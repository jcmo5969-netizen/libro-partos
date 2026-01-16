@echo off
chcp 65001 >nul
echo ========================================
echo   CREAR USUARIO ADMINISTRADOR
echo ========================================
echo.

REM Verificar que existe el archivo .env
if not exist "server\.env" (
    echo [ERROR] No se encontró el archivo server\.env
    echo Por favor, ejecuta primero setup-database.bat
    pause
    exit /b 1
)

echo Creando usuario administrador...
echo.

cd server
call npm run create-admin
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo crear el usuario administrador
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [OK] Usuario administrador creado exitosamente
echo.
pause
