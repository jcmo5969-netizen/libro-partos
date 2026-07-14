import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/connection.js';
import { signToken, verifyToken, authenticateToken } from '../middleware/auth.js';
import { sendError } from '../utils/httpError.js';

const router = express.Router();

// Opciones de la cookie httpOnly que transporta el JWT.
// `secure` se activa con COOKIE_SECURE=1 (requiere HTTPS); mantener en 0 mientras
// el despliegue sea HTTP en LAN, o el navegador no enviará la cookie.
const TOKEN_COOKIE = 'token';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === '1',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  path: '/',
};

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Buscar usuario
    const result = await pool.query(
      'SELECT id, username, password_hash, nombre_completo, email, rol, activo, must_change_password FROM usuarios WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = result.rows[0];

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo. Contacte al administrador' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Actualizar último inicio de sesión
    await pool.query(
      'UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generar token JWT (firma encapsulada en middleware/auth.js).
    const token = signToken({ userId: user.id, username: user.username, rol: user.rol });

    // JWT en cookie httpOnly: no accesible desde JavaScript (mitiga robo por XSS).
    res.cookie(TOKEN_COOKIE, token, cookieOptions);

    // Se mantiene `token` en el cuerpo por compatibilidad; el frontend web ya no lo
    // almacena en localStorage (usa la cookie). Útil para clientes no-navegador.
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nombreCompleto: user.nombre_completo,
        email: user.email,
        rol: user.rol,
        mustChangePassword: user.must_change_password === true,
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    console.error('Stack trace:', error.stack);
    // Verificar si es un error de conexión a la base de datos
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(500).json({ 
        error: 'Error de conexión a la base de datos', 
        details: 'No se pudo conectar al servidor de base de datos. Verifique la configuración.' 
      });
    }
    // Verificar si es un error de tabla no encontrada
    if (error.code === '42P01') {
      return res.status(500).json({ 
        error: 'Tabla no encontrada', 
        details: 'La tabla usuarios no existe. Ejecute las migraciones de la base de datos.' 
      });
    }
    return sendError(res, 500, 'Error al iniciar sesión', error);
  }
});

/**
 * POST /api/auth/logout
 * Cerrar sesión (el cliente debe eliminar el token)
 */
router.post('/logout', (req, res) => {
  // Eliminar la cookie httpOnly del token (mismas opciones que al crearla).
  res.clearCookie(TOKEN_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Sesión cerrada exitosamente' });
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = verifyToken(token);

    const result = await pool.query(
      'SELECT id, username, nombre_completo, email, rol, activo, must_change_password FROM usuarios WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      nombreCompleto: user.nombre_completo,
      email: user.email,
      rol: user.rol,
      mustChangePassword: user.must_change_password === true,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expirado' });
    }
    return sendError(res, 500, 'Error al verificar usuario', error);
  }
});

/**
 * POST /api/auth/change-password
 * Cambiar la contraseña del usuario autenticado (obligatorio en el primer acceso).
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
    }

    const result = await pool.query(
      'SELECT id, password_hash FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE usuarios SET password_hash = $1, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({
      message: 'Contraseña actualizada correctamente',
      user: {
        id: req.user.id,
        username: req.user.username,
        nombreCompleto: req.user.nombre_completo,
        email: req.user.email,
        rol: req.user.rol,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    return sendError(res, 500, 'Error al cambiar la contraseña', error);
  }
});

export default router;

