# SheetGuard: Spreadsheet Quality Inspector ("Code Reviewer for Spreadsheets")

A quality inspector and linter for spreadsheets that goes beyond flagging nulls and duplicates. It identifies what could make an analysis wrong, calculates the downstream financial and analytical consequences, and helps users fix issues without losing original formulas, formatting, or data.

---

## Key Features

1. **Understand What the Data Represents (Semantic Profiling & Grain)**
   - Distinguishes identifiers (ZIP codes, MRNs, Account IDs) from calculated numbers, **strictly locking and preserving leading zeros**.
   - Infers the apparent row grain (e.g., *"One row per Order Line Item, uniquely keyed by Order_ID + SKU"*).
   - Detects **Date Ambiguity Traps** (e.g., `04/05/2024` where day and month both $\le 12$, warning users of potential DD/MM vs MM/DD convention shifts).

2. **Audit Formulas & Spreadsheet Structure (Formula AST)**
   - **Formula Pattern Breaks:** Analyzes contiguous columns using R1C1 relative coordinates to detect hardcoded numeric overrides or altered formulas.
   - **Range Boundary Slippage:** Detects summary functions like `=SUM(D2:D9)` that stop prematurely and omit trailing populated data rows.
   - **Hidden Row Inclusion Risks:** Warns if `=SUM()` blindly calculates values from hidden/filtered rows where `=SUBTOTAL(109, ...)` should have been used.

3. **The Core Differentiator: Counterfactual Impact on Analysis**
   - Connects detected anomalies to summary KPIs and financials.
   - Quantifies the exact delta: e.g., *"Deduplicating this record decreases Total Revenue by $14,200 (-4.8%)"*.
   - Ranks findings by **Magnitude of Business Consequence** rather than arbitrary error counts.

4. **Safe Reversibility & Git-like Diffs**
   - Interactive spreadsheet grid where cells with detected disruptions have visual diff badges.
   - 1-click **Accept Fix**, **Reject**, or inspect in context.
   - **Non-Destructive Export:** Generates an annotated `.xlsx` with soft green highlights, cell provenance comments, and an appended `_Audit_Changelog` tab documenting every edit.

5. **Natural Language Rule Compiler**
   - Type custom rules in plain English (e.g., *"Discharge date must follow admission date"*, *"Discount cannot exceed 25%"*).
   - Compiles into deterministic validation logic without LLM calculation hallucinations.

6. **Executive Trust Scorecard ("Can I Trust This Report?")**
   - 0–100% Trust Index broken down into 4 core pillars: Formula Uniformity, Range Coverage, Grain Purity, and Temporal Consistency.

---

## 3 Built-in Pre-loaded Scenarios

SheetGuard comes pre-loaded with realistic, broken business spreadsheets ready for instant testing:
1. **SaaS Financial Forecast & Unit Economics (`saas_forecast_pnl.xlsx`):** Features a hardcoded net margin override in row 8, hidden row inclusion risks, and a slipped annual sum formula in D15 omitting Q4 revenues.
2. **Clinical Patient Encounters & Admissions (`clinical_patient_intake.xlsx`):** Features leading-zero MRNs and ZIP codes, month/day date ambiguity, discharge-before-admission temporal reversals, and duplicate encounter IDs.
3. **E-Commerce Supply Chain & Orders (`ecommerce_orders.xlsx`):** Features duplicate orders, an out-of-bounds 150% discount, and broken line total formulas.

---

## Quickstart Guide

### 1. Launch Everything (One-Click on Windows)
Simply double-click:
```cmd
start.bat
```
This boots both the FastAPI analytical engine on `http://127.0.0.1:8000` and the React Vite UI on `http://localhost:5173`.

### 2. Manual Startup

#### Backend
```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```

#### Frontend
```powershell
cd frontend
npm install
npm run dev
```

---

## Running Verification Tests

Run the automated backend test suite verifying AST analysis, range slippage, semantic typing, impact calculation, and non-destructive export:
```powershell
cd backend
python test_engine.py
```
