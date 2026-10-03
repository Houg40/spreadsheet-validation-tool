import os
from typing import Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

class SampleGenerator:
    """
    Generates realistic, pre-configured broken spreadsheets showcasing formula breaks,
    range slippages, leading-zero identifiers, and date traps.
    """

    @classmethod
    def create_all_samples(cls, output_dir: str) -> Dict[str, str]:
        os.makedirs(output_dir, exist_ok=True)
        files = {}
        files["saas_forecast"] = cls.create_saas_financial_model(os.path.join(output_dir, "saas_forecast_pnl.xlsx"))
        files["clinical_intake"] = cls.create_clinical_patient_intake(os.path.join(output_dir, "clinical_patient_intake.xlsx"))
        files["ecommerce_orders"] = cls.create_ecommerce_orders(os.path.join(output_dir, "ecommerce_orders.xlsx"))
        return files

    @classmethod
    def create_saas_financial_model(cls, filepath: str) -> str:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Financial_Forecast"

        headers = ["Month", "New_Customers", "ARPU", "Gross_Revenue", "Hosting_Cost", "Sales_Commission", "Net_Margin"]
        ws.append(headers)

        # Style header
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        data = [
            ("Jan 2024", 120, 250, "=B2*C2", 4500, 3000, "=D2-E2-F2"),
            ("Feb 2024", 135, 250, "=B3*C3", 4800, 3375, "=D3-E3-F3"),
            ("Mar 2024", 150, 260, "=B4*C4", 5100, 3900, "=D4-E4-F4"),
            ("Apr 2024", 160, 260, "=B5*C5", 5300, 4160, "=D5-E5-F5"),
            ("May 2024", 175, 270, "=B6*C6", 5600, 4725, "=D6-E6-F6"),
            ("Jun 2024", 190, 270, "=B7*C7", 5900, 5130, "=D7-E7-F7"),
            ("Jul 2024", 210, 280, "=B8*C8", 6200, 5880, "=D8-E8-F8"),
            # ROW 9: FORMULA PATTERN BREAK! Hardcoded 48,000 instead of formula =D9-E9-F9
            ("Aug 2024", 225, 280, "=B9*C9", 6500, 6300, 48000), 
            ("Sep 2024", 240, 290, "=B10*C10", 6800, 6960, "=D10-E10-F10"),
            ("Oct 2024", 255, 290, "=B11*C11", 7100, 7395, "=D11-E11-F11"),
            ("Nov 2024", 270, 300, "=B12*C12", 7400, 8100, "=D12-E12-F12"),
            ("Dec 2024", 290, 300, "=B13*C13", 7800, 8700, "=D13-E13-F13"),
        ]

        for r_idx, row_vals in enumerate(data, start=2):
            for c_idx, val in enumerate(row_vals, start=1):
                cell = ws.cell(row=r_idx, column=c_idx)
                cell.value = val

        # RANGE SLIPPAGE in Summary Row:
        # Sums only D2:D9 instead of D2:D13 (omits Q4 September through December!)
        sum_row = 15
        ws.cell(row=sum_row, column=1, value="Total Annual (YTD)")
        ws.cell(row=sum_row, column=1).font = Font(bold=True)
        
        # Slipped formulas:
        ws.cell(row=sum_row, column=4, value="=SUM(D2:D9)") # Omitting rows 10, 11, 12, 13
        ws.cell(row=sum_row, column=7, value="=SUM(G2:G9)") # Omitting rows 10, 11, 12, 13

        # Add total row styling
        total_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        for c in range(1, len(headers) + 1):
            cell = ws.cell(row=sum_row, column=c)
            cell.fill = total_fill
            cell.font = Font(bold=True)

        # Hide row 5 (one month hidden) to trigger hidden row warning on sum
        ws.row_dimensions[5].hidden = True

        cls._auto_fit_columns(ws)
        wb.save(filepath)
        return filepath

    @classmethod
    def create_clinical_patient_intake(cls, filepath: str) -> str:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Patient_Encounters"

        headers = ["Patient_MRN", "Encounter_ID", "Patient_Name", "Admission_Date", "Discharge_Date", "Zip_Code", "Copay_Amount", "Diagnosis_Code"]
        ws.append(headers)

        header_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")
        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        data = [
            ("001482", "ENC-9001", "Eleanor Vance", "04/05/2024", "04/08/2024", "07030", 50.00, "F32.9"),
            ("002931", "ENC-9002", "Marcus Kane", "03/08/2024", "03/12/2024", "02138", 25.00, "F41.1"),
            # TEMPORAL SEQUENCE ERROR: Discharged before admission! And all <= 12
            ("003184", "ENC-9003", "Sarah Jenkins", "05/10/2024", "05/04/2024", "08540", 50.00, "G47.0"),
            ("004019", "ENC-9004", "David Rodriguez", "02/09/2024", "02/11/2024", "01234", 30.00, "F33.1"),
            # DUPLICATE ENCOUNTER ID (ENC-9002 reused)
            ("005112", "ENC-9002", "Chloe Tremblay", "06/01/2024", "06/04/2024", "07030", 40.00, "F43.2"),
            ("006789", "ENC-9006", "Brian O'Connor", "01/11/2024", "01/12/2024", "10001", 75.00, "F10.1"),
            ("007234", "ENC-9007", "Aaliyah Patel", "05/02/2024", "05/05/2024", "02139", 50.00, "F31.9"),
            ("008901", "ENC-9008", "Thomas Wright", "06/10/2024", "06/12/2024", "07302", 25.00, "F41.0"),
        ]

        for r_idx, row_vals in enumerate(data, start=2):
            for c_idx, val in enumerate(row_vals, start=1):
                cell = ws.cell(row=r_idx, column=c_idx)
                # Keep MRN and Zip as string format
                if c_idx in (1, 6):
                    cell.number_format = "@"
                    cell.value = str(val)
                else:
                    cell.value = val

        cls._auto_fit_columns(ws)
        wb.save(filepath)
        return filepath

    @classmethod
    def create_ecommerce_orders(cls, filepath: str) -> str:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Order_Ledger"

        headers = ["Order_ID", "Order_Date", "Customer_ID", "Product_SKU", "Quantity", "Unit_Price", "Discount_Pct", "Line_Total"]
        ws.append(headers)

        header_fill = PatternFill(start_color="312E81", end_color="312E81", fill_type="solid")
        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font

        data = [
            ("ORD-101", "2024-04-01", "CUST-501", "SKU-A1", 2, 45.00, 0.05, "=E2*F2*(1-G2)"),
            ("ORD-102", "2024-04-01", "CUST-502", "SKU-B2", 1, 120.00, 0.00, "=E3*F3*(1-G3)"),
            ("ORD-103", "2024-04-02", "CUST-503", "SKU-C3", 4, 30.00, 0.10, "=E4*F4*(1-G4)"),
            # DUPLICATE ORDER ID
            ("ORD-103", "2024-04-02", "CUST-503", "SKU-C3", 4, 30.00, 0.10, "=E5*F5*(1-G5)"),
            ("ORD-105", "2024-04-03", "CUST-505", "SKU-A1", 3, 45.00, 0.00, "=E6*F6*(1-G6)"),
            # HARDCODED OVERRIDE (breaks formula pattern)
            ("ORD-106", "2024-04-03", "CUST-506", "SKU-D4", 5, 80.00, 0.15, 340.00), 
            ("ORD-107", "2024-04-04", "CUST-507", "SKU-E5", 1, 250.00, 0.20, "=E8*F8*(1-G8)"),
            # OUT OF BOUNDS DISCOUNT (150%)
            ("ORD-108", "2024-04-05", "CUST-508", "SKU-B2", 2, 120.00, 1.50, "=E9*F9*(1-G9)"),
            ("ORD-109", "2024-04-05", "CUST-509", "SKU-A1", 1, 45.00, 0.00, "=E10*F10*(1-G10)"),
            ("ORD-110", "2024-04-06", "CUST-510", "SKU-F6", 2, 95.00, 0.05, "=E11*F11*(1-G11)"),
        ]

        for r_idx, row_vals in enumerate(data, start=2):
            for c_idx, val in enumerate(row_vals, start=1):
                cell = ws.cell(row=r_idx, column=c_idx)
                cell.value = val

        # Slipped sum formula in row 13
        ws.cell(row=13, column=1, value="Total Revenue")
        ws.cell(row=13, column=8, value="=SUM(H2:H8)") # OMITTING rows 9, 10, 11!

        cls._auto_fit_columns(ws)
        wb.save(filepath)
        return filepath

    @staticmethod
    def _auto_fit_columns(ws):
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)
