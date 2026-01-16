module.exports = {
  apps: [{
    name: 'libro-partos-api',
    script: './server.js',
    instances: 2, // Ajustar según CPU disponible (usar 'max' para usar todas las CPUs)
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
    max_memory_restart: '500M',
    // Estrategia de restart
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

