@echo off
REM Fuoriclasse - avvio con un clic (Windows).
REM Primo avvio: installa le dipendenze e prepara il database, poi parte.
REM Avvii successivi: parte subito. Apre il browser da solo.

setlocal
cd /d "%~dp0.."

echo.
echo   Fuoriclasse - %CD%
echo.

REM --- Node deve essere installato ---
where node >nul 2>&1
if errorlevel 1 (
  echo   [X] Node.js non trovato.
  echo       Installa Node 20 o superiore da https://nodejs.org e riprova.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node --version') do echo   - Node %%v

REM --- installazione al primo avvio ---
if not exist node_modules (
  echo   - Installazione dipendenze ^(solo la prima volta, qualche minuto^)...
  call npm install || goto :fail
  echo   - Generazione client Prisma...
  call npx prisma generate || goto :fail
)

if not exist .env copy .env.example .env >nul

if not exist prisma\dev.db (
  echo   - Preparazione database...
  REM db push e non migrate deploy: allinea il database allo schema attuale
  REM qualunque sia lo storico delle migrazioni.
  call npx prisma db push --skip-generate || goto :fail
  call npm run prisma:seed || goto :fail
)

REM --- apre il browser quando il gioco risponde ---
start "" /b powershell -NoProfile -Command ^
  "for ($i=0; $i -lt 60; $i++) { try { Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process 'http://localhost:5173'; break } catch { Start-Sleep -Seconds 1 } }"

echo   - Avvio del gioco... ^(chiudi questa finestra per fermarlo^)
echo.
call npm run dev
goto :eof

:fail
echo.
echo   [X] Qualcosa e' andato storto durante l'installazione.
echo.
pause
exit /b 1
