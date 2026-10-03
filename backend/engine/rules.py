import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

class PlainEnglishRuleEngine:
    """
    Compiles plain-English business rules into deterministic executable predicates,
    explaining its interpretation back to the user and identifying offending rows.
    """

    @classmethod
    def compile_and_evaluate(
        cls, 
        rule_text: str, 
        data: List[Dict[str, Any]], 
        columns: List[str]
    ) -> Dict[str, Any]:
        rule_lower = rule_text.lower().strip()
        col_map = {c.lower(): c for c in columns}

        # 1. Uniqueness check ("Order ID should be unique" / "must be unique")
        if "unique" in rule_lower:
            target_col = cls._match_column(rule_lower, columns)
            if target_col:
                return cls._eval_uniqueness(target_col, data, rule_text)

        # 2. Date ordering ("Ship date after order date", "delivery must follow order date")
        if any(w in rule_lower for w in ["after", "follow", "greater than", "on or after", "later than"]) and any(w in rule_lower for w in ["date", "time"]):
            cols = cls._match_multiple_columns(rule_lower, columns)
            if len(cols) >= 2:
                # E.g. "ship_date must be after order_date"
                # First col is typically the later one if phrasing is "X must be after Y"
                return cls._eval_date_sequence(cols[0], cols[1], data, rule_text)

        # 3. Numeric range check ("Discount <= 25%", "Price >= 0", "Margin cannot be negative", "under 100")
        if any(w in rule_lower for w in ["<", ">", "<=", ">=", "under", "exceed", "greater than", "less than", "between", "negative", "maximum", "minimum"]):
            target_col = cls._match_column(rule_lower, columns)
            if target_col:
                return cls._eval_numeric_bound(target_col, rule_lower, data, rule_text)

        # 4. Allowed categories / Enum ("Status must be Active, Pending, Closed")
        if any(w in rule_lower for w in ["one of", "in [", "must be either", "valid statuses", "allowed values"]):
            target_col = cls._match_column(rule_lower, columns)
            if target_col:
                return cls._eval_allowed_values(target_col, rule_lower, data, rule_text)

        # 5. Non-empty / Required ("Email cannot be blank", "Customer Name is required")
        if any(w in rule_lower for w in ["required", "cannot be blank", "not empty", "must not be null"]):
            target_col = cls._match_column(rule_lower, columns)
            if target_col:
                return cls._eval_not_null(target_col, data, rule_text)

        # Fallback keyword match
        target_col = cls._match_column(rule_lower, columns)
        return {
            "rule_text": rule_text,
            "interpreted_as": f"Could not deterministically parse rule: '{rule_text}'. Try: '<Column> must be unique', '<Col A> after <Col B>', or '<Column> <= <Value>'.",
            "passed": False,
            "violations_count": 0,
            "failing_rows": [],
            "status": "unparseable"
        }

    @classmethod
    def _match_column(cls, text: str, columns: List[str]) -> Optional[str]:
        # Exact match
        for col in columns:
            if col.lower() in text or col.lower().replace("_", " ") in text:
                return col
        return None

    @classmethod
    def _match_multiple_columns(cls, text: str, columns: List[str]) -> List[str]:
        matched = []
        for col in columns:
            if col.lower() in text or col.lower().replace("_", " ") in text:
                matched.append(col)
        # Sort by position in string
        matched.sort(key=lambda c: text.find(c.lower()) if c.lower() in text else text.find(c.lower().replace("_", " ")))
        return matched

    @classmethod
    def _eval_uniqueness(cls, col: str, data: List[Dict[str, Any]], rule_text: str) -> Dict[str, Any]:
        seen = {}
        duplicates = []
        failing_rows = []

        for idx, row in enumerate(data, start=2): # Row 2 is first data row
            val = str(row.get(col, "")).strip()
            if not val:
                continue
            if val in seen:
                seen[val].append(idx)
                failing_rows.append(idx)
                duplicates.append({
                    "row": idx,
                    "cell": f"{col}{idx}",
                    "value": val,
                    "first_seen_row": seen[val][0],
                    "message": f"Duplicate value '{val}' (first seen at row {seen[val][0]})"
                })
            else:
                seen[val] = [idx]

        return {
            "rule_text": rule_text,
            "interpreted_as": f"Column '{col}' must be unique across all rows",
            "passed": len(failing_rows) == 0,
            "violations_count": len(failing_rows),
            "failing_rows": failing_rows,
            "details": duplicates[:20],
            "status": "evaluated"
        }

    @classmethod
    def _eval_date_sequence(cls, later_col: str, earlier_col: str, data: List[Dict[str, Any]], rule_text: str) -> Dict[str, Any]:
        failing_rows = []
        details = []

        for idx, row in enumerate(data, start=2):
            v_early = row.get(earlier_col)
            v_late = row.get(later_col)
            dt_early = cls._parse_date(v_early)
            dt_late = cls._parse_date(v_late)

            if dt_early and dt_late:
                if dt_late < dt_early:
                    failing_rows.append(idx)
                    details.append({
                        "row": idx,
                        "earlier_col": earlier_col,
                        "earlier_val": str(v_early),
                        "later_col": later_col,
                        "later_val": str(v_late),
                        "message": f"{later_col} ({v_late}) is before {earlier_col} ({v_early})"
                    })

        return {
            "rule_text": rule_text,
            "interpreted_as": f"'{later_col}' must be on or after '{earlier_col}'",
            "passed": len(failing_rows) == 0,
            "violations_count": len(failing_rows),
            "failing_rows": failing_rows,
            "details": details[:20],
            "status": "evaluated"
        }

    @classmethod
    def _eval_numeric_bound(cls, col: str, rule_lower: str, data: List[Dict[str, Any]], rule_text: str) -> Dict[str, Any]:
        # Extract number
        nums = re.findall(r"[-+]?\d*\.?\d+", rule_lower)
        bound = float(nums[0]) if nums else 0.0

        is_lte = any(w in rule_lower for w in ["<=", "under", "less than or equal", "maximum", "cannot exceed", "must not exceed"])
        is_gte = any(w in rule_lower for w in [">=", "greater than or equal", "minimum", "cannot be negative", "at least"])
        if "cannot be negative" in rule_lower or "non-negative" in rule_lower:
            bound = 0.0
            is_gte = True
            is_lte = False

        failing_rows = []
        details = []

        for idx, row in enumerate(data, start=2):
            val_raw = row.get(col)
            try:
                val = float(str(val_raw).replace("$", "").replace("%", "").replace(",", "").strip())
                violation = False
                if is_lte and val > bound:
                    violation = True
                elif is_gte and val < bound:
                    violation = True

                if violation:
                    failing_rows.append(idx)
                    details.append({
                        "row": idx,
                        "value": val_raw,
                        "message": f"Value '{val_raw}' violates bound (Expected {'<= ' if is_lte else '>= '}{bound})"
                    })
            except (ValueError, TypeError):
                continue

        op_desc = f"<= {bound}" if is_lte else f">= {bound}"
        return {
            "rule_text": rule_text,
            "interpreted_as": f"Column '{col}' must be {op_desc}",
            "passed": len(failing_rows) == 0,
            "violations_count": len(failing_rows),
            "failing_rows": failing_rows,
            "details": details[:20],
            "status": "evaluated"
        }

    @classmethod
    def _eval_allowed_values(cls, col: str, rule_lower: str, data: List[Dict[str, Any]], rule_text: str) -> Dict[str, Any]:
        # Extract items after 'one of', 'in', etc.
        parts = re.split(r"one of|must be either|in|values:?", rule_lower)
        candidate_str = parts[-1] if len(parts) > 1 else ""
        allowed = {s.strip().strip("'\"[],") for s in candidate_str.split(",") if s.strip()}

        failing_rows = []
        details = []
        for idx, row in enumerate(data, start=2):
            val = str(row.get(col, "")).strip()
            if val and val.lower() not in allowed:
                failing_rows.append(idx)
                details.append({
                    "row": idx,
                    "value": val,
                    "message": f"'{val}' is not in allowed list: {sorted(list(allowed))}"
                })

        return {
            "rule_text": rule_text,
            "interpreted_as": f"Column '{col}' must be one of: {', '.join(allowed)}",
            "passed": len(failing_rows) == 0,
            "violations_count": len(failing_rows),
            "failing_rows": failing_rows,
            "details": details[:20],
            "status": "evaluated"
        }

    @classmethod
    def _eval_not_null(cls, col: str, data: List[Dict[str, Any]], rule_text: str) -> Dict[str, Any]:
        failing_rows = []
        for idx, row in enumerate(data, start=2):
            val = row.get(col)
            if val is None or str(val).strip() == "":
                failing_rows.append(idx)

        return {
            "rule_text": rule_text,
            "interpreted_as": f"Column '{col}' is required and cannot be blank",
            "passed": len(failing_rows) == 0,
            "violations_count": len(failing_rows),
            "failing_rows": failing_rows,
            "details": [{"row": r, "message": "Missing required value"} for r in failing_rows[:20]],
            "status": "evaluated"
        }

    @staticmethod
    def _parse_date(v: Any) -> Optional[datetime]:
        if not v:
            return None
        if isinstance(v, datetime):
            return v
        s = str(v).strip()
        for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y", "%Y/%m/%d"]:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        return None
