/**
 * Respuestas de error que NO filtran detalles internos en producción.
 *
 * El detalle técnico (mensaje del driver de BD, código, stack, que puede
 * contener nombres de columnas, SQL o incluso PHI en violaciones de unicidad)
 * se registra en el servidor pero solo se expone al cliente en desarrollo.
 */
const isDev = () => process.env.NODE_ENV !== 'production';

/**
 * @param {import('express').Response} res
 * @param {number} status Código HTTP.
 * @param {string} message Mensaje público, seguro para el cliente.
 * @param {Error} [error] Error interno (se loguea; solo se expone en dev).
 */
export function sendError(res, status, message, error) {
  if (error) {
    console.error(`[HTTP ${status}] ${message}:`, error.message);
  }
  const body = { error: message };
  if (isDev() && error) {
    body.details = error.message;
    if (error.code) body.code = error.code;
  }
  return res.status(status).json(body);
}
