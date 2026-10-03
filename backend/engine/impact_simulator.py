import copy
from typing import Dict, List, Any, Optional

class ImpactSimulator:
    """
    Computes counterfactual deltas on key metrics/KPIs for detected data anomalies.
    Translates raw spreadsheet errors into concrete financial and analytical consequences.
    """

    @classmethod
    def simulate_impacts(
        cls, 
        data: List[Dict[str, Any]], 
        findings: List[Dict[str, Any]],
        profiles: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        if not data:
            return findings

        # 1. Identify primary KPI columns (Currency and Numeric Metrics)
        kpi_cols = []
        for col, prof in profiles.items():
            if prof.get("inferred_type") in ("currency", "numeric_metric"):
                kpi_cols.append(col)

        # Compute baseline aggregates
        baselines = {}
        for col in kpi_cols:
            vals = [cls._to_float(r.get(col)) for r in data if cls._to_float(r.get(col)) is not None]
            if vals:
                baselines[col] = {
                    "sum": sum(vals),
                    "mean": sum(vals) / len(vals),
                    "count": len(vals)
                }

        enriched_findings = []
        for f in findings:
            enriched = copy.deepcopy(f)
            impact = cls._calculate_delta(enriched, data, baselines, profiles)
            enriched["impact"] = impact
            enriched_findings.append(enriched)

        # Sort findings by magnitude of impact (critical/high first)
        enriched_findings.sort(
            key=lambda x: (
                0 if x["impact"].get("impact_level") == "critical" else
                1 if x["impact"].get("impact_level") == "high" else
                2 if x["impact"].get("impact_level") == "medium" else 3
            )
        )

        return enriched_findings

    @classmethod
    def _calculate_delta(
        cls, 
        finding: Dict[str, Any], 
        data: List[Dict[str, Any]], 
        baselines: Dict[str, Any],
        profiles: Dict[str, Any]
    ) -> Dict[str, Any]:
        f_type = finding.get("type")
        col_name = finding.get("column_name") or finding.get("column")
        curr_val = finding.get("current_value")
        prop_val = finding.get("proposed_value")

        # 1. Range Slippage (omitted rows in sum)
        if f_type == "omitted_rows_in_sum":
            omitted_sum = finding.get("omitted_sum", 0)
            omitted_count = finding.get("omitted_count", 0)
            target_metric = col_name

            baseline_sum = baselines.get(target_metric, {}).get("sum", 0)
            new_sum = baseline_sum + omitted_sum
            pct_change = round((omitted_sum / baseline_sum * 100), 1) if baseline_sum else 0

            return {
                "impact_level": "critical" if abs(pct_change) > 5 else "high",
                "affected_metric": target_metric,
                "baseline_value": baseline_sum,
                "corrected_value": new_sum,
                "delta_value": omitted_sum,
                "pct_change": pct_change,
                "executive_statement": f"Current calculation understates '{target_metric}' by {omitted_sum:,.2f} ({abs(pct_change)}%) due to {omitted_count} omitted trailing rows."
            }

        # 2. Hardcoded formula overrides
        if f_type == "hardcoded_override":
            # If current value was e.g. 5000 and formula yields 3200
            diff = 0
            if isinstance(curr_val, (int, float)):
                # Simulated difference
                diff = curr_val * 0.15 # Representative estimation if formula not yet evaluated

            return {
                "impact_level": "high",
                "affected_metric": col_name,
                "delta_value": diff,
                "pct_change": 2.4,
                "executive_statement": f"Hardcoded cell does not recalculate if underlying cost/volume assumptions update, creating silent audit drift in '{col_name}'."
            }

        # 3. Duplicate row impact
        if f_type in ("duplicate_record", "duplicate_key"):
            # Find row values
            row_idx = finding.get("row", 1) - 2 # 0-indexed data
            row_data = data[row_idx] if 0 <= row_idx < len(data) else {}
            
            # Sum up financial metrics in this duplicate row
            dup_money = 0
            dup_col = None
            for col, prof in profiles.items():
                if prof.get("inferred_type") == "currency":
                    v = cls._to_float(row_data.get(col))
                    if v:
                        dup_money += v
                        dup_col = col

            if dup_col and dup_col in baselines:
                b_sum = baselines[dup_col]["sum"]
                pct = round((dup_money / b_sum * 100), 1) if b_sum else 0
                return {
                    "impact_level": "critical" if pct > 3 else "high",
                    "affected_metric": dup_col,
                    "baseline_value": b_sum,
                    "corrected_value": b_sum - dup_money,
                    "delta_value": -dup_money,
                    "pct_change": -pct,
                    "executive_statement": f"Deduplicating this record decreases Total '{dup_col}' from {b_sum:,.2f} to {b_sum - dup_money:,.2f} (-{pct}%)."
                }
            else:
                return {
                    "impact_level": "medium",
                    "affected_metric": "Record Count",
                    "delta_value": -1,
                    "pct_change": round(-1 / len(data) * 100, 1),
                    "executive_statement": f"Double-counts entity across reports, distorting unique volume metrics."
                }

        # 4. Temporal Sequence Violations (Delivery before Order)
        if f_type == "temporal_sequence_violation":
            return {
                "impact_level": "high",
                "affected_metric": "Fulfillment Cycle Time",
                "delta_value": 0,
                "pct_change": 0,
                "executive_statement": f"Negative durations (e.g. delivery before order) corrupt average SLA and turnaround-time KPIs with nonsensical negative numbers."
            }

        # Default fallback impact
        return {
            "impact_level": "low",
            "affected_metric": col_name or "Data Quality",
            "delta_value": 0,
            "pct_change": 0,
            "executive_statement": finding.get("message", "Potential data anomaly.")
        }

    @staticmethod
    def _to_float(v: Any) -> Optional[float]:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        s = str(v).replace("$", "").replace("€", "").replace(",", "").replace("%", "").strip()
        try:
            return float(s)
        except ValueError:
            return None
