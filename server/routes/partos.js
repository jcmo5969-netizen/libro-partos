import express from 'express';
import pool from '../db/connection.js';

const router = express.Router();

// GET /api/partos - Obtener todos los partos con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { 
      tipoParto, 
      paridad, 
      mes, 
      comuna, 
      consultorio,
      rut,
      limit = 1000,
      offset = 0 
    } = req.query;

    let query = 'SELECT * FROM partos WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (tipoParto) {
      paramCount++;
      query += ` AND tipo_parto ILIKE $${paramCount}`;
      params.push(`%${tipoParto}%`);
    }

    if (paridad) {
      paramCount++;
      query += ` AND paridad ILIKE $${paramCount}`;
      params.push(`%${paridad}%`);
    }

    if (mes) {
      paramCount++;
      query += ` AND mes_parto = $${paramCount}`;
      params.push(parseInt(mes));
    }

    if (comuna) {
      paramCount++;
      query += ` AND comuna ILIKE $${paramCount}`;
      params.push(`%${comuna}%`);
    }

    if (consultorio) {
      paramCount++;
      query += ` AND consultorio ILIKE $${paramCount}`;
      params.push(`%${consultorio}%`);
    }

    if (rut) {
      paramCount++;
      // Normalizar RUT (eliminar puntos y guiones)
      const rutNormalized = rut.replace(/[.\-]/g, '').toUpperCase();
      query += ` AND rut_normalized = $${paramCount}`;
      params.push(rutNormalized);
    }

    // Ordenar por correlativo descendente, luego por fecha
    query += ` ORDER BY correlativo DESC NULLS LAST, fecha_parto DESC, hora_parto DESC`;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await pool.query(query, params);
    
    // Transformar los datos al formato esperado por el frontend
    const partos = result.rows.map(row => transformRowToFrontendFormat(row));
    
    res.json(partos);
  } catch (error) {
    console.error('Error obteniendo partos:', error);
    res.status(500).json({ error: 'Error al obtener los partos', details: error.message });
  }
});

// GET /api/partos/count - Contar total de partos
router.get('/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM partos');
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Error contando partos:', error);
    res.status(500).json({ error: 'Error al contar los partos', details: error.message });
  }
});

// GET /api/partos/:id - Obtener un parto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentar buscar por UUID primero, luego por trace_id
    let query = 'SELECT * FROM partos WHERE id = $1 OR trace_id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parto no encontrado' });
    }
    
    res.json(transformRowToFrontendFormat(result.rows[0]));
  } catch (error) {
    console.error('Error obteniendo parto:', error);
    res.status(500).json({ error: 'Error al obtener el parto', details: error.message });
  }
});

// POST /api/partos - Crear un nuevo parto
router.post('/', async (req, res) => {
  try {
    const partoData = req.body;
    console.log('📥 Datos recibidos del frontend:', JSON.stringify(partoData, null, 2));
    
    const transformedData = transformFrontendToDbFormat(partoData);
    console.log('🔄 Datos transformados:', JSON.stringify(transformedData, null, 2));
    
    // Generar trace_id si no existe
    if (!transformedData.trace_id) {
      transformedData.trace_id = generateTraceId(transformedData);
    }
    
    // Agregar creado_por desde el usuario autenticado
    if (req.user && req.user.username) {
      transformedData.creado_por = req.user.username;
    }
    
    // No incluir correlativo en el INSERT, se generará automáticamente
    delete transformedData.correlativo;
    
    // Normalizar RUT
    if (transformedData.rut) {
      transformedData.rut_normalized = transformedData.rut.replace(/[.\-]/g, '').toUpperCase();
    }
    
    // Extraer mes de fecha_parto si no existe
    if (transformedData.fecha_parto && !transformedData.mes_parto) {
      // Manejar formato MM/DD/YYYY
      if (typeof transformedData.fecha_parto === 'string' && transformedData.fecha_parto.includes('/')) {
        const dateParts = transformedData.fecha_parto.split('/');
        if (dateParts.length === 3) {
          transformedData.mes_parto = parseInt(dateParts[0]);
        }
      } else {
        const date = new Date(transformedData.fecha_parto);
        if (!isNaN(date.getTime())) {
          transformedData.mes_parto = date.getMonth() + 1;
        }
      }
    }
    
    // Validar que trace_id existe (requerido)
    if (!transformedData.trace_id) {
      throw new Error('trace_id es requerido');
    }
    
    // Filtrar valores undefined y null innecesarios
    const cleanData = {};
    Object.keys(transformedData).forEach(key => {
      if (transformedData[key] !== undefined) {
        cleanData[key] = transformedData[key];
      }
    });
    
    const columns = Object.keys(cleanData).join(', ');
    const values = Object.values(cleanData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `INSERT INTO partos (${columns}) VALUES (${placeholders}) RETURNING *`;
    console.log('📝 Query SQL:', query.substring(0, 200) + '...');
    console.log('📊 Total de valores:', values.length);
    console.log('📊 Primeros 5 valores:', values.slice(0, 5));
    console.log('📊 Primeras 5 columnas:', columns.split(', ').slice(0, 5));
    
    const result = await pool.query(query, values);
    
    console.log('✅ Parto creado exitosamente:', result.rows[0].id);
    res.status(201).json(transformRowToFrontendFormat(result.rows[0]));
  } catch (error) {
    console.error('❌ Error creando parto:', error.message);
    console.error('📋 Código de error:', error.code);
    console.error('📋 Detalle:', error.detail);
    console.error('📋 Stack trace:', error.stack);
    
    // Mensaje de error más descriptivo
    let errorMessage = error.message;
    if (error.code === '23502') {
      errorMessage = `Campo requerido faltante: ${error.column || 'desconocido'}`;
    } else if (error.code === '23505') {
      errorMessage = `Violación de restricción única: ${error.detail || 'El registro ya existe'}`;
    } else if (error.code === '23503') {
      errorMessage = `Violación de clave foránea: ${error.detail || 'Referencia inválida'}`;
    } else if (error.detail) {
      errorMessage = `${error.message}: ${error.detail}`;
    }
    
    res.status(500).json({ 
      error: 'Error al crear el parto', 
      details: errorMessage,
      code: error.code,
      column: error.column
    });
  }
});

// PUT /api/partos/:id - Actualizar un parto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const partoData = req.body;
    const transformedData = transformFrontendToDbFormat(partoData);
    
    // Normalizar RUT si se actualiza
    if (transformedData.rut) {
      transformedData.rut_normalized = transformedData.rut.replace(/[.\-]/g, '').toUpperCase();
    }
    
    // Extraer mes de fecha_parto si se actualiza
    if (transformedData.fecha_parto && !transformedData.mes_parto) {
      const date = new Date(transformedData.fecha_parto);
      transformedData.mes_parto = date.getMonth() + 1;
    }
    
    const setClause = Object.keys(transformedData)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');
    
    const values = Object.values(transformedData);
    values.unshift(id);
    
    const query = `UPDATE partos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 OR trace_id = $1 RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parto no encontrado' });
    }
    
    res.json(transformRowToFrontendFormat(result.rows[0]));
  } catch (error) {
    console.error('Error actualizando parto:', error);
    res.status(500).json({ error: 'Error al actualizar el parto', details: error.message });
  }
});

// DELETE /api/partos/:id - Eliminar un parto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM partos WHERE id = $1 OR trace_id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parto no encontrado' });
    }
    
    res.json({ message: 'Parto eliminado correctamente', id: result.rows[0].id });
  } catch (error) {
    console.error('Error eliminando parto:', error);
    res.status(500).json({ error: 'Error al eliminar el parto', details: error.message });
  }
});

// Función para transformar datos de BD a formato frontend
function transformRowToFrontendFormat(row) {
  const transformed = {};
  
  // Mapear campos de snake_case a camelCase
  Object.keys(row).forEach(key => {
    const camelKey = snakeToCamel(key);
    transformed[camelKey] = row[key];
  });
  
  // Agregar campos compatibles con el formato anterior
  transformed._traceId = row.trace_id;
  transformed.numero = row.n_parto_ano?.toString() || '';
  transformed.id = row.n_parto_mes?.toString() || transformed.numero;
  transformed.fecha = row.fecha_parto;
  transformed.hora = row.hora_parto;
  transformed.nombre = row.nombre_y_apellido;
  transformed.semanasGestacion = row.eg;
  transformed.tipoAnestesia = row.tipo_anestesia;
  transformed.perimetroCefalico = row.cc;
  
  // Campos de control
  transformed.correlativo = row.correlativo;
  transformed.creadoPor = row.creado_por;
  
  // Normalizar campos booleanos
  const booleanFields = [
    'puebloOriginario', 'migrante', 'discapacidad', 'cca', 'gemela',
    'induccion', 'conduccionOcitocica', 'libertadMovimientoTdp',
    'episiotomia', 'anestesiaLocal', 'manejoFarmacologicoDolor',
    'manejoNoFarmacologicoDolor', 'planParto', 'trabajoParto',
    'regimenHidricoAmplioTdp', 'ligaduraTardiaCordon',
    'atencionPertinenciaCultural', 'alojamientoConjunto',
    'acompanamientoPreparto', 'acompanamientoParto',
    'acompanamientoPuerperio', 'acompanamientoRn',
    'lactanciaPrecoz60min', 'embControlado', 'tallerChcc',
    'privadaLibertad', 'transNoBinario', 'malformaciones',
    'chagas', 'vih', 'vihAlParto', 'rprVdrl', 'hepatitisB'
  ];
  
  booleanFields.forEach(field => {
    const dbField = camelToSnake(field);
    if (row[dbField] !== undefined && row[dbField] !== null) {
      transformed[field] = row[dbField] === 1 ? 1 : 0;
    }
  });
  
  return transformed;
}

// Función para transformar datos de frontend a formato BD
function transformFrontendToDbFormat(data) {
  const transformed = {};
  
  // Lista de campos válidos en el schema de PostgreSQL (solo estos se permiten)
  const validDbFields = new Set([
    'trace_id', 'correlativo', 'creado_por', 'n_parto_ano', 'n_parto_mes', 'fecha_parto', 'hora_parto', 'mes_parto',
    'tipo_parto', 'nombre_y_apellido', 'rut', 'rut_normalized', 'edad', 'pueblo_originario',
    'nombre_pueblo_originario', 'migrante', 'nacionalidad', 'discapacidad', 'telefono',
    'comuna', 'consultorio', 'paridad', 'cca', 'presentacion', 'gemela', 'eg', 'dias',
    'rotura_membranas', 'induccion', 'misotrol', 'conduccion_ocitocica', 'monitoreo',
    'libertad_movimiento_tdp', 'posicion_materna_expulsivo', 'episiotomia', 'desgarro',
    'medidas_no_farmacologicas_dolor', 'causa_cesarea', 'eq', 'tipo_anestesia',
    'hora_anestesia', 'medico_anestesista', 'anestesia_local', 'manejo_farmacologico_dolor',
    'manejo_no_farmacologico_dolor', 'motivo_no_anestesia', 'plan_parto', 'trabajo_parto',
    'motivo_sin_libertad_movimiento', 'regimen_hidrico_amplio_tdp', 'ligadura_tardia_cordon',
    'atencion_pertinencia_cultural', 'alumbramiento_conducido', 'grupo_rh', 'chagas', 'vih',
    'vih_al_parto', 'rpr_vdrl', 'hepatitis_b', 'sgb', 'sgb_tratamiento_al_parto',
    'emb_controlado', 'peso', 'talla', 'cc', 'apgar1', 'apgar5', 'apgar10', 'sexo',
    'malformaciones', 'medico_obstetra', 'medico_pediatra', 'matrona_preparto',
    'matrona_parto', 'matrona_rn', 'acompanamiento_preparto', 'acompanamiento_parto',
    'acompanamiento_puerperio', 'acompanamiento_rn', 'nombre_acompanante',
    'parentesco_acompanante_madre', 'parentesco_acompanante_rn', 'apego_piel_30min',
    'causa_no_apego', 'lactancia_precoz_60min', 'destino', 'alojamiento_conjunto',
    'comentarios', 'taller_chcc', 'privada_libertad', 'trans_no_binario'
  ]);
  
  // Campos que deben ignorarse completamente (campos de compatibilidad del frontend)
  const ignoredFields = new Set([
    'numero', // Campo de compatibilidad, no existe en BD
    'id' // Solo se usa si es UUID, si es numérico se ignora
  ]);
  
  // Mapeo explícito de campos importantes
  const fieldMapping = {
    // Identificadores
    '_traceId': 'trace_id',
    'traceId': 'trace_id',
    'correlativo': 'correlativo',
    'creadoPor': 'creado_por',
    'nPartoAno': 'n_parto_ano',
    'nPartoMes': 'n_parto_mes',
    
    // Fechas y tiempos
    'fechaParto': 'fecha_parto',
    'fecha': 'fecha_parto',
    'horaParto': 'hora_parto',
    'hora': 'hora_parto',
    'mesParto': 'mes_parto',
    
    // Tipo de parto
    'tipoParto': 'tipo_parto',
    
    // Datos de la madre
    'nombreYApellido': 'nombre_y_apellido',
    'nombre': 'nombre_y_apellido',
    'rut': 'rut',
    '_rutNormalized': 'rut_normalized',
    'rutNormalized': 'rut_normalized',
    'edad': 'edad',
    'puebloOriginario': 'pueblo_originario',
    'nombrePuebloOriginario': 'nombre_pueblo_originario',
    'migrante': 'migrante',
    'nacionalidad': 'nacionalidad',
    'discapacidad': 'discapacidad',
    'telefono': 'telefono',
    'comuna': 'comuna',
    'consultorio': 'consultorio',
    'paridad': 'paridad',
    'cca': 'cca',
    'presentacion': 'presentacion',
    'gemela': 'gemela',
    
    // Embarazo y parto
    'eg': 'eg',
    'semanasGestacion': 'eg',
    'dias': 'dias',
    'roturaMembranas': 'rotura_membranas',
    'induccion': 'induccion',
    'misotrol': 'misotrol',
    'conduccionOcitocica': 'conduccion_ocitocica',
    'monitoreo': 'monitoreo',
    'libertadDeMovimientoOEnTDP': 'libertad_movimiento_tdp',
    'posicionMaternaEnElExpulsivo': 'posicion_materna_expulsivo',
    'episiotomia': 'episiotomia',
    'desgarro': 'desgarro',
    'medidasNoFarmacologicasParaElDolorCuales': 'medidas_no_farmacologicas_dolor',
    'causaCesarea': 'causa_cesarea',
    'eq': 'eq',
    
    // Anestesia
    'tipoDeAnestesia': 'tipo_anestesia',
    'tipoAnestesia': 'tipo_anestesia',
    'horaDeAnestesia': 'hora_anestesia',
    'medicoAnestesista': 'medico_anestesista',
    'anestesiaLocal': 'anestesia_local',
    'manejoFarmacologicoDelDolor': 'manejo_farmacologico_dolor',
    'manejoNoFarmacologicoDelDolor': 'manejo_no_farmacologico_dolor',
    'motivoNoAnestesia': 'motivo_no_anestesia',
    
    // Plan de parto y prácticas
    'planDeParto': 'plan_parto',
    'trabajoDeParto': 'trabajo_parto',
    'motivoSinLibertadDeMovimiento': 'motivo_sin_libertad_movimiento',
    'regimenHidricoAmplioEnTDP': 'regimen_hidrico_amplio_tdp',
    'ligaduraTardiaCordon': 'ligadura_tardia_cordon',
    'atencionConPertinenciaCultural': 'atencion_pertinencia_cultural',
    'alumbramientoConducido': 'alumbramiento_conducido',
    
    // Exámenes
    'grupoRH': 'grupo_rh',
    'chagas': 'chagas',
    'vih': 'vih',
    'vihAlParto': 'vih_al_parto',
    'rprVdrl': 'rpr_vdrl',
    'hepatitisB': 'hepatitis_b',
    'sgb': 'sgb',
    'sgbConTratamientoAlParto': 'sgb_tratamiento_al_parto',
    'embControlado': 'emb_controlado',
    
    // Recién nacido
    'peso': 'peso',
    'talla': 'talla',
    'cc': 'cc',
    'perimetroCefalico': 'cc',
    'apgar1': 'apgar1',
    'apgar5': 'apgar5',
    'apgar10': 'apgar10',
    'sexo': 'sexo',
    'malformaciones': 'malformaciones',
    
    // Personal médico
    'medicoObstetra': 'medico_obstetra',
    'medicoPediatra': 'medico_pediatra',
    'matronaPreparto': 'matrona_preparto',
    'matronaParto': 'matrona_parto',
    'matronaRN': 'matrona_rn',
    
    // Acompañamiento y apego
    'acompanamientoPreparto': 'acompanamiento_preparto',
    'acompanamientoParto': 'acompanamiento_parto',
    'acompanamientoPuerperioInmediato': 'acompanamiento_puerperio',
    'acompanamientoRN': 'acompanamiento_rn',
    'nombreAcompanante': 'nombre_acompanante',
    'parentescoAcompananteRespectoAMadre': 'parentesco_acompanante_madre',
    'parentescoAcompananteRespectoARN': 'parentesco_acompanante_rn',
    'apegoConPiel30Min': 'apego_piel_30min',
    'causaNoApego': 'causa_no_apego',
    
    // Lactancia y destino
    'lactanciaPrecoz60MinDeVida': 'lactancia_precoz_60min',
    'destino': 'destino',
    'alojamientoConjunto': 'alojamiento_conjunto',
    
    // Información adicional
    'comentarios': 'comentarios',
    'tallerCHCC': 'taller_chcc',
    'privadaDeLibertad': 'privada_libertad',
    'transNoBinario': 'trans_no_binario',
  };
  
  // Lista de campos que son INTEGER en la BD y deben convertirse a 0/1
  const integerBooleanFields = [
    'pueblo_originario', 'migrante', 'discapacidad', 'cca', 'gemela',
    'induccion', 'conduccion_ocitocica', 'libertad_movimiento_tdp',
    'episiotomia', 'anestesia_local', 'manejo_farmacologico_dolor',
    'manejo_no_farmacologico_dolor', 'plan_parto', 'trabajo_parto',
    'regimen_hidrico_amplio_tdp', 'ligadura_tardia_cordon',
    'atencion_pertinencia_cultural', 'alojamiento_conjunto',
    'acompanamiento_preparto', 'acompanamiento_parto',
    'acompanamiento_puerperio', 'acompanamiento_rn',
    'lactancia_precoz_60min', 'emb_controlado', 'taller_chcc',
    'privada_libertad', 'trans_no_binario', 'malformaciones',
    'chagas', 'vih', 'vih_al_parto', 'rpr_vdrl', 'hepatitis_b',
    'alumbramiento_conducido'
  ];
  
  // Campos especiales que son INTEGER pero pueden tener múltiples valores
  const integerMultiValueFields = {
    'apego_piel_30min': { 'NO': 0, 'MADRE': 1, 'PADRE': 2, 'OTRA': 3, 'OTRA PERSONA SIGNIFICATIVA': 3 }
  };
  
  // Transformar campos usando el mapeo
  Object.keys(data).forEach(key => {
    // Ignorar campos que no deben enviarse
    if (ignoredFields.has(key)) {
      return;
    }
    
    // Ignorar campos internos excepto los importantes
    if (key.startsWith('_') && key !== '_traceId' && key !== '_rutNormalized') {
      return;
    }
    
    // Ignorar 'id' si es numérico (solo se usa UUID o trace_id)
    if (key === 'id' && typeof data[key] === 'string' && /^\d+$/.test(data[key])) {
      return;
    }
    
    const dbKey = fieldMapping[key] || camelToSnake(key);
    
    // Solo incluir campos que existen en el schema de PostgreSQL
    if (!dbKey || !validDbFields.has(dbKey)) {
      return;
    }
    
    // Solo incluir campos que tienen valor
    if (data[key] === undefined || data[key] === null) {
      return;
    }
    
    // Ignorar strings vacíos para campos opcionales
    if (typeof data[key] === 'string' && data[key].trim() === '' && dbKey !== 'trace_id') {
      return;
    }
    
    let value = data[key];
    
    // Manejar campos especiales con múltiples valores
    if (integerMultiValueFields[dbKey]) {
      const mapping = integerMultiValueFields[dbKey];
      if (typeof value === 'string') {
        const upperValue = value.toUpperCase().trim();
        transformed[dbKey] = mapping[upperValue] !== undefined ? mapping[upperValue] : 0;
      } else if (typeof value === 'number') {
        transformed[dbKey] = value;
      } else {
        transformed[dbKey] = 0;
      }
    }
    // Convertir valores booleanos solo para campos INTEGER booleanos
    else if (integerBooleanFields.includes(dbKey)) {
      if (typeof value === 'boolean') {
        transformed[dbKey] = value ? 1 : 0;
      } else if (typeof value === 'number') {
        transformed[dbKey] = value === 1 ? 1 : 0;
      } else if (typeof value === 'string') {
        const upperValue = value.toUpperCase().trim();
        if (upperValue === 'SI' || upperValue === 'SÍ' || upperValue === '1' || upperValue === 'TRUE') {
          transformed[dbKey] = 1;
        } else {
          transformed[dbKey] = 0;
        }
      } else {
        transformed[dbKey] = 0;
      }
    } else {
      // Para campos VARCHAR, TEXT, DATE, TIME, NUMERIC, mantener el valor original
      transformed[dbKey] = value;
    }
  });
  
  // Normalizar fecha_parto si es necesario (convertir MM/DD/YYYY a YYYY-MM-DD)
  if (transformed.fecha_parto && typeof transformed.fecha_parto === 'string') {
    const dateMatch = transformed.fecha_parto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      transformed.fecha_parto = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Normalizar RUT
  if (transformed.rut && !transformed.rut_normalized) {
    transformed.rut_normalized = transformed.rut.replace(/[.\-]/g, '').toUpperCase();
  }
  
  // Extraer mes_parto de fecha_parto si no existe
  if (transformed.fecha_parto && !transformed.mes_parto) {
    const date = new Date(transformed.fecha_parto);
    if (!isNaN(date.getTime())) {
      transformed.mes_parto = date.getMonth() + 1;
    }
  }
  
  return transformed;
}

// Función auxiliar: snake_case a camelCase
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Función auxiliar: camelCase a snake_case
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Función para generar trace_id
function generateTraceId(data) {
  const key = `${data.n_parto_ano || ''}_${data.n_parto_mes || ''}_${data.fecha_parto || ''}_${data.rut || ''}_${data.nombre_y_apellido || ''}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `PARTO_${Math.abs(hash)}_${Date.now()}`;
}

export default router;

