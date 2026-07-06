// PM2 para el FRONTEND endurecido (sirve dist/ con cabeceras de seguridad).
// Ejecutar desde la carpeta libro-partos/ con:  pm2 start ecosystem.frontend.cjs
// (El backend usa server/ecosystem.config.cjs por separado.)
module.exports = {
  apps: [{
    name: 'libro-partos-frontend',
    script: './serve-frontend.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      FRONTEND_PORT: 3002,
      // Necesario para que el Content-Security-Policy (connect-src) permita
      // que el navegador llame a la API. Debe coincidir con VITE_API_URL del build.
      VITE_API_URL: 'http://10.69.204.49:3003/api',
      // Ya NO se necesita permitir Google en el CSP: la IA pasa por el backend.
      // (El navegador solo habla con 'self' y la API.)
      // HSTS desactivado: el sitio se sirve por HTTP en la LAN (no HTTPS).
      VITE_ENABLE_HSTS: '0',
    },
    error_file: './logs/frontend-err.log',
    out_file: './logs/frontend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
  }],
};
