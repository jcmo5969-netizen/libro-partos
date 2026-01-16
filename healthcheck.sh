#!/bin/bash

# Script de Health Check para Libro de Partos
# Uso: ./healthcheck.sh [url-api]

API_URL=${1:-"http://localhost:5000"}
HEALTH_ENDPOINT="$API_URL/health"

echo "🏥 Verificando estado del sistema..."
echo "API: $HEALTH_ENDPOINT"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar que el backend responda
echo -n "Backend (API): "
if curl -s -f -o /dev/null "$HEALTH_ENDPOINT"; then
    echo -e "${GREEN}✓ OK${NC}"
    
    # Obtener detalles
    RESPONSE=$(curl -s "$HEALTH_ENDPOINT")
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ ERROR${NC}"
    echo "El backend no está respondiendo"
    exit 1
fi

echo ""

# 2. Verificar PostgreSQL (si PM2 está instalado)
if command -v pm2 &> /dev/null; then
    echo -n "PM2 (Backend Process): "
    if pm2 list | grep -q "libro-partos-api.*online"; then
        echo -e "${GREEN}✓ OK${NC}"
        pm2 describe libro-partos-api | grep -E "status|uptime|restarts"
    else
        echo -e "${RED}✗ ERROR${NC}"
        echo "El proceso no está corriendo en PM2"
    fi
    echo ""
fi

# 3. Verificar Nginx (si está instalado)
if command -v nginx &> /dev/null; then
    echo -n "Nginx: "
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ ERROR${NC}"
        echo "Nginx no está corriendo"
    fi
    echo ""
fi

# 4. Verificar PostgreSQL
echo -n "PostgreSQL: "
if systemctl is-active --quiet postgresql 2>/dev/null || pgrep -x postgres > /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${YELLOW}? No se pudo verificar${NC}"
fi

echo ""
echo "✅ Health check completado"

