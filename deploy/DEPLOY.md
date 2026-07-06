# Guía de despliegue — Libro de Partos

Pasos para subir esta versión al servidor. Ver también `SECURITY-DEPLOYMENT.md`
(HTTPS/HSTS, cifrado en reposo) y `deploy/Caddyfile` / `deploy/nginx.conf`.

## Requisitos
- Node.js ≥ 20.19 (probado en 26.x).
- PostgreSQL accesible con las credenciales del `.env`.
- PM2 para el backend (opcional pero recomendado).

## 1. Configurar el entorno (una vez)
```bash
cp .env.example .env
# Edita .env y rellena: DB_*, JWT_SECRET (genéralo), CORS_ORIGIN, VITE_API_URL.
# Genera el JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
> El backend NO arranca en producción si faltan `DB_USER`/`DB_PASSWORD`/`JWT_SECRET` (protección intencional).

## 2. Instalar dependencias (cambió el toolchain: Vite 8, cookie-parser, express-rate-limit)
```bash
npm install                 # raíz (frontend)
npm --prefix server install # backend
```

## 3. Compilar el frontend
```bash
npm run build               # genera dist/
```

## 4. QA en navegador (OBLIGATORIO — nuevo bundler rolldown/oxc de Vite 8)
Sirve el build y prueba manualmente antes de exponerlo:
```bash
npm run serve               # sirve dist/ (serve-frontend.js)
```
Checklist mínimo: **login**, listar/crear/editar/borrar partos, filtros del dashboard,
gráficos y **export a Excel**. Confirma que no hay errores en la consola del navegador.

## 5. Arrancar / reiniciar el backend
```bash
cd server
pm2 start ecosystem.config.cjs   # primera vez
pm2 restart libro-partos-api     # despliegues siguientes
pm2 logs libro-partos-api        # verificar arranque
```
> Al rotar `JWT_SECRET`, todos los usuarios quedan deslogueados y entran con su nueva contraseña.

## 6. (Producción con HTTPS) tras poner el reverse proxy
En `.env`: `COOKIE_SECURE=1`, `ENABLE_HSTS=1`, `TRUST_PROXY=1`, `HOST=127.0.0.1`; reinicia el backend.

## Notas
- Las migraciones de esquema corren solas al arrancar y son **aditivas** (no borran datos).
- `.env`, credenciales y `node_modules` NO se versionan (`.gitignore`).
