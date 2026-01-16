import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_super_seguro_cambiar_en_produccion';

/**
 * Middleware para verificar el token JWT
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const result = await pool.query(
      'SELECT id, username, nombre_completo, email, rol, activo FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    // Agregar información del usuario al request
    req.user = result.rows[0];
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
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  if (req.user.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de ADMIN' });
  }

  next();
};

export { JWT_SECRET };

