/**
 * Servicio para comunicarse con la API REST del backend
 */

import { getAuthHeader, removeToken } from './authService.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** Si el error indica token expirado, cierra sesión y notifica para redirigir a login */
function handleTokenExpired(error, response) {
  const msg = (error?.message || '').toLowerCase()
  const is401 = response?.status === 401
  const isTokenExpired = msg.includes('token') && (msg.includes('expirado') || msg.includes('expired'))
  if (is401 || isTokenExpired) {
    removeToken()
    window.dispatchEvent(new CustomEvent('auth:token-expired'))
  }
}

/**
 * Normaliza un registro de parto: acepta camelCase y snake_case del backend
 */
function normalizeParto(item) {
  return {
    ...item,
    _traceId: item._traceId || item.traceId,
    fechaParto: item.fechaParto || item.fecha,
    horaParto: item.horaParto || item.hora,
    nombreYApellido: item.nombreYApellido || item.nombre,
    semanasGestacion: item.semanasGestacion || item.eg,
    tipoAnestesia: item.tipoAnestesia || item.tipoDeAnestesia,
    perimetroCefalico: item.perimetroCefalico || item.cc,
    // Campos con acrónimo TDP
    libertadDeMovimientoOEnTDP:
      item.libertadDeMovimientoOEnTDP ??
      item.libertadMovimientoTdp ??
      item.libertad_de_movimiento_o_en_tdp ??
      item.libertad_movimiento ??
      item.libertadMovimiento,
    regimenHidricoAmplioEnTDP:
      item.regimenHidricoAmplioEnTDP ??
      item.regimenHidricoAmplioTdp ??
      item.regimen_hidrico_amplio_en_tdp ??
      item.regimenHidrico ??
      item.regimen_hidrico,
    // Campos de manejo del dolor
    manejoFarmacologicoDelDolor:
      item.manejoFarmacologicoDelDolor ??
      item.manejoFarmacologicoDolor ??
      item.manejo_farmacologico_del_dolor ??
      item.manejoFarmacologico,
    manejoNoFarmacologicoDelDolor:
      item.manejoNoFarmacologicoDelDolor ??
      item.manejoNoFarmacologicoDolor ??
      item.manejo_no_farmacologico_del_dolor ??
      item.manejoNoFarmacologico,
    medidasNoFarmacologicasParaElDolorCuales:
      item.medidasNoFarmacologicasParaElDolorCuales ??
      item.medidasNoFarmacologicasDolorCuales ??
      item.medidas_no_farmacologicas_para_el_dolor_cuales ??
      item.medidasNoFarmacologicas,
    // Posición en el expulsivo
    posicionMaternaEnElExpulsivo:
      item.posicionMaternaEnElExpulsivo ??
      item.posicionMaternaExpulsivo ??
      item.posicion_materna_en_el_expulsivo ??
      item.posicionExpulsivo ??
      item.posicion_expulsivo,
    // Atención con pertinencia cultural
    atencionConPertinenciaCultural:
      item.atencionConPertinenciaCultural ??
      item.atencionPertinenciaCultural ??
      item.atencion_pertinencia_cultural,
    // Campos con nombre corto vs nombre completo
    planDeParto:
      item.planDeParto ?? item.planParto ?? item.plan_parto,
    trabajoDeParto:
      item.trabajoDeParto ?? item.trabajoParto ?? item.trabajo_parto,
    privadaDeLibertad:
      item.privadaDeLibertad ?? item.privadaLibertad ?? item.privada_libertad,
    motivoSinLibertadDeMovimiento:
      item.motivoSinLibertadDeMovimiento ?? item.motivoSinLibertadMovimiento ?? item.motivo_sin_libertad_movimiento,
    acompanamientoRN:
      item.acompanamientoRN ?? item.acompanamientoRn ?? item.acompanamiento_rn,
    acompanamientoPuerperioInmediato:
      item.acompanamientoPuerperioInmediato ?? item.acompanamientoPuerperio ?? item.acompanamiento_puerperio,
    lactanciaPrecoz60MinDeVida:
      item.lactanciaPrecoz60MinDeVida ?? item.lactanciaPrecoz60min ?? item.lactancia_precoz_60min,
    parentescoAcompananteRespectoAMadre:
      item.parentescoAcompananteRespectoAMadre ?? item.parentescoAcompananteMadre ?? item.parentesco_acompanante_madre,
    parentescoAcompananteRespectoARN:
      item.parentescoAcompananteRespectoARN ?? item.parentescoAcompananteRn ?? item.parentesco_acompanante_rn,
    apegoConPiel30Min:
      item.apegoConPiel30Min ?? item.apegoPiel30min ?? item.apego_piel_30min,
    alumbramientoConducido:
      item.alumbramientoConducido ?? item.alumbramiento_conducido,
    embControlado:
      item.embControlado ?? item.emb_controlado,
    pesoMaterno: item.pesoMaterno ?? item.peso_materno,
    tallaMaterna: item.tallaMaterna ?? item.talla_materna,
    registradoPor:
      item.registradoPor ?? item.registrado_por ?? item.responsableLlenado,
    registradoPorUsername:
      item.registradoPorUsername ??
      item.registrado_por_username ??
      item.createdByUsername,
    ultimaModificacionPor:
      item.ultimaModificacionPor ?? item.ultima_modificacion_por,
    ultimaModificacionUsername:
      item.ultimaModificacionUsername ?? item.ultima_modificacion_username,
  };
}

/**
 * Tras PUT, el servidor a veces devuelve un subconjunto de campos.
 * Conserva del cliente los valores que el servidor no reenvía o envía vacíos.
 */
export function mergePartoAfterUpdate(clientPayload, serverResponse) {
  if (!serverResponse || typeof serverResponse !== 'object') {
    return { ...clientPayload };
  }
  const merged = { ...clientPayload };
  for (const key of Object.keys(serverResponse)) {
    const v = serverResponse[key];
    if (v !== undefined && v !== null && v !== '') {
      merged[key] = v;
    }
  }
  merged._traceId = serverResponse._traceId ?? serverResponse.traceId ?? merged._traceId;
  merged.id = serverResponse.id ?? merged.id;
  return merged;
}

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
    // No registrar la URL completa: el filtro por RUT viaja en el query string y es PHI.

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
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
    
    return data.map(normalizeParto);
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
 * Obtiene TODOS los partos paginando en lotes, sin importar cuántos haya.
 * Evita que se pierdan registros por el tope de carga (antes limit fijo).
 */
export async function getAllPartos(extraFilters = {}) {
  const pageSize = 1000;
  let offset = 0;
  let all = [];

  // Bucle de seguridad: trae lotes hasta que el backend devuelva menos de pageSize.
  // Tope duro defensivo de 1,000,000 para evitar bucles infinitos.
  while (offset < 1000000) {
    const batch = await getPartos({ ...extraFilters, limit: pageSize, offset });
    all = all.concat(batch);
    if (batch.length < pageSize) break; // último lote
    offset += pageSize;
  }

  console.log(`✅ getAllPartos: ${all.length} registros cargados en total`);
  return all;
}

/**
 * Obtiene un parto por ID
 */
export async function getPartoById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/partos/${id}`, {
      credentials: 'include',
    });

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
    const response = await fetch(`${API_BASE_URL}/partos`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(partoData),
    });

    const responseText = await response.text();
    // No registrar el payload/respuesta completos: contienen PHI (RUT, VIH, etc.)
    // y quedarían visibles en la consola del navegador en equipos compartidos.

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
      handleTokenExpired(new Error(errorMessage), response);
      throw new Error(errorMessage);
    }
    
    const data = JSON.parse(responseText);
    console.log('✅ Parto creado exitosamente:', data.id || data._traceId);
    return normalizeParto(data);
  } catch (error) {
    if (error?.message) handleTokenExpired(error, { status: 0 });
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
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(partoData),
    });
    
    const responseText = await response.text();
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: 'Error desconocido', details: responseText };
      }
      const errorMessage = errorData.details
        ? `${errorData.error}: ${errorData.details}`
        : errorData.error || `Error actualizando parto: ${response.statusText}`;
      handleTokenExpired(new Error(errorMessage), response);
      throw new Error(errorMessage);
    }
    const data = JSON.parse(responseText);
    return normalizeParto(data);
  } catch (error) {
    if (error?.message) handleTokenExpired(error, { status: 0 });
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
      credentials: 'include',
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
      credentials: 'include',
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

