// Copia de la función parseData para uso en scripts del servidor
// Esta es una versión simplificada que funciona en Node.js

import fs from 'fs';

// Función para generar un ID único basado en el contenido del registro
function generateUniqueId(item, index) {
  const key = `${item.nPartoAno || ''}_${item.nPartoMes || ''}_${item.fechaParto || ''}_${item.rut || ''}_${item.nombreYApellido || ''}_${index}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `PARTO_${Math.abs(hash)}_${Date.now()}_${index}`;
}

// Función para normalizar RUT (eliminar puntos y guiones)
function normalizeRUT(rut) {
  if (!rut) return null;
  return String(rut).replace(/[.\-]/g, '').toUpperCase().trim();
}

// Funciones auxiliares para limpiar valores
function cleanValue(value) {
  if (!value || value === undefined) return null;
  const cleaned = String(value).trim();
  if (cleaned === '' || cleaned === 'NA' || cleaned === 'na') return null;
  return cleaned;
}

function cleanNumber(value) {
  if (!value) return null;
  const num = parseInt(String(value).trim());
  return isNaN(num) ? null : num;
}

function cleanFloat(value) {
  if (!value) return null;
  const num = parseFloat(String(value).trim());
  return isNaN(num) ? null : num;
}

export function parseData(text) {
  if (!text || typeof text !== 'string') {
    console.error('parseData: texto inválido');
    return [];
  }
  
  const lines = text.trim().split('\n');
  const data = [];
  const rutMap = {}; // Mapa para relacionar partos por RUT de la madre
  
  lines.forEach((line, index) => {
    try {
      if (!line.trim()) return;
      
      const values = line.split('\t');
      
      // Validar que haya suficientes columnas
      if (values.length < 10) {
        console.warn(`Línea ${index + 1} tiene muy pocas columnas (${values.length}), se omite`);
        return;
      }
      
      const item = {};
      
      // Mapeo completo del archivo datos.txt (mismo que en src/utils/dataParser.js)
      item.nPartoAno = cleanNumber(values[0]);
      item.nPartoMes = cleanNumber(values[1]);
      
      // Parsear fecha correctamente (formato MM/DD/YYYY)
      const fechaRaw = cleanValue(values[2]);
      if (fechaRaw) {
        const dateParts = fechaRaw.split('/');
        if (dateParts.length === 3) {
          const month = parseInt(dateParts[0]);
          const day = parseInt(dateParts[1]);
          const year = parseInt(dateParts[2]);
          
          if (!isNaN(month) && !isNaN(day) && !isNaN(year) && 
              month >= 1 && month <= 12 && 
              day >= 1 && day <= 31 && 
              year >= 2000 && year <= 2100) {
            item.fechaParto = fechaRaw;
            item.mesParto = month;
          } else {
            console.warn(`Fecha inválida en línea ${index + 1}: ${fechaRaw}`);
            item.fechaParto = null;
            item.mesParto = null;
          }
        } else {
          item.fechaParto = fechaRaw;
          item.mesParto = null;
        }
      } else {
        item.fechaParto = null;
        item.mesParto = null;
      }
      
      item.horaParto = cleanValue(values[3]);
      
      // Normalizar tipo de parto
      const tipoPartoRaw = cleanValue(values[4]);
      if (tipoPartoRaw) {
        const tipoUpper = tipoPartoRaw.toUpperCase().trim();
        if (tipoUpper.includes('VAGINAL')) {
          item.tipoParto = 'VAGINAL';
        } else if (tipoUpper.includes('CES ELE') || tipoUpper === 'CES ELE') {
          item.tipoParto = 'CES ELE';
        } else if (tipoUpper.includes('CES URG') || tipoUpper === 'CES URG') {
          item.tipoParto = 'CES URG';
        } else if (tipoUpper.includes('EXTRAHOSPITALARIO')) {
          item.tipoParto = 'EXTRAHOSPITALARIO';
        } else {
          item.tipoParto = tipoUpper;
        }
      } else {
        item.tipoParto = null;
      }
      
      // Datos de la madre
      item.nombreYApellido = cleanValue(values[5]);
      item.rut = cleanValue(values[6]);
      item.edad = cleanNumber(values[7]);
      item.puebloOriginario = cleanValue(values[8]) || 'NO';
      item.nombrePuebloOriginario = cleanValue(values[9]);
      item.migrante = cleanValue(values[10]) || 'NO';
      item.nacionalidad = cleanValue(values[11]);
      item.embControlado = cleanValue(values[12]) || 'NO';
      item.discapacidad = 'NO';
      item.telefono = cleanValue(values[13]);
      item.comuna = cleanValue(values[14]);
      item.consultorio = cleanValue(values[15]);
      
      // Normalizar paridad
      const paridadRaw = cleanValue(values[16]);
      if (paridadRaw) {
        const paridadUpper = paridadRaw.toUpperCase().trim();
        if (paridadUpper.includes('PRIMIPARA') || paridadUpper === 'PRIMIPARA') {
          item.paridad = 'PRIMIPARA';
        } else if (paridadUpper.includes('MULTIPARA') || paridadUpper === 'MULTIPARA') {
          item.paridad = 'MULTIPARA';
        } else {
          item.paridad = paridadUpper;
        }
      } else {
        item.paridad = null;
      }
      
      item.cca = cleanValue(values[17]) || 'NO';
      
      // Normalizar presentación
      const presentacionRaw = cleanValue(values[18]);
      if (presentacionRaw) {
        const presentacionUpper = presentacionRaw.toUpperCase().trim();
        if (presentacionUpper.includes('CEFALICA') || presentacionUpper === 'CEFALICA') {
          item.presentacion = 'CEFALICA';
        } else if (presentacionUpper.includes('PODALICA')) {
          item.presentacion = 'PODALICA';
        } else if (presentacionUpper.includes('TRANSVERSA')) {
          item.presentacion = 'TRANSVERSA';
        } else {
          item.presentacion = presentacionUpper;
        }
      } else {
        item.presentacion = null;
      }
      
      item.gemela = cleanValue(values[19]) || 'NO';
      item.eg = cleanFloat(values[20]);
      item.dias = cleanNumber(values[21]);
      item.roturaMembranas = cleanValue(values[22]) || null;
      item.induccion = cleanValue(values[23]) || 'NO';
      item.misotrol = cleanValue(values[24]) || null;
      item.conduccionOcitocica = cleanValue(values[25]) || 'NO';
      item.monitoreo = cleanValue(values[26]) || null;
      item.libertadDeMovimientoOEnTDP = cleanValue(values[27]) || 'NO';
      item.posicionMaternaEnElExpulsivo = cleanValue(values[28]);
      item.episiotomia = cleanValue(values[32]) || 'NO';
      item.desgarro = cleanValue(values[33]) || 'NO';
      
      // La posición 34 puede ser manejoDolor O causaCesarea
      if (item.tipoParto && (item.tipoParto.includes('CES') || item.tipoParto.includes('CESAREA'))) {
        item.causaCesarea = cleanValue(values[34]) || null;
        item.medidasNoFarmacologicasParaElDolorCuales = null;
      } else {
        item.causaCesarea = null;
        item.medidasNoFarmacologicasParaElDolorCuales = cleanValue(values[34]);
      }
      
      item.eq = cleanValue(values[35]) || 'NO';
      item.tipoDeAnestesia = cleanValue(values[36]) || 'SIN ANESTESIA';
      item.horaDeAnestesia = cleanValue(values[37]);
      item.medicoAnestesista = cleanValue(values[38]);
      item.anestesiaLocal = cleanValue(values[40]) || 'NO';
      item.manejoFarmacologicoDelDolor = cleanValue(values[41]) || 'NO';
      item.manejoNoFarmacologicoDelDolor = cleanValue(values[43]) || 'NO';
      
      // Datos del recién nacido
      item.grupoRH = cleanValue(values[44]);
      item.chagas = cleanValue(values[45]) || 'NEGATIVO';
      item.vih = cleanValue(values[46]) || 'NEGATIVO';
      item.hepatitisB = cleanValue(values[47]) || 'NEGATIVO';
      item.vihAlParto = cleanValue(values[50]) || 'NEGATIVO';
      item.peso = cleanFloat(values[52]);
      item.talla = cleanFloat(values[53]);
      item.cc = cleanFloat(values[54]);
      item.apgar1 = cleanNumber(values[55]);
      item.apgar5 = cleanNumber(values[56]);
      item.apgar10 = null;
      
      // Normalizar sexo
      const sexoRaw = cleanValue(values[58]);
      if (sexoRaw) {
        const sexoUpper = sexoRaw.toUpperCase().trim();
        if (sexoUpper === 'FEMENINO' || sexoUpper === 'MASCULINO' || sexoUpper === 'INDETERMINADO') {
          item.sexo = sexoUpper;
        } else if (sexoUpper === 'F' || sexoUpper === 'FEM') {
          item.sexo = 'FEMENINO';
        } else if (sexoUpper === 'M' || sexoUpper === 'MASC') {
          item.sexo = 'MASCULINO';
        } else {
          item.sexo = null;
        }
      } else {
        item.sexo = null;
      }
      
      item.malformaciones = cleanValue(values[59]) || 'NO';
      item.matronaPreparto = cleanValue(values[64]);
      item.acompanamientoPreparto = cleanValue(values[65]) || 'NO';
      item.acompanamientoParto = cleanValue(values[66]) || 'NO';
      item.acompanamientoPuerperioInmediato = cleanValue(values[67]) || 'NO';
      item.nombreAcompanante = cleanValue(values[68]);
      item.parentescoAcompananteRespectoAMadre = cleanValue(values[69]);
      item.apegoConPiel30Min = cleanValue(values[71]) || 'NO';
      item.parentescoAcompananteRespectoARN = cleanValue(values[72]);
      item.lactanciaPrecoz60MinDeVida = cleanValue(values[74]) || 'NO';
      item.destino = cleanValue(values[78]);
      item.comentarios = cleanValue(values[79]) || null;
      
      // Mapear alojamiento conjunto basándose en destino
      if (item.destino) {
        const destinoUpper = item.destino.toUpperCase().trim();
        if (destinoUpper.includes('SALA') && !destinoUpper.includes('NO')) {
          item.alojamientoConjunto = 'SI';
        } else {
          item.alojamientoConjunto = 'NO';
        }
      } else {
        item.alojamientoConjunto = 'NO';
      }
      
      // Campos por defecto
      item.planDeParto = 'NO';
      item.trabajoDeParto = 'NO';
      item.motivoSinLibertadDeMovimiento = null;
      item.regimenHidricoAmplioEnTDP = 'NO';
      item.ligaduraTardiaCordon = 'NO';
      item.atencionConPertinenciaCultural = 'NO';
      item.motivoNoAnestesia = null;
      item.alumbramientoConducido = 'NO';
      item.rprVdrl = cleanValue(values[45]) || 'NEGATIVO';
      item.sgb = null;
      item.sgbConTratamientoAlParto = null;
      item.medicoObstetra = null;
      item.medicoPediatra = null;
      item.matronaParto = null;
      item.matronaRN = null;
      item.causaNoApego = null;
      item.acompanamientoRN = 'NO';
      
      if (!item.embControlado || item.embControlado === '' || item.embControlado === 'NA') {
        item.embControlado = 'NO';
      }
      
      item.tallerCHCC = 'NO';
      item.privadaDeLibertad = 'NO';
      item.transNoBinario = 'NO';
      
      // Limpiar valores vacíos
      Object.keys(item).forEach(key => {
        if (item[key] === '' || item[key] === 'NA' || item[key] === 'na' || item[key] === ' ') {
          item[key] = null;
        }
      });
      
      // Normalizar campos booleanos a números (1 = SI/SÍ, 0 = NO/null)
      const camposBooleanos = [
        'puebloOriginario', 'migrante', 'discapacidad', 'cca', 'gemela', 'induccion',
        'conduccionOcitocica', 'libertadDeMovimientoOEnTDP', 'episiotomia',
        'anestesiaLocal', 'manejoFarmacologicoDelDolor', 'manejoNoFarmacologicoDelDolor',
        'alumbramientoConducido', 'planDeParto', 'trabajoDeParto', 'regimenHidricoAmplioEnTDP',
        'ligaduraTardiaCordon', 'atencionConPertinenciaCultural', 'alojamientoConjunto',
        'acompanamientoPreparto', 'acompanamientoParto', 'acompanamientoPuerperioInmediato',
        'acompanamientoRN', 'lactanciaPrecoz60MinDeVida', 'embControlado', 'tallerCHCC',
        'privadaDeLibertad', 'transNoBinario', 'malformaciones'
      ];
      
      camposBooleanos.forEach(campo => {
        try {
          if (typeof item[campo] === 'number') {
            item[campo] = item[campo] === 1 ? 1 : 0;
            return;
          }
          
          if (item[campo] !== null && item[campo] !== undefined) {
            const valor = String(item[campo]).toUpperCase().trim();
            if (valor === 'SI' || valor === 'SÍ' || valor === '1' || valor === 'TRUE') {
              item[campo] = 1;
            } else if (valor === 'NO' || valor === '0' || valor === 'FALSE' || valor === '') {
              item[campo] = 0;
            } else {
              item[campo] = 0;
            }
          } else {
            item[campo] = 0;
          }
        } catch (err) {
          console.warn(`Error normalizando campo ${campo} en línea ${index + 1}:`, err);
          item[campo] = 0;
        }
      });
      
      // Normalizar campos de exámenes
      const camposExamenes = ['chagas', 'vih', 'hepatitisB'];
      camposExamenes.forEach(campo => {
        try {
          if (item[campo] !== null && item[campo] !== undefined) {
            const valor = String(item[campo]).toUpperCase().trim();
            if (valor === 'POSITIVO' || valor === 'SI' || valor === 'SÍ' || valor === '1' || valor === 'TRUE') {
              item[campo] = 1;
            } else {
              item[campo] = 0;
            }
          } else {
            item[campo] = 0;
          }
        } catch (err) {
          console.warn(`Error normalizando campo de examen ${campo} en línea ${index + 1}:`, err);
          item[campo] = 0;
        }
      });
      
      // vihAlParto
      try {
        if (item.vihAlParto !== null && item.vihAlParto !== undefined) {
          const valor = String(item.vihAlParto).toUpperCase().trim();
          if (valor === 'POSITIVO' || valor === 'TOMADO') {
            item.vihAlParto = 1;
            item.vihAlPartoOriginal = valor;
          } else {
            item.vihAlParto = 0;
            item.vihAlPartoOriginal = valor || 'NEGATIVO';
          }
        } else {
          item.vihAlParto = 0;
          item.vihAlPartoOriginal = 'NEGATIVO';
        }
      } catch (err) {
        console.warn(`Error normalizando vihAlParto en línea ${index + 1}:`, err);
        item.vihAlParto = 0;
        item.vihAlPartoOriginal = 'NEGATIVO';
      }
      
      // rprVdrl
      try {
        if (item.rprVdrl !== null && item.rprVdrl !== undefined) {
          const valor = String(item.rprVdrl).toUpperCase().trim();
          if (valor === 'POSITIVO' || valor === 'SI' || valor === 'SÍ' || valor === '1' || valor === 'TRUE') {
            item.rprVdrl = 1;
          } else {
            item.rprVdrl = 0;
          }
        } else {
          item.rprVdrl = 0;
        }
      } catch (err) {
        console.warn(`Error normalizando rprVdrl en línea ${index + 1}:`, err);
        item.rprVdrl = 0;
      }
      
      // Normalizar apegoConPiel30Min
      try {
        if (item.apegoConPiel30Min !== null && item.apegoConPiel30Min !== undefined) {
          const apegoUpper = String(item.apegoConPiel30Min).toUpperCase().trim();
          item.apegoConPiel30MinOriginal = item.apegoConPiel30Min;
          if (apegoUpper === 'MADRE' || apegoUpper === 'SI' || apegoUpper === 'SÍ') {
            item.apegoConPiel30Min = 1;
            item.apegoConPiel30MinMadre = 1;
            item.apegoConPiel30MinPadre = 0;
          } else if (apegoUpper === 'PADRE' || apegoUpper.includes('PADRE')) {
            item.apegoConPiel30Min = 2;
            item.apegoConPiel30MinMadre = 0;
            item.apegoConPiel30MinPadre = 1;
          } else if (apegoUpper === 'OTRA PERSONA SIGNIFICATIVA' || apegoUpper.includes('OTRA')) {
            item.apegoConPiel30Min = 3;
            item.apegoConPiel30MinMadre = 0;
            item.apegoConPiel30MinPadre = 1;
          } else {
            item.apegoConPiel30Min = 0;
            item.apegoConPiel30MinMadre = 0;
            item.apegoConPiel30MinPadre = 0;
          }
        } else {
          item.apegoConPiel30Min = 0;
          item.apegoConPiel30MinMadre = 0;
          item.apegoConPiel30MinPadre = 0;
        }
      } catch (err) {
        console.error(`Error normalizando apegoConPiel30Min en línea ${index + 1}:`, err);
        item.apegoConPiel30Min = 0;
        item.apegoConPiel30MinMadre = 0;
        item.apegoConPiel30MinPadre = 0;
      }
      
      // Campos adicionales para compatibilidad
      item.numero = item.nPartoAno ? item.nPartoAno.toString() : (index + 1).toString();
      item.id = item.nPartoMes ? item.nPartoMes.toString() : item.numero;
      item.fecha = item.fechaParto;
      item.hora = item.horaParto;
      item.nombre = item.nombreYApellido;
      item.semanasGestacion = item.eg;
      item.tipoAnestesia = item.tipoDeAnestesia;
      item.perimetroCefalico = item.cc;
      
      // Trazabilidad
      item._traceId = generateUniqueId(item, index);
      
      item._traceMetadata = {
        createdAt: new Date().toISOString(),
        source: 'datos.txt',
        sourceLine: index + 1,
        version: '1.0',
        lastModified: new Date().toISOString(),
        dataHash: `${item.nPartoAno || ''}_${item.fechaParto || ''}_${item.rut || ''}`
      };
      
      // Normalizar RUT para relaciones
      const normalizedRUT = normalizeRUT(item.rut);
      item._rutNormalized = normalizedRUT;
      
      // Relaciones
      item._relations = {
        relatedPartos: [],
        sameConsultorio: [],
        sameComuna: [],
        sameMonth: [],
        sameMedicoObstetra: [],
        sameMatrona: []
      };
      
      // Agregar al mapa de RUTs
      if (normalizedRUT) {
        if (!rutMap[normalizedRUT]) {
          rutMap[normalizedRUT] = [];
        }
        rutMap[normalizedRUT].push(item._traceId);
      }
      
      // Estructura de datos para análisis
      item._structuredData = {
        identifiers: {
          traceId: item._traceId,
          numero: item.numero,
          rut: normalizedRUT,
          nombre: item.nombreYApellido
        },
        temporal: {
          fechaParto: item.fechaParto,
          horaParto: item.horaParto,
          nPartoAno: item.nPartoAno,
          nPartoMes: item.nPartoMes,
          mesParto: item.mesParto
        },
        madre: {
          nombre: item.nombreYApellido,
          rut: normalizedRUT,
          edad: item.edad,
          comuna: item.comuna,
          consultorio: item.consultorio,
          puebloOriginario: item.puebloOriginario,
          migrante: item.migrante,
          nacionalidad: item.nacionalidad,
          discapacidad: item.discapacidad,
          paridad: item.paridad
        },
        parto: {
          tipo: item.tipoParto,
          eg: item.eg,
          dias: item.dias,
          planDeParto: item.planDeParto,
          induccion: item.induccion,
          trabajoDeParto: item.trabajoDeParto,
          episiotomia: item.episiotomia,
          desgarro: item.desgarro,
          tipoDeAnestesia: item.tipoDeAnestesia,
          medicoObstetra: item.medicoObstetra,
          matronaParto: item.matronaParto
        },
        recienNacido: {
          peso: item.peso,
          talla: item.talla,
          cc: item.cc,
          apgar1: item.apgar1,
          apgar5: item.apgar5,
          apgar10: item.apgar10,
          sexo: item.sexo,
          malformaciones: item.malformaciones,
          medicoPediatra: item.medicoPediatra
        },
        indicadores: {
          embControlado: item.embControlado,
          lactanciaPrecoz: item.lactanciaPrecoz60MinDeVida,
          apegoConPiel: item.apegoConPiel30Min,
          acompanamiento: {
            preparto: item.acompanamientoPreparto,
            parto: item.acompanamientoParto,
            puerperio: item.acompanamientoPuerperioInmediato,
            rn: item.acompanamientoRN
          }
        }
      };
      
      data.push(item);
    } catch (err) {
      console.error(`Error procesando línea ${index + 1}:`, err);
    }
  });
  
  // Crear relaciones entre registros
  data.forEach((item, index) => {
    // Relaciones por RUT (misma madre)
    if (item._rutNormalized && rutMap[item._rutNormalized]) {
      item._relations.relatedPartos = rutMap[item._rutNormalized]
        .filter(traceId => traceId !== item._traceId)
        .map(traceId => {
          const relatedItem = data.find(d => d._traceId === traceId);
          return relatedItem ? {
            traceId: traceId,
            fechaParto: relatedItem.fechaParto,
            tipoParto: relatedItem.tipoParto,
            numero: relatedItem.numero
          } : null;
        }).filter(Boolean);
    }
    
    // Relaciones por consultorio
    if (item.consultorio) {
      item._relations.sameConsultorio = data
        .filter(d => d.consultorio === item.consultorio && d._traceId !== item._traceId)
        .map(d => d._traceId);
    }
    
    // Relaciones por comuna
    if (item.comuna) {
      item._relations.sameComuna = data
        .filter(d => d.comuna === item.comuna && d._traceId !== item._traceId)
        .map(d => d._traceId);
    }
    
    // Relaciones por mes
    if (item.mesParto && item.nPartoAno) {
      item._relations.sameMonth = data
        .filter(d => d.mesParto === item.mesParto && 
                     d.nPartoAno === item.nPartoAno && 
                     d._traceId !== item._traceId)
        .map(d => d._traceId);
    }
    
    // Relaciones por médico obstetra
    if (item.medicoObstetra) {
      item._relations.sameMedicoObstetra = data
        .filter(d => d.medicoObstetra === item.medicoObstetra && d._traceId !== item._traceId)
        .map(d => d._traceId);
    }
    
    // Relaciones por matrona
    if (item.matronaParto) {
      item._relations.sameMatrona = data
        .filter(d => d.matronaParto === item.matronaParto && d._traceId !== item._traceId)
        .map(d => d._traceId);
    }
    
    // Contadores de relaciones
    item._relationCounts = {
      totalRelatedPartos: item._relations.relatedPartos.length,
      totalSameConsultorio: item._relations.sameConsultorio.length,
      totalSameComuna: item._relations.sameComuna.length,
      totalSameMonth: item._relations.sameMonth.length,
      totalSameMedico: item._relations.sameMedicoObstetra.length,
      totalSameMatrona: item._relations.sameMatrona.length
    };
  });
  
  console.log(`✅ Datos parseados con trazabilidad: ${data.length} registros`);
  console.log(`📊 Relaciones creadas: ${Object.keys(rutMap).length} madres únicas`);
  
  return data;
}

