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
      CORS_ALLOW_PRIVATE_NETWORK: '1'
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
