import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as XLSX from 'xlsx'
import './Tabla.css'

function Tabla({ data, onDelete, onEdit, filter, onClearFilter }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [sortColumn, setSortColumn] = useState('correlativo')
  const [sortDirection, setSortDirection] = useState('desc')
  const itemsPerPage = 20

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
            
            // Para tipoParto, buscar si contiene el valor
            if (key === 'tipoParto') {
              const matches = itemStr.includes(filterStr) || itemStr === filterStr
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
    
    // Ordenar por la columna seleccionada
    result = [...result].sort((a, b) => {
      const getValue = (item, column) => {
        // Manejo especial para la columna numero (correlativo)
        if (column === 'numero' || column === 'correlativo') {
          return item.correlativo !== undefined && item.correlativo !== null 
            ? parseInt(item.correlativo) || 0 
            : 0
        }
        
        let value = item[column]
        
        // Si el valor es null o undefined, retornar valor por defecto según tipo
        if (value === null || value === undefined || value === '') {
          return null
        }
        
        // Intentar convertir a número si es posible
        if (typeof value === 'string') {
          const num = parseFloat(value)
          if (!isNaN(num) && isFinite(num)) {
            return num
          }
          // Para fechas en formato MM/DD/YYYY
          if (column === 'fecha' || column === 'fechaParto') {
            const parts = value.split('/')
            if (parts.length === 3) {
              const [mes, dia, año] = parts
              return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia)).getTime()
            }
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
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [data, filter, sortColumn, sortDirection])

  // Paginación
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, sortColumn, sortDirection])

  // Columnas principales a mostrar (más columnas)
  const columns = [
    { key: 'numero', label: 'N°' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'hora', label: 'Hora' },
    { key: 'tipoParto', label: 'Tipo Parto' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'rut', label: 'RUT' },
    { key: 'edad', label: 'Edad' },
    { key: 'paridad', label: 'Paridad' },
    { key: 'presentacion', label: 'Presentación' },
    { key: 'semanasGestacion', label: 'EG' },
    { key: 'tipoAnestesia', label: 'Anestesia' },
    { key: 'peso', label: 'Peso (g)' },
    { key: 'talla', label: 'Talla (cm)' },
    { key: 'apgar1', label: 'APGAR 1' },
    { key: 'apgar5', label: 'APGAR 5' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'destino', label: 'Destino' }
  ]

  const handleDelete = (numero) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de parto? Esta acción no se puede deshacer.')) {
      onDelete(numero)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(null)
    }
  }

  // Función para exportar a Excel
  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    // Preparar datos para Excel
    const excelData = []
    
    // Encabezados
    const headers = columns.map(col => col.label)
    headers.push('Acciones')
    excelData.push(headers)

    // Datos
    filteredData.forEach(item => {
      const row = columns.map(column => {
        let value = item[column.key]
        let displayValue = '-'
        
        // Si es la columna de número, usar el correlativo
        if (column.key === 'numero') {
          displayValue = item.correlativo || '-'
        } else if (column.key === 'fecha') {
          // Formatear fecha a DD-MM-YYYY
          const fecha = item.fechaParto || item.fecha || value
          if (fecha) {
            try {
              let date
              if (typeof fecha === 'string' && fecha.includes('T')) {
                date = new Date(fecha)
              } else if (typeof fecha === 'string' && fecha.includes('-') && fecha.split('-')[0].length === 4) {
                const parts = fecha.split('-')
                date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
              } else if (typeof fecha === 'string' && fecha.includes('/')) {
                const parts = fecha.split('/')
                if (parts.length === 3) {
                  if (parts[0].length <= 2 && parseInt(parts[0]) <= 12) {
                    date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]))
                  } else {
                    date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                  }
                }
              } else if (fecha instanceof Date) {
                date = fecha
              } else {
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
          } else {
            displayValue = value
          }
        }
        
        return displayValue
      })
      row.push('') // Columna de acciones vacía en Excel
      excelData.push(row)
    })

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Ajustar ancho de columnas
    const colWidths = columns.map(() => ({ wch: 15 }))
    colWidths.push({ wch: 10 }) // Columna de acciones
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Partos')
    
    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0]
    const filename = `Partos_${fecha}.xlsx`
    
    XLSX.writeFile(wb, filename)
  }

  return (
    <div className="tabla-container">
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="delete-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
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
                  onClick={() => setDeleteConfirm(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  className="btn-confirm-delete"
                  onClick={() => handleDelete(deleteConfirm)}
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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

      <motion.div 
        className="table-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
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
                          // Para la columna numero, ordenar por correlativo
                          if (sortColumn === 'correlativo' && sortDirection === 'desc') {
                            setSortColumn('correlativo')
                            setSortDirection('asc')
                          } else {
                            setSortColumn('correlativo')
                            setSortDirection('desc')
                          }
                        } else {
                          if (sortColumn === column.key && sortDirection === 'desc') {
                            setSortColumn(column.key)
                            setSortDirection('asc')
                          } else {
                            setSortColumn(column.key)
                            setSortDirection('desc')
                          }
                        }
                        setCurrentPage(1) // Resetear a primera página al cambiar ordenamiento
                      }}
                      title={`Clic para ordenar por ${column.label}`}
                    >
                      <div className="header-content">
                        <span>{column.label}</span>
                        {isSorted && (
                          <span className="sort-indicator">
                            {isAsc ? '↑' : '↓'}
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
                        let value = item[column.key]
                        let displayValue = '-'
                        
                        // Si es la columna de número, usar el correlativo
                        if (column.key === 'numero') {
                          displayValue = item.correlativo || '-'
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
                        className="edit-btn"
                        onClick={() => onEdit && onEdit(item)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Editar registro"
                      >
                        ✏️
                      </motion.button>
                      <motion.button
                        className="delete-btn"
                        onClick={() => setDeleteConfirm(item.numero || item.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Eliminar registro"
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

