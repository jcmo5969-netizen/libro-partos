import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import * as XLSX from 'xlsx'
import './REM.css'

function REM({ data }) {
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')

  // Obtener años únicos de los datos y contar registros por año
  const availableYears = useMemo(() => {
    if (!data || data.length === 0) return []
    
    const yearCounts = new Map()
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 10 // Últimos 10 años + futuro
    const endYear = currentYear + 1
    
    // Contar registros por año
    data.forEach(item => {
      let year = null
      
      // Usar nPartoAno si está disponible
      if (item.nPartoAno) {
        year = parseInt(item.nPartoAno)
        if (!isNaN(year) && year > 1900 && year < 2100) {
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
        }
      }
      
      // Fallback: parsear desde fechaParto
      if (!year && item.fechaParto) {
        const dateParts = item.fechaParto.split('/')
        if (dateParts.length === 3) {
          year = parseInt(dateParts[2])
          if (!isNaN(year) && year > 1900 && year < 2100) {
            yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
          }
        }
      }
    })
    
    // Generar lista de años con conteo, incluyendo años sin datos en el rango
    const yearsWithCount = []
    
    // Primero agregar años con datos (más recientes primero)
    const yearsWithData = Array.from(yearCounts.keys())
      .filter(year => year >= startYear && year <= endYear)
      .sort((a, b) => b - a)
    
    yearsWithData.forEach(year => {
      yearsWithCount.push({
        year,
        count: yearCounts.get(year),
        hasData: true
      })
    })
    
    // Agregar años sin datos en el rango (solo si hay años con datos)
    if (yearsWithData.length > 0) {
      const minYear = Math.min(...yearsWithData)
      const maxYear = Math.max(...yearsWithData)
      
      for (let year = maxYear; year >= Math.max(minYear, startYear); year--) {
        if (!yearCounts.has(year)) {
          yearsWithCount.push({
            year,
            count: 0,
            hasData: false
          })
        }
      }
    }
    
    // Ordenar por año (más reciente primero)
    yearsWithCount.sort((a, b) => b.year - a.year)
    
    return yearsWithCount
  }, [data])

  // Filtrar datos por mes y año
  const filteredDataByMonthAndYear = useMemo(() => {
    let filtered = data
    
    // Filtrar por año
    if (selectedYear !== 'all') {
      const yearNumber = parseInt(selectedYear)
      if (!isNaN(yearNumber)) {
        filtered = filtered.filter(item => {
          // Usar nPartoAno si está disponible
          if (item.nPartoAno) {
            const year = parseInt(item.nPartoAno)
            if (!isNaN(year)) {
              return year === yearNumber
            }
          }
          
          // Fallback: parsear desde fechaParto
          if (item.fechaParto) {
            const dateParts = item.fechaParto.split('/')
            if (dateParts.length === 3) {
              const year = parseInt(dateParts[2])
              if (!isNaN(year)) {
                return year === yearNumber
              }
            }
          }
          
          return false
        })
      }
    }
    
    // Filtrar por mes
    if (selectedMonth !== 'all') {
      const monthNumber = parseInt(selectedMonth)
      if (!isNaN(monthNumber)) {
        filtered = filtered.filter(item => {
          // Usar mesParto si está disponible (más eficiente)
          if (item.mesParto !== undefined && item.mesParto !== null) {
            return item.mesParto === monthNumber
          }
          
          // Fallback: parsear desde fechaParto
          if (!item.fechaParto) return false
          
          // La fecha está en formato M/D/YYYY o MM/DD/YYYY
          const dateParts = item.fechaParto.split('/')
          if (dateParts.length !== 3) return false
          
          // Validar que el mes sea válido (1-12)
          const month = parseInt(dateParts[0])
          if (isNaN(month) || month < 1 || month > 12) {
            console.warn(`Fecha inválida: ${item.fechaParto}`)
            return false
          }
          
          return month === monthNumber
        })
      }
    }
    
    return filtered
  }, [data, selectedMonth, selectedYear])

  // Función auxiliar para normalizar valores booleanos (mejora del mapeo)
  const normalizeBoolean = (value, defaultValue = false) => {
    if (value === null || value === undefined) return defaultValue
    if (typeof value === 'number') return value === 1
    const str = String(value).toUpperCase().trim()
    return str === 'SI' || str === 'SÍ' || str === '1' || str === 'TRUE' || str === 'YES'
  }

  // Función auxiliar para obtener valor de campo con múltiples alternativas
  const getFieldValue = (item, fieldNames, defaultValue = null) => {
    for (const fieldName of fieldNames) {
      if (item[fieldName] !== null && item[fieldName] !== undefined && item[fieldName] !== '') {
        return item[fieldName]
      }
    }
    return defaultValue
  }

  // Función auxiliar para calcular indicadores por tipo de parto (fuera del useMemo para que esté disponible)
  const calcularIndicadorPorTipo = (dataArray, filtroIndicador, filtroTipoParto) => {
    const filtrados = dataArray.filter(item => {
      const cumpleIndicador = filtroIndicador(item)
      const cumpleTipo = filtroTipoParto(item)
      return cumpleIndicador && cumpleTipo
    })
    return filtrados.length
  }

  const tableData = useMemo(() => {
    const dataToUse = filteredDataByMonthAndYear
    
    if (!dataToUse || dataToUse.length === 0) {
      return {
        seccionA: [],
        seccionA1: [],
        seccionD1: [],
        seccionB: []
      }
    }
    
    // Filtrar solo partos vaginales para la sección A.1
    const partosVaginales = dataToUse.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL')
    })
    
    // Función para calcular por semanas de gestación
    const calcularPorSemanas = (filtro) => {
      return {
        total: partosVaginales.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return filtro(item) && semanas !== null && semanas !== undefined
        }).length,
        menos28: partosVaginales.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return filtro(item) && semanas && semanas < 28
        }).length,
        entre28y37: partosVaginales.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return filtro(item) && semanas && semanas >= 28 && semanas < 38
        }).length,
        mas38: partosVaginales.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return filtro(item) && semanas && semanas >= 38
        }).length
      }
    }
    
    // Sección A.1: Partos Vaginales
    const seccionA1 = []
    
    // Espontáneo
    seccionA1.push({
      label: 'Espontáneo',
      subcategory: null,
      ...calcularPorSemanas(item => {
        const induccion = item.induccion
        return induccion === 0 || String(induccion).toUpperCase() === 'NO' || !induccion
      })
    })
    
    // Inducidos - Mecánica
    seccionA1.push({
      label: 'Inducidos',
      subcategory: 'Mecánica',
      ...calcularPorSemanas(item => {
        const induccion = item.induccion
        const comentarios = String(item.comentarios || '').toUpperCase()
        const trabajoParto = String(item.trabajoDeParto || '').toUpperCase()
        return (induccion === 1 || String(induccion).toUpperCase() === 'SI') &&
               (comentarios.includes('MECANICA') || trabajoParto.includes('MECANICA') ||
                comentarios.includes('AMNIOTOMIA') || comentarios.includes('ROTURA ARTIFICIAL'))
      })
    })
    
    // Inducidos - Farmacológica
    seccionA1.push({
      label: 'Inducidos',
      subcategory: 'Farmacológica',
      ...calcularPorSemanas(item => {
        const induccion = item.induccion
        const comentarios = String(item.comentarios || '').toUpperCase()
        return (induccion === 1 || String(induccion).toUpperCase() === 'SI') &&
               (comentarios.includes('MISOTROL') || comentarios.includes('OXITOCINA') ||
                comentarios.includes('PROSTAGLANDINA') || comentarios.includes('FARMACOLOGICA'))
      })
    })
    
    // Conducción oxitócica
    seccionA1.push({
      label: 'Conducción oxitócica',
      subcategory: null,
      ...calcularPorSemanas(item => {
        return normalizeBoolean(item.conduccionOcitocica, false)
      })
    })
    
    // Libertad de movimiento
    seccionA1.push({
      label: 'Libertad de movimiento',
      subcategory: null,
      ...calcularPorSemanas(item => {
        return normalizeBoolean(item.libertadDeMovimientoOEnTDP, false)
      })
    })
    
    // Régimen hídrico amplio
    seccionA1.push({
      label: 'Régimen hídrico amplio',
      subcategory: null,
      ...calcularPorSemanas(item => {
        return normalizeBoolean(item.regimenHidricoAmplioEnTDP, false)
      })
    })
    
    // Manejo del dolor - No farmacológico
    seccionA1.push({
      label: 'Manejo del dolor',
      subcategory: 'No farmacológico',
      ...calcularPorSemanas(item => {
        // Verificar tanto el campo booleano como si hay medidas específicas
        const manejo = normalizeBoolean(item.manejoNoFarmacologicoDelDolor, false)
        const medidas = getFieldValue(item, ['medidasNoFarmacologicasParaElDolorCuales'], '')
        return manejo || (medidas && String(medidas).trim().length > 0)
      })
    })
    
    // Manejo del dolor - Farmacológico
    seccionA1.push({
      label: 'Manejo del dolor',
      subcategory: 'Farmacológico',
      ...calcularPorSemanas(item => {
        return normalizeBoolean(item.manejoFarmacologicoDelDolor, false)
      })
    })
    
    // Posición al momento del expulsivo - Litotomía
    seccionA1.push({
      label: 'Posición al momento del expulsivo',
      subcategory: 'Litotomía',
      ...calcularPorSemanas(item => {
        const posicion = String(item.posicionMaternaEnElExpulsivo || '').toUpperCase()
        return posicion.includes('LITOTOMIA') || posicion.includes('LITOTOMÍA')
      })
    })
    
    // Posición al momento del expulsivo - Otras posiciones
    seccionA1.push({
      label: 'Posición al momento del expulsivo',
      subcategory: 'Otras posiciones',
      ...calcularPorSemanas(item => {
        const posicion = String(item.posicionMaternaEnElExpulsivo || '').toUpperCase()
        return posicion.length > 0 && !posicion.includes('LITOTOMIA') && !posicion.includes('LITOTOMÍA')
      })
    })
    
    // Episiotomía
    seccionA1.push({
      label: 'Episiotomía',
      subcategory: null,
      ...calcularPorSemanas(item => {
        return normalizeBoolean(item.episiotomia, false)
      })
    })
    
    // Acompañamiento - Durante el trabajo de parto
    seccionA1.push({
      label: 'Acompañamiento',
      subcategory: 'Durante el trabajo de parto',
      ...calcularPorSemanas(item => {
        return normalizeBoolean(item.acompanamientoParto, false)
      })
    })
    
    // Acompañamiento - Sólo en el expulsivo
    seccionA1.push({
      label: 'Acompañamiento',
      subcategory: 'Sólo en el expulsivo',
      ...calcularPorSemanas(item => {
        // Solo en expulsivo = NO en parto pero SÍ en puerperio
        const acompanamientoParto = normalizeBoolean(item.acompanamientoParto, false)
        const acompanamientoPuerperio = normalizeBoolean(item.acompanamientoPuerperioInmediato, false)
        return !acompanamientoParto && acompanamientoPuerperio
      })
    })

    // Sección A: Características del Parto con desglose por edad y prematuridad
    const seccionA = []
    
    // Función auxiliar para calcular estadísticas de una característica
    const calcularStats = (filtro) => {
      const filtrados = dataToUse.filter(filtro)
      const total = filtrados.length
      
      const porEdad = {
        menos15: filtrados.filter(item => item.edad && item.edad < 15).length,
        entre15y19: filtrados.filter(item => item.edad && item.edad >= 15 && item.edad <= 19).length,
        entre20y34: filtrados.filter(item => item.edad && item.edad >= 20 && item.edad <= 34).length,
        mas35: filtrados.filter(item => item.edad && item.edad >= 35).length
      }
      
      const porPrematuridad = {
        menos24: filtrados.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return semanas && semanas >= 22 && semanas < 24
        }).length,
        entre24y28: filtrados.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return semanas && semanas >= 24 && semanas <= 28
        }).length,
        entre29y32: filtrados.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return semanas && semanas >= 29 && semanas <= 32
        }).length,
        entre33y36: filtrados.filter(item => {
          const semanas = item.eg || item.semanasGestacion
          return semanas && semanas >= 33 && semanas < 37
        }).length
      }
      
      return { total, porEdad, porPrematuridad }
    }
    
    // Función auxiliar para crear fila con filtro guardado
    const crearFilaConFiltro = (label, filtro) => {
      const stats = calcularStats(filtro)
      return {
        label,
        ...stats,
        filtro // Guardar el filtro para usarlo después
      }
    }
    
    // Crear todas las filas primero (sin TOTAL PARTOS)
    const filasDetalle = []
    
    // Vaginal
    filasDetalle.push(crearFilaConFiltro('Vaginal', item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase() : ''
      return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL')
    }))
    
    // Instrumental
    filasDetalle.push(crearFilaConFiltro('Instrumental', item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase() : ''
      return tipo.includes('INSTRUMENTAL')
    }))
    
    // Cesárea Electiva
    filasDetalle.push(crearFilaConFiltro('Cesárea Electiva', item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase() : ''
      return tipo.includes('CES ELE')
    }))
    
    // Cesárea Urgencia
    filasDetalle.push(crearFilaConFiltro('Cesárea Urgencia', item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase() : ''
      return tipo.includes('CES URG')
    }))
    
    // Parto prehospitalario
    filasDetalle.push(crearFilaConFiltro('Parto prehospitalario (en establecimientos salud o ambulancias)', item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase() : ''
      return tipo.includes('PREHOSPITALARIO') || tipo.includes('EXTRAHOSPITALARIO')
    }))
    
    // Partos fuera de la red de salud
    filasDetalle.push(crearFilaConFiltro('Partos fuera de la red de salud', item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      const comentarios = String(item.comentarios || '').toUpperCase()
      return tipo.includes('FUERA RED') || comentarios.includes('FUERA RED SALUD')
    }))
    
    // Plan de parto
    filasDetalle.push(crearFilaConFiltro('Plan de parto', item => {
      return normalizeBoolean(item.planDeParto, false)
    }))
    
    // Entrega de placenta a solicitud
    filasDetalle.push(crearFilaConFiltro('Entrega de placenta a solicitud', item => {
      const entrega = getFieldValue(item, ['alumbramientoConducido', 'entregaPlacenta'], null)
      return normalizeBoolean(entrega, false)
    }))
    
    // Embarazo no controlado
    // Solo contar los que explícitamente son NO controlados (0)
    filasDetalle.push(crearFilaConFiltro('Embarazo no controlado', item => {
      const controlado = item.embControlado
      // Si es numérico: 0 = NO controlado, 1 = controlado
      if (typeof controlado === 'number') {
        return controlado === 0
      }
      // Si es string: NO = no controlado, SI = controlado
      if (!controlado) return true // null o undefined = no controlado
      const controladoUpper = String(controlado).toUpperCase().trim()
      return controladoUpper === 'NO' || controladoUpper === '' || controladoUpper === 'NA'
    }))
    
    // Parto en domicilio - Con atención profesional
    filasDetalle.push(crearFilaConFiltro('Parto en domicilio - Con atención profesional', item => {
      const comentarios = String(item.comentarios || '').toUpperCase()
      const medicoObstetra = String(item.medicoObstetra || '').toUpperCase()
      const matronaParto = String(item.matronaParto || '').toUpperCase()
      return (comentarios.includes('DOMICILIO') && (comentarios.includes('ATENCION') || comentarios.includes('PROFESIONAL'))) ||
             (medicoObstetra && comentarios.includes('DOMICILIO')) ||
             (matronaParto && comentarios.includes('DOMICILIO'))
    }))
    
    // Parto en domicilio - Sin atención profesional
    filasDetalle.push(crearFilaConFiltro('Parto en domicilio - Sin atención profesional', item => {
      const comentarios = String(item.comentarios || '').toUpperCase()
      return comentarios.includes('DOMICILIO') && comentarios.includes('SIN ATENCION')
    }))
    
    // Calcular TOTAL PARTOS contando todos los registros únicos (no sumar categorías que se solapan)
    const totalPartos = crearFilaConFiltro('TOTAL PARTOS', () => true)
    
    // Insertar TOTAL PARTOS al principio y luego las filas de detalle
    seccionA.push(totalPartos)
    seccionA.push(...filasDetalle)
    
    // Sección B: Otros indicadores
    const seccionB = []
    
    // Función auxiliar para calcular estadísticas de indicadores
    const calcularIndicador = (filtro) => {
      const filtrados = dataToUse.filter(filtro)
      return filtrados.length
    }
    
    // Uso de oxitocina profiláctica
    seccionB.push({
      label: 'Uso de oxitocina profiláctica',
      total: calcularIndicador(item => {
        const oxitocina = getFieldValue(item, ['conduccionOcitocica', 'oxitocina', 'usoOxitocinaProfilactica'], null)
        return normalizeBoolean(oxitocina, false)
      })
    })
    
    // Anestesia Neuroaxial
    seccionB.push({
      label: 'Anestesia Neuroaxial',
      total: calcularIndicador(item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        const manejoNoFarmacologico = String(item.manejoNoFarmacologicoDelDolor || item.medidasNoFarmacologicasParaElDolorCuales || '').toUpperCase()
        return tipo.includes('NEUROAXIAL') || tipo.includes('EPIDURAL') || tipo.includes('RAQUIDEA') || tipo.includes('PERIDURAL')
      })
    })
    
    // Óxido nitroso
    seccionB.push({
      label: 'Óxido nitroso',
      total: calcularIndicador(item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        return tipo.includes('ÓXIDO') || tipo.includes('OXIDO') || tipo.includes('NITROSO')
      })
    })
    
    // Analgesia endovenosa
    seccionB.push({
      label: 'Analgesia endovenosa',
      total: calcularIndicador(item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        // manejoFarmacologicoDelDolor ahora es numérico: 1 = SI, 0 = NO
        // Pero también puede contener texto descriptivo, así que verificamos ambos
        if (typeof item.manejoFarmacologicoDelDolor === 'number' && item.manejoFarmacologicoDelDolor === 1) {
          // Si es numérico y es 1, podría ser endovenosa, pero mejor verificar también el tipo
          return tipo.includes('ENDOVENOSA') || tipo.includes('ENDOVENOSO')
        }
        const manejoFarmacologico = String(item.manejoFarmacologicoDelDolor || '').toUpperCase()
        return tipo.includes('ENDOVENOSA') || tipo.includes('ENDOVENOSO') || manejoFarmacologico.includes('ENDOVENOSA')
      })
    })
    
    // General
    seccionB.push({
      label: 'General',
      total: calcularIndicador(item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        return tipo.includes('GENERAL')
      })
    })
    
    // Local
    seccionB.push({
      label: 'Local',
      total: calcularIndicador(item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        // anestesiaLocal ahora es numérico: 1 = SI, 0 = NO
        if (typeof item.anestesiaLocal === 'number') {
          return tipo.includes('LOCAL') || item.anestesiaLocal === 1
        }
        const anestesiaLocal = String(item.anestesiaLocal || '').toUpperCase()
        return tipo.includes('LOCAL') || anestesiaLocal === 'SI' || anestesiaLocal === 'SÍ'
      })
    })
    
    // Medidas no farmacológicas
    seccionB.push({
      label: 'Medidas no farmacológicas',
      total: calcularIndicador(item => {
        // manejoNoFarmacologicoDelDolor ahora es numérico: 1 = SI, 0 = NO
        if (typeof item.manejoNoFarmacologicoDelDolor === 'number' && item.manejoNoFarmacologicoDelDolor === 1) {
          return true
        }
        const manejoNoFarmacologico = String(item.manejoNoFarmacologicoDelDolor || item.medidasNoFarmacologicasParaElDolorCuales || '').toUpperCase()
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        return manejoNoFarmacologico === 'SI' || manejoNoFarmacologico === 'SÍ' || 
               manejoNoFarmacologico.includes('MOVIMIENTO') || manejoNoFarmacologico.includes('ACOMPAÑAMIENTO') ||
               tipo.includes('NO FARMACOLOGICA') || tipo.includes('NO FARMACOLÓGICA')
      })
    })
    
    // Ligadura tardía del cordón
    seccionB.push({
      label: 'Ligadura tardía del cordón (> a 60 segundos)',
      total: calcularIndicador(item => {
        // Ahora es numérico: 1 = SI, 0 = NO
        const ligadura = item.ligaduraTardiaCordon || item.ligaduraTardia
        if (typeof ligadura === 'number') {
          return ligadura === 1
        }
        return ligadura && (String(ligadura).toUpperCase() === 'SI' || String(ligadura).toUpperCase() === 'SÍ' || ligadura === 1)
      })
    })
    
    // Contacto Piel a Piel - Con la Madre - RN ≤ 2,499 grs.
    // apegoConPiel30Min ahora es numérico: 0=NO, 1=MADRE, 2=PADRE, 3=OTRA PERSONA
    // También tenemos apegoConPiel30MinMadre = 1 si es con madre
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con la Madre - RN peso menor o igual a 2.499 grs.',
      total: calcularIndicador(item => {
        const peso = item.peso
        if (!peso || peso > 2499) return false
        // Verificar apegoConPiel30MinMadre (numérico) o apegoConPiel30Min original
        const contactoMadre = item.apegoConPiel30MinMadre === 1
        const contacto = item.apegoConPiel30Min
        const contactoOriginal = item.apegoConPiel30MinOriginal
        // Si es numérico, verificar si es 1 (MADRE)
        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) {
          return peso <= 2499
        }
        // Compatibilidad con valores string antiguos
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          return (contactoUpper === 'MADRE' || contactoUpper === 'SI' || contactoUpper === 'SÍ') && peso <= 2499
        }
        return false
      })
    })
    
    // Contacto Piel a Piel - Con la Madre - RN ≥ 2,500 grs.
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con la Madre - RN con peso de 2.500 grs. o más',
      total: calcularIndicador(item => {
        const peso = item.peso
        if (!peso || peso < 2500) return false
        // Verificar apegoConPiel30MinMadre (numérico) o apegoConPiel30Min original
        const contactoMadre = item.apegoConPiel30MinMadre === 1
        const contacto = item.apegoConPiel30Min
        const contactoOriginal = item.apegoConPiel30MinOriginal
        // Si es numérico, verificar si es 1 (MADRE)
        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) {
          return peso >= 2500
        }
        // Compatibilidad con valores string antiguos
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          return (contactoUpper === 'MADRE' || contactoUpper === 'SI' || contactoUpper === 'SÍ') && peso >= 2500
        }
        return false
      })
    })
    
    // Contacto Piel a Piel - Con el padre - RN ≤ 2,499 grs.
    // apegoConPiel30MinPadre = 1 si es con padre/acompañante
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con el padre o acompañante significativo - RN peso menor o igual a 2.499 grs.',
      total: calcularIndicador(item => {
        const peso = item.peso
        if (!peso || peso > 2499) return false
        // Verificar apegoConPiel30MinPadre (numérico) o apegoConPiel30Min = 2 o 3
        const contactoPadre = item.apegoConPiel30MinPadre === 1
        const contacto = item.apegoConPiel30Min
        const contactoOriginal = item.apegoConPiel30MinOriginal
        // Si es numérico, verificar si es 2 (PADRE) o 3 (OTRA PERSONA)
        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) {
          return peso <= 2499
        }
        // O verificar por parentesco y acompañamiento
        const parentesco = item.parentescoAcompananteRespectoARN || item.parentescoAcompananteRespectoAMadre
        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
        const acompanamiento = item.acompanamientoParto || item.acompanamientoPuerperioInmediato || item.acompanamientoRN
        const acompanamientoValido = (typeof acompanamiento === 'number' && acompanamiento === 1) || 
                                      (acompanamiento && String(acompanamiento).toUpperCase() === 'SI')
        // Compatibilidad con valores string antiguos
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
          return (esPadreEnApego || (acompanamientoValido && esPadrePorParentesco)) && peso <= 2499
        }
        return (acompanamientoValido && esPadrePorParentesco) && peso <= 2499
      })
    })
    
    // Contacto Piel a Piel - Con el padre - RN ≥ 2,500 grs.
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con el padre o acompañante significativo - RN con peso de 2.500 grs. o más',
      total: calcularIndicador(item => {
        const peso = item.peso
        if (!peso || peso < 2500) return false
        // Verificar apegoConPiel30MinPadre (numérico) o apegoConPiel30Min = 2 o 3
        const contactoPadre = item.apegoConPiel30MinPadre === 1
        const contacto = item.apegoConPiel30Min
        const contactoOriginal = item.apegoConPiel30MinOriginal
        // Si es numérico, verificar si es 2 (PADRE) o 3 (OTRA PERSONA)
        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) {
          return peso >= 2500
        }
        // O verificar por parentesco y acompañamiento
        const parentesco = item.parentescoAcompananteRespectoARN || item.parentescoAcompananteRespectoAMadre
        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
        const acompanamiento = item.acompanamientoParto || item.acompanamientoPuerperioInmediato || item.acompanamientoRN
        const acompanamientoValido = (typeof acompanamiento === 'number' && acompanamiento === 1) || 
                                      (acompanamiento && String(acompanamiento).toUpperCase() === 'SI')
        // Compatibilidad con valores string antiguos
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
          return (esPadreEnApego || (acompanamientoValido && esPadrePorParentesco)) && peso >= 2500
        }
        return (acompanamientoValido && esPadrePorParentesco) && peso >= 2500
      })
    })
    
    // Lactancia materna en los primeros 60 minutos (RN ≥ 2,500 grs.)
    seccionB.push({
      label: 'Lactancia materna en los primeros 60 minutos de vida (RN con peso de 2.500 grs. o más)',
      total: calcularIndicador(item => {
        const peso = item.peso ? parseFloat(item.peso) : null
        if (!peso || peso < 2500) return false
        const lactancia = getFieldValue(item, ['lactanciaPrecoz60MinDeVida', 'lactanciaPrecoz', 'lactanciaMaterna'], null)
        return normalizeBoolean(lactancia, false) && peso >= 2500
      })
    })
    
    // Alojamiento conjunto
    seccionB.push({
      label: 'Alojamiento conjunto en puerperio inmediato',
      total: calcularIndicador(item => {
        // Primero verificar el campo directo
        const alojamiento = normalizeBoolean(item.alojamientoConjunto, false)
        if (alojamiento) return true
        
        // Si no está en el campo directo, inferir de destino
        const destino = item.destino
        if (destino) {
          const destinoUpper = String(destino).toUpperCase().trim()
          return destinoUpper.includes('SALA') && !destinoUpper.includes('NO')
        }
        return false
      })
    })
    
    // Atención con pertinencia cultural
    seccionB.push({
      label: 'Atención con pertinencia cultural',
      total: calcularIndicador(item => {
        // Ahora son numéricos: 1 = SI, 0 = NO
        const atencion = typeof item.atencionConPertinenciaCultural === 'number' ? item.atencionConPertinenciaCultural === 1 : 
                        item.atencionConPertinenciaCultural && String(item.atencionConPertinenciaCultural).toUpperCase() === 'SI'
        const pueblo = typeof item.puebloOriginario === 'number' ? item.puebloOriginario === 1 : 
                      item.puebloOriginario && String(item.puebloOriginario).toUpperCase() === 'SI'
        const migrante = typeof item.migrante === 'number' ? item.migrante === 1 : 
                        item.migrante && String(item.migrante).toUpperCase() === 'SI'
        const discapacidad = typeof item.discapacidad === 'number' ? item.discapacidad === 1 : 
                            item.discapacidad && String(item.discapacidad).toUpperCase() === 'SI'
        const privada = typeof item.privadaDeLibertad === 'number' ? item.privadaDeLibertad === 1 : 
                       item.privadaDeLibertad && String(item.privadaDeLibertad).toUpperCase() === 'SI'
        const trans = typeof item.transNoBinario === 'number' ? item.transNoBinario === 1 : 
                      item.transNoBinario && String(item.transNoBinario).toUpperCase() === 'SI'
        return atencion || pueblo || migrante || discapacidad || privada || trans
      })
    })
    
    // Pueblos Originarios
    seccionB.push({
      label: 'Pueblos Originarios',
      total: calcularIndicador(item => {
        return normalizeBoolean(item.puebloOriginario, false)
      })
    })
    
    // Migrantes
    seccionB.push({
      label: 'Migrantes',
      total: calcularIndicador(item => {
        return normalizeBoolean(item.migrante, false)
      })
    })
    
    // Discapacidad
    seccionB.push({
      label: 'Discapacidad',
      total: calcularIndicador(item => {
        return normalizeBoolean(item.discapacidad, false)
      })
    })
    
    // Privada de Libertad
    seccionB.push({
      label: 'Privada de Libertad',
      total: calcularIndicador(item => {
        return normalizeBoolean(item.privadaDeLibertad, false)
      })
    })
    
    // Trans masculino
    seccionB.push({
      label: 'Trans masculino',
      total: calcularIndicador(item => {
        // Ahora es numérico: 1 = SI, 0 = NO
        if (typeof item.transNoBinario === 'number') {
          return item.transNoBinario === 1
        }
        return item.transNoBinario && (String(item.transNoBinario).toUpperCase() === 'SI' || String(item.transNoBinario).toUpperCase() === 'SÍ' || item.transNoBinario === 1) ||
               item.identidadGenero && String(item.identidadGenero).toUpperCase() === 'TRANS MASCULINO'
      })
    })
    
    // No binarie
    seccionB.push({
      label: 'No binarie',
      total: calcularIndicador(item => {
        // Verificar por identidad de género o transNoBinario
        if (item.identidadGenero && String(item.identidadGenero).toUpperCase() === 'NO BINARIE') {
          return true
        }
        // transNoBinario ahora es numérico, pero "NO BINARIE" es un valor específico
        return false // Este campo requiere un valor específico "NO BINARIE" en identidadGenero
      })
    })
    
    // Sección D.1: Información General de Recién Nacidos Vivos
    const seccionD1 = []
    
    // Función para calcular por peso
    const calcularPorPeso = (filtro) => {
      return {
        total: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null
        }).length,
        menos500: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso < 500
        }).length,
        entre500y999: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 500 && peso < 1000
        }).length,
        entre1000y1499: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 1000 && peso < 1500
        }).length,
        entre1500y1999: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 1500 && peso < 2000
        }).length,
        entre2000y2499: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 2000 && peso < 2500
        }).length,
        entre2500y2999: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 2500 && peso < 3000
        }).length,
        entre3000y3999: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 3000 && peso < 4000
        }).length,
        mas4000: dataToUse.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 4000
        }).length,
        anomaliaCongenita: dataToUse.filter(item => {
          const malformaciones = item.malformaciones
          const comentarios = String(item.comentarios || '').toUpperCase()
          return filtro(item) && (
            (malformaciones === 1 || String(malformaciones).toUpperCase() === 'SI') ||
            comentarios.includes('MALFORMACION') || comentarios.includes('ANOMALIA') ||
            comentarios.includes('CONGENITA') || comentarios.includes('CONGÉNITA')
          )
        }).length
      }
    }
    
    // Nacidos vivos (todos los registros)
    seccionD1.push(calcularPorPeso(() => true))
    
    return { seccionA, seccionA1, seccionD1, seccionB }
  }, [filteredDataByMonthAndYear])

  const [mappingAnalysis, setMappingAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Función para analizar mapeo con IA
  const analyzeMapping = async () => {
    setIsAnalyzing(true)
    try {
      // Tomar una muestra de datos para análisis
      const sample = data.slice(0, 10).map(item => {
        const relevantFields = {
          tipoParto: item.tipoParto,
          conduccionOcitocica: item.conduccionOcitocica,
          tipoDeAnestesia: item.tipoDeAnestesia,
          apegoConPiel30Min: item.apegoConPiel30Min,
          lactanciaPrecoz60MinDeVida: item.lactanciaPrecoz60MinDeVida,
          acompanamientoParto: item.acompanamientoParto,
          parentescoAcompananteRespectoARN: item.parentescoAcompananteRespectoARN,
          destino: item.destino,
          planDeParto: item.planDeParto,
          embControlado: item.embControlado
        }
        return relevantFields
      })

      const prompt = `Analiza estos datos de partos y sugiere mejoras en el mapeo de campos para el componente REM (Registro Estadístico Mensual).

Datos de muestra:
${JSON.stringify(sample, null, 2)}

Campos disponibles en el dataParser:
- conduccionOcitocica (para oxitocina)
- tipoDeAnestesia (para anestesia)
- apegoConPiel30Min (para contacto piel a piel)
- lactanciaPrecoz60MinDeVida (para lactancia)
- acompanamientoParto, acompanamientoPuerperioInmediato (para acompañamiento)
- parentescoAcompananteRespectoARN, parentescoAcompananteRespectoAMadre (para parentesco)
- destino (para alojamiento conjunto)
- planDeParto, embControlado (para características del parto)

Sugiere:
1. Qué campos adicionales del dataParser deberían usarse
2. Cómo mejorar la detección de valores (ej: "SI", "SÍ", "Sala", etc.)
3. Si hay campos que no se están mapeando correctamente

Responde en español de forma concisa y técnica.`

      const analysis = await analyzeDataWithAI(data, prompt)
      setMappingAnalysis(analysis)
    } catch (error) {
      console.error('Error analizando mapeo:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Función para formatear el análisis de mapeo
  const formatMappingAnalysis = (text) => {
    if (!text) return ''
    
    let html = text
    
    // Procesar encabezados
    html = html.replace(/^###\s+(.+)$/gim, '<h4 class="rem-analysis-h4">$1</h4>')
    html = html.replace(/^##\s+(.+)$/gim, '<h3 class="rem-analysis-h3">$1</h3>')
    html = html.replace(/^#\s+(.+)$/gim, '<h2 class="rem-analysis-h2">$1</h2>')
    
    // Procesar negritas
    html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="rem-analysis-bold">$1</strong>')
    
    // Procesar listas
    html = html.replace(/^[-•]\s+(.+)$/gim, '<li class="rem-analysis-li">$1</li>')
    html = html.replace(/^(\d+)\.\s+(.+)$/gim, '<li class="rem-analysis-li">$2</li>')
    
    // Agrupar listas
    html = html.replace(/(<li class="rem-analysis-li">.*?<\/li>)/gs, (match) => {
      return `<ul class="rem-analysis-ul">${match}</ul>`
    })
    
    // Procesar párrafos
    const lines = html.split('\n')
    let result = []
    let currentParagraph = []
    
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      
      if (!trimmed) {
        if (currentParagraph.length > 0) {
          result.push(`<p class="rem-analysis-p">${currentParagraph.join(' ')}</p>`)
          currentParagraph = []
        }
        return
      }
      
      // Si ya es HTML procesado, agregarlo directamente
      if (trimmed.startsWith('<')) {
        if (currentParagraph.length > 0) {
          result.push(`<p class="rem-analysis-p">${currentParagraph.join(' ')}</p>`)
          currentParagraph = []
        }
        result.push(trimmed)
        return
      }
      
      currentParagraph.push(trimmed)
    })
    
    if (currentParagraph.length > 0) {
      result.push(`<p class="rem-analysis-p">${currentParagraph.join(' ')}</p>`)
    }
    
    return result.join('\n')
  }

  useEffect(() => {
    // Analizar mapeo con IA cuando los datos cambien (opcional, puede comentarse si no se quiere)
    // if (data && data.length > 0) {
    //   analyzeMapping()
    // }
  }, [data])

  // Función para exportar Sección A a Excel
  const exportSeccionA = () => {
    if (!tableData.seccionA || tableData.seccionA.length === 0) {
      alert('No hay datos para exportar en la Sección A')
      return
    }

    // Preparar datos para Excel
    const excelData = []
    
    // Encabezados
    excelData.push([
      'CARACTERISTICAS DEL PARTO',
      'TOTAL',
      '< 15 años',
      '15 - 19 años',
      '20 - 34 años',
      '≥35 años',
      'Partos prematuros menos de 24 semanas',
      'Partos prematuros de 24 a 28 semanas',
      'Partos prematuros de 29 a 32 semanas',
      'Partos prematuros de 33 a 36 semanas',
      'Ligadura tardía del cordón (> a 60 segundos)',
      'Contacto Piel a Piel - Madre - ≤2.499 grs.',
      'Contacto Piel a Piel - Madre - ≥2.500 grs.',
      'Contacto Piel a Piel - Padre - ≤2.499 grs.',
      'Contacto Piel a Piel - Padre - ≥2.500 grs.',
      'Lactancia materna primeros 60 min (≥2.500 grs.)',
      'Alojamiento conjunto',
      'Atención con pertinencia cultural',
      'Pueblos Originarios',
      'Migrantes',
      'Discapacidad',
      'Privada de Libertad',
      'Trans masculino',
      'No binarie'
    ])

    // Datos
    tableData.seccionA.forEach(row => {
      excelData.push([
        row.label,
        row.total,
        row.porEdad.menos15,
        row.porEdad.entre15y19,
        row.porEdad.entre20y34,
        row.porEdad.mas35,
        row.porPrematuridad.menos24,
        row.porPrematuridad.entre24y28,
        row.porPrematuridad.entre29y32,
        row.porPrematuridad.entre33y36,
        '', // Ligadura tardía (se calcularía dinámicamente)
        '', // Contacto madre ≤2.499
        '', // Contacto madre ≥2.500
        '', // Contacto padre ≤2.499
        '', // Contacto padre ≥2.500
        '', // Lactancia
        '', // Alojamiento
        '', // Pertinencia cultural
        '', // Pueblos originarios
        '', // Migrantes
        '', // Discapacidad
        '', // Privada de libertad
        '', // Trans masculino
        ''  // No binarie
      ])
    })

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 50 }, // Características
      { wch: 10 }, // Total
      { wch: 12 }, // < 15 años
      { wch: 12 }, // 15-19 años
      { wch: 12 }, // 20-34 años
      { wch: 12 }, // ≥35 años
      { wch: 25 }, // Prematuros <24
      { wch: 25 }, // Prematuros 24-28
      { wch: 25 }, // Prematuros 29-32
      { wch: 25 }, // Prematuros 33-36
      { wch: 30 }, // Ligadura tardía
      { wch: 25 }, // Contacto madre ≤2.499
      { wch: 25 }, // Contacto madre ≥2.500
      { wch: 25 }, // Contacto padre ≤2.499
      { wch: 25 }, // Contacto padre ≥2.500
      { wch: 35 }, // Lactancia
      { wch: 20 }, // Alojamiento
      { wch: 30 }, // Pertinencia cultural
      { wch: 20 }, // Pueblos originarios
      { wch: 15 }, // Migrantes
      { wch: 15 }, // Discapacidad
      { wch: 20 }, // Privada de libertad
      { wch: 15 }, // Trans masculino
      { wch: 15 }  // No binarie
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Sección A')
    
    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0]
    const año = selectedYear !== 'all' ? selectedYear : 'Todos'
    const mes = selectedMonth !== 'all' ? `-${selectedMonth}` : ''
    const filename = `REM_SeccionA_${año}${mes}_${fecha}.xlsx`
    
    XLSX.writeFile(wb, filename)
  }

  // Función para exportar Sección A.1 a Excel
  const exportSeccionA1 = () => {
    if (!tableData.seccionA1 || tableData.seccionA1.length === 0) {
      alert('No hay datos para exportar en la Sección A.1')
      return
    }

    // Preparar datos para Excel
    const excelData = []
    
    // Encabezados
    excelData.push([
      'CARACTERÍSTICAS DEL MODELO DE ATENCIÓN',
      'SUBCATEGORÍA',
      'TOTAL',
      '<28 semanas',
      '28 - 37 semanas',
      '38 semanas y más'
    ])

    // Datos
    tableData.seccionA1.forEach(row => {
      excelData.push([
        row.label,
        row.subcategory || '',
        row.total,
        row.menos28,
        row.entre28y37,
        row.mas38
      ])
    })

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 40 }, // Característica
      { wch: 25 }, // Subcategoría
      { wch: 10 }, // Total
      { wch: 15 }, // <28 semanas
      { wch: 20 }, // 28-37 semanas
      { wch: 20 }  // 38+ semanas
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Sección A.1')
    
    // Generar nombre de archivo
    const fecha = new Date().toISOString().split('T')[0]
    const año = selectedYear !== 'all' ? selectedYear : 'Todos'
    const mes = selectedMonth !== 'all' ? `-${selectedMonth}` : ''
    const filename = `REM_SeccionA1_${año}${mes}_${fecha}.xlsx`
    
    XLSX.writeFile(wb, filename)
  }

  // Función para exportar Sección D a Excel
  const exportSeccionD = () => {
    if (!tableData.seccionD1 || tableData.seccionD1.length === 0) {
      alert('No hay datos para exportar en la Sección D')
      return
    }

    // Preparar datos para Excel
    const excelData = []
    
    // Encabezados principales
    excelData.push([
      'TIPO',
      'TOTAL',
      'Menos de 500',
      '500 a 999',
      '1.000 a 1.499',
      '1.500 a 1.999',
      '2.000 a 2.499',
      '2.500 a 2.999',
      '3.000 a 3.999',
      '4.000 y más',
      'Anomalía Congénita'
    ])

    // Datos
    tableData.seccionD1.forEach(row => {
      excelData.push([
        'Nacidos vivos',
        row.total,
        row.menos500,
        row.entre500y999,
        row.entre1000y1499,
        row.entre1500y1999,
        row.entre2000y2499,
        row.entre2500y2999,
        row.entre3000y3999,
        row.mas4000,
        row.anomaliaCongenita
      ])
    })

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 20 }, // Tipo
      { wch: 10 }, // Total
      { wch: 15 }, // <500
      { wch: 12 }, // 500-999
      { wch: 15 }, // 1000-1499
      { wch: 15 }, // 1500-1999
      { wch: 15 }, // 2000-2499
      { wch: 15 }, // 2500-2999
      { wch: 15 }, // 3000-3999
      { wch: 15 }, // ≥4000
      { wch: 20 }  // Anomalía
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Sección D.1')
    
    // Generar nombre de archivo
    const fecha = new Date().toISOString().split('T')[0]
    const año = selectedYear !== 'all' ? selectedYear : 'Todos'
    const mes = selectedMonth !== 'all' ? `-${selectedMonth}` : ''
    const filename = `REM_SeccionD_${año}${mes}_${fecha}.xlsx`
    
    XLSX.writeFile(wb, filename)
  }

  return (
    <motion.div
      className="rem-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isAnalyzing && (
        <motion.div 
          className="rem-analyzing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="rem-analyzing-content">
            <div className="rem-analyzing-spinner"></div>
            <p>🔍 Analizando mapeo de datos con IA...</p>
          </div>
        </motion.div>
      )}
      
      {mappingAnalysis && (
        <motion.div 
          className="rem-mapping-analysis"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="rem-analysis-header">
            <h3>💡 Análisis de Mapeo con IA</h3>
            <button 
              className="rem-analysis-close"
              onClick={() => setMappingAnalysis(null)}
              aria-label="Cerrar análisis"
            >
              ✕
            </button>
          </div>
          <div 
            className="rem-analysis-content"
            dangerouslySetInnerHTML={{ __html: formatMappingAnalysis(mappingAnalysis) }}
          />
        </motion.div>
      )}

      {!data || data.length === 0 ? (
        <div className="rem-empty-state">
          <div className="rem-empty-icon">📊</div>
          <h3>No hay datos disponibles</h3>
          <p>No se encontraron registros de partos para mostrar en el REM.</p>
        </div>
      ) : (
        <>
          <div className="rem-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <h2>📋 SECCIÓN A: INFORMACIÓN GENERAL DE PARTOS</h2>
              <motion.button
                onClick={exportSeccionA}
                className="rem-export-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Exportar Sección A a Excel"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 182, 193, 0.6)',
                  backgroundColor: 'rgba(255, 182, 193, 0.1)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                📥 Exportar A
              </motion.button>
            </div>
            <div className="rem-filters" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <div className="rem-year-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="rem-year-select" style={{ fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  📅 Año:
                </label>
                <select
                  id="rem-year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '2px solid rgba(255, 182, 193, 0.4)',
                    backgroundColor: 'white',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    minWidth: '180px',
                    boxShadow: '0 2px 4px rgba(255, 182, 193, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'rgba(255, 182, 193, 0.7)'
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 182, 193, 0.3)'
                    e.target.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'rgba(255, 182, 193, 0.4)'
                    e.target.style.boxShadow = '0 2px 4px rgba(255, 182, 193, 0.1)'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  <option value="all">📊 Todos los años</option>
                  {availableYears.length > 0 && <optgroup label="Años con datos:"></optgroup>}
                  {availableYears
                    .filter(y => y.hasData)
                    .map(({ year, count }) => (
                      <option key={year} value={year}>
                        {year} ({count} {count === 1 ? 'registro' : 'registros'})
                      </option>
                    ))}
                  {availableYears.some(y => !y.hasData) && <optgroup label="Otros años:"></optgroup>}
                  {availableYears
                    .filter(y => !y.hasData)
                    .map(({ year }) => (
                      <option key={year} value={year} style={{ color: '#999' }}>
                        {year} (sin datos)
                      </option>
                    ))}
                </select>
              </div>
              <div className="rem-month-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="rem-month-select" style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  Mes:
                </label>
                <select
                  id="rem-month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 182, 193, 0.3)',
                    backgroundColor: 'white',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    minWidth: '150px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'rgba(255, 182, 193, 0.6)'
                    e.target.style.boxShadow = '0 2px 8px rgba(255, 182, 193, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'rgba(255, 182, 193, 0.3)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <option value="all">Todos los meses</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla Unificada */}
          {(tableData.seccionA.length === 0 && tableData.seccionB.length === 0) ? (
            <div className="rem-empty-section">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            <div className="rem-table-wrapper">
              <table className="rem-table">
                <thead>
                  <tr>
                    <th rowSpan="2" className="rem-th-main">CARACTERISTICAS DEL PARTO</th>
                    <th rowSpan="2" className="rem-th-main">TOTAL</th>
                    <th colSpan="4" className="rem-th-group">PARTOS SEGÚN EDAD DE LA MADRE</th>
                    <th colSpan="4" className="rem-th-group">PARTOS PREMATUROS (CONSIDERAR SOBRE 22 SEMANAS)</th>
                    {/* Indicadores adicionales como columnas */}
                    <th rowSpan="2" className="rem-th-main">Ligadura tardía del cordón (&gt; a 60 segundos)</th>
                    <th colSpan="4" className="rem-th-group">CONTACTO INMEDIATO PIEL A PIEL &gt;30 MINUTOS</th>
                    <th rowSpan="2" className="rem-th-main">Lactancia materna en los primeros 60 minutos de vida (RN con peso de 2.500 grs. o más)</th>
                    <th rowSpan="2" className="rem-th-main">Alojamiento conjunto en puerperio inmediato</th>
                    <th rowSpan="2" className="rem-th-main">Atención con pertinencia cultural</th>
                    <th rowSpan="2" className="rem-th-main">Pueblos Originarios</th>
                    <th rowSpan="2" className="rem-th-main">Migrantes</th>
                    <th rowSpan="2" className="rem-th-main">Discapacidad</th>
                    <th rowSpan="2" className="rem-th-main">Privada de Libertad</th>
                    <th colSpan="2" className="rem-th-group">Identidad de Género</th>
                  </tr>
                  <tr>
                    <th className="rem-th-sub">&lt; 15 años</th>
                    <th className="rem-th-sub">15 - 19 años</th>
                    <th className="rem-th-sub">20 - 34 años</th>
                    <th className="rem-th-sub">≥35 años</th>
                    <th className="rem-th-sub">Partos prematuros menos de 24 semanas</th>
                    <th className="rem-th-sub">Partos prematuros de 24 a 28 semanas</th>
                    <th className="rem-th-sub">Partos prematuros de 29 a 32 semanas</th>
                    <th className="rem-th-sub">Partos prematuros de 33 a 36 semanas</th>
                    {/* Subcolumnas para Contacto Piel a Piel */}
                    <th colSpan="2" className="rem-th-sub-group">Con la Madre</th>
                    <th colSpan="2" className="rem-th-sub-group">Con el padre o acompañante significativo</th>
                    <th className="rem-th-sub">Trans masculino</th>
                    <th className="rem-th-sub">No binarie</th>
                  </tr>
                  <tr className="rem-header-row-3">
                    <th colSpan="2"></th>
                    <th colSpan="4"></th>
                    <th colSpan="4"></th>
                    <th colSpan="1"></th>
                    <th className="rem-th-sub-sub">RN peso menor o igual a 2.499 grs.</th>
                    <th className="rem-th-sub-sub">RN con peso de 2.500 grs. o más</th>
                    <th className="rem-th-sub-sub">RN peso menor o igual a 2.499 grs.</th>
                    <th className="rem-th-sub-sub">RN con peso de 2.500 grs. o más</th>
                    <th colSpan="8"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Sección A: Características del Parto */}
                  {tableData.seccionA.map((row, index) => {
                    // Usar el filtro guardado en la fila (el mismo que se usó para calcular row.total, row.porEdad, etc.)
                    const filtroTipoParto = row.filtro || (() => true) // Si no hay filtro guardado, usar todos los partos
                    
                    // Calcular indicadores para este tipo de parto
                    const ligaduraTardia = calcularIndicadorPorTipo(
                      data,
                      item => {
                        // Ahora es numérico: 1 = SI, 0 = NO
                        const ligadura = item.ligaduraTardiaCordon || item.ligaduraTardia
                        if (typeof ligadura === 'number') {
                          return ligadura === 1
                        }
                        return ligadura && (String(ligadura).toUpperCase() === 'SI' || String(ligadura).toUpperCase() === 'SÍ' || ligadura === 1)
                      },
                      filtroTipoParto
                    )
                    
                    const contactoMadreMenor2500 = calcularIndicadorPorTipo(
                      data,
                      item => {
                        const peso = item.peso
                        if (!peso || peso > 2499) return false
                        // Verificar apegoConPiel30MinMadre (numérico) o apegoConPiel30Min = 1
                        const contactoMadre = item.apegoConPiel30MinMadre === 1
                        const contacto = item.apegoConPiel30Min
                        const contactoOriginal = item.apegoConPiel30MinOriginal
                        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) {
                          return peso <= 2499
                        }
                        // Compatibilidad con valores string antiguos
                        if (contactoOriginal) {
                          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
                          return (contactoUpper === 'MADRE' || contactoUpper === 'SI' || contactoUpper === 'SÍ') && peso <= 2499
                        }
                        return false
                      },
                      filtroTipoParto
                    )
                    
                    const contactoMadreMayor2500 = calcularIndicadorPorTipo(
                      data,
                      item => {
                        const peso = item.peso
                        if (!peso || peso < 2500) return false
                        // Verificar apegoConPiel30MinMadre (numérico) o apegoConPiel30Min = 1
                        const contactoMadre = item.apegoConPiel30MinMadre === 1
                        const contacto = item.apegoConPiel30Min
                        const contactoOriginal = item.apegoConPiel30MinOriginal
                        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) {
                          return peso >= 2500
                        }
                        // Compatibilidad con valores string antiguos
                        if (contactoOriginal) {
                          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
                          return (contactoUpper === 'MADRE' || contactoUpper === 'SI' || contactoUpper === 'SÍ') && peso >= 2500
                        }
                        return false
                      },
                      filtroTipoParto
                    )
                    
                    const contactoPadreMenor2500 = calcularIndicadorPorTipo(
                      data,
                      item => {
                        const peso = item.peso
                        if (!peso || peso > 2499) return false
                        // Verificar apegoConPiel30MinPadre (numérico) o apegoConPiel30Min = 2 o 3
                        const contactoPadre = item.apegoConPiel30MinPadre === 1
                        const contacto = item.apegoConPiel30Min
                        const contactoOriginal = item.apegoConPiel30MinOriginal
                        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) {
                          return peso <= 2499
                        }
                        // O verificar por parentesco y acompañamiento
                        const parentesco = item.parentescoAcompananteRespectoARN || item.parentescoAcompananteRespectoAMadre
                        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
                        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
                        const acompanamiento = item.acompanamientoParto || item.acompanamientoPuerperioInmediato || item.acompanamientoRN
                        const acompanamientoValido = (typeof acompanamiento === 'number' && acompanamiento === 1) || 
                                                      (acompanamiento && String(acompanamiento).toUpperCase() === 'SI')
                        // Compatibilidad con valores string antiguos
                        if (contactoOriginal) {
                          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
                          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
                          return (esPadreEnApego || (acompanamientoValido && esPadrePorParentesco)) && peso <= 2499
                        }
                        return (acompanamientoValido && esPadrePorParentesco) && peso <= 2499
                      },
                      filtroTipoParto
                    )
                    
                    const contactoPadreMayor2500 = calcularIndicadorPorTipo(
                      data,
                      item => {
                        const peso = item.peso
                        if (!peso || peso < 2500) return false
                        // Verificar apegoConPiel30MinPadre (numérico) o apegoConPiel30Min = 2 o 3
                        const contactoPadre = item.apegoConPiel30MinPadre === 1
                        const contacto = item.apegoConPiel30Min
                        const contactoOriginal = item.apegoConPiel30MinOriginal
                        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) {
                          return peso >= 2500
                        }
                        // O verificar por parentesco y acompañamiento
                        const parentesco = item.parentescoAcompananteRespectoARN || item.parentescoAcompananteRespectoAMadre
                        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
                        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
                        const acompanamiento = item.acompanamientoParto || item.acompanamientoPuerperioInmediato || item.acompanamientoRN
                        const acompanamientoValido = (typeof acompanamiento === 'number' && acompanamiento === 1) || 
                                                      (acompanamiento && String(acompanamiento).toUpperCase() === 'SI')
                        // Compatibilidad con valores string antiguos
                        if (contactoOriginal) {
                          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
                          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
                          return (esPadreEnApego || (acompanamientoValido && esPadrePorParentesco)) && peso >= 2500
                        }
                        return (acompanamientoValido && esPadrePorParentesco) && peso >= 2500
                      },
                      filtroTipoParto
                    )
                    
                    const lactancia = calcularIndicadorPorTipo(
                      data,
                      item => {
                        const peso = item.peso
                        if (!peso || peso < 2500) return false
                        // Ahora es numérico: 1 = SI, 0 = NO
                        const lactancia = item.lactanciaPrecoz60MinDeVida || item.lactanciaPrecoz || item.lactanciaMaterna
                        if (typeof lactancia === 'number') {
                          return lactancia === 1 && peso >= 2500
                        }
                        const lactanciaValida = lactancia && (String(lactancia).toUpperCase() === 'SI' || String(lactancia).toUpperCase() === 'SÍ' || lactancia === 1)
                        return lactanciaValida && peso >= 2500
                      },
                      filtroTipoParto
                    )
                    
                    const alojamiento = calcularIndicadorPorTipo(
                      data,
                      item => {
                        // Ahora es numérico: 1 = SI, 0 = NO
                        const alojamiento = item.alojamientoConjunto
                        if (typeof alojamiento === 'number') {
                          return alojamiento === 1
                        }
                        // Verificar alojamientoConjunto directamente o inferir de destino
                        if (alojamiento) {
                          const alojamientoUpper = String(alojamiento).toUpperCase().trim()
                          if (alojamientoUpper === 'SI' || alojamientoUpper === 'SÍ' || alojamiento === 1) {
                            return true
                          }
                        }
                        // Si no hay alojamientoConjunto, verificar destino
                        const destino = item.destino
                        if (destino) {
                          const destinoUpper = String(destino).toUpperCase().trim()
                          return destinoUpper.includes('SALA') && !destinoUpper.includes('NO')
                        }
                        return false
                      },
                      filtroTipoParto
                    )
                    
                    const pertinenciaCultural = calcularIndicadorPorTipo(
                      data,
                      item => {
                        // Ahora son numéricos: 1 = SI, 0 = NO
                        const atencion = typeof item.atencionConPertinenciaCultural === 'number' ? item.atencionConPertinenciaCultural === 1 : 
                                        item.atencionConPertinenciaCultural && String(item.atencionConPertinenciaCultural).toUpperCase() === 'SI'
                        const pueblo = typeof item.puebloOriginario === 'number' ? item.puebloOriginario === 1 : 
                                      item.puebloOriginario && String(item.puebloOriginario).toUpperCase() === 'SI'
                        const migrante = typeof item.migrante === 'number' ? item.migrante === 1 : 
                                        item.migrante && String(item.migrante).toUpperCase() === 'SI'
                        const discapacidad = typeof item.discapacidad === 'number' ? item.discapacidad === 1 : 
                                            item.discapacidad && String(item.discapacidad).toUpperCase() === 'SI'
                        const privada = typeof item.privadaDeLibertad === 'number' ? item.privadaDeLibertad === 1 : 
                                       item.privadaDeLibertad && String(item.privadaDeLibertad).toUpperCase() === 'SI'
                        const trans = typeof item.transNoBinario === 'number' ? item.transNoBinario === 1 : 
                                      item.transNoBinario && String(item.transNoBinario).toUpperCase() === 'SI'
                        return atencion || pueblo || migrante || discapacidad || privada || trans
                      },
                      filtroTipoParto
                    )
                    
                    const pueblosOriginarios = calcularIndicadorPorTipo(
                      data,
                      item => {
                        if (typeof item.puebloOriginario === 'number') {
                          return item.puebloOriginario === 1
                        }
                        return item.puebloOriginario && (String(item.puebloOriginario).toUpperCase() === 'SI' || String(item.puebloOriginario).toUpperCase() === 'SÍ' || item.puebloOriginario === 1)
                      },
                      filtroTipoParto
                    )
                    
                    const migrantes = calcularIndicadorPorTipo(
                      data,
                      item => {
                        if (typeof item.migrante === 'number') {
                          return item.migrante === 1
                        }
                        return item.migrante && (String(item.migrante).toUpperCase() === 'SI' || String(item.migrante).toUpperCase() === 'SÍ' || item.migrante === 1)
                      },
                      filtroTipoParto
                    )
                    
                    const discapacidad = calcularIndicadorPorTipo(
                      data,
                      item => {
                        if (typeof item.discapacidad === 'number') {
                          return item.discapacidad === 1
                        }
                        return item.discapacidad && (String(item.discapacidad).toUpperCase() === 'SI' || String(item.discapacidad).toUpperCase() === 'SÍ' || item.discapacidad === 1)
                      },
                      filtroTipoParto
                    )
                    
                    const privadaLibertad = calcularIndicadorPorTipo(
                      data,
                      item => {
                        if (typeof item.privadaDeLibertad === 'number') {
                          return item.privadaDeLibertad === 1
                        }
                        return item.privadaDeLibertad && (String(item.privadaDeLibertad).toUpperCase() === 'SI' || String(item.privadaDeLibertad).toUpperCase() === 'SÍ' || item.privadaDeLibertad === 1)
                      },
                      filtroTipoParto
                    )
                    
                    const transMasculino = calcularIndicadorPorTipo(
                      data,
                      item => {
                        if (typeof item.transNoBinario === 'number') {
                          return item.transNoBinario === 1
                        }
                        return (item.transNoBinario && String(item.transNoBinario).toUpperCase() === 'SI') ||
                               (item.identidadGenero && String(item.identidadGenero).toUpperCase() === 'TRANS MASCULINO')
                      },
                      filtroTipoParto
                    )
                    
                    const noBinarie = calcularIndicadorPorTipo(
                      data,
                      item => {
                        // Verificar por identidad de género específica
                        return item.identidadGenero && String(item.identidadGenero).toUpperCase() === 'NO BINARIE'
                      },
                      filtroTipoParto
                    )
                    
                    return (
                      <tr key={`seccionA-${index}`} className={index === 0 ? 'rem-row-total' : ''}>
                        <td className="rem-td-label">{row.label}</td>
                        <td className="rem-td-value">{row.total}</td>
                        <td className="rem-td-value">{row.porEdad.menos15}</td>
                        <td className="rem-td-value">{row.porEdad.entre15y19}</td>
                        <td className="rem-td-value">{row.porEdad.entre20y34}</td>
                        <td className="rem-td-value">{row.porEdad.mas35}</td>
                        <td className="rem-td-value">{row.porPrematuridad.menos24}</td>
                        <td className="rem-td-value">{row.porPrematuridad.entre24y28}</td>
                        <td className="rem-td-value">{row.porPrematuridad.entre29y32}</td>
                        <td className="rem-td-value">{row.porPrematuridad.entre33y36}</td>
                        {/* Indicadores adicionales */}
                        <td className="rem-td-value">{ligaduraTardia}</td>
                        <td className="rem-td-value">{contactoMadreMenor2500}</td>
                        <td className="rem-td-value">{contactoMadreMayor2500}</td>
                        <td className="rem-td-value">{contactoPadreMenor2500}</td>
                        <td className="rem-td-value">{contactoPadreMayor2500}</td>
                        <td className="rem-td-value">{lactancia}</td>
                        <td className="rem-td-value">{alojamiento}</td>
                        <td className="rem-td-value">{pertinenciaCultural}</td>
                        <td className="rem-td-value">{pueblosOriginarios}</td>
                        <td className="rem-td-value">{migrantes}</td>
                        <td className="rem-td-value">{discapacidad}</td>
                        <td className="rem-td-value">{privadaLibertad}</td>
                        <td className="rem-td-value">{transMasculino}</td>
                        <td className="rem-td-value">{noBinarie}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Sección A.1: Partos Vaginales */}
          {tableData.seccionA1 && tableData.seccionA1.length > 0 && (
            <>
              <div className="rem-header" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <h2>📋 SECCIÓN A.1: PARTOS VAGINALES *</h2>
                <motion.button
                  onClick={exportSeccionA1}
                  className="rem-export-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Exportar Sección A.1 a Excel"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 182, 193, 0.6)',
                    backgroundColor: 'rgba(255, 182, 193, 0.1)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📥 Exportar A.1
                </motion.button>
              </div>
              
              <div className="rem-table-wrapper">
                <table className="rem-table">
                  <thead>
                    <tr>
                      <th colSpan="2" className="rem-th-main">CARACTERÍSTICAS DEL MODELO DE ATENCIÓN</th>
                      <th rowSpan="2" className="rem-th-main">TOTAL</th>
                      <th colSpan="3" className="rem-th-group">SEMANAS DE GESTACIÓN</th>
                    </tr>
                    <tr>
                      <th className="rem-th-sub">Característica</th>
                      <th className="rem-th-sub">Subcategoría</th>
                      <th className="rem-th-sub">&lt;28 semanas</th>
                      <th className="rem-th-sub">28 - 37 semanas</th>
                      <th className="rem-th-sub">38 semanas y más</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.seccionA1.map((row, index) => {
                      const isSubcategory = row.subcategory !== null
                      const prevRow = index > 0 ? tableData.seccionA1[index - 1] : null
                      
                      // Determinar si debemos mostrar la característica principal
                      let showMainLabel = false
                      let rowSpan = 1
                      
                      if (!isSubcategory) {
                        // Si no tiene subcategoría, siempre mostrar el label
                        showMainLabel = true
                        rowSpan = 1
                      } else {
                        // Si tiene subcategoría, mostrar el label solo si es la primera del grupo
                        showMainLabel = !prevRow || prevRow.label !== row.label
                        
                        if (showMainLabel) {
                          // Contar cuántas subcategorías más hay del mismo grupo
                          let count = 1
                          for (let i = index + 1; i < tableData.seccionA1.length; i++) {
                            if (tableData.seccionA1[i].label === row.label && tableData.seccionA1[i].subcategory !== null) {
                              count++
                            } else {
                              break
                            }
                          }
                          rowSpan = count
                        }
                      }
                      
                      return (
                        <tr key={`seccionA1-${index}`}>
                          {!isSubcategory ? (
                            // Si no tiene subcategoría, combinar las dos primeras celdas
                            <td colSpan="2" className="rem-td-label" style={{ 
                              fontWeight: 'bold',
                              verticalAlign: 'middle',
                              padding: '8px',
                              borderRight: '1px solid #ddd'
                            }}>
                              {row.label}
                            </td>
                          ) : (
                            // Si tiene subcategoría, mostrar label y subcategoría por separado
                            <>
                              {showMainLabel && (
                                <td rowSpan={rowSpan} className="rem-td-label" style={{ 
                                  fontWeight: 'bold',
                                  verticalAlign: 'top',
                                  borderRight: '1px solid #ddd',
                                  padding: '8px'
                                }}>
                                  {row.label}
                                </td>
                              )}
                              <td className="rem-td-label" style={{ 
                                paddingLeft: '20px',
                                padding: '8px'
                              }}>
                                {row.subcategory}
                              </td>
                            </>
                          )}
                          <td className="rem-td-value">{row.total}</td>
                          <td className="rem-td-value">{row.menos28}</td>
                          <td className="rem-td-value">{row.entre28y37}</td>
                          <td className="rem-td-value">{row.mas38}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          
          {/* Sección D.1: Información General de Recién Nacidos Vivos */}
          {tableData.seccionD1 && tableData.seccionD1.length > 0 && (
            <>
              <div className="rem-header" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <div>
                  <h2>📋 SECCIÓN D: INFORMACIÓN DE RECIÉN NACIDOS</h2>
                  <h3>📋 SECCIÓN D.1: INFORMACIÓN GENERAL DE RECIÉN NACIDOS VIVOS</h3>
                </div>
                <motion.button
                  onClick={exportSeccionD}
                  className="rem-export-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Exportar Sección D a Excel"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 182, 193, 0.6)',
                    backgroundColor: 'rgba(255, 182, 193, 0.1)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📥 Exportar D
                </motion.button>
              </div>
              
              <div className="rem-table-wrapper">
                <table className="rem-table">
                  <thead>
                    <tr>
                      <th rowSpan="2" className="rem-th-main">TIPO</th>
                      <th rowSpan="2" className="rem-th-main">TOTAL</th>
                      <th colSpan="8" className="rem-th-group">PESO AL NACER (EN GRAMOS)</th>
                      <th rowSpan="2" className="rem-th-main">Anomalía Congénita</th>
                    </tr>
                    <tr>
                      <th className="rem-th-sub">Menos de 500</th>
                      <th className="rem-th-sub">500 a 999</th>
                      <th className="rem-th-sub">1.000 a 1.499</th>
                      <th className="rem-th-sub">1.500 a 1.999</th>
                      <th className="rem-th-sub">2.000 a 2.499</th>
                      <th className="rem-th-sub">2.500 a 2.999</th>
                      <th className="rem-th-sub">3.000 a 3.999</th>
                      <th className="rem-th-sub">4.000 y más</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.seccionD1.map((row, index) => (
                      <tr key={`seccionD1-${index}`}>
                        <td className="rem-td-label">Nacidos vivos</td>
                        <td className="rem-td-value">{row.total}</td>
                        <td className="rem-td-value">{row.menos500}</td>
                        <td className="rem-td-value">{row.entre500y999}</td>
                        <td className="rem-td-value">{row.entre1000y1499}</td>
                        <td className="rem-td-value">{row.entre1500y1999}</td>
                        <td className="rem-td-value">{row.entre2000y2499}</td>
                        <td className="rem-td-value">{row.entre2500y2999}</td>
                        <td className="rem-td-value">{row.entre3000y3999}</td>
                        <td className="rem-td-value">{row.mas4000}</td>
                        <td className="rem-td-value">{row.anomaliaCongenita}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </motion.div>
  )
}

export default REM

