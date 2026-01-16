import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './DashboardInsights.css'

function DashboardInsights({ data, selectedKPI, selectedMonth }) {
  const [insights, setInsights] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (selectedKPI && data && data.length > 0) {
      loadInsights()
    } else {
      setInsights(null)
    }
  }, [selectedKPI, data, selectedMonth])

  const loadInsights = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Filtrar datos según el KPI seleccionado
      let filteredData = [...data]
      
      if (selectedMonth && selectedMonth !== 'all') {
        const monthNumber = parseInt(selectedMonth)
        filteredData = filteredData.filter(item => {
          if (item.mesParto !== undefined && item.mesParto !== null) {
            return item.mesParto === monthNumber
          }
          if (!item.fechaParto) return false
          const dateParts = item.fechaParto.split('/')
          if (dateParts.length !== 3) return false
          const month = parseInt(dateParts[0])
          return !isNaN(month) && month >= 1 && month <= 12 && month === monthNumber
        })
      }

      // Aplicar filtro del KPI
      if (selectedKPI.filter) {
        Object.keys(selectedKPI.filter).forEach(key => {
          filteredData = filteredData.filter(item => {
            const value = item[key]
            const filterValue = selectedKPI.filter[key]
            if (typeof value === 'string' && typeof filterValue === 'string') {
              return String(value).toUpperCase().includes(String(filterValue).toUpperCase())
            }
            return value === filterValue
          })
        })
      }

      // Crear prompt específico para el KPI
      const prompt = `Analiza los siguientes datos de partos y proporciona insights específicos sobre "${selectedKPI.label}".

Datos del KPI:
- Total de casos: ${filteredData.length}
- KPI: ${selectedKPI.label}
${selectedMonth && selectedMonth !== 'all' ? `- Período: Mes ${selectedMonth}` : '- Período: Todos los meses'}

Proporciona un análisis conciso y estructurado que incluya:
1. Interpretación del valor: ¿Qué significa este número en el contexto del hospital?
2. Comparación con estándares: ¿Cómo se compara con estándares de la OMS o mejores prácticas?
3. Insight clave: Un hallazgo importante o patrón observado
4. Recomendación breve: Una acción sugerida (máximo 2-3 líneas)

Formato de respuesta (usa este formato exacto, sin asteriscos):

Interpretación:
[texto de interpretación]

Comparación:
[texto de comparación]

Insight:
[texto del insight]

Recomendación:
[texto de recomendación]

Responde en español de forma técnica pero accesible. NO uses asteriscos ni markdown.`

      const analysis = await analyzeDataWithAI(filteredData, prompt)
      setInsights(analysis)
    } catch (err) {
      console.error('Error cargando insights:', err)
      setError('No se pudieron cargar los insights. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!selectedKPI) return null

  return (
    <AnimatePresence>
      <motion.div
        className="dashboard-insights"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="insights-header">
          <h3>💡 Insights Inteligentes: {selectedKPI.label}</h3>
          <button 
            className="refresh-insights-btn"
            onClick={loadInsights}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Analizando...' : '🔄 Actualizar'}
          </button>
        </div>

        {isLoading && (
          <div className="insights-loading">
            <div className="loading-spinner"></div>
            <p>Analizando datos con IA...</p>
          </div>
        )}

        {error && (
          <div className="insights-error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {insights && !isLoading && (
          <motion.div
            className="insights-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div 
              className="insights-text"
              dangerouslySetInnerHTML={{ __html: formatInsights(insights) }}
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function formatInsights(text) {
  let html = text
  
  // Eliminar todos los asteriscos
  html = html.replace(/\*\*/g, '').replace(/\*/g, '')
  
  // Procesar secciones con formato limpio
  html = html.replace(/Interpretación:\s*/gi, '</div><div class="insight-section insight-interpretation"><h4 class="insight-section-title">📊 Interpretación</h4><div class="insight-section-content">')
  html = html.replace(/Comparación:\s*/gi, '</div></div><div class="insight-section insight-comparison"><h4 class="insight-section-title">📈 Comparación</h4><div class="insight-section-content">')
  html = html.replace(/Insight:\s*/gi, '</div></div><div class="insight-section insight-key"><h4 class="insight-section-title">💡 Insight Clave</h4><div class="insight-section-content">')
  html = html.replace(/Recomendación:\s*/gi, '</div></div><div class="insight-section insight-recommendation"><h4 class="insight-section-title">✅ Recomendación</h4><div class="insight-section-content">')
  
  // Dividir en líneas
  const lines = html.split('\n')
  let result = []
  let currentParagraph = []
  let inSection = false
  
  lines.forEach((line) => {
    const trimmed = line.trim()
    
    // Si la línea está vacía, procesar párrafo actual
    if (!trimmed) {
      if (currentParagraph.length > 0) {
        const paragraph = currentParagraph.join(' ').trim()
          .replace(/\*\*/g, '').replace(/\*/g, '').trim()
        if (paragraph.length >= 10 && !/^[\d\.\s\-]+$/.test(paragraph) && !/^[^\w\s]+$/.test(paragraph)) {
          if (inSection) {
            result.push(`<p class="insight-paragraph">${paragraph}</p>`)
          } else {
            result.push(`<p class="insight-intro">${paragraph}</p>`)
          }
        }
        currentParagraph = []
      }
      return
    }
    
    // Si empieza con HTML (ya procesado), agregarlo directamente
    if (trimmed.startsWith('<div')) {
      if (currentParagraph.length > 0) {
        const paragraph = currentParagraph.join(' ').trim()
          .replace(/\*\*/g, '').replace(/\*/g, '').trim()
        if (paragraph.length >= 10) {
          result.push(`<p class="insight-paragraph">${paragraph}</p>`)
        }
        currentParagraph = []
      }
      
      // Detectar inicio de sección
      if (trimmed.includes('insight-section-content')) {
        inSection = true
      }
      if (trimmed.includes('</div></div>') && trimmed.includes('insight-section')) {
        inSection = false
        result.push('</div></div>')
        return
      }
      
      result.push(trimmed)
      return
    }
    
    // Filtrar líneas sin contenido relevante
    const cleanLine = trimmed.replace(/\*\*/g, '').replace(/\*/g, '').trim()
    if (cleanLine.length < 10 || 
        /^[\d\.\s\-]+$/.test(cleanLine) || 
        /^[^\w\s]+$/.test(cleanLine) ||
        /^[\s\-\.\,\:\;]+$/.test(cleanLine)) {
      return
    }
    
    // Agregar al párrafo actual
    currentParagraph.push(trimmed)
  })
  
  // Cerrar último párrafo
  if (currentParagraph.length > 0) {
    const paragraph = currentParagraph.join(' ').trim()
      .replace(/\*\*/g, '').replace(/\*/g, '').trim()
    if (paragraph.length >= 10 && !/^[\d\.\s\-]+$/.test(paragraph) && !/^[^\w\s]+$/.test(paragraph)) {
      if (inSection) {
        result.push(`<p class="insight-paragraph">${paragraph}</p>`)
      } else {
        result.push(`<p class="insight-intro">${paragraph}</p>`)
      }
    }
  }
  
  // Cerrar última sección si está abierta
  if (inSection) {
    result.push('</div></div>')
  }
  
  // Agregar wrapper inicial
  let finalHtml = result.join('\n')
  if (!finalHtml.includes('insight-section')) {
    finalHtml = '<div class="insights-wrapper">' + finalHtml + '</div>'
  } else {
    finalHtml = '<div class="insights-wrapper">' + finalHtml + '</div>'
  }
  
  // Limpiar párrafos vacíos
  finalHtml = finalHtml.replace(/<p[^>]*>\s*<\/p>/gi, '')
  finalHtml = finalHtml.replace(/<p[^>]*>([^<]{0,10})<\/p>/gi, (match, content) => {
    const trimmed = content.trim()
    if (trimmed.length < 10 || /^[\d\.\s\-]+$/.test(trimmed) || /^[^\w\s]+$/.test(trimmed)) {
      return ''
    }
    return match
  })
  
  return finalHtml
}

export default DashboardInsights
