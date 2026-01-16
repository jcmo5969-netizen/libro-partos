@echo off
chcp 65001 >nul
echo ========================================
echo  INSTALADOR AUTOMÁTICO LIBRO DE PARTOS
echo ========================================
echo.
echo Este script usa valores por defecto para instalación rápida
echo.

:: Valores por defecto
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=libro_partos
set DB_USER=postgres
set DB_PASSWORD=postgres
set SERVER_PORT=5000
set FRONTEND_IP=localhost
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=admin123
set ADMIN_NOMBRE=Administrador
set ADMIN_EMAIL=admin@hospital.cl

echo Configuración por defecto:
echo   Base de datos: %DB_NAME% en %DB_HOST%:%DB_PORT%
echo   Usuario DB: %DB_USER%
echo   Contraseña DB: %DB_PASSWORD%
echo   Usuario admin: %ADMIN_USERNAME% / %ADMIN_PASSWORD%
echo.
set /p CONTINUAR="¿Continuar con esta configuración? (S/N): "
if /i not "%CONTINUAR%"=="S" (
    echo Instalación cancelada. Ejecuta instalar.bat para configuración personalizada.
    pause
    exit /b 0
)
echo.

:: Verificar Node.js
echo [1/6] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado
    pause
    exit /b 1
)
echo ✅ Node.js encontrado
echo.

:: Verificar PostgreSQL
echo [2/6] Verificando PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL no está en el PATH
    pause
    exit /b 1
)
echo ✅ PostgreSQL encontrado
echo.

:: Instalar dependencias
echo [3/6] Instalando dependencias del frontend...
if not exist "node_modules" (
    call npm install --silent
)
echo ✅ Frontend listo

echo [3/6] Instalando dependencias del backend...
cd server
if not exist "node_modules" (
    call npm install --silent
)
cd ..
echo ✅ Backend listo
echo.

:: Crear archivos de configuración
echo [4/6] Creando archivos de configuración...
(
echo DB_HOST=%DB_HOST%
echo DB_PORT=%DB_PORT%
echo DB_NAME=%DB_NAME%
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASSWORD%
echo PORT=%SERVER_PORT%
echo CORS_ORIGIN=http://%FRONTEND_IP%:5173,http://%FRONTEND_IP%:3000,http://localhost:5173,http://localhost:3000
echo CLEAR_TABLE=false
echo ADMIN_USERNAME=%ADMIN_USERNAME%
echo ADMIN_PASSWORD=%ADMIN_PASSWORD%
echo ADMIN_NOMBRE=%ADMIN_NOMBRE%
echo ADMIN_EMAIL=%ADMIN_EMAIL%
) > server\.env

(
echo VITE_API_URL=http://localhost:%SERVER_PORT%/api
) > .env.local

echo ✅ Archivos de configuración creados
echo.

:: Crear base de datos
echo [5/6] Creando base de datos...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Base de datos creada
) else (
    echo ⚠️ Base de datos ya existe o error al crearla
)
echo.

:: Ejecutar migraciones
echo [6/6] Ejecutando migraciones...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrations\schema.sql >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrations\users.sql >nul 2>&1
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f migrations\add_correlativo_creado_por.sql >nul 2>&1
echo ✅ Migraciones ejecutadas
echo.

:: Crear usuario administrador
cd server
set PGPASSWORD=%DB_PASSWORD%
call npm run create-admin >nul 2>&1
cd ..
echo ✅ Usuario administrador creado
echo.

echo ========================================
echo  INSTALACIÓN COMPLETADA
echo ========================================
echo.
echo Para iniciar:
echo   Backend:  cd server ^&^& npm start
echo   Frontend: npm run dev
echo.
pause
