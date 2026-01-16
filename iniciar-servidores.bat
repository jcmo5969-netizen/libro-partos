@echo off
chcp 65001 >nul
echo ========================================
echo   INICIANDO SERVIDORES
echo ========================================
echo.

REM Verificar que existe el archivo .env
if not exist "server\.env" (
    echo [ERROR] No se encontró el archivo server\.env
    echo Por favor, ejecuta primero setup-database.bat o crea el archivo manualmente
    pause
    exit /b 1
)

echo Iniciando servidores en ventanas separadas...
echo.

REM Iniciar backend
echo Iniciando Backend (puerto 5000)...
start "Backend - Libro de Partos" cmd /k "cd /d %~dp0server && npm start"

REM Esperar un poco antes de iniciar el frontend
timeout /t 3 /nobreak >nul

REM Iniciar frontend
echo Iniciando Frontend (puerto 5173)...
start "Frontend - Libro de Partos" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================
echo   SERVIDORES INICIADOS
echo ========================================
echo.
echo Backend: http://localhost:5000/api
echo Frontend: http://localhost:5173
echo.
echo Las ventanas de los servidores se han abierto.
echo Cierra esta ventana cuando termines.
echo.
pause
