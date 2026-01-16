# 🚀 Guía de Deployment a Producción - Libro de Partos

## 📋 Pre-requisitos

- Servidor con Node.js v18+ instalado
- PostgreSQL 14+ (local o remoto)
- Dominio con SSL/TLS (certificado HTTPS)
- Servidor web (Nginx o Apache) para servir el frontend
- PM2 o similar para mantener el backend corriendo

---

## FASE 1: Preparación de la Base de Datos

### 1.1 Crear Base de Datos de Producción

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear usuario y base de datos
CREATE USER libro_partos_user WITH PASSWORD 'contraseña_segura_aquí';
CREATE DATABASE libro_partos_prod OWNER libro_partos_user;

# Dar permisos
GRANT ALL PRIVILEGES ON DATABASE libro_partos_prod TO libro_partos_user;

# Conectarse a la nueva base de datos
\c libro_partos_prod

# Habilitar extensión UUID (necesaria para el schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 1.2 Ejecutar Migraciones

```bash
cd server
npm run migrate
```

### 1.3 Crear Usuario Administrador

```bash
npm run create-admin
```

### 1.4 Backup de Datos (si migras desde desarrollo)

```bash
# Exportar desde desarrollo
pg_dump -U postgres libro_partos > backup_desarrollo.sql

# Importar a producción
psql -U libro_partos_user -d libro_partos_prod < backup_desarrollo.sql
```

---

## FASE 2: Configuración del Backend

### 2.1 Variables de Entorno

Crear archivo `.env` en `server/`:

```env
NODE_ENV=production
PORT=5000

# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=libro_partos_prod
DB_USER=libro_partos_user
DB_PASSWORD=tu_contraseña_segura

# JWT Secret (generar uno nuevo)
JWT_SECRET=tu_secret_jwt_super_seguro_de_al_menos_64_caracteres

# CORS (tu dominio de producción)
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com
```

**Generar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.2 Instalar Dependencias de Producción

```bash
cd server
npm ci --production
```

### 2.3 Instalar PM2 (Process Manager)

```bash
npm install -g pm2
```

### 2.4 Crear archivo de configuración PM2

Crear `server/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'libro-partos-api',
    script: './server.js',
    instances: 2, // Ajustar según CPU disponible
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
```

### 2.5 Configuración de Red (Importante para Acceso LAN)

⚠️ **IMPORTANTE**: El servidor está configurado para escuchar en `0.0.0.0`, lo que permite conexiones desde otras computadoras en la red local.

**En desarrollo local (Windows):**

Si otras computadoras no pueden acceder al backend:

1. **Verificar el Firewall de Windows:**
```powershell
# Ejecutar PowerShell como Administrador y agregar regla:
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

2. **Obtener tu dirección IP local:**
```powershell
ipconfig
# Buscar "IPv4 Address" en tu adaptador de red (ej: 192.168.1.100)
```

3. **Acceder desde otras computadoras:**
- Backend: `http://TU_IP:5000/api`
- Ejemplo: `http://192.168.1.100:5000/api`

### 2.6 Iniciar Backend con PM2

```bash
# Crear carpeta de logs
mkdir -p logs

# Iniciar aplicación
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs libro-partos-api

# Configurar PM2 para iniciar al arrancar el servidor
pm2 startup
pm2 save
```

---

## FASE 3: Configuración del Frontend

### 3.1 Configurar URL del API

Crear archivo `src/config.js`:

```javascript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const IS_PRODUCTION = import.meta.env.PROD;
```

### 3.2 Actualizar servicios para usar la configuración

Modificar `src/services/apiService.js` y `src/services/authService.js` para usar:

```javascript
import { API_URL } from '../config';

// Usar API_URL en lugar de localhost hardcodeado
const response = await fetch(`${API_URL}/api/partos`, ...);
```

### 3.3 Crear archivo `.env.production`

En la raíz del proyecto:

```env
VITE_API_URL=https://api.tudominio.com
```

### 3.4 Build de Producción

```bash
# Instalar dependencias
npm ci

# Crear build optimizado
npm run build

# El resultado estará en la carpeta /dist
```

### 3.5 Probar Build Localmente

```bash
npm run preview
```

---

## FASE 4: Configuración del Servidor Web (Nginx)

### 4.1 Instalar Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 4.2 Configurar Nginx

Crear `/etc/nginx/sites-available/libro-partos`:

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    return 301 https://$server_name$request_uri;
}

# Frontend (HTTPS)
server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    # Certificados SSL (usar Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    # Configuración SSL segura
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Raíz del proyecto (build de React)
    root /var/www/libro-partos/dist;
    index index.html;

    # Comprimir assets
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css text/javascript application/javascript application/json;

    # Cache para assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA: todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}

# Backend API (HTTPS)
server {
    listen 443 ssl http2;
    server_name api.tudominio.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/api.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tudominio.com/privkey.pem;

    # Proxy al backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4.3 Habilitar Sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/libro-partos /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### 4.4 Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificados
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
sudo certbot --nginx -d api.tudominio.com

# Renovación automática (ya viene configurada)
sudo certbot renew --dry-run
```

---

## FASE 5: Deployment del Frontend

### 5.1 Copiar archivos al servidor

```bash
# Desde tu máquina local
scp -r dist/* usuario@servidor:/var/www/libro-partos/dist/
```

O usar Git en el servidor:

```bash
# En el servidor
cd /var/www/libro-partos
git pull origin main
npm ci
npm run build
```

### 5.2 Configurar permisos

```bash
sudo chown -R www-data:www-data /var/www/libro-partos/dist
sudo chmod -R 755 /var/www/libro-partos/dist
```

---

## FASE 6: Seguridad

### 6.1 Firewall

```bash
# Permitir solo puertos necesarios
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 6.2 PostgreSQL

```bash
# Editar configuración
sudo nano /etc/postgresql/14/main/postgresql.conf

# Cambiar:
listen_addresses = 'localhost'

# Si DB está en otro servidor, configurar SSL
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
```

### 6.3 Backups Automáticos

Crear script `/home/usuario/backup-db.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/libro-partos"
DB_NAME="libro_partos_prod"
DB_USER="libro_partos_user"

mkdir -p $BACKUP_DIR

# Backup con compresión
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Mantener solo los últimos 30 días
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completado: backup_$DATE.sql.gz"
```

Agregar a crontab:

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2 AM)
0 2 * * * /home/usuario/backup-db.sh
```

---

## FASE 7: Monitoreo

### 7.1 Monitorear PM2

```bash
# Ver procesos
pm2 status

# Ver logs en tiempo real
pm2 logs libro-partos-api --lines 100

# Ver métricas
pm2 monit

# Reiniciar si hay problemas
pm2 restart libro-partos-api
```

### 7.2 Logs de Nginx

```bash
# Errores
sudo tail -f /var/log/nginx/error.log

# Accesos
sudo tail -f /var/log/nginx/access.log
```

### 7.3 Logs de PostgreSQL

```bash
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## FASE 8: Mantenimiento

### 8.1 Actualizar Aplicación

```bash
# Backend
cd /var/www/libro-partos/server
git pull
npm ci --production
pm2 restart libro-partos-api

# Frontend
cd /var/www/libro-partos
git pull
npm ci
npm run build
```

### 8.2 Actualizar Dependencias

```bash
# Revisar vulnerabilidades
npm audit

# Actualizar
npm update

# Actualizar package.json y reinstalar
npm install
```

---

## 📝 Checklist Final

- [ ] Base de datos creada y migrada
- [ ] Usuario administrador creado
- [ ] Variables de entorno configuradas
- [ ] Backend corriendo con PM2
- [ ] Frontend construido y desplegado
- [ ] Nginx configurado con SSL
- [ ] Firewall configurado
- [ ] Backups automáticos configurados
- [ ] Logs monitoreados
- [ ] CORS configurado correctamente
- [ ] Pruebas de login funcionando
- [ ] Todas las funcionalidades probadas

---

## 🆘 Troubleshooting

### Backend no responde desde otras computadoras

**Problema:** El frontend carga pero el backend no responde desde otra PC en la red.

**Soluciones:**

1. **Verificar que el servidor escucha en 0.0.0.0:**
```bash
# En el servidor, verificar:
netstat -ano | findstr :5000
# Debe mostrar: 0.0.0.0:5000 (no 127.0.0.1:5000)
```

2. **Configurar Firewall de Windows:**
```powershell
# PowerShell como Administrador:
New-NetFirewallRule -DisplayName "Node.js Backend Port 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

3. **Verificar acceso desde otra PC:**
```bash
# Desde otra computadora:
curl http://IP_DEL_SERVIDOR:5000/health
# O abrir en navegador: http://IP_DEL_SERVIDOR:5000/health
```

4. **Actualizar la URL del API en el frontend:**
- Editar `src/config.js` para usar la IP del servidor en lugar de localhost
- O configurar variable de entorno `VITE_API_URL`

### Backend no inicia

```bash
pm2 logs libro-partos-api --err
# Revisar errores de conexión a DB o variables de entorno
```

### Error de CORS

Verificar que `CORS_ORIGIN` en `.env` incluya tu dominio:
```env
CORS_ORIGIN=https://tudominio.com
```

### Base de datos no conecta

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Probar conexión manual
psql -h localhost -U libro_partos_user -d libro_partos_prod
```

### SSL no funciona

```bash
# Renovar certificados
sudo certbot renew --force-renewal

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 📞 Contacto y Soporte

Para problemas o dudas, revisar logs y documentación del sistema.

