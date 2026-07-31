// PM2: ejecutar desde la carpeta server/ con: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'libro-partos-api',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3003,
      // Secretos SOLO desde variables de entorno del servidor (nunca en el repo).
      // Defina JWT_SECRET (>=32 bytes aleatorios) en el entorno del proceso antes
      // de arrancar PM2. Sin fallbacks embebidos.
      JWT_SECRET: process.env.JWT_SECRET,
      ENABLE_HSTS: '0',
      // Antes: CORS_ALLOW_PRIVATE_NETWORK='1' aceptaba con credentials:true
      // cualquier origen de TODA la red privada (10.0.0.0/8, 172.16.0.0/12,
      // 192.168.0.0/16), no solo el frontend real. Se acota al origen conocido
      // (ver VITE_API_URL en ecosystem.frontend.cjs). Si existe otro origen LAN
      // legítimo que dependía del wildcard, agrégalo aquí separado por comas en
      // vez de volver a poner CORS_ALLOW_PRIVATE_NETWORK en '1'.
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://10.69.204.49:3002',
      CORS_ALLOW_PRIVATE_NETWORK: '0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
