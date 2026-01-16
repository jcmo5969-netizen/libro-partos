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
 * Verifica si el usuario está autenticado
 */
export function isAuthenticated() {
  return !!getToken();
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
 * Inicia sesión
 */
export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
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
    setToken(data.token);
    setUser(data.user);
    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

/**
 * Cierra sesión
 */
export async function logout() {
  try {
    const token = getToken();
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
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
    const token = getToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
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
 * Obtiene el header de autorización para las peticiones
 */
export function getAuthHeader() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

