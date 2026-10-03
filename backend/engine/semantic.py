import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

class SemanticProfiler:
    """
    Infers data semantics, protects identifiers from float truncation/zero stripping,
    detects date conventions & ambiguities, and identifies the entity grain.
    """

    ID_KEYWORDS = {
        "id", "uuid", "code", "zip", "zipcode", "postal", "fips", "mrn", "ssn", 
        "account", "acct", "sku", "tracking", "order_id", "patient_id", "customer_id",
        "vin", "cin", "npi", "upc", "ean", "ein"
    }

    CURRENCY_KEYWORDS = {
        "price", "cost", "revenue", "amount", "total", "fee", "rate", "subtotal",
        "margin", "gross", "net", "spend", "discount", "balance", "tax", "charge",
        "salary", "payroll", "budget", "pnl", "arr", "mrr"
    }

    DATE_KEYWORDS = {
        "date", "time", "timestamp", "dob", "created", "updated", "shipped",
        "delivered", "admitted", "discharged", "due", "expiry", "period", "month"
    }

    @classmethod
    def profile_dataset(cls, data: List[Dict[str, Any]], raw_cells: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Takes row records and returns semantic type specifications, grain, and risk flags.
        """
        if not data:
            return {"columns": {}, "grain": "Empty dataset", "suggested_rules": [], "date_ambiguities": []}

        columns = list(data[0].keys())
        total_rows = len(data)
        col_profiles = {}
        date_ambiguities = []

        for col in columns:
            col_values = [row.get(col) for row in data]
            profile = cls._profile_column(col, col_values, raw_cells, total_rows)
            col_profiles[col] = profile

            if profile.get("date_ambiguity"):
                date_ambiguities.append(profile["date_ambiguity"])

        # Infer apparent grain
        grain_info = cls._infer_grain(columns, data)

        # Propose validation rules based on inferred semantics
        suggested_rules = cls._suggest_rules(col_profiles, grain_info, columns)

        return {
            "columns": col_profiles,
            "grain": grain_info["description"],
            "candidate_keys": grain_info["candidate_keys"],
            "suggested_rules": suggested_rules,
            "date_ambiguities": date_ambiguities,
            "total_rows": total_rows,
            "total_columns": len(columns)
        }

    @classmethod
    def _profile_column(cls, col_name: str, values: List[Any], raw_cells: Optional[Dict[str, str]], total_rows: int) -> Dict[str, Any]:
        col_lower = col_name.lower().strip()
        non_null_values = [v for v in values if v is not None and str(v).strip() != ""]
        non_null_count = len(non_null_values)

        if non_null_count == 0:
            return {
                "name": col_name,
                "inferred_type": "empty",
                "is_identifier": False,
                "preserve_leading_zeros": False,
                "cardinality": 0,
                "null_pct": 100.0,
                "confidence": 1.0,
                "sample_values": []
            }

        null_pct = round(((total_rows - non_null_count) / total_rows) * 100, 1)
        str_values = [str(v).strip() for v in non_null_values]
        unique_count = len(set(str_values))

        # Check for leading zero patterns (ZIP codes, IDs like '00123', '07030')
        leading_zeros_detected = any(
            re.match(r"^0\d+", s) for s in str_values
        )
        is_id_name = any(kw in col_lower for kw in cls.ID_KEYWORDS)

        # Check if numeric or currency
        numeric_count = 0
        currency_signs = 0
        percent_signs = 0
        parsed_numbers = []

        for s in str_values:
            clean = s.replace(",", "").replace("$", "").replace("€", "").replace("£", "").replace("%", "").strip()
            if "$" in s or "€" in s or "£" in s:
                currency_signs += 1
            if "%" in s:
                percent_signs += 1
            try:
                val = float(clean)
                parsed_numbers.append(val)
                numeric_count += 1
            except ValueError:
                pass

        numeric_pct = numeric_count / non_null_count

        # Check dates
        date_candidates = []
        is_date_col = any(kw in col_lower for kw in cls.DATE_KEYWORDS)
        date_ambiguity = None

        if is_date_col or numeric_pct < 0.5:
            date_candidates = cls._check_date_parsing(str_values)

        # Classify Semantic Type
        if is_id_name and (leading_zeros_detected or unique_count / non_null_count > 0.6 or not parsed_numbers):
            inferred_type = "identifier"
            preserve_zeros = True
            confidence = 0.95
        elif percent_signs > non_null_count * 0.4 or ("margin" in col_lower or "pct" in col_lower or "rate" in col_lower and numeric_pct > 0.8):
            inferred_type = "percentage"
            preserve_zeros = False
            confidence = 0.92
        elif currency_signs > 0 or (numeric_pct > 0.8 and any(kw in col_lower for kw in cls.CURRENCY_KEYWORDS)):
            inferred_type = "currency"
            preserve_zeros = False
            confidence = 0.94
        elif len(date_candidates) > non_null_count * 0.6:
            inferred_type = "date"
            preserve_zeros = False
            confidence = 0.90
            date_ambiguity = cls._detect_date_ambiguity(col_name, str_values)
        elif numeric_pct > 0.85:
            if all(float(x).is_integer() for x in parsed_numbers) and is_id_name:
                inferred_type = "identifier"
                preserve_zeros = leading_zeros_detected
                confidence = 0.88
            else:
                inferred_type = "numeric_metric"
                preserve_zeros = False
                confidence = 0.90
        elif unique_count < 15 or unique_count / non_null_count < 0.2:
            inferred_type = "category"
            preserve_zeros = False
            confidence = 0.85
        else:
            inferred_type = "text"
            preserve_zeros = False
            confidence = 0.80

        # Preserve zeros safeguard
        if is_id_name or "zip" in col_lower or "code" in col_lower or leading_zeros_detected:
            preserve_zeros = True

        return {
            "name": col_name,
            "inferred_type": inferred_type,
            "is_identifier": inferred_type == "identifier",
            "preserve_leading_zeros": preserve_zeros,
            "cardinality": unique_count,
            "null_pct": null_pct,
            "confidence": confidence,
            "date_ambiguity": date_ambiguity,
            "sample_values": str_values[:5],
            "stats": {
                "min": min(parsed_numbers) if parsed_numbers else None,
                "max": max(parsed_numbers) if parsed_numbers else None,
                "sum": round(sum(parsed_numbers), 2) if parsed_numbers and inferred_type in ("currency", "numeric_metric") else None
            }
        }

    @classmethod
    def _check_date_parsing(cls, str_values: List[str]) -> List[datetime]:
        formats = [
            "%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d",
            "%m-%d-%Y", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S",
            "%b %d, %Y", "%d %b %Y"
        ]
        parsed = []
        for s in str_values[:30]:
            for fmt in formats:
                try:
                    dt = datetime.strptime(s, fmt)
                    parsed.append(dt)
                    break
                except ValueError:
                    continue
        return parsed

    @classmethod
    def _detect_date_ambiguity(cls, col_name: str, str_values: List[str]) -> Optional[Dict[str, Any]]:
        """
        Detects if dates like '03/04/2024' could be March 4 or April 3.
        If all first components and second components are <= 12, ambiguous.
        """
        slash_dates = [s for s in str_values if re.match(r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$", s)]
        if not slash_dates:
            return None

        first_parts = []
        second_parts = []
        for s in slash_dates:
            parts = re.split(r"[/-]", s)
            if len(parts) >= 2:
                first_parts.append(int(parts[0]))
                second_parts.append(int(parts[1]))

        if not first_parts:
            return None

        # If both first and second are all <= 12, there is zero unambiguous anchor row!
        both_under_12 = all(p <= 12 for p in first_parts) and all(p <= 12 for p in second_parts)
        has_day_over_12_in_second = any(p > 12 for p in second_parts)
        has_day_over_12_in_first = any(p > 12 for p in first_parts)

        if has_day_over_12_in_second and not has_day_over_12_in_first:
            # Clearly MM/DD/YYYY
            return None
        if has_day_over_12_in_first and not has_day_over_12_in_second:
            # Clearly DD/MM/YYYY
            return None

        if both_under_12:
            return {
                "column": col_name,
                "type": "dual_convention_risk",
                "severity": "high",
                "message": f"Date column '{col_name}' has ambiguous date conventions (e.g. '{slash_dates[0]}'). Values never exceed 12 in either day/month position, so MM/DD/YYYY and DD/MM/YYYY cannot be separated automatically.",
                "sample": slash_dates[0],
                "proposed_resolution": "Confirm format: US (MM/DD/YYYY) vs International (DD/MM/YYYY)"
            }
        return None

    @classmethod
    def _infer_grain(cls, columns: List[str], data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Finds primary key or composite primary key that uniquely defines each row.
        """
        n_rows = len(data)
        if n_rows == 0:
            return {"description": "Empty", "candidate_keys": []}

        candidate_keys = []
        
        # Check single column uniqueness
        for col in columns:
            vals = [str(r.get(col, "")) for r in data if r.get(col) is not None]
            if len(vals) == n_rows and len(set(vals)) == n_rows:
                candidate_keys.append([col])

        # If no single column is unique, test 2-column combinations
        if not candidate_keys and len(columns) > 1:
            for i in range(len(columns)):
                for j in range(i + 1, len(columns)):
                    c1, c2 = columns[i], columns[j]
                    combos = [f"{r.get(c1)}_{r.get(c2)}" for r in data]
                    if len(set(combos)) == n_rows:
                        candidate_keys.append([c1, c2])
                        if len(candidate_keys) >= 3:
                            break
                if candidate_keys:
                    break

        # Generate readable description
        if candidate_keys:
            best_key = candidate_keys[0]
            if len(best_key) == 1:
                col_name = best_key[0]
                clean_name = col_name.replace("_id", "").replace("_", " ").title()
                description = f"One row per {clean_name} (Uniquely keyed by '{col_name}')"
            else:
                description = f"One row per composite combination ({' + '.join(best_key)})"
        else:
            # Check near-unique (maybe duplicates exist)
            best_col = None
            highest_uniq = 0
            for col in columns:
                vals = [str(r.get(col, "")) for r in data if r.get(col)]
                u = len(set(vals))
                if u > highest_uniq:
                    highest_uniq = u
                    best_col = col

            if best_col and highest_uniq / n_rows > 0.85:
                description = f"Likely one row per {best_col.replace('_', ' ').title()} (contains {n_rows - highest_uniq} duplicates)"
                candidate_keys.append([best_col])
            else:
                description = "Tabular record grain (No unique single identifier found)"

        return {
            "description": description,
            "candidate_keys": candidate_keys
        }

    @classmethod
    def _suggest_rules(cls, profiles: Dict[str, Any], grain_info: Dict[str, Any], columns: List[str]) -> List[Dict[str, str]]:
        rules = []
        # Key rule
        for k in grain_info.get("candidate_keys", []):
            if len(k) == 1:
                rules.append({
                    "id": f"rule_unique_{k[0]}",
                    "column": k[0],
                    "rule": f"'{k[0]}' should be strictly unique per row",
                    "type": "uniqueness"
                })
            else:
                rules.append({
                    "id": f"rule_unique_composite",
                    "column": ", ".join(k),
                    "rule": f"Compound key ({' + '.join(k)}) should be unique",
                    "type": "composite_uniqueness"
                })

        # Date order rule
        date_cols = [c for c, p in profiles.items() if p["inferred_type"] == "date"]
        order_dates = [c for c in date_cols if any(w in c.lower() for w in ["order", "start", "admit", "create"])]
        ship_dates = [c for c in date_cols if any(w in c.lower() for w in ["ship", "deliver", "end", "discharge", "close"])]
        if order_dates and ship_dates:
            rules.append({
                "id": "rule_date_order",
                "column": f"{order_dates[0]} -> {ship_dates[0]}",
                "rule": f"'{ship_dates[0]}' must be on or after '{order_dates[0]}'",
                "type": "temporal_sequence"
            })

        # Non-negative metrics
        metric_cols = [c for c, p in profiles.items() if p["inferred_type"] in ("currency", "numeric_metric")]
        for m in metric_cols:
            if any(w in m.lower() for w in ["price", "cost", "quantity", "qty", "volume", "hours"]):
                rules.append({
                    "id": f"rule_non_negative_{m}",
                    "column": m,
                    "rule": f"'{m}' must be greater than or equal to 0",
                    "type": "range"
                })

        return rules
