/**
 * Servicio para manejar la autenticación
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Obtiene el token almacenado en localStorage
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Guarda el token en localStorage
 */
export function setToken(token) {
  localStorage.setItem('token', token);
}

/**
 * Elimina el token de localStorage
 */
export function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Obtiene la información del usuario almacenada
 */
export function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Guarda la información del usuario
 */
export function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Verifica si el usuario está autenticado.
 * El JWT vive en una cookie httpOnly (no legible por JS); para gating de UI se usa
 * la presencia del objeto `user`. La autorización real la impone el servidor.
 */
export function isAuthenticated() {
  return !!getUser();
}

/**
 * Obtiene el rol del usuario actual
 */
export function getUserRole() {
  const user = getUser();
  return user ? user.rol : null;
}

/**
 * Verifica si el usuario es ADMIN
 */
export function isAdmin() {
  return getUserRole() === 'ADMIN';
}

/**
 * Indica si el usuario debe cambiar su contraseña antes de usar el sistema.
 */
export function needsPasswordChange() {
  const user = getUser();
  return user?.mustChangePassword === true;
}

/** Nombre para mostrar (trazabilidad de partos) */
export function getUserDisplayName() {
  const u = getUser();
  if (!u) return '';
  return (u.nombreCompleto || u.username || '').trim();
}

/**
 * Perfiles no admin (p. ej. USUARIO / matronería) solo pueden editar partos que ellos registraron.
 * Se considera propietario del registro al usuario que figura en `registradoPorUsername`
 * o, como respaldo para registros antiguos, al valor de `creadoPor`.
 * Registros sin ninguno de esos campos quedan solo para ADMIN.
 */
export function puedeEditarParto(parto) {
  if (!parto) return false;
  if (isAdmin()) return true;
  const user = getUser();
  if (!user?.username) return false;
  const owner =
    parto.registradoPorUsername ||
    parto.registrado_por_username ||
    parto.createdByUsername ||
    parto.creadoPor ||
    parto.creado_por;
  if (owner == null || owner === '') return false;
  return String(owner).toLowerCase() === String(user.username).toLowerCase();
}

export function puedeEliminarParto(parto) {
  return puedeEditarParto(parto);
}

/**
 * Inicia sesión
 */
export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al iniciar sesión');
    }

    const data = await response.json();
    // El JWT viaja en una cookie httpOnly puesta por el servidor; NO se almacena en localStorage.
    setUser(data.user);
    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

/**
 * Cambia la contraseña del usuario autenticado (primer acceso obligatorio).
 */
export async function changePassword(currentPassword, newPassword) {
  const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al cambiar la contraseña');
  }

  const data = await response.json();
  if (data.user) {
    setUser(data.user);
  }
  return data;
}

/**
 * Cierra sesión
 */
export async function logout() {
  try {
    // La cookie httpOnly se envía automáticamente; el servidor la elimina.
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error en logout:', error);
  } finally {
    removeToken();
  }
}

/**
 * Verifica el token y obtiene información del usuario actual
 */
export async function verifyToken() {
  try {
    // La cookie httpOnly se envía automáticamente; no se requiere token en JS.
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      removeToken();
      return null;
    }

    const user = await response.json();
    setUser(user);
    return user;
  } catch (error) {
    console.error('Error verificando token:', error);
    removeToken();
    return null;
  }
}

/**
 * Header de autorización. El JWT ahora viaja en una cookie httpOnly, por lo que
 * ya no se envía por header. Se mantiene (devolviendo {}) por compatibilidad con
 * los call sites que lo esparcen en sus `headers`. Usar siempre credentials:'include'.
 */
export function getAuthHeader() {
  return {};
}

