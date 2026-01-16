@echo off
chcp 65001 >nul
echo ========================================
echo  INSTALADOR LIBRO DE PARTOS
echo ========================================
echo.

:: Verificar Node.js
echo [1/7] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado. Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo ✅ Node.js encontrado
echo.

:: Verificar PostgreSQL
echo [2/7] Verificando PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL no está instalado o no está en el PATH.
    echo    Por favor instala PostgreSQL desde https://www.postgresql.org/download/
    echo    O asegúrate de agregar PostgreSQL al PATH del sistema.
    pause
    exit /b 1
)
psql --version
echo ✅ PostgreSQL encontrado
echo.

:: Solicitar información de la base de datos
echo [3/7] Configuración de Base de Datos
echo.
set /p DB_HOST="Ingresa la IP o host de PostgreSQL (Enter para localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Ingresa el puerto de PostgreSQL (Enter para 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_NAME="Ingresa el nombre de la base de datos (Enter para libro_partos): "
if "%DB_NAME%"=="" set DB_NAME=libro_partos

set /p DB_USER="Ingresa el usuario de PostgreSQL (Enter para postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASSWORD="Ingresa la contraseña de PostgreSQL: "
if "%DB_PASSWORD%"=="" (
    echo ❌ La contraseña es requerida
    pause
    exit /b 1
)
echo.

:: Solicitar información del servidor
echo [4/7] Configuración del Servidor
echo.
set /p SERVER_PORT="Ingresa el puerto del servidor backend (Enter para 5000): "
if "%SERVER_PORT%"=="" set SERVER_PORT=5000

set /p FRONTEND_IP="Ingresa la IP del frontend para CORS (Enter para localhost): "
if "%FRONTEND_IP%"=="" set FRONTEND_IP=localhost
echo.

:: Solicitar información del administrador
echo [5/7] Configuración del Usuario Administrador
echo.
set /p ADMIN_USERNAME="Ingresa el nombre de usuario del administrador (Enter para admin): "
if "%ADMIN_USERNAME%"=="" set ADMIN_USERNAME=admin

set /p ADMIN_PASSWORD="Ingresa la contraseña del administrador (Enter para admin123): "
if "%ADMIN_PASSWORD%"=="" set ADMIN_PASSWORD=admin123

set /p ADMIN_NOMBRE="Ingresa el nombre completo del administrador (Enter para Administrador): "
if "%ADMIN_NOMBRE%"=="" set ADMIN_NOMBRE=Administrador

set /p ADMIN_EMAIL="Ingresa el email del administrador (Enter para admin@hospital.cl): "
if "%ADMIN_EMAIL%"=="" set ADMIN_EMAIL=admin@hospital.cl
echo.

:: Instalar dependencias del frontend
echo [6/7] Instalando dependencias del frontend...
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error instalando dependencias del frontend
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencias del frontend ya instaladas
)
echo.

:: Instalar dependencias del backend
echo [6/7] Instalando dependencias del backend...
cd server
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error instalando dependencias del backend
        cd ..
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencias del backend ya instaladas
)
cd ..
echo.

:: Crear archivo .env para el backend
echo [7/7] Creando archivos de configuración...
(
echo # Configuración de Base de Datos PostgreSQL
echo DB_HOST=%DB_HOST%
echo DB_PORT=%DB_PORT%
echo DB_NAME=%DB_NAME%
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASSWORD%
echo.
echo # Puerto del servidor backend
echo PORT=%SERVER_PORT%
echo.
echo # Orígenes permitidos para CORS
echo CORS_ORIGIN=http://%FRONTEND_IP%:5173,http://%FRONTEND_IP%:3000,http://localhost:5173,http://localhost:3000
echo.
echo # Limpiar tabla antes de importar datos (true/false)
echo CLEAR_TABLE=false
echo.
echo # Configuración del usuario administrador
echo ADMIN_USERNAME=%ADMIN_USERNAME%
echo ADMIN_PASSWORD=%ADMIN_PASSWORD%
echo ADMIN_NOMBRE=%ADMIN_NOMBRE%
echo ADMIN_EMAIL=%ADMIN_EMAIL%
) > server\.env

echo ✅ Archivo server\.env creado
echo.

:: Crear archivo .env.local para el frontend
(
echo # Configuración local para desarrollo
echo VITE_API_URL=http://localhost:%SERVER_PORT%/api
) > .env.local

echo ✅ Archivo .env.local creado
echo.

:: Crear base de datos en PostgreSQL
echo [8/8] Creando base de datos en PostgreSQL...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" | findstr /C:"1" >nul
if %errorlevel% equ 0 (
    echo ⚠️ La base de datos '%DB_NAME%' ya existe
    set /p DROP_DB="¿Deseas eliminarla y crearla de nuevo? (S/N): "
    if /i "%DROP_DB%"=="S" (
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;"
        echo ✅ Base de datos eliminada
    )
)

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" | findstr /C:"1" >nul
if %errorlevel% neq 0 (
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
    if %errorlevel% neq 0 (
        echo ❌ Error creando la base de datos
        pause
        exit /b 1
    )
    echo ✅ Base de datos '%DB_NAME%' creada
) else (
    echo ✅ Base de datos '%DB_NAME%' ya existe
)
echo.

:: Ejecutar migraciones
echo [9/9] Ejecutando migraciones SQL...
cd server
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f ..\migrations\schema.sql
if %errorlevel% neq 0 (
    echo ❌ Error ejecutando schema.sql
    cd ..
    pause
    exit /b 1
)
echo ✅ Schema ejecutado

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f ..\migrations\users.sql
if %errorlevel% neq 0 (
    echo ❌ Error ejecutando users.sql
    cd ..
    pause
    exit /b 1
)
echo ✅ Tabla de usuarios creada

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f ..\migrations\add_correlativo_creado_por.sql
if %errorlevel% neq 0 (
    echo ⚠️ Advertencia al ejecutar add_correlativo_creado_por.sql (puede ser normal si ya existe)
) else (
    echo ✅ Migración de correlativo ejecutada
)
cd ..
echo.

:: Crear usuario administrador
echo [10/10] Creando usuario administrador...
cd server
set ADMIN_USERNAME=%ADMIN_USERNAME%
set ADMIN_PASSWORD=%ADMIN_PASSWORD%
set ADMIN_NOMBRE=%ADMIN_NOMBRE%
set ADMIN_EMAIL=%ADMIN_EMAIL%
call npm run create-admin
if %errorlevel% neq 0 (
    echo ⚠️ Advertencia al crear usuario administrador (puede que ya exista)
) else (
    echo ✅ Usuario administrador creado
)
cd ..
echo.

:: Resumen final
echo ========================================
echo  INSTALACIÓN COMPLETADA
echo ========================================
echo.
echo 📋 Resumen de la configuración:
echo    Base de datos: %DB_NAME% en %DB_HOST%:%DB_PORT%
echo    Usuario DB: %DB_USER%
echo    Servidor backend: puerto %SERVER_PORT%
echo    Usuario admin: %ADMIN_USERNAME%
echo.
echo 🚀 Para iniciar el servidor:
echo    1. Abre una terminal en la carpeta 'server'
echo    2. Ejecuta: npm start
echo.
echo 🚀 Para iniciar el frontend:
echo    1. Abre otra terminal en la raíz del proyecto
echo    2. Ejecuta: npm run dev
echo.
echo 📝 Archivos de configuración creados:
echo    - server\.env
echo    - .env.local
echo.
echo ⚠️ IMPORTANTE: Cambia la contraseña del administrador después del primer inicio de sesión
echo.
pause
