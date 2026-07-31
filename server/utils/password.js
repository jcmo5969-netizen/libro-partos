/**
 * Política de contraseñas centralizada (auth.js y usuarios.js la comparten para
 * no duplicar/desincronizar la regla). Prioriza longitud sobre complejidad forzada
 * (alineado con NIST 800-63B) y bloquea los valores triviales más obvios.
 */
const MIN_LENGTH = 10;

const DENYLIST = new Set([
  'password',
  'contraseña',
  'contrasena',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyui',
  'matrona1',
  'hospital1',
]);

/** Devuelve un mensaje de error si la contraseña no cumple la política, o null si es válida. */
export function validatePassword(password, { username } = {}) {
  if (typeof password !== 'string' || password.length < MIN_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_LENGTH} caracteres`;
  }
  const normalized = password.toLowerCase();
  if (DENYLIST.has(normalized)) {
    return 'Esa contraseña es demasiado común/predecible. Elige otra.';
  }
  if (username && normalized === String(username).toLowerCase()) {
    return 'La contraseña no puede ser igual al nombre de usuario';
  }
  return null;
}
