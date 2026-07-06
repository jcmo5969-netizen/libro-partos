import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ExcelJS from 'exceljs'
import { puedeEditarParto, puedeEliminarParto } from '../services/authService'
import './Tabla.css'

// Todas las columnas del sistema para exportar (información completa del libro de partos)
const EXPORT_COLUMNS = [
  { key: 'correlativo', label: 'N°' },
  { key: 'fechaParto', label: 'Fecha parto' },
  { key: 'horaParto', label: 'Hora parto' },
  { key: 'tipoParto', label: 'Tipo parto' },
  { key: 'clasificacionRobson', label: 'Clasificación Robson' },
  { key: 'causaCesarea', label: 'Causa cesárea' },
  { key: 'medicoIndicaCesarea', label: 'Médico indica cesárea' },
  { key: 'medicoOperadorCesarea', label: 'Médico operador cesárea' },
  { key: 'nombreYApellido', label: 'Nombre y apellido madre' },
  { key: 'rut', label: 'RUT' },
  { key: 'edad', label: 'Edad' },
  { key: 'pesoMaterno', label: 'Peso materna (kg)' },
  { key: 'tallaMaterna', label: 'Talla materna (cm)' },
  { key: 'registradoPor', label: 'Responsable llenado' },
  { key: 'puebloOriginario', label: 'Pueblo originario' },
  { key: 'nombrePuebloOriginario', label: 'Nombre pueblo originario' },
  { key: 'migrante', label: 'Migrante' },
  { key: 'nacionalidad', label: 'Nacionalidad' },
  { key: 'discapacidad', label: 'Discapacidad' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'comuna', label: 'Comuna' },
  { key: 'consultorio', label: 'Consultorio' },
  { key: 'paridad', label: 'Paridad' },
  { key: 'cca', label: 'CCA' },
  { key: 'presentacion', label: 'Presentación' },
  { key: 'gemela', label: 'Gemelar' },
  { key: 'eg', label: 'EG (semanas)' },
  { key: 'dias', label: 'Días' },
  { key: 'planDeParto', label: 'Plan de parto' },
  { key: 'induccion', label: 'Inducción' },
  { key: 'tipoInduccion', label: 'Tipo inducción' },
  { key: 'induccionMecanica', label: 'Inducción mecánica' },
  { key: 'induccionFarmacologica', label: 'Inducción farmacológica' },
  { key: 'induccionCombinada', label: 'Inducción combinada' },
  { key: 'detalleInduccion', label: 'Detalle inducción' },
  { key: 'trabajoDeParto', label: 'Trabajo de parto' },
  { key: 'conduccionOcitocica', label: 'Conducción ocitócica' },
  { key: 'libertadDeMovimientoOEnTDP', label: 'Libertad de movimiento en TDP' },
  { key: 'motivoSinLibertadDeMovimiento', label: 'Motivo sin libertad de movimiento' },
  { key: 'regimenHidricoAmplioEnTDP', label: 'Régimen hídrico amplio en TDP' },
  { key: 'episiotomia', label: 'Episiotomía' },
  { key: 'desgarro', label: 'Desgarro' },
  { key: 'ligaduraTardiaCordon', label: 'Ligadura tardía cordón' },
  { key: 'posicionMaternaEnElExpulsivo', label: 'Posición materna en expulsivo' },
  { key: 'atencionConPertinenciaCultural', label: 'Atención con pertinencia cultural' },
  { key: 'eq', label: 'EQ' },
  { key: 'tipoDeAnestesia', label: 'Tipo de anestesia' },
  { key: 'horaDeAnestesia', label: 'Hora anestesia' },
  { key: 'medicoAnestesista', label: 'Médico anestesista' },
  { key: 'motivoNoAnestesia', label: 'Motivo no anestesia' },
  { key: 'anestesiaLocal', label: 'Anestesia local' },
  { key: 'detalleAnestesiaCombinada', label: 'Detalle anestesia combinada' },
  { key: 'detalleAnestesiaPCA', label: 'Detalle anestesia PCA' },
  { key: 'manejoFarmacologicoDelDolor', label: 'Manejo farmacológico del dolor' },
  { key: 'manejoNoFarmacologicoDelDolor', label: 'Manejo no farmacológico del dolor' },
  { key: 'medidasNoFarmacologicasParaElDolorCuales', label: 'Medidas no farmacológicas (cuáles)' },
  { key: 'alumbramientoConducido', label: 'Alumbramiento conducido' },
  { key: 'grupoRH', label: 'Grupo RH' },
  { key: 'chagas', label: 'Chagas' },
  { key: 'vih', label: 'VIH' },
  { key: 'vihAlParto', label: 'VIH al parto' },
  { key: 'rprVdrl', label: 'RPR/VDRL' },
  { key: 'hepatitisB', label: 'Hepatitis B' },
  { key: 'sgb', label: 'SGB' },
  { key: 'sgbConTratamientoAlParto', label: 'SGB con tratamiento al parto' },
  { key: 'embControlado', label: 'EMB controlado' },
  { key: 'privadaDeLibertad', label: 'Privada de libertad' },
  { key: 'transNoBinario', label: 'Trans no binario' },
  { key: 'peso', label: 'Peso RN (g)' },
  { key: 'talla', label: 'Talla RN (cm)' },
  { key: 'cc', label: 'CC RN (cm)' },
  { key: 'apgar1', label: 'APGAR 1 min' },
  { key: 'apgar5', label: 'APGAR 5 min' },
  { key: 'apgar10', label: 'APGAR 10 min' },
  { key: 'sexo', label: 'Sexo RN' },
  { key: 'malformaciones', label: 'Malformaciones RN' },
  { key: 'medicoObstetra', label: 'Médico obstetra' },
  { key: 'medicoPediatra', label: 'Médico pediatra' },
  { key: 'matronaPreparto', label: 'Matrona preparto' },
  { key: 'matronaParto', label: 'Matrona parto' },
  { key: 'matronaRN', label: 'Matrona RN' },
  { key: 'acompanamientoPreparto', label: 'Acompañamiento preparto' },
  { key: 'acompanamientoParto', label: 'Acompañamiento parto' },
  { key: 'acompanamientoPuerperioInmediato', label: 'Acompañamiento puerperio inmediato' },
  { key: 'nombreAcompanante', label: 'Nombre acompañante' },
  { key: 'parentescoAcompananteRespectoAMadre', label: 'Parentesco acompañante (madre)' },
  { key: 'apegoConPiel30Min', label: 'Apego piel a piel 30 min' },
  { key: 'causaNoApego', label: 'Causa no apego' },
  { key: 'acompanamientoRN', label: 'Acompañamiento RN' },
  { key: 'parentescoAcompananteRespectoARN', label: 'Parentesco acompañante (RN)' },
  { key: 'lactanciaPrecoz60MinDeVida', label: 'Lactancia precoz 60 min' },
  { key: 'destino', label: 'Destino RN' },
  { key: 'horaParto2', label: 'Hora parto RN2' },
  { key: 'peso2', label: 'Peso RN2 (g)' },
  { key: 'talla2', label: 'Talla RN2 (cm)' },
  { key: 'cc2', label: 'CC RN2 (cm)' },
  { key: 'apgar1_2', label: 'APGAR 1 min RN2' },
  { key: 'apgar5_2', label: 'APGAR 5 min RN2' },
  { key: 'apgar10_2', label: 'APGAR 10 min RN2' },
  { key: 'sexo2', label: 'Sexo RN2' },
  { key: 'malformaciones2', label: 'Malformaciones RN2' },
  { key: 'destino2', label: 'Destino RN2' },
  { key: 'comentarios', label: 'Comentarios' }
]

function Tabla({ data, onDelete, onEdit, filter, onClearFilter }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState('fechaParto')
  const [sortDirection, setSortDirection] = useState('desc')
  const itemsPerPage = 20

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Filtrar datos por filtros del dashboard
  const filteredData = useMemo(() => {
    let result = data
    
    // Aplicar filtro del dashboard si existe
    if (filter && Object.keys(filter).length > 0) {
      console.log('Aplicando filtro:', filter)
      result = result.filter(item => {
        return Object.entries(filter).every(([key, value]) => {
          // Filtro especial para mes
          if (key === 'mes') {
            // Usar mesParto si está disponible (más eficiente)
            if (item.mesParto !== undefined && item.mesParto !== null) {
              const filterMonth = parseInt(value)
              if (isNaN(filterMonth)) return false
              return item.mesParto === filterMonth
            }
            
            // Fallback: parsear desde fechaParto
            if (!item.fechaParto) return false
            
            // La fecha está en formato M/D/YYYY o MM/DD/YYYY
            const dateParts = item.fechaParto.split('/')
            if (dateParts.length !== 3) return false
            
            // Validar que el mes sea válido (1-12)
            const month = parseInt(dateParts[0])
            if (isNaN(month) || month < 1 || month > 12) {
              return false
            }
            
            const filterMonth = parseInt(value)
            if (isNaN(filterMonth)) return false
            
            return month === filterMonth
          }
          
          const itemValue = item[key]
          
          // Si el valor del filtro es 'SI' o 'NO', comparar exactamente
          if (value === 'SI' || value === 'NO') {
            const matches = itemValue === value || itemValue === value.toUpperCase() || itemValue === value.toLowerCase()
            if (!matches) {
              console.log(`Filtro ${key}: itemValue="${itemValue}" !== filterValue="${value}"`)
            }
            return matches
          }
          
          // Si el valor del item es string, hacer comparación case-insensitive
          if (itemValue && typeof itemValue === 'string') {
            const itemStr = itemValue.toUpperCase().trim()
            const filterStr = value.toUpperCase().trim()
            
            // Para tipoParto: VAGINAL incluye también INSTRUMENTAL
            if (key === 'tipoParto') {
              const matches = itemStr.includes(filterStr) || itemStr === filterStr ||
                (filterStr === 'VAGINAL' && itemStr.includes('INSTRUMENTAL'))
              if (!matches) {
                console.log(`Filtro tipoParto: "${itemStr}" no contiene "${filterStr}"`)
              }
              return matches
            }
            
            // Para paridad, comparar exactamente o si contiene
            if (key === 'paridad') {
              const matches = itemStr === filterStr || itemStr.includes(filterStr)
              if (!matches) {
                console.log(`Filtro paridad: "${itemStr}" !== "${filterStr}"`)
              }
              return matches
            }
            
            // Para otros campos string, buscar si contiene
            return itemStr.includes(filterStr) || itemStr === filterStr
          }
          
          // Comparación directa para otros tipos
          return itemValue === value
        })
      })
      console.log(`Resultados filtrados: ${result.length} de ${data.length}`)
    }

    // Búsqueda rápida (nombre, RUT, N°, tipo parto, fecha, comentarios, teléfono) — sin descargar Excel
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      const compact = (s) => String(s ?? '').toLowerCase().replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '')
      const qCompact = compact(q)
      result = result.filter((item) => {
        const lc = (v) => String(v ?? '').toLowerCase()
        const nombre = `${lc(item.nombre)} ${lc(item.nombreYApellido)} ${lc(item.nombre_y_apellido)}`
        const rut = lc(item.rut)
        const rutC = compact(item.rut)
        const num = lc(item.correlativo ?? item.numero)
        if (nombre.includes(q) || rut.includes(q) || num.includes(q)) return true
        if (qCompact.length >= 2 && rutC.includes(qCompact)) return true
        return (
          lc(item.tipoParto).includes(q) ||
          lc(item.comentarios).includes(q) ||
          lc(item.telefono).includes(q) ||
          lc(item.fechaParto).includes(q) ||
          lc(item.fecha).includes(q)
        )
      })
    }

    // Ordenar por la columna seleccionada
    result = [...result].sort((a, b) => {
      const toSnakeSort = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
      const getValue = (item, column) => {
        // Manejo especial para la columna numero (correlativo)
        if (column === 'numero' || column === 'correlativo') {
          return item.correlativo !== undefined && item.correlativo !== null 
            ? parseInt(item.correlativo) || 0 
            : 0
        }
        
        let value = item[column] ?? item[toSnakeSort(column)]
        if ((column === 'fecha' || column === 'fechaParto') && (value === null || value === undefined || value === '')) {
          value = item.fechaParto ?? item.fecha ?? ''
        }
        
        // Si el valor es null o undefined, retornar valor por defecto según tipo
        if (value === null || value === undefined || value === '') {
          return null
        }
        
        // Fecha como objeto Date: convertir a timestamp para ordenar
        if ((column === 'fecha' || column === 'fechaParto') && value instanceof Date && !isNaN(value.getTime())) {
          return value.getTime()
        }
        
        // Intentar convertir a número si es posible
        if (typeof value === 'string') {
          // Fechas PRIMERO (antes de parseFloat): "04-03-2026" daría parseFloat=4 y rompería el orden
          if (column === 'fecha' || column === 'fechaParto') {
            const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
            if (isoMatch) {
              return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10)).getTime()
            }
            const parts = value.split(/[/-]/)
            if (parts.length === 3) {
              const p0 = parseInt(parts[0], 10), p1 = parseInt(parts[1], 10), p2 = parseInt(parts[2], 10)
              if (p0 > 31) {
                return new Date(p0, p1 - 1, p2).getTime()
              }
              if (p2 > 31) {
                return new Date(p2, p1 - 1, p0).getTime()
              }
              return new Date(p2, p1 - 1, p0).getTime()
            }
            const fallback = new Date(value).getTime()
            if (!isNaN(fallback)) return fallback
          }
          const num = parseFloat(value)
          if (!isNaN(num) && isFinite(num)) {
            return num
          }
          // Para horas en formato HH:MM
          if (column === 'hora' || column === 'horaParto') {
            const parts = value.split(':')
            if (parts.length >= 2) {
              return parseInt(parts[0]) * 60 + parseInt(parts[1])
            }
          }
          return value.toLowerCase()
        }
        
        return value
      }
      
      const valueA = getValue(a, sortColumn)
      const valueB = getValue(b, sortColumn)

      // Manejar valores null
      if (valueA === null && valueB === null) return 0
      if (valueA === null) return 1
      if (valueB === null) return -1

      // Comparar valores
      let comparison = 0
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        comparison = valueA - valueB
      } else if (typeof valueA === 'string' && typeof valueB === 'string') {
        comparison = valueA.localeCompare(valueB, 'es', { numeric: true })
      } else {
        comparison = String(valueA).localeCompare(String(valueB), 'es', { numeric: true })
      }

      if (comparison !== 0) return sortDirection === 'asc' ? comparison : -comparison

      // Desempate: si columna primaria es fecha, ordenar por hora luego por correlativo
      if (sortColumn === 'fechaParto' || sortColumn === 'fecha') {
        const horaA = getValue(a, 'horaParto')
        const horaB = getValue(b, 'horaParto')
        if (horaA !== null && horaB !== null && horaA !== horaB) {
          return sortDirection === 'asc' ? (horaA < horaB ? -1 : 1) : (horaA > horaB ? -1 : 1)
        }
      }
      // Desempate final por correlativo DESC
      const cA = parseInt(a.correlativo) || 0
      const cB = parseInt(b.correlativo) || 0
      return cB - cA
    })
    
    return result
  }, [data, filter, searchQuery, sortColumn, sortDirection])

  // Paginación
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, sortColumn, sortDirection])

  // Columnas principales a mostrar (incluye posición materna, hora anestesia, medidas no farmac., grupo RH)
  const columns = [
    { key: 'numero', label: 'N°' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'hora', label: 'Hora' },
    { key: 'tipoParto', label: 'Tipo Parto' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'rut', label: 'RUT' },
    { key: 'edad', label: 'Edad' },
    { key: 'pesoMaterno', label: 'Peso mat. (kg)' },
    { key: 'tallaMaterna', label: 'Talla mat. (cm)' },
    { key: 'registradoPor', label: 'Registró' },
    { key: 'paridad', label: 'Paridad' },
    { key: 'presentacion', label: 'Presentación' },
    { key: 'semanasGestacion', label: 'EG' },
    { key: 'ligaduraTardiaCordon', label: 'Ligadura tardía cordón' },
    { key: 'posicionMaternaEnElExpulsivo', label: 'Posición materna expulsivo' },
    { key: 'atencionConPertinenciaCultural', label: 'Atención con pertinencia' },
    { key: 'tipoDeAnestesia', label: 'Tipo anestesia' },
    { key: 'horaDeAnestesia', label: 'Hora anestesia' },
    { key: 'manejoNoFarmacologicoDelDolor', label: 'Manejo no farmac. dolor' },
    { key: 'medidasNoFarmacologicasParaElDolorCuales', label: 'Medidas no farmac. (cuáles)' },
    { key: 'grupoRH', label: 'Grupo RH' },
    { key: 'matronaRN', label: 'Matrona RN' },
    { key: 'parentescoAcompananteRespectoAMadre', label: 'Parentesco acompañante (madre)' },
    { key: 'parentescoAcompananteRespectoARN', label: 'Parentesco acompañante (RN)' },
    { key: 'peso', label: 'Peso (g)' },
    { key: 'talla', label: 'Talla (cm)' },
    { key: 'apgar1', label: 'APGAR 1' },
    { key: 'apgar5', label: 'APGAR 5' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'destino', label: 'Destino' }
  ]

  const confirmDeleteRow = () => {
    if (!itemToDelete || !onDelete) return
    // La API DELETE acepta solo UUID (id) o trace_id, no correlativo ni número de fila.
    const traceId =
      itemToDelete.id ??
      itemToDelete._traceId ??
      itemToDelete.traceId ??
      itemToDelete.numero ??
      itemToDelete.correlativo
    onDelete(traceId, itemToDelete)
    setItemToDelete(null)
  }

  // Convierte camelCase a snake_case para buscar en datos del backend
  const toSnake = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')

  // Obtener valor para mostrar en la tabla (misma lógica que export: key, snake_case, aliases)
  const getCellValue = (item, key) => {
    const aliases = {
      nombreYApellido: ['nombre', 'nombre_y_apellido'],
      fechaParto: ['fecha', 'fecha_parto'],
      horaParto: ['hora', 'hora_parto'],
      horaDeAnestesia: ['hora_anestesia', 'horaAnestesia'],
      eg: ['semanasGestacion', 'semanas_gestacion'],
      tipoDeAnestesia: ['tipoAnestesia', 'tipo_anestesia'],
      tipoParto: ['tipo_parto'],
      posicionMaternaEnElExpulsivo: ['posicion_materna_en_el_expulsivo', 'posicion_materna_expulsivo'],
      medidasNoFarmacologicasParaElDolorCuales: ['medidas_no_farmacologicas_para_el_dolor_cuales', 'medidas_no_farmacologicas'],
      grupoRH: ['grupo_rh', 'grupoRh'],
      matronaRN: ['matronaRn', 'matrona_rn', 'matronaNeo', 'matrona_neo'],
      parentescoAcompananteRespectoAMadre: ['parentesco_acompanante_respecto_a_madre', 'parentesco_madre'],
      parentescoAcompananteRespectoARN: ['parentesco_acompanante_respecto_a_rn', 'parentesco_rn'],
      pesoMaterno: ['peso_materno'],
      tallaMaterna: ['talla_materna'],
      registradoPor: ['registrado_por', 'responsableLlenado', 'responsable_llenado']
    }
    const snake = toSnake(key)
    let raw = item[key] ?? item[snake]
    if (raw === null || raw === undefined || raw === '') {
      const alt = aliases[key]
      if (alt) raw = alt.map(a => item[a]).find(v => v != null && v !== '')
    }
    if (raw === null || raw === undefined || raw === '') {
      for (const k of Object.keys(item)) {
        if (toSnake(k) === snake) { raw = item[k]; break }
      }
    }
    return raw
  }

  // Columnas Sí/No: si no hay valor, mostrar "No" para que el Excel no quede en blanco
  const SI_NO_KEYS = new Set(['puebloOriginario', 'migrante', 'discapacidad', 'planDeParto', 'induccion', 'trabajoDeParto', 'conduccionOcitocica', 'libertadDeMovimientoOEnTDP', 'regimenHidricoAmplioEnTDP', 'episiotomia', 'desgarro', 'ligaduraTardiaCordon', 'atencionConPertinenciaCultural', 'eq', 'manejoFarmacologicoDelDolor', 'manejoNoFarmacologicoDelDolor', 'alumbramientoConducido', 'chagas', 'vih', 'vihAlParto', 'rprVdrl', 'hepatitisB', 'embControlado', 'privadaDeLibertad', 'transNoBinario', 'malformaciones', 'acompanamientoPreparto', 'acompanamientoParto', 'acompanamientoPuerperioInmediato', 'apegoConPiel30Min', 'acompanamientoRN', 'lactanciaPrecoz60MinDeVida', 'gemela', 'anestesiaLocal', 'cca', 'malformaciones2', 'acompanamientoPreparto2', 'acompanamientoParto2', 'acompanamientoPuerperioInmediato2', 'apegoConPiel30Min2', 'acompanamientoRN2', 'lactanciaPrecoz60MinDeVida2'])

  // Campos del segundo RN (solo se muestran si la paciente es gemelar)
  const SECOND_RN_FIELDS = new Set(['horaParto2', 'peso2', 'talla2', 'cc2', 'apgar1_2', 'apgar5_2', 'apgar10_2', 'sexo2', 'malformaciones2', 'destino2'])

  const isGemela = (item) => {
    const v = item.gemela ?? item.gemelar
    return v === 1 || v === true || String(v).toUpperCase() === 'SI' || String(v).toUpperCase() === 'SÍ'
  }

  // Obtener valor para exportar: busca por clave exacta, snake_case y en todas las claves del item
  const getExportValue = (item, key) => {
    // Campos del 2° RN: solo mostrar si la paciente es gemelar
    if (SECOND_RN_FIELDS.has(key) && !isGemela(item)) return ''
    const aliases = {
      nombreYApellido: ['nombre', 'nombre_y_apellido'],
      fechaParto: ['fecha', 'fecha_parto'],
      horaParto: ['hora', 'hora_parto'],
      horaDeAnestesia: ['hora_anestesia', 'horaAnestesia'],
      eg: ['semanasGestacion', 'semanas_gestacion'],
      tipoDeAnestesia: ['tipoAnestesia', 'tipo_anestesia'],
      tipoParto: ['tipo_parto', 'tipoParto'],
      cc: ['perimetroCefalico', 'perimetro_cefalico'],
      planDeParto: ['plan_de_parto'],
      trabajoDeParto: ['trabajo_de_parto'],
      induccion: ['induccion'],
      posicionMaternaEnElExpulsivo: ['posicion_materna_en_el_expulsivo', 'posicion_materna_expulsivo', 'posicionMaternaExpulsivo'],
      medidasNoFarmacologicasParaElDolorCuales: ['medidas_no_farmacologicas_para_el_dolor_cuales', 'medidas_no_farmacologicas', 'medidasNoFarmacologicas'],
      grupoRH: ['grupo_rh', 'grupoRh', 'grupo'],
      matronaRN: ['matronaRn', 'matrona_rn', 'matronaNeo', 'matrona_neo'],
      parentescoAcompananteRespectoAMadre: ['parentesco_acompanante_respecto_a_madre', 'parentesco_madre', 'parentescoAcompananteMadre'],
      parentescoAcompananteRespectoARN: ['parentesco_acompanante_respecto_a_rn', 'parentesco_rn', 'parentescoAcompananteRN'],
      pesoMaterno: ['peso_materno'],
      tallaMaterna: ['talla_materna'],
      registradoPor: ['registrado_por', 'responsableLlenado', 'responsable_llenado']
    }
    const snake = toSnake(key)
    let raw = item[key] ?? item[snake]
    if (raw === null || raw === undefined || raw === '') {
      const alt = aliases[key]
      if (alt) raw = alt.map(a => item[a]).find(v => v != null && v !== '')
    }
    if (raw === null || raw === undefined || raw === '') {
      for (const k of Object.keys(item)) {
        if (toSnake(k) === snake) {
          raw = item[k]
          break
        }
      }
    }
    if (raw === null || raw === undefined || raw === '') {
      return ''
    }
    if (key === 'fechaParto' || key === 'fecha') {
      const f = typeof raw === 'string' && raw.includes('T') ? new Date(raw) : typeof raw === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(raw) ? new Date(raw + 'T12:00:00') : typeof raw === 'string' && raw.includes('/') ? (p => p.length === 3 ? new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])) : null)(raw.split('/')) : raw instanceof Date ? raw : new Date(raw)
      if (f && !isNaN(f.getTime())) return f
      return String(raw)
    }
    if (key === 'horaParto' || key === 'hora' || key === 'horaDeAnestesia' || key === 'horaParto2') {
      if (typeof raw === 'string' && /^\d{1,2}:\d{2}/.test(raw)) return raw.substring(0, 8)
      return String(raw)
    }
    if (typeof raw === 'number' && !Number.isInteger(raw) && key.match(/peso|talla|cc|eg|dias/)) return raw.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    if (typeof raw === 'boolean') return raw ? 'Sí' : 'No'
    if (SI_NO_KEYS.has(key)) {
      if (raw === 1 || raw === '1' || raw === true || String(raw).toUpperCase() === 'SI' || String(raw).toUpperCase() === 'SÍ') return 'Sí'
      if (raw === 0 || raw === '0' || raw === false || String(raw).toUpperCase() === 'NO') return 'No'
    }
    return String(raw)
  }

  // Función para exportar a Excel (toda la información del sistema, formato estético)
  const exportToExcel = async () => {
    if (!filteredData || filteredData.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Libro de Partos'
    const ws = wb.addWorksheet('Partos', { views: [{ state: 'frozen', ySplit: 3 }] })

    const colToLetter = (n) => {
      let s = ''
      while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1 }
      return s
    }
    const lastCol = colToLetter(EXPORT_COLUMNS.length - 1)

    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4C4C1' } }
    const headerFont = { bold: true, size: 11, color: { argb: 'FF2D2D2D' } }
    const titleFont = { bold: true, size: 14, color: { argb: 'FF8B4513' } }

    ws.mergeCells('A1:' + lastCol + '1')
    const titleCell = ws.getCell('A1')
    titleCell.value = 'Libro de Partos — Exportación completa'
    titleCell.font = titleFont
    titleCell.alignment = { vertical: 'middle' }

    const dateCell = ws.getCell('A2')
    dateCell.value = 'Exportado: ' + new Date().toLocaleString('es-CL')
    dateCell.font = { size: 10, color: { argb: 'FF666666' } }
    ws.mergeCells('A2:' + lastCol + '2')

    const headerRow = ws.addRow(EXPORT_COLUMNS.map(c => c.label))
    headerRow.height = 22
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = headerFill
      cell.font = headerFont
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Numeración continua 1,2,3… en el archivo descargado (sin huecos): se ordena
    // por el orden de registro (correlativo ascendente; respaldo por fecha y hora)
    // y se asigna un N° secuencial nuevo, independiente de los saltos del correlativo en la BD.
    const exportData = [...filteredData].sort((a, b) => {
      const cA = parseInt(a.correlativo)
      const cB = parseInt(b.correlativo)
      if (Number.isFinite(cA) && Number.isFinite(cB) && cA !== cB) return cA - cB
      const fA = String(a.fechaParto ?? a.fecha ?? '')
      const fB = String(b.fechaParto ?? b.fecha ?? '')
      if (fA !== fB) return fA.localeCompare(fB, 'es', { numeric: true })
      return String(a.horaParto ?? a.hora ?? '').localeCompare(String(b.horaParto ?? b.hora ?? ''), 'es', { numeric: true })
    })

    exportData.forEach((item, idx) => {
      const row = ws.addRow(EXPORT_COLUMNS.map(col => {
        if (col.key === 'correlativo') return idx + 1
        return getExportValue(item, col.key)
      }))
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', wrapText: true }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        if (cell.value instanceof Date) {
          cell.numFmt = 'dd-mm-yyyy'
          cell.alignment = { ...cell.alignment, horizontal: 'center' }
        }
      })
    })

    EXPORT_COLUMNS.forEach((_, i) => {
      ws.getColumn(i + 1).width = Math.min(Math.max(12, EXPORT_COLUMNS[i].label.length + 2), 40)
    })

    // Autofilter sobre la fila de encabezados (fila 3) para que Excel agrupe fechas por año/mes
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3 + filteredData.length, column: EXPORT_COLUMNS.length }
    }

    const filename = `Libro_de_Partos_${new Date().toISOString().slice(0, 10)}.xlsx`
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tabla-container">
      <AnimatePresence>
        {itemToDelete && (
          <motion.div
            className="delete-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setItemToDelete(null)}
          >
            <motion.div
              className="delete-confirm-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>⚠️ Confirmar Eliminación</h3>
              <p>¿Estás seguro de que deseas eliminar este registro de parto?</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
              <div className="confirm-actions">
                <motion.button
                  className="btn-cancel-delete"
                  onClick={() => setItemToDelete(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  className="btn-confirm-delete"
                  onClick={confirmDeleteRow}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Eliminar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="tabla-toolbar">
        <label className="tabla-search" htmlFor="tabla-busqueda-paciente">
          <span className="tabla-search-icon" aria-hidden="true">🔍</span>
          <input
            id="tabla-busqueda-paciente"
            type="search"
            className="tabla-search-input"
            placeholder="Buscar paciente (nombre, RUT, N°, fecha, tipo parto…)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
            title="Búsqueda en la tabla sin descargar Excel"
          />
          {searchQuery.trim() !== '' && (
            <button
              type="button"
              className="tabla-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </label>
      <div className="tabla-toolbar-row">
      <motion.div 
        className="results-count"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {filteredData.length} resultado{filteredData.length !== 1 ? 's' : ''}
        {filter && Object.keys(filter).length > 0 && (
          <motion.span 
            className="filter-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {' '}• Filtrado activo
            {onClearFilter && (
              <motion.button
                className="clear-filter-btn"
                onClick={onClearFilter}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Limpiar filtro"
              >
                ✕
              </motion.button>
            )}
          </motion.span>
        )}
      </motion.div>
        <motion.button
          className="btn-export-excel"
          onClick={exportToExcel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          title="Descargar tabla en formato Excel"
        >
          📊 Descargar Excel
        </motion.button>
      </div>
      </div>

      <motion.div 
        className="table-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <p className="table-scroll-hint">
          La tabla tiene barra de desplazamiento horizontal aquí abajo: no necesita bajar hasta el final de la página.
        </p>
        <div className="table-scroll-viewport">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(column => {
                  const isSorted = sortColumn === column.key || (column.key === 'numero' && sortColumn === 'correlativo')
                  const isAsc = sortDirection === 'asc'
                  return (
                    <th 
                      key={column.key}
                      className={`sortable-header ${column.key === 'fecha' ? 'fecha-header' : ''}`}
                      onClick={() => {
                        if (column.key === 'numero') {
                          if (sortColumn === 'correlativo' && sortDirection === 'desc') {
                            setSortColumn('correlativo')
                            setSortDirection('asc')
                          } else {
                            setSortColumn('correlativo')
                            setSortDirection('desc')
                          }
                        } else {
                          const nextDir = (sortColumn === column.key && sortDirection === 'desc') ? 'asc' : 'desc'
                          setSortColumn(column.key)
                          setSortDirection(nextDir)
                        }
                        setCurrentPage(1)
                      }}
                      title={column.key === 'fecha' 
                        ? (sortColumn === 'fecha' && sortDirection === 'desc' 
                            ? 'Clic: ordenar de menor a mayor (más antigua primero)' 
                            : 'Clic: ordenar de mayor a menor (más reciente primero)')
                        : `Clic para ordenar por ${column.label}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          if (column.key === 'numero') {
                            if (sortColumn === 'correlativo' && sortDirection === 'desc') {
                              setSortColumn('correlativo')
                              setSortDirection('asc')
                            } else {
                              setSortColumn('correlativo')
                              setSortDirection('desc')
                            }
                          } else {
                            const nextDir = (sortColumn === column.key && sortDirection === 'desc') ? 'asc' : 'desc'
                            setSortColumn(column.key)
                            setSortDirection(nextDir)
                          }
                          setCurrentPage(1)
                        }
                      }}
                    >
                      <div className="header-content">
                        <span>{column.label}</span>
                        {isSorted && (
                          <span className="sort-indicator" aria-hidden="true">
                            {isAsc ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
                <th className="actions-header">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const canEdit = puedeEditarParto(item)
                  const canDel = puedeEliminarParto(item)
                  return (
                    <motion.tr
                      key={item.numero || item._traceId || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.3 }}
                      whileHover={{ 
                        backgroundColor: 'rgba(255, 182, 193, 0.1)',
                        scale: 1.01
                      }}
                    >
                      {columns.map(column => {
                        const value = getCellValue(item, column.key)
                        let displayValue = '-'
                        
                        // Si es la columna de número, usar el correlativo
                        if (column.key === 'numero') {
                          displayValue = item.correlativo ?? item.numero ?? '-'
                        } else if (column.key === 'fecha') {
                          // Formatear fecha a DD-MM-YYYY
                          const fecha = item.fechaParto || item.fecha || value
                          if (fecha) {
                            try {
                              let date
                              // Si es un string ISO (2025-12-16T03:00:00.000Z)
                              if (typeof fecha === 'string' && fecha.includes('T')) {
                                date = new Date(fecha)
                              }
                              // Si es formato YYYY-MM-DD
                              else if (typeof fecha === 'string' && fecha.includes('-') && fecha.split('-')[0].length === 4) {
                                const parts = fecha.split('-')
                                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                              }
                              // Si es formato MM/DD/YYYY
                              else if (typeof fecha === 'string' && fecha.includes('/')) {
                                const parts = fecha.split('/')
                                if (parts.length === 3) {
                                  // Determinar si es MM/DD/YYYY o DD/MM/YYYY
                                  if (parts[0].length <= 2 && parseInt(parts[0]) <= 12) {
                                    // MM/DD/YYYY
                                    date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
                                  } else {
                                    // DD/MM/YYYY
                                    date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                                  }
                                }
                              }
                              // Si es un objeto Date
                              else if (fecha instanceof Date) {
                                date = fecha
                              }
                              // Si no se pudo parsear, intentar Date constructor
                              else {
                                date = new Date(fecha)
                              }
                              
                              if (date && !isNaN(date.getTime())) {
                                const dia = String(date.getDate()).padStart(2, '0')
                                const mes = String(date.getMonth() + 1).padStart(2, '0')
                                const año = date.getFullYear()
                                displayValue = `${dia}-${mes}-${año}`
                              } else {
                                displayValue = fecha
                              }
                            } catch (error) {
                              displayValue = fecha
                            }
                          }
                        } else if (value !== null && value !== undefined && value !== '') {
                          if (column.key === 'peso' && typeof value === 'number') {
                            displayValue = value.toLocaleString('es-CL')
                          } else if (SI_NO_KEYS.has(column.key)) {
                            const v = value
                            if (v === 1 || v === '1' || v === true || String(v).toUpperCase() === 'SI' || String(v).toUpperCase() === 'SÍ') displayValue = 'Sí'
                            else if (v === 0 || v === '0' || v === false || String(v).toUpperCase() === 'NO') displayValue = 'No'
                            else displayValue = String(v)
                          } else if (column.key === 'horaDeAnestesia' && typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value)) {
                            displayValue = value.substring(0, 8)
                          } else {
                            displayValue = value
                          }
                        }
                        
                        return (
                          <td key={column.key} className={column.key === 'fecha' ? 'fecha-cell' : ''}>
                            {displayValue}
                          </td>
                        )
                      })}
                    <td className="actions-cell">
                      <motion.button
                        type="button"
                        className="edit-btn"
                        disabled={!canEdit}
                        onClick={() => canEdit && onEdit && onEdit(item)}
                        whileHover={{ scale: canEdit ? 1.1 : 1 }}
                        whileTap={{ scale: canEdit ? 0.9 : 1 }}
                        style={{ opacity: canEdit ? 1 : 0.35 }}
                        title={
                          canEdit
                            ? 'Editar registro'
                            : 'Solo puede editar los partos que usted registró'
                        }
                      >
                        ✏️
                      </motion.button>
                      <motion.button
                        type="button"
                        className="delete-btn"
                        disabled={!canDel}
                        onClick={() => canDel && setItemToDelete(item)}
                        whileHover={{ scale: canDel ? 1.1 : 1 }}
                        whileTap={{ scale: canDel ? 0.9 : 1 }}
                        style={{ opacity: canDel ? 1 : 0.35 }}
                        title={
                          canDel
                            ? 'Eliminar registro'
                            : 'Solo puede eliminar los partos que usted registró'
                        }
                      >
                        🗑️
                      </motion.button>
                    </td>
                  </motion.tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="no-data">
                    No se encontraron resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <motion.button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              Anterior
            </motion.button>
            
            <span className="page-info">
              Página {currentPage} de {totalPages}
            </span>
            
            <motion.button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              Siguiente
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Tabla

