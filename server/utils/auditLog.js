import pool from '../db/connection.js';

/**
 * Registro de auditoría de acceso a PHI: quién, qué acción, sobre qué registro,
 * desde qué IP, cuándo. "Best effort" — un fallo al escribir el log nunca debe
 * bloquear la operación real sobre el parto, solo se reporta a consola.
 */
export async function logAudit(req, accion, partoId = null, detalle = null) {
  try {
    await pool.query(
      'INSERT INTO audit_log (usuario_id, username, accion, parto_id, detalle, ip) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user?.id || null, req.user?.username || null, accion, partoId, detalle, req.ip]
    );
  } catch (error) {
    console.error('⚠️ Error registrando auditoría:', error.message);
  }
}
