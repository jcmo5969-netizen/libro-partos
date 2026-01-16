@echo off
chcp 65001 >nul
echo ========================================
echo   INSTALACIÓN LIBRO DE PARTOS
echo ========================================
echo.

REM Verificar si Node.js está instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado.
    echo Por favor, instala Node.js desde https://nodejs.org/
    echo Versión recomendada: Node.js 18 o superior
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node --version

REM Verificar si PostgreSQL está instalado
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] PostgreSQL no está en el PATH.
    echo Asegúrate de que PostgreSQL esté instalado y agregado al PATH del sistema.
    echo.
    echo Si PostgreSQL está instalado pero no en el PATH, puedes:
    echo 1. Agregar la ruta de PostgreSQL al PATH del sistema
    echo 2. O ejecutar setup-database.bat manualmente desde pgAdmin
    echo.
    pause
)

echo.
echo ========================================
echo   PASO 1: Instalación de dependencias
echo ========================================
echo.

call install-dependencies.bat
if %errorlevel% neq 0 (
    echo [ERROR] Falló la instalación de dependencias
    pause
    exit /b 1
)

echo.
echo ========================================
echo   PASO 2: Configuración de Base de Datos
echo ========================================
echo.

call setup-database.bat
if %errorlevel% neq 0 (
    echo [ERROR] Falló la configuración de la base de datos
    pause
    exit /b 1
)

echo.
echo ========================================
echo   PASO 3: Crear usuario administrador
echo ========================================
echo.

cd server
call npm run create-admin
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] No se pudo crear el usuario administrador automáticamente
    echo Puedes crearlo manualmente ejecutando: cd server ^&^& npm run create-admin
)
cd ..

echo.
echo ========================================
echo   INSTALACIÓN COMPLETADA
echo ========================================
echo.
echo Próximos pasos:
echo 1. Configura el archivo server\.env con tus credenciales de PostgreSQL
echo 2. Inicia el backend: cd server ^&^& npm start
echo 3. Inicia el frontend: npm run dev
echo.
echo Para más información, consulta el archivo README.md
echo.
pause
