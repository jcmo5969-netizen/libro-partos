import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { testConnection } from './db/connection.js';
import partosRouter from './routes/partos.js';
import authRouter from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración CORS
const corsOptions = {
  origin: function (origin, callback) {
    // En producción, no permitir requests sin origen
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('No permitido por CORS'));
    }
    
    // Permitir requests sin origen en desarrollo (Postman, curl, etc.)
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Obtener orígenes permitidos desde variables de entorno o usar lista por defecto
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    // En desarrollo, permitir cualquier origen local (IP privada o localhost)
    const isLocalOrigin = process.env.NODE_ENV !== 'production' && (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) || // IPs privadas clase A (10.0.0.0/8)
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) || // IPs privadas clase C (192.168.0.0/16)
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin) // IPs privadas clase B (172.16.0.0/12)
    );
    
    if (allowedOrigins.includes(origin) || isLocalOrigin) {
      console.log(`✅ CORS permitido para: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqueado para origen: ${origin}`);
      console.log(`   Orígenes permitidos: ${allowedOrigins.join(', ')}`);
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

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Logging de requests para debugging CORS
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`🔍 Preflight request: ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  } else {
    console.log(`📥 Request: ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  }
  next();
});

// Health check
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz de la API - Información de endpoints
app.get('/api', (req, res) => {
  res.json({
    message: 'API del Sistema de Libro de Partos',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      partos: {
        list: 'GET /api/partos',
        count: 'GET /api/partos/count',
        getById: 'GET /api/partos/:id',
        create: 'POST /api/partos',
        update: 'PUT /api/partos/:id',
        delete: 'DELETE /api/partos/:id'
      }
    },
    documentation: 'Ver README.md o MIGRATION.md para más información'
  });
});

// Rutas API públicas (autenticación)
app.use('/api/auth', authRouter);

// Rutas API protegidas (requieren autenticación)
app.use('/api/partos', authenticateToken, partosRouter);
app.use('/api/usuarios', usuariosRouter);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
  console.log(`🌐 Servidor accesible desde la red en todas las interfaces (0.0.0.0:${PORT})`);
  
  // Probar conexión a la base de datos
  await testConnection();
});

export default app;

