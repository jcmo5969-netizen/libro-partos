import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/connection.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol ADMIN
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/usuarios
 * Obtener todos los usuarios (solo ADMIN)
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, nombre_completo, email, rol, activo, created_at, updated_at, last_login FROM usuarios ORDER BY created_at DESC'
    );

    const usuarios = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      nombreCompleto: row.nombre_completo,
      email: row.email,
      rol: row.rol,
      activo: row.activo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login
    }));

    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error al obtener los usuarios', details: error.message });
  }
});

/**
 * GET /api/usuarios/:id
 * Obtener un usuario por ID (solo ADMIN)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, username, nombre_completo, email, rol, activo, created_at, updated_at, last_login FROM usuarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      nombreCompleto: user.nombre_completo,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error al obtener el usuario', details: error.message });
  }
});

/**
 * POST /api/usuarios
 * Crear un nuevo usuario (solo ADMIN)
 */
router.post('/', async (req, res) => {
  try {
    const { username, password, nombreCompleto, email, rol } = req.body;

    if (!username || !password || !nombreCompleto) {
      return res.status(400).json({ error: 'Usuario, contraseña y nombre completo son requeridos' });
    }

    // Validar rol
    if (rol && !['ADMIN', 'USUARIO'].includes(rol)) {
      return res.status(400).json({ error: 'Rol debe ser ADMIN o USUARIO' });
    }

    // Verificar que el username no exista
    const existingUser = await pool.query(
      'SELECT id FROM usuarios WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const result = await pool.query(
      'INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, nombre_completo, email, rol, activo, created_at',
      [username, passwordHash, nombreCompleto, email || null, rol || 'USUARIO']
    );

    const newUser = result.rows[0];
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      nombreCompleto: newUser.nombre_completo,
      email: newUser.email,
      rol: newUser.rol,
      activo: newUser.activo,
      createdAt: newUser.created_at
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario', details: error.message });
  }
});

/**
 * PUT /api/usuarios/:id
 * Actualizar un usuario (solo ADMIN)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, nombreCompleto, email, rol, activo } = req.body;

    // Verificar que el usuario existe
    const existingUser = await pool.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar rol si se proporciona
    if (rol && !['ADMIN', 'USUARIO'].includes(rol)) {
      return res.status(400).json({ error: 'Rol debe ser ADMIN o USUARIO' });
    }

    // Verificar que el username no esté en uso por otro usuario
    if (username) {
      const usernameCheck = await pool.query(
        'SELECT id FROM usuarios WHERE username = $1 AND id != $2',
        [username, id]
      );

      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
    }

    // Construir query de actualización dinámicamente
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (username) {
      paramCount++;
      updates.push(`username = $${paramCount}`);
      values.push(username);
    }

    if (password) {
      paramCount++;
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount}`);
      values.push(passwordHash);
    }

    if (nombreCompleto) {
      paramCount++;
      updates.push(`nombre_completo = $${paramCount}`);
      values.push(nombreCompleto);
    }

    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email || null);
    }

    if (rol) {
      paramCount++;
      updates.push(`rol = $${paramCount}`);
      values.push(rol);
    }

    if (activo !== undefined) {
      paramCount++;
      updates.push(`activo = $${paramCount}`);
      values.push(activo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, nombre_completo, email, rol, activo, updated_at`;
    const result = await pool.query(query, values);

    const updatedUser = result.rows[0];
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      nombreCompleto: updatedUser.nombre_completo,
      email: updatedUser.email,
      rol: updatedUser.rol,
      activo: updatedUser.activo,
      updatedAt: updatedUser.updated_at
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario', details: error.message });
  }
});

/**
 * DELETE /api/usuarios/:id
 * Eliminar un usuario (solo ADMIN)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar el propio usuario
    if (id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente', id: result.rows[0].id });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error al eliminar el usuario', details: error.message });
  }
});

export default router;

