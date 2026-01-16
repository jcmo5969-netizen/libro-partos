/**
 * Servicio para gestionar usuarios (solo ADMIN)
 */

import { getAuthHeader } from './authService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Obtiene todos los usuarios
 */
export async function getUsuarios() {
  try {
    const response = await fetch(`${API_BASE_URL}/usuarios`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener los usuarios');
    }

    return await response.json();
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
}

/**
 * Crea un nuevo usuario
 */
export async function createUsuario(usuarioData) {
  try {
    const response = await fetch(`${API_BASE_URL}/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(usuarioData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear el usuario');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creando usuario:', error);
    throw error;
  }
}

/**
 * Actualiza un usuario
 */
export async function updateUsuario(id, usuarioData) {
  try {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(usuarioData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el usuario');
    }

    return await response.json();
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    throw error;
  }
}

/**
 * Elimina un usuario
 */
export async function deleteUsuario(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar el usuario');
    }

    return await response.json();
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    throw error;
  }
}

