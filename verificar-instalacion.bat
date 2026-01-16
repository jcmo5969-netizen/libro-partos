@echo off
chcp 65001 >nul
echo ========================================
echo   VERIFICACIÓN DE INSTALACIÓN
echo ========================================
echo.

echo Verificando requisitos...
echo.

REM Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js NO está instalado
    set ERROR=1
) else (
    echo [OK] Node.js instalado
    node --version
)

echo.

REM Verificar PostgreSQL
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] PostgreSQL NO está en el PATH
    echo     (Puede estar instalado pero no en el PATH)
    set ERROR=1
) else (
    echo [OK] PostgreSQL encontrado
    psql --version
)

echo.

REM Verificar dependencias del frontend
if exist "node_modules" (
    echo [OK] Dependencias del frontend instaladas
) else (
    echo [X] Dependencias del frontend NO instaladas
    echo     Ejecuta: install-dependencies.bat
    set ERROR=1
)

echo.

REM Verificar dependencias del backend
if exist "server\node_modules" (
    echo [OK] Dependencias del backend instaladas
) else (
    echo [X] Dependencias del backend NO instaladas
    echo     Ejecuta: install-dependencies.bat
    set ERROR=1
)

echo.

REM Verificar archivo .env
if exist "server\.env" (
    echo [OK] Archivo server\.env existe
    echo.
    echo Contenido del archivo .env:
    echo ----------------------------------------
    type server\.env | findstr /V "PASSWORD"
    echo ----------------------------------------
) else (
    echo [X] Archivo server\.env NO existe
    echo     Ejecuta: setup-database.bat
    set ERROR=1
)

echo.

if defined ERROR (
    echo ========================================
    echo   VERIFICACIÓN COMPLETADA CON ERRORES
    echo ========================================
    echo.
    echo Por favor, corrige los errores antes de continuar.
) else (
    echo ========================================
    echo   VERIFICACIÓN EXITOSA
    echo ========================================
    echo.
    echo Todo está configurado correctamente.
    echo Puedes iniciar los servidores con: iniciar-servidores.bat
)

echo.
pause
