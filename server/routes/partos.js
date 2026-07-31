import express from 'express';
import pool from '../db/connection.js';
import { sendError } from '../utils/httpError.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Tope duro de paginación: evita que un cliente pida toda la tabla (PHI) en una
// sola respuesta (p. ej. ?limit=999999999). getAllPartos() en el frontend ya
// pagina en lotes de 1000, así que este tope no afecta el uso normal.
const MAX_PAGE_LIMIT = 1000;

function clampLimit(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(parsed, MAX_PAGE_LIMIT);
}

function clampOffset(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/** Partos extrahospitalarios no reciben correlativo y se guardan con tipo EXTRAHOSPITALARIO. */
function isExtrahospitalario(tipoParto) {
  return String(tipoParto || '').toUpperCase().includes('EXTRAHOSPITALARIO');
}

async function getNextCorrelativo() {
  const result = await pool.query("SELECT nextval('partos_correlativo_seq') AS val");
  return parseInt(result.rows[0].val, 10);
}

async function fetchPartoRow(id) {
  if (isUuid(id)) {
    const result = await pool.query(
      'SELECT tipo_parto, correlativo FROM partos WHERE id = $1::uuid OR trace_id = $2',
      [id, id]
    );
    return result.rows[0] || null;
  }
  const result = await pool.query(
    'SELECT tipo_parto, correlativo FROM partos WHERE trace_id = $1',
    [id]
  );
  return result.rows[0] || null;
}

function applyCorrelativoOnCreate(transformedData) {
  if (isExtrahospitalario(transformedData.tipo_parto)) {
    transformedData.tipo_parto = 'EXTRAHOSPITALARIO';
    transformedData.correlativo = null;
    return;
  }
  delete transformedData.correlativo;
}

async function applyCorrelativoOnUpdate(transformedData, existingRow) {
  const newTipo = transformedData.tipo_parto ?? existingRow?.tipo_parto;

  if (isExtrahospitalario(newTipo)) {
    transformedData.tipo_parto = 'EXTRAHOSPITALARIO';
    transformedData.correlativo = null;
    return;
  }

  const wasExtrahospitalario = isExtrahospitalario(existingRow?.tipo_parto);
  if (wasExtrahospitalario && existingRow?.correlativo == null) {
    transformedData.correlativo = await getNextCorrelativo();
    return;
  }

  delete transformedData.correlativo;
}

/**
 * Verifica que el usuario autenticado puede modificar/eliminar el parto indicado.
 * Regla: ADMIN puede todo; el resto solo sobre partos que registró (registrado_por_username / creado_por).
 * Devuelve { ok: true } o { ok: false, status, error } para responder directamente.
 */
async function assertPuedeModificarParto(id, user) {
  if (!user) {
    return { ok: false, status: 401, error: 'Autenticación requerida' };
  }
  if (user.rol === 'ADMIN') {
    return { ok: true };
  }

  const lookup = isUuid(id)
    ? await pool.query(
        'SELECT registrado_por_username, creado_por FROM partos WHERE id = $1::uuid OR trace_id = $2',
        [id, id]
      )
    : await pool.query(
        'SELECT registrado_por_username, creado_por FROM partos WHERE trace_id = $1',
        [id]
      );

  if (lookup.rows.length === 0) {
    return { ok: false, status: 404, error: 'Parto no encontrado' };
  }

  const row = lookup.rows[0];
  const owner = row.registrado_por_username || row.creado_por;
  const username = user.username;
  if (owner && username && String(owner).toLowerCase() === String(username).toLowerCase()) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: 'No autorizado para modificar este parto' };
}

/**
 * `registrado_por_username` llega desde el cliente (quién atendió, puede diferir de
 * quién digita el registro) y assertPuedeModificarParto() lo usa para decidir quién
 * puede editar/borrar. Sin esta validación, cualquier usuario podría escribir un
 * username inventado o de un tercero y así ceder/perder derechos de edición sobre
 * el registro que crea. Solo se acepta si coincide con el propio usuario autenticado
 * o con una cuenta activa real; en cualquier otro caso se usa el usuario autenticado.
 */
async function resolveRegistradoPorUsername(candidate, authenticatedUsername) {
  if (!candidate) return authenticatedUsername;
  if (String(candidate).toLowerCase() === String(authenticatedUsername).toLowerCase()) {
    return candidate;
  }
  const result = await pool.query(
    'SELECT username FROM usuarios WHERE LOWER(username) = LOWER($1) AND activo = TRUE',
    [candidate]
  );
  return result.rows.length > 0 ? result.rows[0].username : authenticatedUsername;
}

/** No sobrescribir con NULL en UPDATE si el cliente envía string vacío (p. ej. grupo RH no mapeado en el formulario). */
const preserveOnEmptyStringUpdate = new Set(['grupo_rh']);

function formatDateForFrontend(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, month, day, year] = slashMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return value;
}

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
    params.push(clampLimit(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(clampOffset(offset));

    const result = await pool.query(query, params);
    
    // Transformar los datos al formato esperado por el frontend
    const partos = result.rows.map(row => transformRowToFrontendFormat(row));

    logAudit(req, 'LIST', null, `count=${partos.length}`);
    res.json(partos);
  } catch (error) {
    console.error('Error obteniendo partos:', error);
    return sendError(res, 500, 'Error al obtener los partos', error);
  }
});

// GET /api/partos/count - Contar total de partos
router.get('/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM partos');
    res.json({ total: parseInt(result.rows[0].total) });
  } catch (error) {
    console.error('Error contando partos:', error);
    return sendError(res, 500, 'Error al contar los partos', error);
  }
});

// GET /api/partos/:id - Obtener un parto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let query;
    let params;
    if (isUuid(id)) {
      query = 'SELECT * FROM partos WHERE id = $1::uuid OR trace_id = $2';
      params = [id, id];
    } else {
      query = 'SELECT * FROM partos WHERE trace_id = $1';
      params = [id];
    }
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parto no encontrado' });
    }

    logAudit(req, 'READ', result.rows[0].id);
    res.json(transformRowToFrontendFormat(result.rows[0]));
  } catch (error) {
    console.error('Error obteniendo parto:', error);
    return sendError(res, 500, 'Error al obtener el parto', error);
  }
});

// POST /api/partos - Crear un nuevo parto
router.post('/', async (req, res) => {
  try {
    const partoData = req.body;
    // No registrar payloads completos: contienen PHI (nombre, RUT, VIH, etc.).

    const transformedData = transformFrontendToDbFormat(partoData);
    
    // Generar trace_id si no existe
    if (!transformedData.trace_id) {
      transformedData.trace_id = generateTraceId(transformedData);
    }
    
    // Agregar creado_por y registrado_por desde el usuario autenticado
    if (req.user && req.user.username) {
      transformedData.creado_por = req.user.username;
      transformedData.registrado_por_username = await resolveRegistradoPorUsername(
        transformedData.registrado_por_username,
        req.user.username
      );
    }
    
    applyCorrelativoOnCreate(transformedData);

    // Calcular IMC materno automáticamente
    if (transformedData.peso_materno && transformedData.talla_materna) {
      const tallaMt = parseFloat(transformedData.talla_materna) / 100;
      if (tallaMt > 0) {
        transformedData.imc_materno = Math.round((parseFloat(transformedData.peso_materno) / (tallaMt * tallaMt)) * 100) / 100;
      }
    }

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
    // No registrar valores/columnas del INSERT: pueden contener PHI.

    const result = await pool.query(query, values);

    console.log('✅ Parto creado exitosamente:', result.rows[0].id);
    logAudit(req, 'CREATE', result.rows[0].id);
    res.status(201).json(transformRowToFrontendFormat(result.rows[0]));
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    // No registrar error.detail: en violaciones de unicidad puede contener PHI (p. ej. RUT).
    console.error('❌ Error creando parto | code:', error.code);

    // Mensajes públicos seguros por tipo de error (sin exponer error.detail/column).
    if (error.code === '23502') {
      return sendError(res, 400, `Campo requerido faltante: ${error.column || 'desconocido'}`, error);
    }
    if (error.code === '23505') {
      return sendError(res, 409, 'El registro ya existe (violación de restricción única).', error);
    }
    if (error.code === '23503') {
      return sendError(res, 400, 'Referencia inválida (violación de clave foránea).', error);
    }
    return sendError(res, 500, 'Error al crear el parto', error);
  }
});

// PUT /api/partos/:id - Actualizar un parto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const partoData = req.body;

    const authz = await assertPuedeModificarParto(id, req.user);
    if (!authz.ok) {
      return res.status(authz.status).json({ error: authz.error });
    }

    const transformedData = transformFrontendToDbFormat(partoData, true); // isUpdate=true: permite limpiar campos vacíos

    // creado_por es el registro de auditoría de quién creó el parto y además el
    // respaldo de assertPuedeModificarParto() cuando no hay registrado_por_username.
    // Nunca debe poder reescribirse desde el body de un UPDATE.
    delete transformedData.creado_por;

    if (transformedData.registrado_por_username) {
      transformedData.registrado_por_username = await resolveRegistradoPorUsername(
        transformedData.registrado_por_username,
        req.user.username
      );
    }

    const existingRow = await fetchPartoRow(id);
    if (!existingRow) {
      return res.status(404).json({ error: 'Parto no encontrado' });
    }
    await applyCorrelativoOnUpdate(transformedData, existingRow);
    
    // Normalizar RUT si se actualiza
    if (transformedData.rut) {
      transformedData.rut_normalized = transformedData.rut.replace(/[.\-]/g, '').toUpperCase();
    }
    
    // Extraer mes de fecha_parto si se actualiza
    if (transformedData.fecha_parto && !transformedData.mes_parto) {
      const date = new Date(transformedData.fecha_parto);
      transformedData.mes_parto = date.getMonth() + 1;
    }

    // Recalcular IMC materno si se actualizan peso o talla
    if (transformedData.peso_materno && transformedData.talla_materna) {
      const tallaMt = parseFloat(transformedData.talla_materna) / 100;
      if (tallaMt > 0) {
        transformedData.imc_materno = Math.round((parseFloat(transformedData.peso_materno) / (tallaMt * tallaMt)) * 100) / 100;
      }
    }

    const dataValues = Object.values(transformedData);
    let query;
    let values;
    if (isUuid(id)) {
      const setClause = Object.keys(transformedData)
        .map((key, i) => `${key} = $${i + 3}`)
        .join(', ');
      query = `UPDATE partos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid OR trace_id = $2 RETURNING *`;
      values = [id, id, ...dataValues];
    } else {
      const setClause = Object.keys(transformedData)
        .map((key, i) => `${key} = $${i + 2}`)
        .join(', ');
      query = `UPDATE partos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE trace_id = $1 RETURNING *`;
      values = [id, ...dataValues];
    }
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parto no encontrado' });
    }

    logAudit(req, 'UPDATE', result.rows[0].id);
    res.json(transformRowToFrontendFormat(result.rows[0]));
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    return sendError(res, 500, 'Error al actualizar el parto', error);
  }
});

// DELETE /api/partos/:id - Eliminar un parto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const authz = await assertPuedeModificarParto(id, req.user);
    if (!authz.ok) {
      return res.status(authz.status).json({ error: authz.error });
    }

    let query;
    let params;
    if (isUuid(id)) {
      query = 'DELETE FROM partos WHERE id = $1::uuid OR trace_id = $2 RETURNING id';
      params = [id, id];
    } else {
      query = 'DELETE FROM partos WHERE trace_id = $1 RETURNING id';
      params = [id];
    }
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parto no encontrado' });
    }

    logAudit(req, 'DELETE', result.rows[0].id);
    res.json({ message: 'Parto eliminado correctamente', id: result.rows[0].id });
  } catch (error) {
    return sendError(res, 500, 'Error al eliminar el parto', error);
  }
});

// Función para transformar datos de BD a formato frontend
function transformRowToFrontendFormat(row) {
  const transformed = {};
  const formattedDate = formatDateForFrontend(row.fecha_parto);
  
  // Mapear campos de snake_case a camelCase
  Object.keys(row).forEach(key => {
    const camelKey = snakeToCamel(key);
    transformed[camelKey] = row[key];
  });
  
  // Agregar campos compatibles con el formato anterior
  transformed._traceId = row.trace_id;
  transformed.numero = isExtrahospitalario(row.tipo_parto)
    ? ''
    : (row.correlativo?.toString() || row.n_parto_ano?.toString() || '');
  transformed.id = row.id;
  transformed.fechaParto = formattedDate;
  transformed.fecha = formattedDate;
  transformed.hora = row.hora_parto;
  transformed.nombre = row.nombre_y_apellido;
  transformed.semanasGestacion = row.eg;
  transformed.tipoAnestesia = row.tipo_anestesia;
  transformed.perimetroCefalico = row.cc;
  
  // Mapeo explícito para campos de anestesia (mantener consistencia con frontend)
  if (row.detalle_anestesia_pca !== undefined) {
    transformed.detalleAnestesiaPCA = row.detalle_anestesia_pca;
  }
  
  // Campos de control
  transformed.correlativo = row.correlativo;
  transformed.creadoPor = row.creado_por;

  // Peso, talla e IMC materna
  transformed.pesoMaterno = row.peso_materno;
  transformed.tallaMaterna = row.talla_materna;
  transformed.imcMaterno = row.imc_materno;

  // Responsable del llenado
  transformed.registradoPor = row.registrado_por;
  transformed.registradoPorUsername = row.registrado_por_username || row.creado_por;

  // Alias explícitos para campos con nombres no-estándar que el frontend espera
  transformed.libertadDeMovimientoOEnTDP = row.libertad_movimiento_tdp;
  transformed.regimenHidricoAmplioEnTDP = row.regimen_hidrico_amplio_tdp;
  transformed.manejoFarmacologicoDelDolor = row.manejo_farmacologico_dolor;
  transformed.manejoNoFarmacologicoDelDolor = row.manejo_no_farmacologico_dolor;
  transformed.posicionMaternaEnElExpulsivo = row.posicion_materna_expulsivo;
  transformed.medidasNoFarmacologicasParaElDolorCuales = row.medidas_no_farmacologicas_dolor;
  transformed.atencionConPertinenciaCultural = row.atencion_pertinencia_cultural;
  transformed.planDeParto = row.plan_parto;
  transformed.trabajoDeParto = row.trabajo_parto;
  transformed.motivoSinLibertadDeMovimiento = row.motivo_sin_libertad_movimiento;
  transformed.acompanamientoRN = row.acompanamiento_rn;
  transformed.acompanamientoPuerperioInmediato = row.acompanamiento_puerperio;
  transformed.lactanciaPrecoz60MinDeVida = row.lactancia_precoz_60min;
  transformed.parentescoAcompananteRespectoAMadre = row.parentesco_acompanante_madre;
  transformed.parentescoAcompananteRespectoARN = row.parentesco_acompanante_rn;
  transformed.privadaDeLibertad = row.privada_libertad;
  transformed.alumbramientoConducido = row.alumbramiento_conducido;
  transformed.apegoConPiel30Min = row.apego_piel_30min;
  transformed.sgbConTratamientoAlParto = row.sgb_tratamiento_al_parto;
  transformed.embControlado = row.emb_controlado;
  transformed.vihAlParto = row.vih_al_parto;
  transformed.rprVdrl = row.rpr_vdrl;
  transformed.hepatitisB = row.hepatitis_b;

  // Profesionales — mapeos explícitos para evitar errores de capitalización
  transformed.matronaRN = row.matrona_rn;
  transformed.matronaPreparto = row.matrona_preparto;
  transformed.matronaParto = row.matrona_parto;
  transformed.medicoObstetra = row.medico_obstetra;
  transformed.medicoPediatra = row.medico_pediatra;
  transformed.medicoAnestesista = row.medico_anestesista;
  transformed.medicoIndicaCesarea = row.medico_indica_cesarea;
  transformed.medicoOperadorCesarea = row.medico_operador_cesarea;
  
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
    'lactanciaPrecoz60min', 'embControlado',
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
function transformFrontendToDbFormat(data, isUpdate = false) {
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
    'malformaciones', 'medico_obstetra', 'medico_pediatra', 'medico_indica_cesarea',
    'medico_operador_cesarea', 'clasificacion_robson', 'matrona_preparto',
    'matrona_parto', 'matrona_rn', 'acompanamiento_preparto', 'acompanamiento_parto',
    'acompanamiento_puerperio', 'acompanamiento_rn', 'nombre_acompanante',
    'parentesco_acompanante_madre', 'parentesco_acompanante_rn', 'apego_piel_30min',
    'causa_no_apego', 'lactancia_precoz_60min', 'destino', 'alojamiento_conjunto',
    'comentarios', 'privada_libertad', 'trans_no_binario',
    'tipo_induccion', 'induccion_mecanica', 'induccion_farmacologica',
    'induccion_combinada', 'detalle_induccion', 'peso2', 'talla2', 'cc2',
    'apgar1_2', 'apgar5_2', 'apgar10_2', 'sexo2', 'malformaciones2',
    'hora_parto_2', 'destino_2',
    'detalle_anestesia_combinada', 'detalle_anestesia_pca',
    'peso_materno', 'talla_materna', 'imc_materno',
    'registrado_por', 'registrado_por_username',
    'causa_cesarea_electiva'
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
    
    // Peso, talla e IMC materna
    'pesoMaterno': 'peso_materno',
    'tallaMaterna': 'talla_materna',
    'imcMaterno': 'imc_materno',

    // Responsable del llenado
    'registradoPor': 'registrado_por',
    'registradoPorUsername': 'registrado_por_username',

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
    'causaCesareaElectiva': 'causa_cesarea_electiva',
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
    'detalleAnestesiaCombinada': 'detalle_anestesia_combinada',
    'detalleAnestesiaPCA': 'detalle_anestesia_pca',
    
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
    'medicoIndicaCesarea': 'medico_indica_cesarea',
    'medicoOperadorCesarea': 'medico_operador_cesarea',
    'clasificacionRobson': 'clasificacion_robson',
    'matronaPreparto': 'matrona_preparto',
    'matronaParto': 'matrona_parto',
    'matronaRN': 'matrona_rn',
    
    // Inducción detallada
    'tipoInduccion': 'tipo_induccion',
    'induccionMecanica': 'induccion_mecanica',
    'induccionFarmacologica': 'induccion_farmacologica',
    'induccionCombinada': 'induccion_combinada',
    'detalleInduccion': 'detalle_induccion',
    
    // Segundo recién nacido (gemelar)
    'peso2': 'peso2',
    'talla2': 'talla2',
    'cc2': 'cc2',
    'apgar1_2': 'apgar1_2',
    'apgar5_2': 'apgar5_2',
    'apgar10_2': 'apgar10_2',
    'sexo2': 'sexo2',
    'malformaciones2': 'malformaciones2',
    'horaParto2': 'hora_parto_2',
    'hora_parto_2': 'hora_parto_2',
    'destino2': 'destino_2',
    'destino_2': 'destino_2',
    
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
    'lactancia_precoz_60min', 'emb_controlado',
    'privada_libertad', 'trans_no_binario', 'malformaciones',
    'chagas', 'vih', 'vih_al_parto', 'rpr_vdrl', 'hepatitis_b',
    'alumbramiento_conducido', 'malformaciones2'
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
      if (isUpdate && preserveOnEmptyStringUpdate.has(dbKey)) {
        return; // No enviar columna: conserva el valor en BD (evita borrar grupo RH al editar)
      }
      if (isUpdate && !integerBooleanFields.includes(dbKey)) {
        transformed[dbKey] = null; // Permite limpiar el campo en UPDATE
      }
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

