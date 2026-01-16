@echo off
chcp 65001 >nul
echo Instalando dependencias del proyecto...
echo.

REM Instalar dependencias del frontend
echo [1/2] Instalando dependencias del frontend...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Falló la instalación de dependencias del frontend
    exit /b 1
)
echo [OK] Dependencias del frontend instaladas
echo.

REM Instalar dependencias del backend
echo [2/2] Instalando dependencias del backend...
cd server
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Falló la instalación de dependencias del backend
    cd ..
    exit /b 1
)
cd ..
echo [OK] Dependencias del backend instaladas
echo.

echo [OK] Todas las dependencias instaladas correctamente
exit /b 0
