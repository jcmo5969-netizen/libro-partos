import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { Pool } = pg;

// M10: en producción no se permiten credenciales de BD por defecto ni vacías.
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error(
      'DB_USER y DB_PASSWORD son obligatorias en producción. Configure credenciales de BD explícitas.'
    );
  }
}

// SSL deshabilitado por defecto (compatible con Postgres local/loopback sin TLS
// configurado). Si la BD corre en otro host de la LAN, definir DB_SSL=1 (y
// DB_SSL_REJECT_UNAUTHORIZED=0 solo si el certificado no es verificable).
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'libro_partos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl:
    process.env.DB_SSL === '1'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== '0' }
      : undefined,
});

// Manejar errores del pool
pool.on('error', (err, client) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
  process.exit(-1);
});

// Función para probar la conexión
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
}

export default pool;

