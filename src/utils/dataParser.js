// Función para generar un ID único basado en el contenido del registro
function generateUniqueId(item, index) {
  // Crear un hash único basado en los datos del registro
  const key = `${item.nPartoAno || ''}_${item.nPartoMes || ''}_${item.fechaParto || ''}_${item.rut || ''}_${item.nombreYApellido || ''}_${index}`
  // Generar un hash simple
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convertir a 32bit integer
  }
  return `PARTO_${Math.abs(hash)}_${Date.now()}_${index}`
}

// Función para normalizar RUT (eliminar puntos y guiones)
function normalizeRUT(rut) {
  if (!rut) return null
  return String(rut).replace(/[.\-]/g, '').toUpperCase().trim()
}

export function parseData(text) {
  if (!text || typeof text !== 'string') {
    console.error('parseData: texto inválido')
    return []
  }
  
  const lines = text.trim().split('\n')
  const data = []
  const rutMap = {} // Mapa para relacionar partos por RUT de la madre
  
  lines.forEach((line, index) => {
    try {
      if (!line.trim()) return
      
      const values = line.split('\t')
      
      // Validar que haya suficientes columnas
      if (values.length < 10) {
        console.warn(`Línea ${index + 1} tiene muy pocas columnas (${values.length}), se omite`)
        return
      }
      
      const item = {}
      
      // Mapeo completo del archivo datos.txt a las variables especificadas
      // Orden del archivo -> Variable especificada
      
      // Datos generales
      item.nPartoAno = cleanNumber(values[0]) // posición 0: numero
      item.nPartoMes = cleanNumber(values[1]) // posición 1: id (usado como mes)
      
      // Parsear fecha correctamente (formato MM/DD/YYYY según el usuario)
      const fechaRaw = cleanValue(values[2])
      if (fechaRaw) {
        const dateParts = fechaRaw.split('/')
        if (dateParts.length === 3) {
          const month = parseInt(dateParts[0])
          const day = parseInt(dateParts[1])
          const year = parseInt(dateParts[2])
          
          // Validar que sea una fecha válida
          // El formato es MM/DD/YYYY, entonces el primer número es el mes
          if (!isNaN(month) && !isNaN(day) && !isNaN(year) && 
              month >= 1 && month <= 12 && 
              day >= 1 && day <= 31 && 
              year >= 2000 && year <= 2100) { // Validar año completo (4 dígitos)
            item.fechaParto = fechaRaw
            // Guardar también el mes extraído para facilitar filtros
            item.mesParto = month
          } else {
            // Fecha inválida - puede ser formato incorrecto o año incompleto
            console.warn(`Fecha inválida o mal formateada en línea ${index + 1}: ${fechaRaw} (mes: ${month}, día: ${day}, año: ${year})`)
            item.fechaParto = null
            item.mesParto = null
          }
        } else {
          item.fechaParto = fechaRaw
          item.mesParto = null
        }
      } else {
        item.fechaParto = null
        item.mesParto = null
      }
      
      item.horaParto = cleanValue(values[3]) // posición 3: hora
      // Normalizar tipo de parto
      const tipoPartoRaw = cleanValue(values[4])
      if (tipoPartoRaw) {
        const tipoUpper = tipoPartoRaw.toUpperCase().trim()
        // Normalizar variaciones comunes
        if (tipoUpper.includes('VAGINAL')) {
          item.tipoParto = 'VAGINAL'
        } else if (tipoUpper.includes('CES ELE') || tipoUpper === 'CES ELE') {
          item.tipoParto = 'CES ELE'
        } else if (tipoUpper.includes('CES URG') || tipoUpper === 'CES URG') {
          item.tipoParto = 'CES URG'
        } else if (tipoUpper.includes('EXTRAHOSPITALARIO')) {
          item.tipoParto = 'EXTRAHOSPITALARIO'
        } else {
          item.tipoParto = tipoUpper
        }
      } else {
        item.tipoParto = null
      }
      
      // Datos de la madre
      item.nombreYApellido = cleanValue(values[5]) // posición 5: nombre
      item.rut = cleanValue(values[6]) // posición 6: rut
      item.edad = cleanNumber(values[7]) // posición 7: edad
      item.puebloOriginario = cleanValue(values[8]) || 'NO' // posición 8: indigena
      item.nombrePuebloOriginario = cleanValue(values[9]) // posición 9: etnia
      item.migrante = cleanValue(values[10]) || 'NO' // posición 10: extranjera
      item.nacionalidad = cleanValue(values[11]) // posición 11: nacionalidad
      // posición 12: EMB controlados (SI = controlado, NO/vacío = no controlado)
      item.embControlado = cleanValue(values[12]) || 'NO' // posición 12: EMB controlados
      // discapacidad: buscar en columnas no mapeadas o usar valor por defecto
      // Por ahora, no hay una columna específica para discapacidad en el archivo
      item.discapacidad = 'NO' // discapacidad - valor por defecto si no está en el archivo
      item.telefono = cleanValue(values[13]) // posición 13: telefono
      item.comuna = cleanValue(values[14]) // posición 14: comuna
      item.consultorio = cleanValue(values[15]) // posición 15: sector
      // Normalizar paridad
      const paridadRaw = cleanValue(values[16])
      if (paridadRaw) {
        const paridadUpper = paridadRaw.toUpperCase().trim()
        if (paridadUpper.includes('PRIMIPARA') || paridadUpper === 'PRIMIPARA') {
          item.paridad = 'PRIMIPARA'
        } else if (paridadUpper.includes('MULTIPARA') || paridadUpper === 'MULTIPARA') {
          item.paridad = 'MULTIPARA'
        } else {
          item.paridad = paridadUpper
        }
      } else {
        item.paridad = null
      }
      item.cca = cleanValue(values[17]) || 'NO' // posición 17: cesareaAnterior
      // Normalizar presentación
      const presentacionRaw = cleanValue(values[18])
      if (presentacionRaw) {
        const presentacionUpper = presentacionRaw.toUpperCase().trim()
        if (presentacionUpper.includes('CEFALICA') || presentacionUpper === 'CEFALICA') {
          item.presentacion = 'CEFALICA'
        } else if (presentacionUpper.includes('PODALICA')) {
          item.presentacion = 'PODALICA'
        } else if (presentacionUpper.includes('TRANSVERSA')) {
          item.presentacion = 'TRANSVERSA'
        } else {
          item.presentacion = presentacionUpper
        }
      } else {
        item.presentacion = null
      }
      item.gemela = cleanValue(values[19]) || 'NO' // posición 19: version
      item.eg = cleanFloat(values[20]) // posición 20: semanasGestacion
      item.dias = cleanNumber(values[21]) // posición 21: dilatacion
      // posición 22: roturaMembranas (no mapeado - podría ser útil para análisis)
      item.roturaMembranas = cleanValue(values[22]) || null // posición 22: roturaMembranas
      item.induccion = cleanValue(values[23]) || 'NO' // posición 23: induccion
      // posición 24: misotrol (no mapeado directamente, pero podría ser parte de inducción)
      item.misotrol = cleanValue(values[24]) || null // posición 24: misotrol
      item.conduccionOcitocica = cleanValue(values[25]) || 'NO' // posición 25: oxitocina
      // posición 26: monitoreo (no mapeado - podría ser útil)
      item.monitoreo = cleanValue(values[26]) || null // posición 26: monitoreo
      item.libertadDeMovimientoOEnTDP = cleanValue(values[27]) || 'NO' // posición 27: acompanamiento
      item.posicionMaternaEnElExpulsivo = cleanValue(values[28]) // posición 28: posicion
      // posición 29: (vacío en el archivo)
      // posición 30: (vacío en el archivo)
      // posición 31: (vacío en el archivo)
      item.episiotomia = cleanValue(values[32]) || 'NO' // posición 32: episiotomia
      // posición 33: desgarro (valores: NO, GI, GII, GIII, GIV, FISURA)
      item.desgarro = cleanValue(values[33]) || 'NO' // posición 33: desgarro
      item.medidasNoFarmacologicasParaElDolorCuales = cleanValue(values[34]) // posición 34: manejoDolor
      // La posición 34 puede ser manejoDolor O causaCesarea dependiendo del tipo de parto
      // Si es cesárea, usar como causaCesarea; si no, usar como manejoDolor
      if (item.tipoParto && (item.tipoParto.includes('CES') || item.tipoParto.includes('CESAREA'))) {
        item.causaCesarea = cleanValue(values[34]) || null
        item.medidasNoFarmacologicasParaElDolorCuales = null
      } else {
        item.causaCesarea = null
        item.medidasNoFarmacologicasParaElDolorCuales = cleanValue(values[34])
      }
      // posición 35: (DILATACION ESTACIONARIA u otra información)
      item.eq = cleanValue(values[35]) || 'NO' // posición 35: puede ser EQ o información adicional
      item.tipoDeAnestesia = cleanValue(values[36]) || 'SIN ANESTESIA' // posición 36: anestesia
      item.horaDeAnestesia = cleanValue(values[37]) // posición 37: tiempoAnestesia
      item.medicoAnestesista = cleanValue(values[38]) // posición 38: medico
      // posición 39: (vacío)
      item.anestesiaLocal = cleanValue(values[40]) || 'NO' // posición 40
      item.manejoFarmacologicoDelDolor = cleanValue(values[41]) || 'NO' // posición 41
      // posición 42: (vacío)
      item.manejoNoFarmacologicoDelDolor = cleanValue(values[43]) || 'NO' // posición 43
      // posición 44: grupoSanguineo (mapeado abajo)
    
      // Datos del recién nacido
      item.grupoRH = cleanValue(values[44]) // posición 44: grupoSanguineo
      item.chagas = cleanValue(values[45]) || 'NEGATIVO' // posición 45: vdrl (mapeado a chagas)
      item.vih = cleanValue(values[46]) || 'NEGATIVO' // posición 46: hiv
      item.hepatitisB = cleanValue(values[47]) || 'NEGATIVO' // posición 47: hepatitisB
      // posición 48: NO REACTIVO (toxoplasma)
      // posición 49: NO REACTIVO (chagas original)
      item.vihAlParto = cleanValue(values[50]) || 'NEGATIVO' // posición 50: chagas (mapeado a vihAlParto)
      // posición 51: NA
      item.peso = cleanFloat(values[52]) // posición 52: peso
      item.talla = cleanFloat(values[53]) // posición 53: talla
      item.cc = cleanFloat(values[54]) // posición 54: perimetroCefalico
      item.apgar1 = cleanNumber(values[55]) // posición 55: apgar1
      item.apgar5 = cleanNumber(values[56]) // posición 56: apgar5
      // posición 57: (vacío - apgar10 no está en archivo original)
      item.apgar10 = null
      // Normalizar sexo - solo aceptar valores válidos
      const sexoRaw = cleanValue(values[58])
      if (sexoRaw) {
      const sexoUpper = sexoRaw.toUpperCase().trim()
      // Validar que sea un valor válido de sexo
      if (sexoUpper === 'FEMENINO' || sexoUpper === 'MASCULINO' || sexoUpper === 'INDETERMINADO') {
        item.sexo = sexoUpper
      } else if (sexoUpper === 'F' || sexoUpper === 'FEM') {
        item.sexo = 'FEMENINO'
      } else if (sexoUpper === 'M' || sexoUpper === 'MASC') {
        item.sexo = 'MASCULINO'
      } else {
        // Si es un número o valor inválido, establecer como null
        item.sexo = null
      }
      } else {
      item.sexo = null
    }
      item.malformaciones = cleanValue(values[59]) || 'NO' // posición 59: reanimacion
      // posición 60-63: apellidos y nombres (no mapeados directamente)
      item.matronaPreparto = cleanValue(values[64]) // posición 64: puede ser matrona
      item.acompanamientoPreparto = cleanValue(values[65]) || 'NO' // posición 65
      item.acompanamientoParto = cleanValue(values[66]) || 'NO' // posición 66
      item.acompanamientoPuerperioInmediato = cleanValue(values[67]) || 'NO' // posición 67
      item.nombreAcompanante = cleanValue(values[68]) // posición 68: acompanante
      item.parentescoAcompananteRespectoAMadre = cleanValue(values[69]) // posición 69: relacionAcompanante
      // posición 70: madre (no mapeado directamente)
      item.apegoConPiel30Min = cleanValue(values[71]) || 'NO' // posición 71: apego piel a piel (valores: NO, MADRE, PADRE, OTRA PERSONA SIGNIFICATIVA)
      item.parentescoAcompananteRespectoARN = cleanValue(values[72]) // posición 72: parentesco acompañante respecto a RN
      // posición 73: (posiblemente información adicional)
      item.lactanciaPrecoz60MinDeVida = cleanValue(values[74]) || 'NO' // posición 74: lactanciaMaterna
      // posiciones 75-77: (posiblemente información adicional)
      item.destino = cleanValue(values[78]) // posición 78: destino
      // posición 79: comentarios
      item.comentarios = cleanValue(values[79]) || null // posición 79: comentarios
    
      // Mapear alojamiento conjunto basándose en destino
      // Si destino contiene "SALA" o similar, indica alojamiento conjunto
      if (item.destino) {
      const destinoUpper = item.destino.toUpperCase().trim()
      if (destinoUpper.includes('SALA') && !destinoUpper.includes('NO')) {
        item.alojamientoConjunto = 'SI'
      } else {
        item.alojamientoConjunto = 'NO'
      }
      } else {
      item.alojamientoConjunto = 'NO'
    }
    
      // Campos que no están en el archivo pero son requeridos - valores por defecto
      item.planDeParto = 'NO'
      item.trabajoDeParto = 'NO'
      item.motivoSinLibertadDeMovimiento = null
      item.regimenHidricoAmplioEnTDP = 'NO'
      item.ligaduraTardiaCordon = 'NO'
      item.atencionConPertinenciaCultural = 'NO'
      item.motivoNoAnestesia = null
      item.alumbramientoConducido = 'NO'
      item.rprVdrl = cleanValue(values[45]) || 'NEGATIVO' // usar posición 45
      item.sgb = null
      item.sgbConTratamientoAlParto = null
      item.medicoObstetra = null
      item.medicoPediatra = null
      item.matronaParto = null
      item.matronaRN = null
      item.causaNoApego = null
      item.acompanamientoRN = 'NO'
      // embControlado ya fue mapeado desde la posición 12 (EMB controlados)
      // Si la posición 12 tiene "SI", el embarazo está controlado
      // Si la posición 12 tiene "NO" o está vacía, el embarazo NO está controlado
      // El valor ya está asignado arriba, solo asegurar que tenga un valor por defecto si está vacío
      if (!item.embControlado || item.embControlado === '' || item.embControlado === 'NA') {
        item.embControlado = 'NO' // Si no hay valor, asumir NO controlado
      }
      // Estos campos no están en el archivo, usar valores por defecto
      item.tallerCHCC = 'NO'
      item.privadaDeLibertad = 'NO'
      item.transNoBinario = 'NO'
      // comentarios ya fue mapeado desde la posición 79 arriba
    
      // Limpiar valores vacíos o "NA"
    Object.keys(item).forEach(key => {
      if (item[key] === '' || item[key] === 'NA' || item[key] === 'na' || item[key] === ' ') {
        item[key] = null
      }
    })
    
      // Normalizar campos booleanos a números (1 = SI/SÍ, 0 = NO/null)
      // Lista de campos que deben ser normalizados a 0/1
      // NOTA: desgarro NO se normaliza porque tiene valores específicos: NO, GI, GII, GIII, GIV, FISURA
      const camposBooleanos = [
      'puebloOriginario', 'migrante', 'discapacidad', 'cca', 'gemela', 'induccion',
      'conduccionOcitocica', 'libertadDeMovimientoOEnTDP', 'episiotomia',
      'anestesiaLocal', 'manejoFarmacologicoDelDolor', 'manejoNoFarmacologicoDelDolor',
      'alumbramientoConducido', 'planDeParto', 'trabajoDeParto', 'regimenHidricoAmplioEnTDP',
      'ligaduraTardiaCordon', 'atencionConPertinenciaCultural', 'alojamientoConjunto',
      'acompanamientoPreparto', 'acompanamientoParto', 'acompanamientoPuerperioInmediato',
      'acompanamientoRN', 'lactanciaPrecoz60MinDeVida', 'embControlado', 'tallerCHCC',
      'privadaDeLibertad', 'transNoBinario', 'malformaciones'
    ]
    
    try {
      camposBooleanos.forEach(campo => {
        try {
          // Si el campo ya es un número, no hacer nada
          if (typeof item[campo] === 'number') {
            // Ya está normalizado, solo asegurar que sea 0 o 1
            item[campo] = item[campo] === 1 ? 1 : 0
            return
          }
          
          if (item[campo] !== null && item[campo] !== undefined) {
            const valor = String(item[campo]).toUpperCase().trim()
            if (valor === 'SI' || valor === 'SÍ' || valor === '1' || valor === 'TRUE') {
              item[campo] = 1
            } else if (valor === 'NO' || valor === '0' || valor === 'FALSE' || valor === '') {
              item[campo] = 0
            } else {
              // Si no es un valor booleano claro, establecer como 0
              item[campo] = 0
            }
          } else {
            item[campo] = 0
          }
        } catch (err) {
          // Si hay error normalizando un campo específico, establecer como 0
          console.warn(`Error normalizando campo ${campo} en línea ${index + 1}:`, err)
          item[campo] = 0
        }
      })
    } catch (err) {
      console.error(`Error en normalización de campos booleanos en línea ${index + 1}:`, err)
    }
    
      // Normalizar campos de resultados de exámenes
      // chagas, vih, hepatitisB: POSITIVO/NEGATIVO -> 1/0
      // vihAlParto: TOMADO/POSITIVO/NEGATIVO -> mantener como string o convertir TOMADO/POSITIVO a 1
      // rprVdrl: NEGATIVO/POSITIVO -> 0/1
      const camposExamenes = ['chagas', 'vih', 'hepatitisB']
    try {
      camposExamenes.forEach(campo => {
        try {
          if (item[campo] !== null && item[campo] !== undefined) {
            const valor = String(item[campo]).toUpperCase().trim()
            if (valor === 'POSITIVO' || valor === 'SI' || valor === 'SÍ' || valor === '1' || valor === 'TRUE') {
              item[campo] = 1
            } else {
              item[campo] = 0
            }
          } else {
            item[campo] = 0
          }
        } catch (err) {
          console.warn(`Error normalizando campo de examen ${campo} en línea ${index + 1}:`, err)
          item[campo] = 0
        }
      })
      
      // vihAlParto: TOMADO, POSITIVO, NEGATIVO
      try {
        if (item.vihAlParto !== null && item.vihAlParto !== undefined) {
          const valor = String(item.vihAlParto).toUpperCase().trim()
          // Mantener el valor original para consultas, pero también crear un flag numérico
          if (valor === 'POSITIVO' || valor === 'TOMADO') {
            item.vihAlParto = 1 // Para cálculos, considerar POSITIVO y TOMADO como 1
            item.vihAlPartoOriginal = valor // Guardar original
          } else {
            item.vihAlParto = 0
            item.vihAlPartoOriginal = valor || 'NEGATIVO'
          }
        } else {
          item.vihAlParto = 0
          item.vihAlPartoOriginal = 'NEGATIVO'
        }
      } catch (err) {
        console.warn(`Error normalizando vihAlParto en línea ${index + 1}:`, err)
        item.vihAlParto = 0
        item.vihAlPartoOriginal = 'NEGATIVO'
      }
      
      // rprVdrl: NEGATIVO, POSITIVO
      try {
        if (item.rprVdrl !== null && item.rprVdrl !== undefined) {
          const valor = String(item.rprVdrl).toUpperCase().trim()
          if (valor === 'POSITIVO' || valor === 'SI' || valor === 'SÍ' || valor === '1' || valor === 'TRUE') {
            item.rprVdrl = 1
          } else {
            item.rprVdrl = 0
          }
        } else {
          item.rprVdrl = 0
        }
      } catch (err) {
        console.warn(`Error normalizando rprVdrl en línea ${index + 1}:`, err)
        item.rprVdrl = 0
      }
    } catch (err) {
      console.error(`Error en normalización de campos de exámenes en línea ${index + 1}:`, err)
    }
    
      // Normalizar apegoConPiel30Min (valores: NO=0, MADRE=1, PADRE=2, OTRA PERSONA SIGNIFICATIVA=3)
      // Pero mantener el valor original también para consultas
    try {
      if (item.apegoConPiel30Min !== null && item.apegoConPiel30Min !== undefined) {
        const apegoUpper = String(item.apegoConPiel30Min).toUpperCase().trim()
        item.apegoConPiel30MinOriginal = item.apegoConPiel30Min // Guardar original
        if (apegoUpper === 'MADRE' || apegoUpper === 'SI' || apegoUpper === 'SÍ') {
          item.apegoConPiel30Min = 1 // 1 = con madre
          item.apegoConPiel30MinMadre = 1
          item.apegoConPiel30MinPadre = 0
        } else if (apegoUpper === 'PADRE' || apegoUpper.includes('PADRE')) {
          item.apegoConPiel30Min = 2 // 2 = con padre
          item.apegoConPiel30MinMadre = 0
          item.apegoConPiel30MinPadre = 1
        } else if (apegoUpper === 'OTRA PERSONA SIGNIFICATIVA' || apegoUpper.includes('OTRA')) {
          item.apegoConPiel30Min = 3 // 3 = otra persona
          item.apegoConPiel30MinMadre = 0
          item.apegoConPiel30MinPadre = 1 // Considerar como padre/acompañante
        } else {
          item.apegoConPiel30Min = 0 // 0 = NO
          item.apegoConPiel30MinMadre = 0
          item.apegoConPiel30MinPadre = 0
        }
      } else {
        item.apegoConPiel30Min = 0
        item.apegoConPiel30MinMadre = 0
        item.apegoConPiel30MinPadre = 0
      }
    } catch (err) {
      console.error(`Error normalizando apegoConPiel30Min en línea ${index + 1}:`, err)
      item.apegoConPiel30Min = 0
      item.apegoConPiel30MinMadre = 0
      item.apegoConPiel30MinPadre = 0
    }
    
      // Campos adicionales para compatibilidad con sistema existente
      item.numero = item.nPartoAno ? item.nPartoAno.toString() : (index + 1).toString()
      item.id = item.nPartoMes ? item.nPartoMes.toString() : item.numero
      item.fecha = item.fechaParto
      item.hora = item.horaParto
      item.nombre = item.nombreYApellido
      item.semanasGestacion = item.eg
      item.tipoAnestesia = item.tipoDeAnestesia
      item.perimetroCefalico = item.cc
      
      // ===== TRAZABILIDAD PARA IA =====
      // ID único persistente para trazabilidad
      item._traceId = generateUniqueId(item, index)
      
      // Metadatos de trazabilidad
      item._traceMetadata = {
        createdAt: new Date().toISOString(),
        source: 'datos.txt',
        sourceLine: index + 1,
        version: '1.0',
        lastModified: new Date().toISOString(),
        dataHash: `${item.nPartoAno || ''}_${item.fechaParto || ''}_${item.rut || ''}`
      }
      
      // Normalizar RUT para relaciones
      const normalizedRUT = normalizeRUT(item.rut)
      item._rutNormalized = normalizedRUT
      
      // Relaciones con otros registros
      item._relations = {
        // Partos relacionados (misma madre por RUT)
        relatedPartos: [],
        // Relaciones por consultorio
        sameConsultorio: [],
        // Relaciones por comuna
        sameComuna: [],
        // Relaciones por fecha (partos en el mismo mes)
        sameMonth: [],
        // Relaciones por médico obstetra
        sameMedicoObstetra: [],
        // Relaciones por matrona
        sameMatrona: []
      }
      
      // Agregar al mapa de RUTs para crear relaciones después
      if (normalizedRUT) {
        if (!rutMap[normalizedRUT]) {
          rutMap[normalizedRUT] = []
        }
        rutMap[normalizedRUT].push(item._traceId)
      }
      
      // Campos estructurados para análisis de IA
      item._structuredData = {
        // Identificadores
        identifiers: {
          traceId: item._traceId,
          numero: item.numero,
          rut: normalizedRUT,
          nombre: item.nombreYApellido
        },
        // Datos temporales
        temporal: {
          fechaParto: item.fechaParto,
          horaParto: item.horaParto,
          nPartoAno: item.nPartoAno,
          nPartoMes: item.nPartoMes,
          mesParto: item.mesParto
        },
        // Datos de la madre
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
        // Datos del parto
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
        // Datos del recién nacido
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
        // Indicadores clave para análisis
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
      }
      
      data.push(item)
    } catch (err) {
      console.error(`Error procesando línea ${index + 1}:`, err)
      // Continuar con la siguiente línea en lugar de detener todo el proceso
    }
  })
  
  // ===== CREAR RELACIONES ENTRE REGISTROS =====
  // Establecer relaciones entre partos de la misma madre
  data.forEach((item, index) => {
    // Relaciones por RUT (misma madre)
    if (item._rutNormalized && rutMap[item._rutNormalized]) {
      item._relations.relatedPartos = rutMap[item._rutNormalized]
        .filter(traceId => traceId !== item._traceId)
        .map(traceId => {
          const relatedItem = data.find(d => d._traceId === traceId)
          return relatedItem ? {
            traceId: traceId,
            fechaParto: relatedItem.fechaParto,
            tipoParto: relatedItem.tipoParto,
            numero: relatedItem.numero
          } : null
        }).filter(Boolean)
    }
    
    // Relaciones por consultorio
    if (item.consultorio) {
      item._relations.sameConsultorio = data
        .filter(d => d.consultorio === item.consultorio && d._traceId !== item._traceId)
        .map(d => d._traceId)
    }
    
    // Relaciones por comuna
    if (item.comuna) {
      item._relations.sameComuna = data
        .filter(d => d.comuna === item.comuna && d._traceId !== item._traceId)
        .map(d => d._traceId)
    }
    
    // Relaciones por mes (mismo mes de parto)
    if (item.mesParto && item.nPartoAno) {
      item._relations.sameMonth = data
        .filter(d => d.mesParto === item.mesParto && 
                     d.nPartoAno === item.nPartoAno && 
                     d._traceId !== item._traceId)
        .map(d => d._traceId)
    }
    
    // Relaciones por médico obstetra
    if (item.medicoObstetra) {
      item._relations.sameMedicoObstetra = data
        .filter(d => d.medicoObstetra === item.medicoObstetra && d._traceId !== item._traceId)
        .map(d => d._traceId)
    }
    
    // Relaciones por matrona
    if (item.matronaParto) {
      item._relations.sameMatrona = data
        .filter(d => d.matronaParto === item.matronaParto && d._traceId !== item._traceId)
        .map(d => d._traceId)
    }
    
    // Agregar contadores de relaciones para análisis rápido
    item._relationCounts = {
      totalRelatedPartos: item._relations.relatedPartos.length,
      totalSameConsultorio: item._relations.sameConsultorio.length,
      totalSameComuna: item._relations.sameComuna.length,
      totalSameMonth: item._relations.sameMonth.length,
      totalSameMedico: item._relations.sameMedicoObstetra.length,
      totalSameMatrona: item._relations.sameMatrona.length
    }
  })
  
  // Agregar índice global para búsqueda rápida
  const globalIndex = {}
  data.forEach((item, index) => {
    globalIndex[item._traceId] = index
    if (item._rutNormalized) {
      if (!globalIndex._byRUT) globalIndex._byRUT = {}
      if (!globalIndex._byRUT[item._rutNormalized]) {
        globalIndex._byRUT[item._rutNormalized] = []
      }
      globalIndex._byRUT[item._rutNormalized].push(item._traceId)
    }
  })
  
  // Agregar índice global a cada item para acceso rápido
  data.forEach(item => {
    item._globalIndex = globalIndex
  })
  
  console.log(`✅ Datos parseados con trazabilidad: ${data.length} registros`)
  console.log(`📊 Relaciones creadas: ${Object.keys(rutMap).length} madres únicas`)
  
  return data
}

// Funciones auxiliares para limpiar valores
function cleanValue(value) {
  if (!value || value === undefined) return null
  const cleaned = value.trim()
  if (cleaned === '' || cleaned === 'NA' || cleaned === 'na') return null
  return cleaned
}

function cleanNumber(value) {
  if (!value) return null
  const num = parseInt(value.trim())
  return isNaN(num) ? null : num
}

function cleanFloat(value) {
  if (!value) return null
  const num = parseFloat(value.trim())
  return isNaN(num) ? null : num
}

export function checkAlerts(data) {
  const alerts = []
  
  if (!data || data.length === 0) {
    return alerts
  }
  
  // Verificar peso bajo (< 2500g)
  const bajoPeso = data.filter(item => item.peso && item.peso < 2500)
  if (bajoPeso.length > 0) {
    alerts.push({
      type: 'warning',
      title: '⚠️ Alertas de Peso Bajo',
      message: `Se encontraron ${bajoPeso.length} caso(s) con peso menor a 2500g. Se recomienda revisión médica.`
    })
  }
  
  // Verificar semanas de gestación bajas (< 37 semanas)
  const prematuros = data.filter(item => 
      item.eg && item.eg < 37
  )
  if (prematuros.length > 0) {
    alerts.push({
      type: 'warning',
      title: '⚠️ Partos Prematuros',
      message: `Se detectaron ${prematuros.length} parto(s) prematuro(s) (menos de 37 semanas).`
    })
  }
  
  // Verificar edad materna muy joven (< 18 años)
  const edadJoven = data.filter(item => item.edad && item.edad < 18)
  if (edadJoven.length > 0) {
    alerts.push({
      type: 'info',
      title: 'ℹ️ Edad Materna',
      message: `Se registraron ${edadJoven.length} caso(s) con edad materna menor a 18 años.`
    })
  }
  
  // Verificar APGAR bajo
  const apgarBajo = data.filter(item => {
      const apgar1 = item.apgar1 ? parseInt(item.apgar1) : null
      const apgar5 = item.apgar5 ? parseInt(item.apgar5) : null
    return (apgar1 !== null && apgar1 < 7) || (apgar5 !== null && apgar5 < 7)
  })
  if (apgarBajo.length > 0) {
    alerts.push({
      type: 'warning',
      title: '⚠️ APGAR Bajo',
      message: `Se encontraron ${apgarBajo.length} caso(s) con puntuación APGAR menor a 7. Requiere atención.`
    })
  }
  
  return alerts
}
