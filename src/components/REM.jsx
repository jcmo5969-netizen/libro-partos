import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ExcelJS from 'exceljs'
import './REM.css'

/**
 * Genera y descarga un .xlsx con exceljs (reemplaza a la librería `xlsx`, sin
 * parche para sus CVEs de Prototype Pollution / ReDoS).
 * @param {string} sheetName Nombre de la hoja.
 * @param {Array<Array>} rows Filas (array de arrays); la primera suele ser el encabezado.
 * @param {Array<{wch:number}>} cols Anchos de columna estilo `xlsx` (wch); se convierten a width.
 * @param {string} filename Nombre del archivo a descargar.
 */
async function descargarExcelREM(sheetName, rows, cols, filename) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)
  if (Array.isArray(cols)) {
    ws.columns = cols.map((c) => ({ width: c?.wch ?? 12 }))
  }
  ws.addRows(rows)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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

  const toSnake = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
  const getFieldValue = (item, fieldNames, defaultValue = null) => {
    for (const fieldName of fieldNames) {
      const val = item[fieldName] ?? item[toSnake(fieldName)]
      if (val !== null && val !== undefined && val !== '') return val
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

  // Calcula todos los indicadores de la Sección A para una fila (ligadura, apego, lactancia, etc.)
  const getIndicadoresSeccionA = (row) => {
    const filtroTipoParto = row.filtro || (() => true)
    const ligaduraTardia = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const ligadura = getFieldValue(item, ['ligaduraTardiaCordon', 'ligaduraTardia'], null)
        return typeof ligadura === 'number' ? ligadura === 1 : normalizeBoolean(ligadura, false)
      },
      filtroTipoParto
    )
    const contactoMadreMenor2500 = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso > 2499) return false
        const contactoMadre = getFieldValue(item, ['apegoConPiel30MinMadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) return true
        if (contactoOriginal && (String(contactoOriginal).toUpperCase().trim() === 'MADRE' || String(contactoOriginal).toUpperCase().trim() === 'SI')) return true
        return normalizeBoolean(contacto, false)
      },
      filtroTipoParto
    )
    const contactoMadreMayor2500 = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso < 2500) return false
        const contactoMadre = getFieldValue(item, ['apegoConPiel30MinMadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) return true
        if (contactoOriginal && (String(contactoOriginal).toUpperCase().trim() === 'MADRE' || String(contactoOriginal).toUpperCase().trim() === 'SI')) return true
        return normalizeBoolean(contacto, false)
      },
      filtroTipoParto
    )
    const contactoPadreMenor2500 = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso > 2499) return false
        const contactoPadre = getFieldValue(item, ['apegoConPiel30MinPadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) return true
        const parentesco = getFieldValue(item, ['parentescoAcompananteRespectoARN', 'parentescoAcompananteRespectoAMadre'], null)
        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
        const acompanamiento = getFieldValue(item, ['acompanamientoParto', 'acompanamientoPuerperioInmediato', 'acompanamientoRN'], null)
        const acompanamientoValido = normalizeBoolean(acompanamiento, false)
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
          return esPadreEnApego || (acompanamientoValido && esPadrePorParentesco)
        }
        return acompanamientoValido && esPadrePorParentesco
      },
      filtroTipoParto
    )
    const contactoPadreMayor2500 = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso < 2500) return false
        const contactoPadre = getFieldValue(item, ['apegoConPiel30MinPadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) return true
        const parentesco = getFieldValue(item, ['parentescoAcompananteRespectoARN', 'parentescoAcompananteRespectoAMadre'], null)
        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
        const acompanamiento = getFieldValue(item, ['acompanamientoParto', 'acompanamientoPuerperioInmediato', 'acompanamientoRN'], null)
        const acompanamientoValido = normalizeBoolean(acompanamiento, false)
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
          return esPadreEnApego || (acompanamientoValido && esPadrePorParentesco)
        }
        return acompanamientoValido && esPadrePorParentesco
      },
      filtroTipoParto
    )
    const lactancia = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso < 2500) return false
        const lactanciaVal = getFieldValue(item, ['lactanciaPrecoz60MinDeVida', 'lactanciaPrecoz', 'lactanciaMaterna'], null)
        return normalizeBoolean(lactanciaVal, false) && peso >= 2500
      },
      filtroTipoParto
    )
    const alojamiento = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const alojamientoVal = getFieldValue(item, ['alojamientoConjunto'], null)
        if (normalizeBoolean(alojamientoVal, false)) return true
        const destino = getFieldValue(item, ['destino'], null)
        if (destino) {
          const destinoUpper = String(destino).toUpperCase().trim()
          return destinoUpper.includes('SALA') && !destinoUpper.includes('NO')
        }
        return false
      },
      filtroTipoParto
    )
    const pertinenciaCultural = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        if (typeof item.atencionConPertinenciaCultural === 'number') {
          return item.atencionConPertinenciaCultural === 1
        }
        return item.atencionConPertinenciaCultural &&
               String(item.atencionConPertinenciaCultural).toUpperCase() === 'SI'
      },
      filtroTipoParto
    )
    const pueblosOriginarios = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        if (typeof item.puebloOriginario === 'number') {
          return item.puebloOriginario === 1
        }
        return item.puebloOriginario && (String(item.puebloOriginario).toUpperCase() === 'SI' || String(item.puebloOriginario).toUpperCase() === 'SÍ' || item.puebloOriginario === 1)
      },
      filtroTipoParto
    )
    const migrantes = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        if (typeof item.migrante === 'number') {
          return item.migrante === 1
        }
        return item.migrante && (String(item.migrante).toUpperCase() === 'SI' || String(item.migrante).toUpperCase() === 'SÍ' || item.migrante === 1)
      },
      filtroTipoParto
    )
    const discapacidad = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        if (typeof item.discapacidad === 'number') {
          return item.discapacidad === 1
        }
        return item.discapacidad && (String(item.discapacidad).toUpperCase() === 'SI' || String(item.discapacidad).toUpperCase() === 'SÍ' || item.discapacidad === 1)
      },
      filtroTipoParto
    )
    const privadaLibertad = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        if (typeof item.privadaDeLibertad === 'number') {
          return item.privadaDeLibertad === 1
        }
        return item.privadaDeLibertad && (String(item.privadaDeLibertad).toUpperCase() === 'SI' || String(item.privadaDeLibertad).toUpperCase() === 'SÍ' || item.privadaDeLibertad === 1)
      },
      filtroTipoParto
    )
    const transMasculino = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
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
      filteredDataByMonthAndYear,
      item => {
        return item.identidadGenero && String(item.identidadGenero).toUpperCase() === 'NO BINARIE'
      },
      filtroTipoParto
    )

    // Anestesia / analgesia / oxitocina (cruzados con tipo de parto de la fila)
    const oxitocinaProf = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const oxitocina = getFieldValue(item, ['conduccionOcitocica', 'oxitocina', 'usoOxitocinaProfilactica'], null)
        return normalizeBoolean(oxitocina, false)
      },
      filtroTipoParto
    )
    const anestesiaNeuroaxial = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        return tipo.includes('NEUROAXIAL') || tipo.includes('EPIDURAL') || tipo.includes('RAQUIDEA') || tipo.includes('PERIDURAL')
      },
      filtroTipoParto
    )
    const oxidoNitroso = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        return tipo.includes('ÓXIDO') || tipo.includes('OXIDO') || tipo.includes('NITROSO')
      },
      filtroTipoParto
    )
    const analgesiaEndovenosa = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        if (typeof item.manejoFarmacologicoDelDolor === 'number' && item.manejoFarmacologicoDelDolor === 1) {
          return tipo.includes('ENDOVENOSA') || tipo.includes('ENDOVENOSO')
        }
        const manejoFarmacologico = String(item.manejoFarmacologicoDelDolor || '').toUpperCase()
        return tipo.includes('ENDOVENOSA') || tipo.includes('ENDOVENOSO') || manejoFarmacologico.includes('ENDOVENOSA')
      },
      filtroTipoParto
    )
    const anestesiaGeneral = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        return tipo.includes('GENERAL')
      },
      filtroTipoParto
    )
    const anestesiaLocal = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        if (typeof item.anestesiaLocal === 'number') {
          return tipo.includes('LOCAL') || item.anestesiaLocal === 1
        }
        const anestesiaLocalVal = String(item.anestesiaLocal || '').toUpperCase()
        return tipo.includes('LOCAL') || anestesiaLocalVal === 'SI' || anestesiaLocalVal === 'SÍ'
      },
      filtroTipoParto
    )
    const medidasNoFarmacologicas = calcularIndicadorPorTipo(
      filteredDataByMonthAndYear,
      item => {
        if (typeof item.manejoNoFarmacologicoDelDolor === 'number' && item.manejoNoFarmacologicoDelDolor === 1) {
          return true
        }
        const manejoNoFarmacologico = String(item.manejoNoFarmacologicoDelDolor || item.medidasNoFarmacologicasParaElDolorCuales || '').toUpperCase()
        const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
        return manejoNoFarmacologico === 'SI' || manejoNoFarmacologico === 'SÍ' ||
               manejoNoFarmacologico.includes('MOVIMIENTO') || manejoNoFarmacologico.includes('ACOMPAÑAMIENTO') ||
               tipo.includes('NO FARMACOLOGICA') || tipo.includes('NO FARMACOLÓGICA')
      },
      filtroTipoParto
    )

    return {
      ligaduraTardia,
      contactoMadreMenor2500,
      contactoMadreMayor2500,
      contactoPadreMenor2500,
      contactoPadreMayor2500,
      lactancia,
      alojamiento,
      pertinenciaCultural,
      pueblosOriginarios,
      migrantes,
      discapacidad,
      privadaLibertad,
      transMasculino,
      noBinarie,
      oxitocinaProf,
      anestesiaNeuroaxial,
      oxidoNitroso,
      analgesiaEndovenosa,
      anestesiaGeneral,
      anestesiaLocal,
      medidasNoFarmacologicas
    }
  }

  const tableData = useMemo(() => {
    const dataToUse = filteredDataByMonthAndYear
    
    if (!dataToUse || dataToUse.length === 0) {
      return {
        seccionA: [],
        seccionA1: [],
        seccionA2: [],
        seccionD1: [],
        seccionD2: null,
        seccionB: []
      }
    }
    
    // Expandir datos para partos gemelares: duplicar el registro cuando hay gemela
    // para que se cuenten ambos recién nacidos en el REM
    const expandedData = []
    dataToUse.forEach(item => {
      // Siempre agregar el primer recién nacido
      expandedData.push(item)
      
      // Si es gemelar y tiene datos del segundo recién nacido, agregar un registro duplicado
      // con los datos del segundo recién nacido
      const esGemelar = item.gemela === 1 || 
                       String(item.gemela || '').toUpperCase() === 'SI' ||
                       String(item.gemela || '').toUpperCase() === 'SÍ'
      
      if (esGemelar && (item.peso2 || item.talla2 || item.cc2)) {
        // Crear un registro duplicado con los datos del segundo recién nacido
        const segundoRN = {
          ...item,
          peso: item.peso2 || item.peso,
          talla: item.talla2 || item.talla,
          cc: item.cc2 || item.cc,
          apgar1: item.apgar1_2 || item.apgar1,
          apgar5: item.apgar5_2 || item.apgar5,
          apgar10: item.apgar10_2 || item.apgar10,
          sexo: item.sexo2 || item.sexo,
          malformaciones: item.malformaciones2 || item.malformaciones,
          _esSegundoRN: true // Marca para identificar que es el segundo RN
        }
        expandedData.push(segundoRN)
      }
    })
    
    // Usar los datos expandidos para los cálculos
    const dataForCalculations = expandedData
    
    // Filtrar solo partos vaginales para la sección A.1 (usar datos originales, no expandidos)
    const partosVaginales = dataToUse.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL')
    })
    
    // Función para calcular por semanas de gestación.
    // TOTAL = <28 + (28–37) + ≥38 solo entre registros con EG numérica válida (cuadra el Excel).
    const parseEgSemanas = (item) => {
      const raw = item.eg ?? item.semanasGestacion
      if (raw === null || raw === undefined || raw === '') return null
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'))
      if (!Number.isFinite(n)) return null
      return n
    }

    // Filtros de anestesia/analgesia/oxitocina (compartidos con sección B)
    const esOxitocinaProfilactica = (item) => {
      const oxitocina = getFieldValue(item, ['conduccionOcitocica', 'oxitocina', 'usoOxitocinaProfilactica'], null)
      return normalizeBoolean(oxitocina, false)
    }
    const esNeuroaxial = (item) => {
      const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
      return tipo.includes('NEUROAXIAL') || tipo.includes('EPIDURAL') || tipo.includes('RAQUIDEA') || tipo.includes('PERIDURAL')
    }
    const esOxidoNitroso = (item) => {
      const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
      return tipo.includes('ÓXIDO') || tipo.includes('OXIDO') || tipo.includes('NITROSO')
    }
    const esEndovenosa = (item) => {
      const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
      if (typeof item.manejoFarmacologicoDelDolor === 'number' && item.manejoFarmacologicoDelDolor === 1) {
        return tipo.includes('ENDOVENOSA') || tipo.includes('ENDOVENOSO')
      }
      const manejoFarmacologico = String(item.manejoFarmacologicoDelDolor || '').toUpperCase()
      return tipo.includes('ENDOVENOSA') || tipo.includes('ENDOVENOSO') || manejoFarmacologico.includes('ENDOVENOSA')
    }
    const esGeneral = (item) => {
      const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
      return tipo.includes('GENERAL')
    }
    const esLocal = (item) => {
      const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
      if (typeof item.anestesiaLocal === 'number') {
        return tipo.includes('LOCAL') || item.anestesiaLocal === 1
      }
      const anestesiaLocal = String(item.anestesiaLocal || '').toUpperCase()
      return tipo.includes('LOCAL') || anestesiaLocal === 'SI' || anestesiaLocal === 'SÍ'
    }
    const esNoFarmacologica = (item) => {
      if (typeof item.manejoNoFarmacologicoDelDolor === 'number' && item.manejoNoFarmacologicoDelDolor === 1) {
        return true
      }
      const manejoNoFarmacologico = String(item.manejoNoFarmacologicoDelDolor || item.medidasNoFarmacologicasParaElDolorCuales || '').toUpperCase()
      const tipo = String(item.tipoDeAnestesia || item.tipoAnestesia || '').toUpperCase()
      return manejoNoFarmacologico === 'SI' || manejoNoFarmacologico === 'SÍ' ||
             manejoNoFarmacologico.includes('MOVIMIENTO') || manejoNoFarmacologico.includes('ACOMPAÑAMIENTO') ||
             tipo.includes('NO FARMACOLOGICA') || tipo.includes('NO FARMACOLÓGICA')
    }

    const calcularPorSemanas = (filtro) => {
      let menos28 = 0, entre28y37 = 0, mas38 = 0
      let oxitocina = 0, neuroaxial = 0, oxido = 0, endovenosa = 0, general = 0, local = 0, noFarmacologicas = 0
      for (const item of partosVaginales) {
        if (!filtro(item)) continue
        const semanas = parseEgSemanas(item)
        if (semanas === null) continue
        if (semanas < 28) menos28++
        else if (semanas >= 28 && semanas < 38) entre28y37++
        else mas38++

        if (esOxitocinaProfilactica(item)) oxitocina++
        if (esNeuroaxial(item)) neuroaxial++
        if (esOxidoNitroso(item)) oxido++
        if (esEndovenosa(item)) endovenosa++
        if (esGeneral(item)) general++
        if (esLocal(item)) local++
        if (esNoFarmacologica(item)) noFarmacologicas++
      }
      return {
        total: menos28 + entre28y37 + mas38,
        menos28, entre28y37, mas38,
        oxitocina, neuroaxial, oxido, endovenosa, general, local, noFarmacologicas
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
    
    // Inducidos - Mecánica (solo mecánica; si tipo es COMBINADA se cuenta en Combinada)
    seccionA1.push({
      label: 'Inducidos',
      subcategory: 'Mecánica',
      ...calcularPorSemanas(item => {
        const induccion = item.induccion
        const tipoInduccion = String(item.tipoInduccion || '').toUpperCase()
        const induccionMecanica = String(item.induccionMecanica || '').toUpperCase()
        const induccionCombinada = String(item.induccionCombinada || '').toUpperCase()
        const comentarios = String(item.comentarios || '').toUpperCase()
        const trabajoParto = String(item.trabajoDeParto || '').toUpperCase()
        const esInducido = induccion === 1 || String(induccion).toUpperCase() === 'SI' || String(induccion).toUpperCase() === 'SÍ'
        if (!esInducido) return false
        if (tipoInduccion === 'COMBINADA') return false
        return tipoInduccion === 'MECANICA' ||
               (induccionMecanica && induccionMecanica !== '') ||
               induccionCombinada.includes('BALON') || induccionCombinada.includes('SONDA') ||
               comentarios.includes('MECANICA') || trabajoParto.includes('MECANICA') ||
               comentarios.includes('AMNIOTOMIA') || comentarios.includes('ROTURA ARTIFICIAL')
      })
    })
    
    // Inducidos - Farmacológica (solo farmacológica; si tipo es COMBINADA se cuenta en Combinada)
    seccionA1.push({
      label: 'Inducidos',
      subcategory: 'Farmacológica',
      ...calcularPorSemanas(item => {
        const induccion = item.induccion
        const tipoInduccion = String(item.tipoInduccion || '').toUpperCase()
        const induccionFarmacologica = String(item.induccionFarmacologica || '').toUpperCase()
        const induccionCombinada = String(item.induccionCombinada || '').toUpperCase()
        const comentarios = String(item.comentarios || '').toUpperCase()
        const esInducido = induccion === 1 || String(induccion).toUpperCase() === 'SI' || String(induccion).toUpperCase() === 'SÍ'
        if (!esInducido) return false
        if (tipoInduccion === 'COMBINADA') return false
        return tipoInduccion === 'FARMACOLOGICA' ||
               (induccionFarmacologica && induccionFarmacologica !== '') ||
               induccionCombinada.includes('MISOTROL') || induccionCombinada.includes('OXITOCINA') ||
               comentarios.includes('MISOTROL') || comentarios.includes('OXITOCINA') ||
               comentarios.includes('PROSTAGLANDINA') || comentarios.includes('FARMACOLOGICA') ||
               comentarios.includes('DINOPROSTONA')
      })
    })
    
    // Inducidos - Combinada (tipo "Combinada" en el libro o ambos métodos)
    seccionA1.push({
      label: 'Inducidos',
      subcategory: 'Combinada',
      ...calcularPorSemanas(item => {
        const induccion = item.induccion
        const tipoInduccion = String(item.tipoInduccion || '').toUpperCase()
        const induccionMecanica = String(item.induccionMecanica || '').toUpperCase()
        const induccionFarmacologica = String(item.induccionFarmacologica || '').toUpperCase()
        const induccionCombinada = String(item.induccionCombinada || '').toUpperCase()
        const comentarios = String(item.comentarios || '').toUpperCase()
        const trabajoParto = String(item.trabajoDeParto || '').toUpperCase()
        const esInducido = induccion === 1 || String(induccion).toUpperCase() === 'SI' || String(induccion).toUpperCase() === 'SÍ'
        if (!esInducido) return false
        if (tipoInduccion === 'COMBINADA') return true
        const tieneMecanica = tipoInduccion === 'MECANICA' || (induccionMecanica && induccionMecanica !== '') ||
          induccionCombinada.includes('BALON') || induccionCombinada.includes('SONDA') ||
          comentarios.includes('MECANICA') || trabajoParto.includes('MECANICA') ||
          comentarios.includes('AMNIOTOMIA') || comentarios.includes('ROTURA ARTIFICIAL')
        const tieneFarmacologica = tipoInduccion === 'FARMACOLOGICA' || (induccionFarmacologica && induccionFarmacologica !== '') ||
          induccionCombinada.includes('MISOTROL') || induccionCombinada.includes('OXITOCINA') ||
          comentarios.includes('MISOTROL') || comentarios.includes('OXITOCINA') ||
          comentarios.includes('PROSTAGLANDINA') || comentarios.includes('FARMACOLOGICA') || comentarios.includes('DINOPROSTONA')
        return tieneMecanica && tieneFarmacologica
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
        const val = getFieldValue(item, [
          'libertadDeMovimientoOEnTDP',
          'libertad_de_movimiento_o_en_tdp',
          'libertad_movimiento',
          'libertadMovimiento'
        ], null)
        return normalizeBoolean(val, false)
      })
    })

    // Régimen hídrico amplio
    seccionA1.push({
      label: 'Régimen hídrico amplio',
      subcategory: null,
      ...calcularPorSemanas(item => {
        const val = getFieldValue(item, [
          'regimenHidricoAmplioEnTDP',
          'regimen_hidrico_amplio_en_tdp',
          'regimenHidrico',
          'regimen_hidrico'
        ], null)
        return normalizeBoolean(val, false)
      })
    })

    // Manejo del dolor - No farmacológico
    seccionA1.push({
      label: 'Manejo del dolor',
      subcategory: 'No farmacológico',
      ...calcularPorSemanas(item => {
        const manejo = normalizeBoolean(getFieldValue(item, [
          'manejoNoFarmacologicoDelDolor',
          'manejo_no_farmacologico_del_dolor',
          'manejoNoFarmacologico'
        ], null), false)
        const medidas = getFieldValue(item, [
          'medidasNoFarmacologicasParaElDolorCuales',
          'medidas_no_farmacologicas_para_el_dolor_cuales',
          'medidasNoFarmacologicas'
        ], '')
        return manejo || (medidas && String(medidas).trim().length > 0)
      })
    })

    // Manejo del dolor - Farmacológico
    seccionA1.push({
      label: 'Manejo del dolor',
      subcategory: 'Farmacológico',
      ...calcularPorSemanas(item => {
        return normalizeBoolean(getFieldValue(item, [
          'manejoFarmacologicoDelDolor',
          'manejo_farmacologico_del_dolor',
          'manejoFarmacologico'
        ], null), false)
      })
    })

    // Posición al momento del expulsivo - Litotomía
    seccionA1.push({
      label: 'Posición al momento del expulsivo',
      subcategory: 'Litotomía',
      ...calcularPorSemanas(item => {
        const posicion = String(getFieldValue(item, [
          'posicionMaternaEnElExpulsivo',
          'posicion_materna_en_el_expulsivo',
          'posicionExpulsivo',
          'posicion_expulsivo'
        ], '') || '').toUpperCase()
        return posicion.includes('LITOTOMIA') || posicion.includes('LITOTOMÍA') || posicion.includes('DORSAL')
      })
    })

    // Posición al momento del expulsivo - Otras posiciones
    seccionA1.push({
      label: 'Posición al momento del expulsivo',
      subcategory: 'Otras posiciones',
      ...calcularPorSemanas(item => {
        const posicion = String(getFieldValue(item, [
          'posicionMaternaEnElExpulsivo',
          'posicion_materna_en_el_expulsivo',
          'posicionExpulsivo',
          'posicion_expulsivo'
        ], '') || '').toUpperCase()
        return posicion.length > 0 &&
               !posicion.includes('LITOTOMIA') && !posicion.includes('LITOTOMÍA') && !posicion.includes('DORSAL')
      })
    })
    
    // Episiotomía
    seccionA1.push({
      label: 'Episiotomía',
      subcategory: null,
      ...calcularPorSemanas(item => {
        return normalizeBoolean(getFieldValue(item, ['episiotomia'], null), false)
      })
    })
    
    // Acompañamiento - Durante el trabajo de parto
    seccionA1.push({
      label: 'Acompañamiento',
      subcategory: 'Durante el trabajo de parto',
      ...calcularPorSemanas(item => {
        return normalizeBoolean(getFieldValue(item, ['acompanamientoParto'], null), false)
      })
    })
    
    // Acompañamiento - Sólo en el expulsivo
    seccionA1.push({
      label: 'Acompañamiento',
      subcategory: 'Sólo en el expulsivo',
      ...calcularPorSemanas(item => {
        const acompanamientoParto = normalizeBoolean(getFieldValue(item, ['acompanamientoParto'], null), false)
        const acompanamientoPuerperio = normalizeBoolean(getFieldValue(item, ['acompanamientoPuerperioInmediato'], null), false)
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
        menos15: filtrados.filter(item => item.edad != null && item.edad < 15).length,
        entre15y19: filtrados.filter(item => item.edad != null && item.edad >= 15 && item.edad <= 19).length,
        entre20y34: filtrados.filter(item => item.edad != null && item.edad >= 20 && item.edad <= 34).length,
        mas35: filtrados.filter(item => item.edad != null && item.edad >= 35).length
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
    
    // Entrega de placenta a solicitud (el libro no registra este dato; no usar alumbramientoConducido)
    filasDetalle.push(crearFilaConFiltro('Entrega de placenta a solicitud', item => {
      const entrega = getFieldValue(item, ['entregaPlacenta', 'entregaPlacentaASolicitud'], null)
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
    // Usar datos expandidos cuando se cuenta por recién nacido (peso, talla, etc.)
    const calcularIndicador = (filtro, usarDatosExpandidos = false) => {
      const datosAUsar = usarDatosExpandidos ? dataForCalculations : dataToUse
      const filtrados = datosAUsar.filter(filtro)
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
    
    // Ligadura tardía del cordón (acepta camelCase y snake_case del backend)
    seccionB.push({
      label: 'Ligadura tardía del cordón (> a 60 segundos)',
      total: calcularIndicador(item => {
        const ligadura = getFieldValue(item, ['ligaduraTardiaCordon', 'ligaduraTardia'], null)
        if (typeof ligadura === 'number') return ligadura === 1
        return normalizeBoolean(ligadura, false)
      })
    })
    
    // Contacto Piel a Piel - Con la Madre - RN ≤ 2,499 grs.
    // Libro registra apegoConPiel30Min como SI/NO; SI = con madre (no hay desglose madre/padre en formulario)
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con la Madre - RN peso menor o igual a 2.499 grs.',
      total: calcularIndicador(item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso > 2499) return false
        const contactoMadre = getFieldValue(item, ['apegoConPiel30MinMadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) return true
        if (contactoOriginal && (String(contactoOriginal).toUpperCase().trim() === 'MADRE' || String(contactoOriginal).toUpperCase().trim() === 'SI')) return true
        return normalizeBoolean(contacto, false)
      }, true)
    })
    
    // Contacto Piel a Piel - Con la Madre - RN ≥ 2,500 grs.
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con la Madre - RN con peso de 2.500 grs. o más',
      total: calcularIndicador(item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso < 2500) return false
        const contactoMadre = getFieldValue(item, ['apegoConPiel30MinMadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoMadre || (typeof contacto === 'number' && contacto === 1)) return true
        if (contactoOriginal && (String(contactoOriginal).toUpperCase().trim() === 'MADRE' || String(contactoOriginal).toUpperCase().trim() === 'SI')) return true
        return normalizeBoolean(contacto, false)
      }, true)
    })
    
    // Contacto Piel a Piel - Con el padre - RN ≤ 2,499 grs.
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con el padre o acompañante significativo - RN peso menor o igual a 2.499 grs.',
      total: calcularIndicador(item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso > 2499) return false
        const contactoPadre = getFieldValue(item, ['apegoConPiel30MinPadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) return true
        const parentesco = getFieldValue(item, ['parentescoAcompananteRespectoARN', 'parentescoAcompananteRespectoAMadre'], null)
        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
        const acompanamiento = getFieldValue(item, ['acompanamientoParto', 'acompanamientoPuerperioInmediato', 'acompanamientoRN'], null)
        const acompanamientoValido = normalizeBoolean(acompanamiento, false)
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
          return (esPadreEnApego || (acompanamientoValido && esPadrePorParentesco))
        }
        return acompanamientoValido && esPadrePorParentesco
      }, true)
    })
    
    // Contacto Piel a Piel - Con el padre - RN ≥ 2,500 grs.
    seccionB.push({
      label: 'CONTACTO INMEDIATO PIEL A PIEL >30 MINUTOS - Con el padre o acompañante significativo - RN con peso de 2.500 grs. o más',
      total: calcularIndicador(item => {
        const peso = parseFloat(item.peso) || parseFloat(item.peso2)
        if (!peso || peso < 2500) return false
        const contactoPadre = getFieldValue(item, ['apegoConPiel30MinPadre'], null) === 1
        const contacto = getFieldValue(item, ['apegoConPiel30Min'], null)
        const contactoOriginal = getFieldValue(item, ['apegoConPiel30MinOriginal'], null)
        if (contactoPadre || (typeof contacto === 'number' && (contacto === 2 || contacto === 3))) return true
        const parentesco = getFieldValue(item, ['parentescoAcompananteRespectoARN', 'parentescoAcompananteRespectoAMadre'], null)
        const parentescoUpper = parentesco ? String(parentesco).toUpperCase() : ''
        const esPadrePorParentesco = parentescoUpper.includes('PADRE') || parentescoUpper.includes('PAREJA')
        const acompanamiento = getFieldValue(item, ['acompanamientoParto', 'acompanamientoPuerperioInmediato', 'acompanamientoRN'], null)
        const acompanamientoValido = normalizeBoolean(acompanamiento, false)
        if (contactoOriginal) {
          const contactoUpper = String(contactoOriginal).toUpperCase().trim()
          const esPadreEnApego = contactoUpper === 'PADRE' || contactoUpper === 'OTRA PERSONA SIGNIFICATIVA' || contactoUpper.includes('PADRE')
          return (esPadreEnApego || (acompanamientoValido && esPadrePorParentesco))
        }
        return acompanamientoValido && esPadrePorParentesco
      }, true)
    })
    
    // Lactancia materna en los primeros 60 minutos (RN ≥ 2,500 grs.)
    seccionB.push({
      label: 'Lactancia materna en los primeros 60 minutos de vida (RN con peso de 2.500 grs. o más)',
      total: calcularIndicador(item => {
        const peso = item.peso ? parseFloat(item.peso) : null
        if (!peso || peso < 2500) return false
        const lactancia = getFieldValue(item, ['lactanciaPrecoz60MinDeVida', 'lactanciaPrecoz', 'lactanciaMaterna'], null)
        return normalizeBoolean(lactancia, false) && peso >= 2500
      }, true) // Usar datos expandidos para contar ambos recién nacidos
    })
    
    // Alojamiento conjunto
    seccionB.push({
      label: 'Alojamiento conjunto en puerperio inmediato',
      total: calcularIndicador(item => {
        const alojamiento = getFieldValue(item, ['alojamientoConjunto'], null)
        if (normalizeBoolean(alojamiento, false)) return true
        const destino = getFieldValue(item, ['destino'], null)
        if (destino) {
          const destinoUpper = String(destino).toUpperCase().trim()
          return destinoUpper.includes('SALA') && !destinoUpper.includes('NO')
        }
        return false
      })
    })
    
    // Atención con pertinencia cultural
    // Solo contar registros donde explícitamente se marcó atención con pertinencia cultural = SI
    seccionB.push({
      label: 'Atención con pertinencia cultural',
      total: calcularIndicador(item => {
        if (typeof item.atencionConPertinenciaCultural === 'number') {
          return item.atencionConPertinenciaCultural === 1
        }
        return item.atencionConPertinenciaCultural &&
               String(item.atencionConPertinenciaCultural).toUpperCase() === 'SI'
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
    
    // Función para calcular por peso (usar datos expandidos para contar ambos recién nacidos en gemelares)
    const calcularPorPeso = (filtro) => {
      return {
        total: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null
        }).length,
        menos500: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso < 500
        }).length,
        entre500y999: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 500 && peso < 1000
        }).length,
        entre1000y1499: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 1000 && peso < 1500
        }).length,
        entre1500y1999: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 1500 && peso < 2000
        }).length,
        entre2000y2499: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 2000 && peso < 2500
        }).length,
        entre2500y2999: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 2500 && peso < 3000
        }).length,
        entre3000y3999: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 3000 && peso < 4000
        }).length,
        mas4000: dataForCalculations.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return filtro(item) && peso !== null && peso >= 4000
        }).length,
        anomaliaCongenita: dataForCalculations.filter(item => {
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

    // ─────────────────────────────────────────────
    // Sección A.2: Cesáreas según Modelo de Robson
    // ─────────────────────────────────────────────
    const esCesareaProg = item => String(item.tipoParto || '').toUpperCase().includes('CES ELE')
    const esCesareaUrg  = item => String(item.tipoParto || '').toUpperCase().includes('CES URG')
    const esCesarea     = item => esCesareaProg(item) || esCesareaUrg(item)

    // Derivar grupo Robson: usa clasificacionRobson si existe, si no calcula
    const getRobsonGroup = (item) => {
      if (item.clasificacionRobson) {
        const r = String(item.clasificacionRobson).toUpperCase()
        if (r.includes('GRUPO 1') || r === '1') return 1
        if (r.includes('GRUPO 2') || r === '2') return 2
        if (r.includes('GRUPO 3') || r === '3') return 3
        if (r.includes('GRUPO 4') || r === '4') return 4
        if (r.includes('GRUPO 5') || r === '5') return 5
        if (r.includes('GRUPO 6') || r === '6') return 6
        if (r.includes('GRUPO 7') || r === '7') return 7
        if (r.includes('GRUPO 8') || r === '8') return 8
        if (r.includes('GRUPO 9') || r === '9') return 9
        if (r.includes('GRUPO 10') || r === '10') return 10
      }
      // Derivar desde otros campos
      const paridad = String(item.paridad || '').toUpperCase()
      const pres    = String(item.presentacion || '').toUpperCase()
      const eg      = parseFloat(item.eg) || 0
      const isNul   = paridad.includes('PRIMIPARA') || paridad.includes('NULIPARA')
      const isMul   = paridad.includes('MULTIPARA')
      const isCef   = pres.includes('CEFALICA')
      const isPod   = pres.includes('PODALICA')
      const isTrans = pres.includes('TRANSVERSA') || pres.includes('OBLICUA')
      const isGem   = item.gemela === 1 || String(item.gemela || '').toUpperCase() === 'SI'
      const hasCCA  = item.cca === 1 || String(item.cca || '').toUpperCase() === 'SI'
      const isTermino = eg >= 37
      const isInducido = item.induccion === 1 || String(item.induccion || '').toUpperCase() === 'SI'

      if (isGem) return 8
      if (isTrans) return 9
      if (!isTermino && isCef) return 10
      if (isPod && isNul) return 6
      if (isPod && isMul) return 7
      if (isNul && isCef && isTermino && !isInducido) return 1
      if (isNul && isCef && isTermino && isInducido) return 2
      if (isMul && !hasCCA && isCef && isTermino && !isInducido) return 3
      if (isMul && !hasCCA && isCef && isTermino && isInducido) return 4
      if (isMul && hasCCA && isCef && isTermino) return 5
      return null
    }

    const contarRobson = (grupoPred) => ({
      programada: dataToUse.filter(item => esCesarea(item) && esCesareaProg(item) && grupoPred(item)).length,
      urgencia:   dataToUse.filter(item => esCesarea(item) && esCesareaUrg(item)  && grupoPred(item)).length,
    })

    const seccionA2 = [
      {
        label: 'Grupo 1: Nulíparas, embarazo único, cefálica, ≥37 sem, TDP espontáneo',
        subcategory: null,
        ...contarRobson(item => getRobsonGroup(item) === 1)
      },
      {
        label: 'Grupo 2: Nulíparas, embarazo único, cefálica, ≥37 sem, cesárea programada o inducción',
        subcategory: 'Cesárea por inducción fracasada',
        programada: 0,
        urgencia: dataToUse.filter(item => esCesarea(item) && esCesareaUrg(item) && getRobsonGroup(item) === 2 && (item.induccion === 1 || String(item.induccion || '').toUpperCase() === 'SI')).length
      },
      {
        label: 'Grupo 2: Nulíparas, embarazo único, cefálica, ≥37 sem, cesárea programada o inducción',
        subcategory: 'Cesárea programada',
        programada: dataToUse.filter(item => esCesarea(item) && esCesareaProg(item) && getRobsonGroup(item) === 2).length,
        urgencia: 0
      },
      {
        label: 'Grupo 3: Multípara, sin cesárea previa, embarazo único, cefálica, ≥37 sem, TDP espontáneo',
        subcategory: null,
        ...contarRobson(item => getRobsonGroup(item) === 3)
      },
      {
        label: 'Grupo 4: Multípara, sin cesárea previa, embarazo único, cefálica, ≥37 sem, inducción/programada',
        subcategory: 'Cesárea por inducción fracasada',
        programada: 0,
        urgencia: dataToUse.filter(item => esCesarea(item) && esCesareaUrg(item) && getRobsonGroup(item) === 4 && (item.induccion === 1 || String(item.induccion || '').toUpperCase() === 'SI')).length
      },
      {
        label: 'Grupo 4: Multípara, sin cesárea previa, embarazo único, cefálica, ≥37 sem, inducción/programada',
        subcategory: 'Cesárea programada',
        programada: dataToUse.filter(item => esCesarea(item) && esCesareaProg(item) && getRobsonGroup(item) === 4).length,
        urgencia: 0
      },
      {
        label: 'Grupo 5: Multíparas con ≥1 cesárea previa, embarazo único, cefálica, ≥37 sem',
        subcategory: '5.1: con 1 cesárea previa',
        ...contarRobson(item => getRobsonGroup(item) === 5)
      },
      {
        label: 'Grupo 5: Multíparas con ≥1 cesárea previa, embarazo único, cefálica, ≥37 sem',
        subcategory: '5.2: 2 o más cesáreas previas',
        programada: 0,
        urgencia: 0
      },
      {
        label: 'Grupo 6: Nulíparas, embarazo único, podálica',
        subcategory: null,
        ...contarRobson(item => getRobsonGroup(item) === 6)
      },
      {
        label: 'Grupo 7: Multíparas, embarazo único, podálica, con 1 o más cesáreas previas',
        subcategory: null,
        ...contarRobson(item => getRobsonGroup(item) === 7)
      },
      {
        label: 'Grupo 8: Todas las mujeres con embarazo múltiple, incluidas las que tienen 1 o más cesáreas previas',
        subcategory: null,
        ...contarRobson(item => getRobsonGroup(item) === 8)
      },
      {
        label: 'Grupo 9: Embarazo único, transverso y oblicuo, incluidas las que tienen una o más cesáreas previas',
        subcategory: null,
        ...contarRobson(item => getRobsonGroup(item) === 9)
      },
      {
        label: 'Grupo 10: Todas las mujeres con embarazo único, cefálica, <37 sem, incluidas las que tienen 1 o más cesáreas',
        subcategory: null,
        ...contarRobson(item => getRobsonGroup(item) === 10)
      },
      {
        label: 'Total cesáreas por requerimiento materno',
        subcategory: 'Nulípara',
        programada: dataToUse.filter(item => esCesarea(item) && esCesareaProg(item) && (String(item.paridad || '').toUpperCase().includes('PRIMIPARA') || String(item.paridad || '').toUpperCase().includes('NULIPARA')) && String(item.causaCesarea || '').toUpperCase().includes('MATERNO')).length,
        urgencia: dataToUse.filter(item => esCesarea(item) && esCesareaUrg(item) && (String(item.paridad || '').toUpperCase().includes('PRIMIPARA') || String(item.paridad || '').toUpperCase().includes('NULIPARA')) && String(item.causaCesarea || '').toUpperCase().includes('MATERNO')).length
      },
      {
        label: 'Total cesáreas por requerimiento materno',
        subcategory: 'Multípara',
        programada: dataToUse.filter(item => esCesarea(item) && esCesareaProg(item) && String(item.paridad || '').toUpperCase().includes('MULTIPARA') && String(item.causaCesarea || '').toUpperCase().includes('MATERNO')).length,
        urgencia: dataToUse.filter(item => esCesarea(item) && esCesareaUrg(item) && String(item.paridad || '').toUpperCase().includes('MULTIPARA') && String(item.causaCesarea || '').toUpperCase().includes('MATERNO')).length
      },
      {
        label: 'Acompañamiento durante la cesárea',
        subcategory: null,
        programada: dataToUse.filter(item => esCesareaProg(item) && normalizeBoolean(item.acompanamientoParto, false)).length,
        urgencia:   dataToUse.filter(item => esCesareaUrg(item)  && normalizeBoolean(item.acompanamientoParto, false)).length,
      }
    ]

    // ─────────────────────────────────────────────────────
    // Sección D.2: Atención Inmediata del Recién Nacido
    // ─────────────────────────────────────────────────────
    const calcD2 = (filtro) => dataForCalculations.filter(filtro).length

    const seccionD2 = {
      lesionesVaginal: calcD2(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL')
      }),
      lesionesInstrumental: calcD2(item => String(item.tipoParto || '').toUpperCase().includes('INSTRUMENTAL')),
      lesionesCesarea: calcD2(item => String(item.tipoParto || '').toUpperCase().includes('CES')),
      lesionesExtrahospitalario: calcD2(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        return tipo.includes('EXTRAHOSPITALARIO') || tipo.includes('PREHOSPITALARIO')
      }),
      // APGAR según criterios REM: ≤3 al minuto 1; ≤6 al minuto 5
      apgar3min1: calcD2(item => {
        const a = getFieldValue(item, ['apgar1', 'apgar_1'], null)
        if (a === null || a === undefined || a === '') return false
        const n = Number(a)
        return !Number.isNaN(n) && n <= 3
      }),
      apgar6min5: calcD2(item => {
        const a = getFieldValue(item, ['apgar5', 'apgar_5'], null)
        if (a === null || a === undefined || a === '') return false
        const n = Number(a)
        return !Number.isNaN(n) && n <= 6
      }),
    }

    return { seccionA, seccionA1, seccionA2, seccionD1, seccionD2, seccionB }
  }, [filteredDataByMonthAndYear])


  // Función para exportar Sección A a Excel
  const exportSeccionA = async () => {
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
      'No binarie',
      'Uso de oxitocina profiláctica',
      'Anestesia Neuroaxial',
      'Óxido nitroso',
      'Analgesia endovenosa',
      'General',
      'Local',
      'Medidas no farmacológicas'
    ])

    // Datos: misma información que la tabla (indicadores calculados por fila)
    tableData.seccionA.forEach(row => {
      const ind = getIndicadoresSeccionA(row)
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
        ind.ligaduraTardia,
        ind.contactoMadreMenor2500,
        ind.contactoMadreMayor2500,
        ind.contactoPadreMenor2500,
        ind.contactoPadreMayor2500,
        ind.lactancia,
        ind.alojamiento,
        ind.pertinenciaCultural,
        ind.pueblosOriginarios,
        ind.migrantes,
        ind.discapacidad,
        ind.privadaLibertad,
        ind.transMasculino,
        ind.noBinarie,
        ind.oxitocinaProf,
        ind.anestesiaNeuroaxial,
        ind.oxidoNitroso,
        ind.analgesiaEndovenosa,
        ind.anestesiaGeneral,
        ind.anestesiaLocal,
        ind.medidasNoFarmacologicas
      ])
    })

    // Workbook y worksheet se crean dentro de descargarExcelREM (exceljs)
    
    // Ajustar ancho de columnas
    const cols = [
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
      { wch: 15 }, // No binarie
      { wch: 22 }, // Oxitocina profiláctica
      { wch: 20 }, // Neuroaxial
      { wch: 15 }, // Óxido nitroso
      { wch: 22 }, // Endovenosa
      { wch: 12 }, // General
      { wch: 12 }, // Local
      { wch: 22 }  // No farmacológicas
    ]

    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0]
    const año = selectedYear !== 'all' ? selectedYear : 'Todos'
    const mes = selectedMonth !== 'all' ? `-${selectedMonth}` : ''
    const filename = `REM_SeccionA_${año}${mes}_${fecha}.xlsx`
    await descargarExcelREM('Sección A', excelData, cols, filename)
  }

  // Función para exportar Sección A.1 a Excel
  const exportSeccionA1 = async () => {
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

    // Workbook y worksheet se crean dentro de descargarExcelREM (exceljs)

    // Ajustar ancho de columnas
    const cols = [
      { wch: 40 }, // Característica
      { wch: 25 }, // Subcategoría
      { wch: 10 }, // Total
      { wch: 15 }, // <28 semanas
      { wch: 20 }, // 28-37 semanas
      { wch: 20 }  // 38+ semanas
    ]

    // Generar nombre de archivo
    const fecha = new Date().toISOString().split('T')[0]
    const año = selectedYear !== 'all' ? selectedYear : 'Todos'
    const mes = selectedMonth !== 'all' ? `-${selectedMonth}` : ''
    const filename = `REM_SeccionA1_${año}${mes}_${fecha}.xlsx`
    await descargarExcelREM('Sección A.1', excelData, cols, filename)
  }

  // Función para exportar Sección D a Excel
  const exportSeccionD = async () => {
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

    // Workbook y worksheet se crean dentro de descargarExcelREM (exceljs)
    
    // Ajustar ancho de columnas
    const cols = [
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

    // Generar nombre de archivo
    const fecha = new Date().toISOString().split('T')[0]
    const año = selectedYear !== 'all' ? selectedYear : 'Todos'
    const mes = selectedMonth !== 'all' ? `-${selectedMonth}` : ''
    const filename = `REM_SeccionD_${año}${mes}_${fecha}.xlsx`
    await descargarExcelREM('Sección D.1', excelData, cols, filename)
  }

  return (
    <motion.div
      className="rem-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >

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
                    <th rowSpan="2" className="rem-th-main rem-th-vertical">Uso de oxitocina profiláctica</th>
                    <th colSpan="6" className="rem-th-group">ANESTESIA Y/O ANALGESIA DEL PARTO (MEDIDAS FARMACOLÓGICAS Y NO FARMACOLÓGICAS)</th>
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
                    <th className="rem-th-sub">Anestesia Neuroaxial</th>
                    <th className="rem-th-sub">Óxido nitroso</th>
                    <th className="rem-th-sub">Analgesia endovenosa</th>
                    <th className="rem-th-sub">General</th>
                    <th className="rem-th-sub">Local</th>
                    <th className="rem-th-sub">Medidas no farmacológicas</th>
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
                    <th colSpan="7"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Sección A: Características del Parto */}
                  {tableData.seccionA.map((row, index) => {
                    const ind = getIndicadoresSeccionA(row)
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
                        <td className="rem-td-value">{ind.ligaduraTardia}</td>
                        <td className="rem-td-value">{ind.contactoMadreMenor2500}</td>
                        <td className="rem-td-value">{ind.contactoMadreMayor2500}</td>
                        <td className="rem-td-value">{ind.contactoPadreMenor2500}</td>
                        <td className="rem-td-value">{ind.contactoPadreMayor2500}</td>
                        <td className="rem-td-value">{ind.lactancia}</td>
                        <td className="rem-td-value">{ind.alojamiento}</td>
                        <td className="rem-td-value">{ind.pertinenciaCultural}</td>
                        <td className="rem-td-value">{ind.pueblosOriginarios}</td>
                        <td className="rem-td-value">{ind.migrantes}</td>
                        <td className="rem-td-value">{ind.discapacidad}</td>
                        <td className="rem-td-value">{ind.privadaLibertad}</td>
                        <td className="rem-td-value">{ind.transMasculino}</td>
                        <td className="rem-td-value">{ind.noBinarie}</td>
                        <td className="rem-td-value">{ind.oxitocinaProf}</td>
                        <td className="rem-td-value">{ind.anestesiaNeuroaxial}</td>
                        <td className="rem-td-value">{ind.oxidoNitroso}</td>
                        <td className="rem-td-value">{ind.analgesiaEndovenosa}</td>
                        <td className="rem-td-value">{ind.anestesiaGeneral}</td>
                        <td className="rem-td-value">{ind.anestesiaLocal}</td>
                        <td className="rem-td-value">{ind.medidasNoFarmacologicas}</td>
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

          {/* Sección A.2: Cesáreas según Modelo de Robson */}
          {tableData.seccionA2 && tableData.seccionA2.length > 0 && (
            <>
              <div className="rem-header" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <h2>📋 SECCIÓN A.2: CESÁREAS (CLASIFICACIÓN SEGÚN MODELO DE ROBSON)</h2>
              </div>
              <div className="rem-table-wrapper">
                <table className="rem-table">
                  <thead>
                    <tr>
                      <th colSpan="2" className="rem-th-main">CLASIFICACIÓN SEGÚN MODELO DE ROBSON</th>
                      <th className="rem-th-main">Programada</th>
                      <th className="rem-th-main">Urgencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.seccionA2.map((row, index) => {
                      const prevRow = index > 0 ? tableData.seccionA2[index - 1] : null
                      const isSubcategory = row.subcategory !== null
                      let showMainLabel = false
                      let rowSpan = 1

                      if (!isSubcategory) {
                        showMainLabel = true
                      } else {
                        showMainLabel = !prevRow || prevRow.label !== row.label
                        if (showMainLabel) {
                          let count = 1
                          for (let i = index + 1; i < tableData.seccionA2.length; i++) {
                            if (tableData.seccionA2[i].label === row.label && tableData.seccionA2[i].subcategory !== null) count++
                            else break
                          }
                          rowSpan = count
                        }
                      }

                      return (
                        <tr key={`seccionA2-${index}`}>
                          {!isSubcategory ? (
                            <td colSpan="2" className="rem-td-label" style={{ fontWeight: 'bold' }}>{row.label}</td>
                          ) : (
                            <>
                              {showMainLabel && (
                                <td rowSpan={rowSpan} className="rem-td-label" style={{ fontWeight: 'bold', verticalAlign: 'top' }}>{row.label}</td>
                              )}
                              <td className="rem-td-label" style={{ paddingLeft: '20px' }}>{row.subcategory}</td>
                            </>
                          )}
                          <td className="rem-td-value">{row.programada}</td>
                          <td className="rem-td-value">{row.urgencia}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Sección D.2: Atención Inmediata del Recién Nacido */}
          {tableData.seccionD2 && (
            <>
              <div className="rem-header" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <h2>📋 SECCIÓN D.2: ATENCIÓN INMEDIATA DEL RECIÉN NACIDO</h2>
              </div>
              <div className="rem-table-wrapper">
                <table className="rem-table">
                  <thead>
                    <tr>
                      <th rowSpan="2" className="rem-th-main">TIPO</th>
                      <th colSpan="4" className="rem-th-group">LESIONES POR TIPO DE PARTO</th>
                      <th colSpan="2" className="rem-th-group">APGAR</th>
                    </tr>
                    <tr>
                      <th className="rem-th-sub">Parto Vaginal</th>
                      <th className="rem-th-sub">Parto Instrumental</th>
                      <th className="rem-th-sub">Cesárea</th>
                      <th className="rem-th-sub">Parto extrahospitalario</th>
                      <th className="rem-th-sub">Apgar menor o igual a 3 al minuto</th>
                      <th className="rem-th-sub">Apgar menor o igual a 6 a los 5 minutos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="rem-td-label">Nacidos vivos</td>
                      <td className="rem-td-value">{tableData.seccionD2.lesionesVaginal}</td>
                      <td className="rem-td-value">{tableData.seccionD2.lesionesInstrumental}</td>
                      <td className="rem-td-value">{tableData.seccionD2.lesionesCesarea}</td>
                      <td className="rem-td-value">{tableData.seccionD2.lesionesExtrahospitalario}</td>
                      <td className="rem-td-value">{tableData.seccionD2.apgar3min1}</td>
                      <td className="rem-td-value">{tableData.seccionD2.apgar6min5}</td>
                    </tr>
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

