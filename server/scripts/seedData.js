import pool from '../db/connection.js';

/**
 * Script para cargar datos ficticios en la base de datos
 */

// Función para generar RUT chileno aleatorio
function generarRUT() {
  const num = Math.floor(Math.random() * 25000000) + 1000000;
  const dv = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'][num % 11];
  const rutFormateado = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
  return { formateado: rutFormateado, normalizado: num + dv };
}

// Función para generar fecha aleatoria en los últimos 12 meses
function generarFecha() {
  const hoy = new Date();
  const hace12Meses = new Date();
  hace12Meses.setMonth(hace12Meses.getMonth() - 12);
  
  const fechaAleatoria = new Date(
    hace12Meses.getTime() + Math.random() * (hoy.getTime() - hace12Meses.getTime())
  );
  
  const año = fechaAleatoria.getFullYear();
  const mes = fechaAleatoria.getMonth() + 1;
  const dia = fechaAleatoria.getDate();
  
  return {
    fecha: `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    mes: mes,
    año: año,
    hora: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`
  };
}

// Nombres ficticios
const nombres = [
  'María González', 'Carmen Rodríguez', 'Ana Martínez', 'Laura Fernández', 'Patricia López',
  'Sofía Sánchez', 'Isabel Pérez', 'Elena Gómez', 'Lucía Martín', 'Marta Jiménez',
  'Rosa Hernández', 'Pilar Díaz', 'Cristina Moreno', 'Javier Muñoz', 'Carlos Álvarez',
  'Juan Torres', 'Luis Ramírez', 'Miguel Flores', 'Antonio Ruiz', 'Francisco Vásquez'
];

const comunas = ['Quilpué', 'Villa Alemana', 'Limache', 'Olmué', 'Valparaíso', 'Viña del Mar'];
const consultorios = ['Consultorio 1', 'Consultorio 2', 'Consultorio 3', 'CESFAM Norte', 'CESFAM Sur'];
const tiposParto = ['VAGINAL', 'INSTRUMENTAL', 'CES ELE', 'CES URG', 'EXTRAHOSPITALARIO'];
const paridades = ['PRIMIPARA', 'MULTIPARA'];
const presentaciones = ['CEFALICA', 'PODALICA', 'TRANSVERSA'];
const sexos = ['MASCULINO', 'FEMENINO', 'INDETERMINADO'];
const tiposAnestesia = ['RAQUIDEA', 'PERIDURAL', 'GENERAL', 'SIN ANESTESIA', 'COMBINADA'];
const medicos = ['Dr. Juan Pérez', 'Dr. Carlos González', 'Dra. María López', 'Dra. Ana Martínez'];
const matronas = ['Matrona Carmen Silva', 'Matrona Patricia Torres', 'Matrona Rosa Fernández'];

// Función para generar un parto ficticio
function generarPartoFicticio(index) {
  const rut = generarRUT();
  const fechaData = generarFecha();
  const tipoParto = tiposParto[Math.floor(Math.random() * tiposParto.length)];
  const esCesarea = tipoParto === 'CES ELE' || tipoParto === 'CES URG';
  const esGemelar = Math.random() < 0.1; // 10% de probabilidad de ser gemelar
  
  const parto = {
    trace_id: `TRACE-${Date.now()}-${index}`,
    correlativo: null, // Se genera automáticamente
    creado_por: 'admin',
    n_parto_ano: fechaData.año,
    n_parto_mes: fechaData.mes,
    fecha_parto: fechaData.fecha,
    hora_parto: fechaData.hora,
    mes_parto: fechaData.mes,
    tipo_parto: tipoParto,
    
    // Datos de la madre
    nombre_y_apellido: nombres[Math.floor(Math.random() * nombres.length)],
    rut: rut.formateado,
    rut_normalized: rut.normalizado,
    edad: Math.floor(Math.random() * 25) + 18, // Entre 18 y 43 años
    pueblo_originario: Math.random() < 0.15 ? 1 : 0,
    nombre_pueblo_originario: Math.random() < 0.15 ? 'Mapuche' : null,
    migrante: Math.random() < 0.1 ? 1 : 0,
    nacionalidad: Math.random() < 0.1 ? 'Venezolana' : 'Chilena',
    discapacidad: Math.random() < 0.05 ? 1 : 0,
    telefono: `+569${Math.floor(Math.random() * 90000000) + 10000000}`,
    comuna: comunas[Math.floor(Math.random() * comunas.length)],
    consultorio: consultorios[Math.floor(Math.random() * consultorios.length)],
    paridad: paridades[Math.floor(Math.random() * paridades.length)],
    cca: Math.random() < 0.2 ? 1 : 0,
    presentacion: presentaciones[Math.floor(Math.random() * presentaciones.length)],
    gemela: esGemelar ? 1 : 0,
    
    // Datos del embarazo
    eg: (Math.random() * 5 + 37).toFixed(1), // Entre 37 y 42 semanas
    dias: Math.floor(Math.random() * 7),
    induccion: Math.random() < 0.3 ? 1 : 0,
    tipo_induccion: Math.random() < 0.3 ? ['MECANICA', 'FARMACOLOGICA', 'COMBINADA'][Math.floor(Math.random() * 3)] : null,
    trabajo_parto: Math.random() < 0.7 ? 1 : 0,
    conduccion_ocitocica: Math.random() < 0.4 ? 1 : 0,
    libertad_movimiento_tdp: Math.random() < 0.6 ? 1 : 0,
    episiotomia: tipoParto === 'VAGINAL' && Math.random() < 0.3 ? 1 : 0,
    desgarro: tipoParto === 'VAGINAL' ? (Math.random() < 0.2 ? ['GI', 'GII', 'GIII'][Math.floor(Math.random() * 3)] : 'NO') : 'NO',
    ligadura_tardia_cordon: Math.random() < 0.5 ? 1 : 0,
    atencion_pertinencia_cultural: Math.random() < 0.1 ? 1 : 0,
    plan_parto: Math.random() < 0.4 ? 1 : 0,
    
    // Cesárea
    causa_cesarea: esCesarea ? 'Indicación obstétrica' : null,
    medico_indica_cesarea: esCesarea ? medicos[Math.floor(Math.random() * medicos.length)] : null,
    medico_operador_cesarea: esCesarea ? medicos[Math.floor(Math.random() * medicos.length)] : null,
    clasificacion_robson: esCesarea ? `GRUPO ${Math.floor(Math.random() * 10) + 1}` : null,
    
    // Anestesia
    tipo_anestesia: tipoParto === 'VAGINAL' ? (Math.random() < 0.3 ? 'SIN ANESTESIA' : tiposAnestesia[Math.floor(Math.random() * tiposAnestesia.length)]) : tiposAnestesia[Math.floor(Math.random() * tiposAnestesia.length)],
    hora_anestesia: esCesarea ? fechaData.hora : null,
    medico_anestesista: (tipoParto !== 'VAGINAL' || Math.random() < 0.3) ? medicos[Math.floor(Math.random() * medicos.length)] : null,
    anestesia_local: tipoParto === 'VAGINAL' && Math.random() < 0.2 ? 1 : 0,
    
    // Exámenes
    grupo_rh: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'][Math.floor(Math.random() * 8)],
    chagas: Math.random() < 0.95 ? 0 : 1,
    vih: Math.random() < 0.98 ? 0 : 1,
    vih_al_parto: Math.random() < 0.98 ? 0 : 1,
    rpr_vdrl: Math.random() < 0.95 ? 0 : 1,
    hepatitis_b: Math.random() < 0.97 ? 0 : 1,
    sgb: ['NEGATIVO', 'POSITIVO', 'TOMADO'][Math.floor(Math.random() * 3)],
    emb_controlado: Math.random() < 0.8 ? 1 : 0,
    
    // Recién nacido
    peso: Math.floor(Math.random() * 2000) + 2500, // Entre 2500 y 4500g
    talla: (Math.random() * 15 + 45).toFixed(1), // Entre 45 y 60 cm
    cc: (Math.random() * 5 + 32).toFixed(1), // Entre 32 y 37 cm
    apgar1: Math.floor(Math.random() * 3) + 7, // Entre 7 y 10
    apgar5: Math.floor(Math.random() * 2) + 8, // Entre 8 y 10
    apgar10: Math.floor(Math.random() * 2) + 9, // Entre 9 y 10
    sexo: sexos[Math.floor(Math.random() * sexos.length)],
    malformaciones: Math.random() < 0.05 ? 1 : 0,
    
    // Personal médico
    medico_obstetra: medicos[Math.floor(Math.random() * medicos.length)],
    medico_pediatra: medicos[Math.floor(Math.random() * medicos.length)],
    matrona_preparto: matronas[Math.floor(Math.random() * matronas.length)],
    matrona_parto: matronas[Math.floor(Math.random() * matronas.length)],
    matrona_rn: matronas[Math.floor(Math.random() * matronas.length)],
    
    // Acompañamiento
    acompanamiento_preparto: Math.random() < 0.7 ? 1 : 0,
    acompanamiento_parto: Math.random() < 0.8 ? 1 : 0,
    acompanamiento_puerperio: Math.random() < 0.6 ? 1 : 0,
    acompanamiento_rn: Math.random() < 0.5 ? 1 : 0,
    nombre_acompanante: Math.random() < 0.7 ? 'Esposo/Esposa' : null,
    parentesco_acompanante_madre: Math.random() < 0.7 ? 'Esposo' : null,
    parentesco_acompanante_rn: Math.random() < 0.5 ? 'Padre' : null,
    apego_piel_30min: Math.random() < 0.7 ? (Math.random() < 0.8 ? 1 : 2) : 0, // 1=MADRE, 2=PADRE
    lactancia_precoz_60min: Math.random() < 0.8 ? 1 : 0,
    
    // Otros
    destino: ['Domicilio', 'Hospitalización', 'UCI Neonatal'][Math.floor(Math.random() * 3)],
    taller_chcc: Math.random() < 0.3 ? 1 : 0,
    privada_libertad: Math.random() < 0.02 ? 1 : 0,
    trans_no_binario: Math.random() < 0.01 ? 1 : 0,
    comentarios: Math.random() < 0.2 ? 'Parto sin complicaciones' : null
  };
  
  // Si es gemelar, agregar datos del segundo recién nacido
  if (esGemelar) {
    parto.peso2 = Math.floor(Math.random() * 2000) + 2000; // Entre 2000 y 4000g
    parto.talla2 = (Math.random() * 15 + 40).toFixed(1);
    parto.cc2 = (Math.random() * 5 + 30).toFixed(1);
    parto.apgar1_2 = Math.floor(Math.random() * 3) + 7;
    parto.apgar5_2 = Math.floor(Math.random() * 2) + 8;
    parto.apgar10_2 = Math.floor(Math.random() * 2) + 9;
    parto.sexo2 = sexos[Math.floor(Math.random() * sexos.length)];
    parto.malformaciones2 = Math.random() < 0.05 ? 1 : 0;
  }
  
  return parto;
}

// Función para insertar datos
async function seedData(cantidad = 50) {
  try {
    console.log(`🔄 Iniciando carga de ${cantidad} registros ficticios...`);
    
    // Verificar conexión
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL verificada');
    
    // Obtener el siguiente correlativo
    const correlativoResult = await pool.query('SELECT MAX(correlativo) as max FROM partos');
    let siguienteCorrelativo = 1;
    if (correlativoResult.rows[0]?.max) {
      siguienteCorrelativo = parseInt(correlativoResult.rows[0].max) + 1;
    }
    
    let insertados = 0;
    let errores = 0;
    
    for (let i = 0; i < cantidad; i++) {
      try {
        const parto = generarPartoFicticio(i);
        parto.correlativo = siguienteCorrelativo + i;
        
        // Construir la consulta INSERT
        const campos = Object.keys(parto);
        const valores = Object.values(parto);
        const placeholders = valores.map((_, idx) => `$${idx + 1}`).join(', ');
        
        const query = `
          INSERT INTO partos (${campos.join(', ')})
          VALUES (${placeholders})
          RETURNING id, trace_id, correlativo
        `;
        
        await pool.query(query, valores);
        insertados++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`   Procesados: ${i + 1}/${cantidad}...`);
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error insertando registro ${i + 1}:`, error.message);
      }
    }
    
    console.log('\n✅ Carga de datos completada!');
    console.log(`📊 Total insertados: ${insertados}`);
    console.log(`❌ Total errores: ${errores}`);
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en carga de datos:', error);
    await pool.end();
    process.exit(1);
  }
}

// Ejecutar
const cantidad = process.argv[2] ? parseInt(process.argv[2]) : 50;
seedData(cantidad);
