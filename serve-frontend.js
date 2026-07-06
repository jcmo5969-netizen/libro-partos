/**
 * Servidor estático ENDURECIDO para el frontend (dist/) del Libro de Partos.
 *
 * Sirve la SPA aplicando cabeceras de seguridad en TODAS las respuestas y SIN
 * 'Access-Control-Allow-Origin: *'. Reemplaza a servidores estáticos genéricos
 * (http-server / serve) que dejaban el sitio sin cabeceras y con CORS abierto.
 *
 * Corrige los hallazgos del escaneo OWASP ZAP/Checkmarx sobre http://HOST:3002:
 *   - Falta Content-Security-Policy (Medio)
 *   - Configuración CORS incorrecta: Access-Control-Allow-Origin: * (Medio)
 *   - Falta cabecera Anti-Clickjacking / X-Frame-Options (Medio)
 *   - Falta X-Content-Type-Options: nosniff (Bajo)
 *
 * Uso:  NODE_ENV=production VITE_API_URL=http://10.69.204.49:3003/api node serve-frontend.js
 * PM2:  pm2 start ecosystem.frontend.cjs
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSecurityHeaders } from './vite.security.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = parseInt(process.env.FRONTEND_PORT || process.env.PORT || '3002', 10);
const HOST = process.env.FRONTEND_HOST || '0.0.0.0';

const app = express();
app.disable('x-powered-by');

// Cabeceras de seguridad en cada respuesta (CSP, X-Frame-Options, nosniff,
// Referrer-Policy, Permissions-Policy). El CSP se calcula desde vite.security.mjs
// usando VITE_API_URL para permitir las llamadas a la API (connect-src).
const securityHeaders = getSecurityHeaders();
app.use((req, res, next) => {
  for (const [name, value] of Object.entries(securityHeaders)) {
    res.setHeader(name, value);
  }
  next();
});

// Archivos estáticos. Los assets llevan hash en el nombre → caché larga e inmutable;
// index.html nunca se cachea para que los despliegues se vean al recargar.
app.use(
  express.static(DIST_DIR, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// SPA: cualquier ruta que no sea un archivo real devuelve index.html.
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`🔒 Frontend endurecido sirviendo: ${DIST_DIR}`);
  console.log(`🌐 Escuchando en http://${HOST}:${PORT}`);
});
