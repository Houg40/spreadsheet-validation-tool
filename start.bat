@echo off
echo =======================================================================
echo     Starting SheetGuard: Spreadsheet Quality Inspector & Code Reviewer
echo =======================================================================
echo.

start "SheetGuard Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak >nul

start "SheetGuard Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Backend started at:  http://127.0.0.1:8000
echo Frontend started at: http://localhost:5173
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173
