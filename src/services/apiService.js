/**
 * Servicio para comunicarse con la API REST del backend
 */

import { getAuthHeader } from './authService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Obtiene todos los partos con filtros opcionales
 */
export async function getPartos(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.tipoParto) queryParams.append('tipoParto', filters.tipoParto);
    if (filters.paridad) queryParams.append('paridad', filters.paridad);
    if (filters.mes) queryParams.append('mes', filters.mes);
    if (filters.comuna) queryParams.append('comuna', filters.comuna);
    if (filters.consultorio) queryParams.append('consultorio', filters.consultorio);
    if (filters.rut) queryParams.append('rut', filters.rut);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);
    
    const url = `${API_BASE_URL}/partos${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    console.log(`🔗 Intentando conectar a: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      // Agregar timeout
      signal: AbortSignal.timeout(10000) // 10 segundos timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP ${response.status}: ${errorText}`);
      throw new Error(`Error obteniendo partos: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Datos recibidos de la API: ${data.length} registros`);
    
    // Agregar campos de compatibilidad con el formato anterior
    return data.map(item => ({
      ...item,
      _traceId: item._traceId || item.traceId,
      fechaParto: item.fechaParto || item.fecha,
      horaParto: item.horaParto || item.hora,
      nombreYApellido: item.nombreYApellido || item.nombre,
      semanasGestacion: item.semanasGestacion || item.eg,
      tipoAnestesia: item.tipoAnestesia || item.tipoDeAnestesia,
      perimetroCefalico: item.perimetroCefalico || item.cc,
    }));
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('⏱️ Timeout al obtener partos (10s)');
      throw new Error('Timeout: El servidor no respondió a tiempo. Verifica que esté ejecutándose.');
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('🌐 Error de red al obtener partos:', error.message);
      throw new Error('No se pudo conectar con el servidor. Verifica que el servidor backend esté ejecutándose en http://localhost:5000');
    } else {
      console.error('❌ Error obteniendo partos:', error.message);
      throw error;
    }
  }
}

/**
 * Obtiene un parto por ID
 */
export async function getPartoById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/partos/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error obteniendo parto: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Agregar campos de compatibilidad
    return {
      ...data,
      _traceId: data._traceId || data.traceId,
      fechaParto: data.fechaParto || data.fecha,
      horaParto: data.horaParto || data.hora,
      nombreYApellido: data.nombreYApellido || data.nombre,
      semanasGestacion: data.semanasGestacion || data.eg,
      tipoAnestesia: data.tipoAnestesia || data.tipoDeAnestesia,
      perimetroCefalico: data.perimetroCefalico || data.cc,
    };
  } catch (error) {
    console.error('Error obteniendo parto:', error);
    throw error;
  }
}

/**
 * Crea un nuevo parto
 */
export async function createParto(partoData) {
  try {
    console.log('📤 Enviando datos al servidor:', JSON.stringify(partoData, null, 2));
    const response = await fetch(`${API_BASE_URL}/partos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(partoData),
    });
    
    const responseText = await response.text();
    console.log('📥 Respuesta del servidor:', response.status, responseText.substring(0, 500));
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: 'Error desconocido', details: responseText };
      }
      
      const errorMessage = errorData.details 
        ? `${errorData.error}: ${errorData.details}`
        : errorData.error || `Error creando parto: ${response.statusText}`;
      
      console.error('❌ Error del servidor:', errorData);
      throw new Error(errorMessage);
    }
    
    const data = JSON.parse(responseText);
    console.log('✅ Parto creado exitosamente:', data.id || data._traceId);
    return data;
  } catch (error) {
    console.error('❌ Error creando parto:', error);
    throw error;
  }
}

/**
 * Actualiza un parto existente
 */
export async function updateParto(id, partoData) {
  try {
    const response = await fetch(`${API_BASE_URL}/partos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(partoData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error actualizando parto: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error actualizando parto:', error);
    throw error;
  }
}

/**
 * Elimina un parto
 */
export async function deleteParto(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/partos/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error eliminando parto: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error eliminando parto:', error);
    throw error;
  }
}

/**
 * Obtiene el conteo total de partos
 */
export async function getPartosCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/partos/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error obteniendo conteo: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.total;
  } catch (error) {
    console.error('Error obteniendo conteo:', error);
    throw error;
  }
}

/**
 * Verifica el estado de la API
 */
export async function checkApiHealth() {
  try {
    const healthUrl = API_BASE_URL.replace('/api', '/health');
    console.log(`🔍 Verificando salud de API en: ${healthUrl}`);
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Agregar timeout
      signal: AbortSignal.timeout(5000) // 5 segundos timeout
    });
    
    if (!response.ok) {
      console.warn(`⚠️ Health check falló: ${response.status} ${response.statusText}`);
      return { status: 'error', database: 'unknown' };
    }
    
    const data = await response.json();
    console.log(`✅ Health check exitoso:`, data);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('⏱️ Timeout verificando salud de API (5s)');
    } else {
      console.error('❌ Error verificando salud de API:', error.message);
    }
    return { status: 'error', database: 'disconnected' };
  }
}

