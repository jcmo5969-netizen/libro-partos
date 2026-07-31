import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { testConnection } from './db/connection.js';
import { runAutoMigrations } from './db/autoMigrate.js';
import partosRouter from './routes/partos.js';
import authRouter from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import { authenticateToken, requirePasswordChanged } from './middleware/auth.js';
import { loginLimiter, apiLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

const PRIVATE_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;

app.disable('x-powered-by');

// Cabeceras tipo helmet (sin paquete helmet: evita ERR_MODULE_NOT_FOUND si falta npm install).
// CORP cross-origin: mismo criterio que helmet para API consumida desde otro origen (CORS).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), microphone=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_HSTS === '1') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Configuración CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin && process.env.NODE_ENV === 'production' && process.env.CORS_ALLOW_NO_ORIGIN !== '1') {
      return callback(new Error('No permitido por CORS'));
    }

    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (!origin) {
      return callback(null, true);
    }

    const fromEnv = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const defaultLocal = [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:5173',
    ];
    const allowedOrigins =
      fromEnv.length > 0 ? fromEnv : process.env.NODE_ENV !== 'production' ? defaultLocal : [];

    const allowPrivate =
      process.env.CORS_ALLOW_PRIVATE_NETWORK === '1' ||
      (process.env.NODE_ENV !== 'production' && process.env.CORS_ALLOW_PRIVATE_NETWORK !== '0');

    if (
      process.env.NODE_ENV === 'production' &&
      allowedOrigins.length === 0 &&
      !allowPrivate
    ) {
      console.error(
        'Producción: defina CORS_ORIGIN (origen del front) o CORS_ALLOW_PRIVATE_NETWORK=1 para LAN.'
      );
      return callback(new Error('No permitido por CORS'));
    }

    const isPrivateLan = allowPrivate && PRIVATE_ORIGIN_RE.test(origin);

    if (allowedOrigins.includes(origin) || isPrivateLan) {
      console.log(`✅ CORS permitido para: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueado para origen: ${origin}`);
      console.log(`   Orígenes permitidos: ${allowedOrigins.join(', ') || '(solo red privada en dev)'}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplicar CORS antes de cualquier otra ruta
app.use(cors(corsOptions));

// Manejar preflight requests explícitamente
app.options('*', cors(corsOptions));

// El formulario de parto es JSON de texto (sin adjuntos/archivos); 2mb es holgado
// y acota la superficie de DoS por payloads grandes frente al 10mb anterior.
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Logging de requests para debugging CORS — opt-in vía DEBUG_HTTP=1. Por defecto
// apagado: sin rotación de logs configurada en PM2, este log en cada request
// infla server/logs/ innecesariamente en operación normal.
if (process.env.DEBUG_HTTP === '1') {
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      console.log(`🔍 Preflight request: ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    } else {
      console.log(`📥 Request: ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    }
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ruta raíz de la API
app.get('/api', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Rutas API públicas (autenticación) — rate limit en login contra fuerza bruta.
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);

// Rutas API protegidas (requieren autenticación)
app.use('/api/partos', apiLimiter, authenticateToken, requirePasswordChanged, partosRouter);
app.use('/api/usuarios', apiLimiter, usuariosRouter);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const isCors = err?.message?.includes('CORS');
  const status = isCors ? 403 : 500;
  const body = {
    error: isCors ? 'Origen no permitido (CORS)' : 'Error interno del servidor',
  };
  if (process.env.NODE_ENV !== 'production') {
    body.message = err.message;
  }
  res.status(status).json(body);
});

// Iniciar servidor. Interfaz de escucha configurable (M5): por defecto 0.0.0.0
// (compatibilidad con acceso LAN). Detrás de un reverse proxy, usar HOST=127.0.0.1
// para no exponer el backend directamente en la red.
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, async () => {
  console.log(`🚀 Servidor iniciado en ${HOST}:${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
  if (HOST === '0.0.0.0') {
    console.log('🌐 Escuchando en TODAS las interfaces. Detrás de un proxy, define HOST=127.0.0.1.');
  }

  // Probar conexión a la base de datos
  const dbOk = await testConnection();

  // Ejecutar auto-migraciones idempotentes para garantizar que el esquema
  // esté alineado con el código (previene fallos al guardar partos por
  // columnas faltantes cuando se despliega nuevo código sin migrar la BD).
  if (dbOk) {
    try {
      await runAutoMigrations();
    } catch (error) {
      console.error('❌ Error en auto-migraciones:', error.message);
    }
  }
});

export default app;

