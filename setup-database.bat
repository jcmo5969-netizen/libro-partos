@echo off
chcp 65001 >nul
echo ========================================
echo   CONFIGURACIÓN DE BASE DE DATOS
echo ========================================
echo.

REM Solicitar información de conexión
echo Por favor, ingresa la información de conexión a PostgreSQL:
echo.

set /p DB_HOST="Host (por defecto: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Puerto (por defecto: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_USER="Usuario (por defecto: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASSWORD="Contraseña: "
if "%DB_PASSWORD%"=="" (
    echo [ERROR] La contraseña es requerida
    pause
    exit /b 1
)

set /p DB_NAME="Nombre de la base de datos (por defecto: libro_partos): "
if "%DB_NAME%"=="" set DB_NAME=libro_partos

echo.
echo ========================================
echo   Configuración ingresada:
echo ========================================
echo Host: %DB_HOST%
echo Puerto: %DB_PORT%
echo Usuario: %DB_USER%
echo Base de datos: %DB_NAME%
echo.
set /p CONFIRM="¿Continuar con esta configuración? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo Instalación cancelada.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   Creando base de datos...
echo ========================================
echo.

REM Configurar variable de entorno para la contraseña
set PGPASSWORD=%DB_PASSWORD%

REM Crear la base de datos si no existe
echo Creando base de datos '%DB_NAME%'...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" | findstr /C:"1" >nul
if %errorlevel% equ 0 (
    echo [INFO] La base de datos '%DB_NAME%' ya existe.
    set /p DROP_DB="¿Deseas eliminarla y recrearla? (S/N): "
    if /i "%DROP_DB%"=="S" (
        echo Eliminando base de datos existente...
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;"
        echo Creando nueva base de datos...
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
    )
) else (
    echo Creando nueva base de datos...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo crear la base de datos
        echo Verifica que PostgreSQL esté corriendo y que las credenciales sean correctas
        pause
        exit /b 1
    )
)

echo [OK] Base de datos creada/verificada
echo.

REM Ejecutar migraciones en orden
echo ========================================
echo   Ejecutando migraciones...
echo ========================================
echo.

echo [1/3] Ejecutando schema.sql...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrations\schema.sql
if %errorlevel% neq 0 (
    echo [ERROR] Falló la ejecución de schema.sql
    pause
    exit /b 1
)
echo [OK] Schema creado

echo.
echo [2/3] Ejecutando add_correlativo_creado_por.sql...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrations\add_correlativo_creado_por.sql
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Falló la ejecución de add_correlativo_creado_por.sql (puede que ya esté aplicado)
)

echo.
echo [3/3] Ejecutando users.sql...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrations\users.sql
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Falló la ejecución de users.sql (puede que la función ya exista)
    echo Continuando...
) else (
    echo [OK] Tabla de usuarios creada
)

echo.
echo ========================================
echo   Creando archivo de configuración...
echo ========================================
echo.

REM Crear archivo .env en server
(
echo # Configuración de Base de Datos PostgreSQL
echo DB_HOST=%DB_HOST%
echo DB_PORT=%DB_PORT%
echo DB_NAME=%DB_NAME%
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASSWORD%
echo.
echo # Puerto del servidor backend
echo PORT=5000
echo.
echo # Orígenes permitidos para CORS
echo CORS_ORIGIN=http://localhost:5173,http://localhost:3000
echo.
echo # Limpiar tabla antes de importar datos
echo CLEAR_TABLE=false
) > server\.env

echo [OK] Archivo server\.env creado con la configuración
echo.

REM Limpiar variable de entorno sensible
set PGPASSWORD=

echo ========================================
echo   CONFIGURACIÓN COMPLETADA
echo ========================================
echo.
echo La base de datos '%DB_NAME%' ha sido configurada correctamente.
echo.
echo Próximo paso: Ejecutar 'npm run create-admin' en la carpeta server
echo para crear el usuario administrador inicial.
echo.
pause
exit /b 0
