#!/bin/bash

# Script de deployment automático para Libro de Partos
# Uso: ./deploy.sh [produccion|staging]

set -e  # Salir si hay error

ENV=${1:-produccion}
echo "🚀 Iniciando deployment en entorno: $ENV"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}ADVERTENCIA:${NC} $1"
}

# 1. Verificar que estamos en la rama correcta
print_step "Verificando rama de Git..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    print_warning "No estás en la rama main/master (actual: $CURRENT_BRANCH)"
    read -p "¿Continuar de todas formas? (s/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# 2. Verificar que no hay cambios sin commitear
if [[ -n $(git status -s) ]]; then
    print_error "Hay cambios sin commitear"
    git status -s
    exit 1
fi

# 3. Pull de últimos cambios
print_step "Obteniendo últimos cambios..."
git pull origin $CURRENT_BRANCH

# 4. Backend - Instalar dependencias
print_step "Instalando dependencias del backend..."
cd server
npm ci --production

# 5. Backend - Ejecutar migraciones
print_step "Ejecutando migraciones de base de datos..."
npm run migrate || print_warning "Las migraciones fallaron o ya están aplicadas"

# 6. Backend - Reiniciar con PM2
print_step "Reiniciando backend con PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart libro-partos-api || pm2 start ecosystem.config.js
    pm2 save
else
    print_error "PM2 no está instalado. Instalar con: npm install -g pm2"
    exit 1
fi

# 7. Frontend - Volver a raíz y construir
cd ..
print_step "Instalando dependencias del frontend..."
npm ci

print_step "Construyendo frontend..."
npm run build

# 8. Verificar que el build fue exitoso
if [ ! -d "dist" ]; then
    print_error "El directorio dist no se creó. Build falló."
    exit 1
fi

# 9. Copiar archivos (ajustar ruta según tu servidor)
print_step "Archivos listos en ./dist"
print_warning "Recuerda copiar los archivos de ./dist a tu servidor web"
print_warning "Ejemplo: sudo cp -r dist/* /var/www/libro-partos/dist/"

# 10. Estado final
print_step "✅ Deployment completado"
echo ""
echo "📋 Verificaciones recomendadas:"
echo "  1. pm2 status"
echo "  2. pm2 logs libro-partos-api"
echo "  3. sudo systemctl status nginx"
echo "  4. Probar https://tudominio.com"
echo ""

