# Guía de seguridad y despliegue — Libro de Partos

Estado tras la remediación de la auditoría (informe `request.pdf`). Documenta lo que
**queda a cargo de infraestructura/operaciones** y no puede resolverse solo con código.

---

## 1. Variables de entorno requeridas en producción

Definir en el `.env` del servidor (o en el gestor de secretos), **nunca en el repo**:

| Variable | Descripción | Valor recomendado |
|----------|-------------|-------------------|
| `JWT_SECRET` | Secreto de firma JWT (≥32 bytes). | Aleatorio: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `ADMIN_PASSWORD` | Solo para (re)crear el admin. | Aleatoria; borrar tras el primer login |
| `NODE_ENV` | Modo. | `production` |
| `COOKIE_SECURE` | Cookie de sesión solo por HTTPS. | `1` **una vez haya HTTPS** (ver §3) |
| `ENABLE_HSTS` | Cabecera HSTS. | `1` **una vez haya HTTPS** |
| `TRUST_PROXY` | Leer IP real tras reverse proxy. | `1` si hay nginx/Caddy delante |
| `HOST` | Interfaz de escucha del backend. | `127.0.0.1` si hay proxy delante; `0.0.0.0` para LAN directa |
| `DB_USER` / `DB_PASSWORD` | Credenciales de BD (obligatorias en producción). | Valores explícitos (sin defaults) |
| `JWT_EXPIRES_IN` | Vigencia del token. | `7d` (reducir si se quiere menor ventana) |
| `CORS_ORIGIN` | Orígenes permitidos (coma-separados). | Orígenes explícitos del frontend |

> ⚠️ `COOKIE_SECURE=1` sin HTTPS hace que el navegador **no envíe la cookie** → el login
> deja de funcionar. Actívalo en el mismo paso que HTTPS.

---

## 2. H6 — Cifrado en reposo del PHI (pendiente de infraestructura)

Los campos sensibles (`nombre_y_apellido`, `rut`, `telefono`, `vih`, `comentarios`) están
en texto plano. En contexto sanitario chileno (Ley 19.628) se requiere cifrado en reposo.
**No se implementó cifrado a nivel de aplicación** porque rompería la búsqueda/deduplicación
por RUT (`rut_normalized`) y las agregaciones, y exige gestión de claves. Opciones, de mayor
a menor recomendación:

1. **Cifrado de volumen / TDE (recomendado).** Cifrar el disco del servidor PostgreSQL
   (LUKS en Linux, o cifrado del proveedor cloud). Transparente para la aplicación, no
   rompe consultas. Es la vía estándar para "encryption at rest".
2. **`pgcrypto` a nivel de columna.** Cifrar columnas concretas con `pgp_sym_encrypt`.
   Requiere reescribir lecturas/escrituras y **rompe** la búsqueda directa por esos campos;
   el RUT necesitaría un hash determinista aparte para buscar/deduplicar.
3. **Cifrado a nivel de aplicación.** Máximo control, máxima complejidad y riesgo; no
   recomendado para el estado actual del proyecto.

Además: definir política de **retención y minimización** de PHI y un procedimiento de
gestión de claves (KMS / secreto rotable).

---

## 3. P3 — HTTPS + HSTS con reverse proxy (pendiente de infraestructura)

Hoy el backend sirve HTTP en `:3003` en la LAN. Para exposición segura:

1. Poner un reverse proxy con TLS delante. Hay configs listas en `deploy/`:
   - **[deploy/Caddyfile](deploy/Caddyfile)** — TLS automático (Let's Encrypt).
   - **[deploy/nginx.conf](deploy/nginx.conf)** — nginx con certificado (certbot o institucional).
   Ajusta `server_name`/dominio y la ruta a `dist/`.
2. En el `.env`: `TRUST_PROXY=1`, `COOKIE_SECURE=1`, `ENABLE_HSTS=1`, `HOST=127.0.0.1`, `NODE_ENV=production`.
3. Reiniciar el backend. Verificar que el login funciona sobre HTTPS y que la cabecera
   `Strict-Transport-Security` aparece en las respuestas.

---

## 4. Retención y rotación de logs (P3)

PM2 persiste logs en `server/logs/`. Configurar rotación y retención acotada:
```
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```
Los logs ya **no** contienen payloads de partos ni `error.detail` (remediado en código),
pero conviene limitar su retención igualmente.

---

## 5. Verificación manual pendiente (navegador)

La migración a cookie `httpOnly` (M3) se probó en round-trip a nivel de servidor. Falta
verificar en un navegador real contra el despliegue:
- Login → la cookie `token` aparece como `HttpOnly` y **no** hay token en `localStorage`.
- Navegar/crear/editar/borrar partos funciona (las peticiones envían la cookie).
- Logout elimina la cookie.
- Tras habilitar HTTPS, repetir con `COOKIE_SECURE=1`.

---

## 6. Acciones externas ya señaladas (no automatizables)

- La integración con Google Gemini fue **eliminada** de la aplicación (ya no se envía
  PHI a terceros ni se gestionan claves de IA). No obstante, las 2 claves antiguas
  (`AIzaSyB9…LUNWM` y `AIzaSyA5…KBZGM`) siguen **activas en Google Cloud y en el historial
  de git**: revócalas igualmente para evitar abuso de cuota/facturación.
- Ejecutar el reseteo de contraseñas de cuentas USUARIO cuando se decida la ventana:
  `node server/scripts/resetMatronaPasswords.js --confirm`.
- Re-escaneo ZAP/Trivy y pentest externo contra el despliegue endurecido real.
