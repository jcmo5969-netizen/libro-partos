import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para importar datos desde datos.txt a PostgreSQL
 */
async function importData() {
  try {
    console.log('🔄 Iniciando importación de datos...');
    
    // Importar parseData desde el módulo del servidor
    let parseData;
    try {
      // Usar el módulo local del servidor que es compatible con ES6
      const { parseData: importedParseData } = await import('../utils/dataParser.js');
      parseData = importedParseData;
      
      if (!parseData || typeof parseData !== 'function') {
        throw new Error('parseData no es una función exportada');
      }
      
      console.log('✅ Parser de datos cargado correctamente');
    } catch (error) {
      console.error('❌ Error importando parseData:', error.message);
      console.error('⚠️  Asegúrate de que el archivo server/utils/dataParser.js existe');
      if (error.stack) {
        console.error('\n💡 Stack trace:', error.stack);
      }
      process.exit(1);
    }
    
    // Leer archivo datos.txt
    const datosPath = path.join(__dirname, '../../public/datos.txt');
    
    if (!fs.existsSync(datosPath)) {
      console.error('❌ No se encontró el archivo datos.txt en:', datosPath);
      process.exit(1);
    }
    
    const text = fs.readFileSync(datosPath, 'utf-8');
    console.log(`📄 Archivo leído: ${text.length} caracteres`);
    
    // Parsear datos usando la función existente
    const data = parseData(text);
    console.log(`✅ Datos parseados: ${data.length} registros`);
    
    if (data.length === 0) {
      console.error('❌ No se encontraron datos para importar');
      process.exit(1);
    }
    
    // Verificar conexión a la BD
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL verificada');
    
    // Limpiar tabla si es necesario (opcional, comentar si no quieres borrar datos existentes)
    const clearTable = process.env.CLEAR_TABLE === 'true';
    if (clearTable) {
      console.log('⚠️  Limpiando tabla partos...');
      await pool.query('TRUNCATE TABLE partos_relaciones CASCADE');
      await pool.query('TRUNCATE TABLE partos CASCADE');
      console.log('✅ Tabla limpiada');
    }
    
    // Insertar datos en lotes para mejor rendimiento
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;
    
    console.log(`📦 Insertando datos en lotes de ${batchSize}...`);
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(data.length / batchSize);
      
      console.log(`📦 Procesando lote ${batchNum}/${totalBatches} (${batch.length} registros)...`);
      
      for (const item of batch) {
        try {
          const dbData = transformToDbFormat(item);
          
          // Verificar si ya existe por trace_id
          const existing = await pool.query(
            'SELECT id FROM partos WHERE trace_id = $1',
            [item._traceId]
          );
          
          if (existing.rows.length > 0) {
            console.log(`⏭️  Registro ${item._traceId} ya existe, omitiendo...`);
            continue;
          }
          
          // Insertar registro
          const columns = Object.keys(dbData).join(', ');
          const values = Object.values(dbData);
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
          
          const insertQuery = `
            INSERT INTO partos (${columns})
            VALUES (${placeholders})
            RETURNING id, trace_id
          `;
          
          const result = await pool.query(insertQuery, values);
          inserted++;
          
          // Insertar relaciones si existen
          if (item._relations && item._relations.relatedPartos && item._relations.relatedPartos.length > 0) {
            await insertRelations(result.rows[0].id, item._relations, pool);
          }
          
        } catch (error) {
          errors++;
          console.error(`❌ Error insertando registro ${item._traceId}:`, error.message);
          // Continuar con el siguiente registro
        }
      }
      
      console.log(`✅ Lote ${batchNum} completado. Insertados: ${inserted}, Errores: ${errors}`);
    }
    
    // Crear relaciones después de insertar todos los datos
    console.log('🔗 Creando relaciones entre partos...');
    await createRelations(pool);
    
    console.log('\n✅ Importación completada!');
    console.log(`📊 Total insertados: ${inserted}`);
    console.log(`❌ Total errores: ${errors}`);
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en importación:', error);
    await pool.end();
    process.exit(1);
  }
}

/**
 * Transforma datos del formato frontend al formato de BD
 */
function transformToDbFormat(item) {
  const dbData = {};
  
  // Mapeo directo de campos
  const fieldMapping = {
    // Identificadores
    '_traceId': 'trace_id',
    'nPartoAno': 'n_parto_ano',
    'nPartoMes': 'n_parto_mes',
    
    // Fechas y tiempos
    'fechaParto': 'fecha_parto',
    'horaParto': 'hora_parto',
    'mesParto': 'mes_parto',
    
    // Tipo de parto
    'tipoParto': 'tipo_parto',
    
    // Datos de la madre
    'nombreYApellido': 'nombre_y_apellido',
    'rut': 'rut',
    '_rutNormalized': 'rut_normalized',
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
  
  // Transformar campos
  Object.keys(fieldMapping).forEach(frontendKey => {
    const dbKey = fieldMapping[frontendKey];
    let value = item[frontendKey];
    
    // Manejar valores especiales
    if (value === null || value === undefined || value === '') {
      dbData[dbKey] = null;
    } else if (typeof value === 'boolean') {
      dbData[dbKey] = value ? 1 : 0;
    } else if (typeof value === 'number') {
      dbData[dbKey] = value;
    } else {
      dbData[dbKey] = String(value);
    }
  });
  
  // Normalizar fecha_parto si es necesario
  if (dbData.fecha_parto && typeof dbData.fecha_parto === 'string') {
    // Convertir formato MM/DD/YYYY a YYYY-MM-DD
    const dateMatch = dbData.fecha_parto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      dbData.fecha_parto = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Normalizar RUT
  if (dbData.rut) {
    dbData.rut_normalized = dbData.rut.replace(/[.\-]/g, '').toUpperCase();
  }
  
  // Extraer mes_parto de fecha_parto si no existe
  if (dbData.fecha_parto && !dbData.mes_parto) {
    const date = new Date(dbData.fecha_parto);
    if (!isNaN(date.getTime())) {
      dbData.mes_parto = date.getMonth() + 1;
    }
  }
  
  // Metadatos
  if (item._traceMetadata) {
    dbData.source_line = item._traceMetadata.sourceLine;
    dbData.data_hash = item._traceMetadata.dataHash;
  }
  
  return dbData;
}

/**
 * Inserta relaciones de un parto
 */
async function insertRelations(partoId, relations, pool) {
  // Esta función se puede expandir para insertar relaciones específicas
  // Por ahora, las relaciones se crearán después con createRelations
}

/**
 * Crea relaciones entre partos después de importar todos los datos
 */
async function createRelations(pool) {
  try {
    // Crear relaciones por RUT (misma madre)
    console.log('  🔗 Creando relaciones por RUT...');
    const relacionQuery = `
      INSERT INTO partos_relaciones (parto_id, relacionado_con_id, tipo_relacion)
      SELECT 
        p1.id,
        p2.id,
        'misma_madre'
      FROM partos p1
      INNER JOIN partos p2 ON p1.rut_normalized = p2.rut_normalized
      WHERE p1.id != p2.id
        AND p1.rut_normalized IS NOT NULL
        AND p2.rut_normalized IS NOT NULL
      ON CONFLICT (parto_id, relacionado_con_id, tipo_relacion) DO NOTHING
    `;
    
    const result = await pool.query(relacionQuery);
    console.log(`  ✅ Relaciones por RUT creadas: ${result.rowCount}`);
    
    // Crear relaciones por consultorio
    console.log('  🔗 Creando relaciones por consultorio...');
    const consultorioQuery = `
      INSERT INTO partos_relaciones (parto_id, relacionado_con_id, tipo_relacion)
      SELECT 
        p1.id,
        p2.id,
        'mismo_consultorio'
      FROM partos p1
      INNER JOIN partos p2 ON p1.consultorio = p2.consultorio
      WHERE p1.id != p2.id
        AND p1.consultorio IS NOT NULL
        AND p2.consultorio IS NOT NULL
      ON CONFLICT (parto_id, relacionado_con_id, tipo_relacion) DO NOTHING
    `;
    
    const result2 = await pool.query(consultorioQuery);
    console.log(`  ✅ Relaciones por consultorio creadas: ${result2.rowCount}`);
    
    // Crear relaciones por mes
    console.log('  🔗 Creando relaciones por mes...');
    const mesQuery = `
      INSERT INTO partos_relaciones (parto_id, relacionado_con_id, tipo_relacion)
      SELECT 
        p1.id,
        p2.id,
        'mismo_mes'
      FROM partos p1
      INNER JOIN partos p2 ON p1.mes_parto = p2.mes_parto AND p1.n_parto_ano = p2.n_parto_ano
      WHERE p1.id != p2.id
        AND p1.mes_parto IS NOT NULL
        AND p2.mes_parto IS NOT NULL
      ON CONFLICT (parto_id, relacionado_con_id, tipo_relacion) DO NOTHING
    `;
    
    const result3 = await pool.query(mesQuery);
    console.log(`  ✅ Relaciones por mes creadas: ${result3.rowCount}`);
    
  } catch (error) {
    console.error('❌ Error creando relaciones:', error);
  }
}

// Ejecutar importación
importData();

