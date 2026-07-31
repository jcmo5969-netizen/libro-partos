import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no definido. Definir la variable de entorno JWT_SECRET antes de iniciar en producción.');
  }
  console.warn('⚠️  JWT_SECRET no definido. Usar solo en desarrollo local.');
}
// M11: el secreto queda ENCAPSULADO en este módulo. No se exporta; el resto del
// código firma/verifica a través de signToken()/verifyToken().
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** Firma un JWT con el secreto y expiración configurados. */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/** Verifica un JWT y devuelve el payload decodificado (lanza si es inválido/expirado). */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Middleware para verificar el token JWT
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Token desde la cookie httpOnly (preferente) o el header Authorization (compatibilidad).
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]); // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = verifyToken(token);

    // Verificar que el usuario existe y está activo
    const result = await pool.query(
      'SELECT id, username, nombre_completo, email, rol, activo, must_change_password, token_version FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    // Permite revocar sesiones ya emitidas (p. ej. tras un cambio de contraseña)
    // sin esperar a que el JWT expire por su cuenta. Tokens emitidos antes de
    // este mecanismo no llevan tokenVersion; se tratan como versión 0.
    const user = result.rows[0];
    if ((decoded.tokenVersion || 0) !== user.token_version) {
      return res.status(401).json({ error: 'Sesión inválida o revocada. Inicia sesión nuevamente.' });
    }

    // Agregar información del usuario al request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expirado' });
    }
    console.error('Error en autenticación:', error);
    return res.status(500).json({ error: 'Error en la autenticación' });
  }
};

/**
 * Middleware para verificar que el usuario es ADMIN
 */
/**
 * Bloquea el acceso a rutas protegidas hasta que el usuario cambie su contraseña.
 */
export const requirePasswordChanged = (req, res, next) => {
  if (req.user?.must_change_password) {
    return res.status(403).json({
      error: 'Debe cambiar su contraseña antes de continuar',
      code: 'MUST_CHANGE_PASSWORD',
    });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  if (req.user.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de ADMIN' });
  }

  next();
};

