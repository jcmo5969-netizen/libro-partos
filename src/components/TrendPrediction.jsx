import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './TrendPrediction.css'

function TrendPrediction({ data }) {
  const [predictions, setPredictions] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Calcular datos históricos por mes
  const monthlyData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    const months = {}
    data.forEach(item => {
      const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
      if (month && month >= 1 && month <= 12) {
        if (!months[month]) {
          months[month] = {
            month,
            total: 0,
            vaginales: 0,
            cesareas: 0,
            cesareasElectivas: 0,
            cesareasUrgentes: 0
          }
        }
        months[month].total++
        
        const tipo = item.tipoParto ? item.tipoParto.toUpperCase() : ''
        if (tipo.includes('VAGINAL')) months[month].vaginales++
        if (tipo.includes('CES')) {
          months[month].cesareas++
          if (tipo.includes('CES ELE')) months[month].cesareasElectivas++
          if (tipo.includes('CES URG')) months[month].cesareasUrgentes++
        }
      }
    })
    
    return Object.values(months).sort((a, b) => a.month - b.month)
  }, [data])

  useEffect(() => {
    if (monthlyData.length > 0) {
      loadPredictions()
    }
  }, [monthlyData])

  const loadPredictions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      
      const totalPartos = monthlyData.reduce((sum, m) => sum + m.total, 0)
      const promedioMensual = monthlyData.length > 0 ? (totalPartos / monthlyData.length).toFixed(1) : 0
      const totalCesareas = monthlyData.reduce((sum, m) => sum + m.cesareas, 0)
      const tasaCesareasPromedio = totalPartos > 0 ? ((totalCesareas / totalPartos) * 100).toFixed(1) : 0
      const minPartos = Math.min(...monthlyData.map(m => m.total))
      const maxPartos = Math.max(...monthlyData.map(m => m.total))
      const mesesConDatos = monthlyData.map(m => monthNames[m.month - 1]).join(', ')

      const prompt = `Eres un analista de datos especializado en obstetricia. Analiza los siguientes datos históricos de partos y proporciona un análisis completo con predicciones para los próximos 3 meses.

## DATOS HISTÓRICOS (${mesesConDatos}):

${JSON.stringify(monthlyData.map(m => ({
  mes: monthNames[m.month - 1],
  total: m.total,
  vaginales: m.vaginales,
  cesareas: m.cesareas,
  tasaCesareas: m.total > 0 ? ((m.cesareas / m.total) * 100).toFixed(1) : 0,
  cesareasElectivas: m.cesareasElectivas,
  cesareasUrgentes: m.cesareasUrgentes
})), null, 2)}

## ESTADÍSTICAS RESUMIDAS:
- Total de partos registrados: ${totalPartos}
- Promedio mensual: ${promedioMensual} partos
- Rango mensual: ${minPartos} - ${maxPartos} partos
- Tasa promedio de cesáreas: ${tasaCesareasPromedio}%

## INSTRUCCIONES:

Proporciona un análisis estructurado con el siguiente formato:

### Análisis de Datos Históricos
Presenta un análisis detallado de los datos históricos, incluyendo:
- **Volumen de Partos:** Analiza la variación mensual, identifica meses con mayor/menor actividad, calcula promedios y rangos. Identifica tendencias (aumento, disminución, estabilidad).
- **Tasa de Cesáreas:** Analiza la evolución de la tasa de cesáreas mes a mes, identifica si está por encima o debajo de los estándares de la OMS (10-15%), calcula promedios y tendencias.
- **Distribución por Tipo:** Analiza la proporción entre partos vaginales, cesáreas electivas y cesáreas urgentes.

### Predicción para [Mes 1]
- **Total esperado:** [número] partos (rango probable: [min]-[max])
- **Tasa de cesáreas esperada:** [%]%
- **Observaciones:** [análisis breve de factores que influyen en esta predicción]

### Predicción para [Mes 2]
- **Total esperado:** [número] partos (rango probable: [min]-[max])
- **Tasa de cesáreas esperada:** [%]%
- **Observaciones:** [análisis breve]

### Predicción para [Mes 3]
- **Total esperado:** [número] partos (rango probable: [min]-[max])
- **Tasa de cesáreas esperada:** [%]%
- **Observaciones:** [análisis breve]

### Tendencias Identificadas
Lista las tendencias principales observadas en los datos históricos y proyectadas para el futuro:
- [Tendencia 1 con explicación]
- [Tendencia 2 con explicación]

### Alertas de Umbrales
Identifica alertas si algún indicador se acerca a niveles críticos:
- [Alerta si aplica, con umbral y justificación]
- Si no hay alertas, indica "No se identificaron alertas críticas en este momento"

### Recomendaciones Estratégicas
Proporciona recomendaciones basadas en las tendencias y predicciones:
- [Recomendación 1 específica y accionable]
- [Recomendación 2 específica y accionable]

IMPORTANTE:
- Usa un tono técnico pero accesible
- Incluye datos numéricos específicos
- Justifica las predicciones basándote en los datos históricos
- Sé específico en las recomendaciones
- Responde completamente en español`

      const analysis = await analyzeDataWithAI(data, prompt)
      setPredictions(analysis)
    } catch (err) {
      console.error('Error cargando predicciones:', err)
      setError('No se pudieron generar las predicciones. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (monthlyData.length === 0) return null

  return (
    <motion.div
      className="trend-prediction"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="prediction-header">
        <h3>🔮 Predicción de Tendencias</h3>
        <button 
          className="refresh-prediction-btn"
          onClick={loadPredictions}
          disabled={isLoading}
        >
          {isLoading ? '🔄 Analizando...' : '🔄 Actualizar'}
        </button>
      </div>

      {isLoading && (
        <div className="prediction-loading">
          <div className="loading-spinner"></div>
          <p>Analizando tendencias y generando predicciones...</p>
        </div>
      )}

      {error && (
        <div className="prediction-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {predictions && !isLoading && (
        <motion.div
          className="prediction-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div 
            className="prediction-text"
            dangerouslySetInnerHTML={{ __html: formatPredictions(predictions) }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function formatPredictions(text) {
  let html = text
  
  // Extraer y destacar números en el texto
  html = html.replace(/(\d+\.?\d*%)/g, '<span class="prediction-number">$1</span>')
  html = html.replace(/(\d+)\s*(partos?|cesáreas?|meses?)/gi, '<span class="prediction-number">$1</span> $2')
  
  // PASO 1: Detectar y procesar secciones principales primero
  const sectionPatterns = [
    { pattern: /###\s*Análisis de Datos Históricos/gi, replacement: '<div class="prediction-historical-section"><h4 class="prediction-section-title">📊 Análisis de Datos Históricos</h4>' },
    { pattern: /###\s*Predicción para\s+([^\n]+)/gi, replacement: '</div><div class="prediction-month"><h4 class="prediction-month-title">🔮 Predicción para $1</h4>' },
    { pattern: /###\s*Tendencias Identificadas/gi, replacement: '</div><div class="prediction-section"><h4 class="prediction-section-title">📈 Tendencias Identificadas</h4>' },
    { pattern: /###\s*Alertas de Umbrales/gi, replacement: '</div><div class="prediction-section prediction-alerts"><h4 class="prediction-section-title">⚠️ Alertas de Umbrales</h4>' },
    { pattern: /###\s*Recomendaciones Estratégicas/gi, replacement: '</div><div class="prediction-section prediction-recommendations"><h4 class="prediction-section-title">✅ Recomendaciones Estratégicas</h4>' },
    { pattern: /\*\*Análisis de Datos Históricos\*\*/gi, replacement: '<div class="prediction-historical-section"><h4 class="prediction-section-title">📊 Análisis de Datos Históricos</h4>' },
    { pattern: /\*\*Predicción para\s+([^:]+):\*\*/gi, replacement: '</div><div class="prediction-month"><h4 class="prediction-month-title">🔮 Predicción para $1</h4>' },
    { pattern: /\*\*Tendencias Identificadas:\*\*/gi, replacement: '</div><div class="prediction-section"><h4 class="prediction-section-title">📈 Tendencias Identificadas</h4>' },
    { pattern: /\*\*Alertas de Umbrales:\*\*/gi, replacement: '</div><div class="prediction-section prediction-alerts"><h4 class="prediction-section-title">⚠️ Alertas de Umbrales</h4>' },
    { pattern: /\*\*Recomendaciones Estratégicas:\*\*/gi, replacement: '</div><div class="prediction-section prediction-recommendations"><h4 class="prediction-section-title">✅ Recomendaciones Estratégicas</h4>' }
  ]
  
  sectionPatterns.forEach(({ pattern, replacement }) => {
    html = html.replace(pattern, replacement)
  })
  
  // PASO 2: Detectar subsecciones dentro del análisis histórico
  html = html.replace(/\*\*Volumen de Partos:\*\*/gi, '<div class="prediction-subsection"><h5 class="prediction-subsection-title">📊 Volumen de Partos</h5>')
  html = html.replace(/\*\*Tasa de Cesáreas:\*\*/gi, '</div><div class="prediction-subsection"><h5 class="prediction-subsection-title">📈 Tasa de Cesáreas</h5>')
  html = html.replace(/\*\*Distribución por Tipo:\*\*/gi, '</div><div class="prediction-subsection"><h5 class="prediction-subsection-title">📋 Distribución por Tipo</h5>')
  
  // PASO 3: Procesar elementos de predicción mensual
  html = html.replace(/\*\*Total esperado:\*\*\s*([^\n]+)/gi, '<div class="prediction-detail"><span class="prediction-label">Total esperado:</span> <span class="prediction-value">$1</span></div>')
  html = html.replace(/\*\*Tasa de cesáreas esperada:\*\*\s*([^\n]+)/gi, '<div class="prediction-detail"><span class="prediction-label">Tasa de cesáreas esperada:</span> <span class="prediction-value">$1</span></div>')
  html = html.replace(/\*\*Observaciones:\*\*\s*([^\n]+)/gi, '<div class="prediction-observations"><span class="prediction-label">Observaciones:</span> <span class="prediction-text-content">$1</span></div>')
  
  // PASO 4: Procesar encabezados markdown restantes
  html = html.replace(/^###\s+(.+)$/gim, '<h3 class="prediction-h3">$1</h3>')
  
  // PASO 5: Procesar negritas (después de las secciones)
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="prediction-bold">$1</strong>')
  
  // Eliminar asteriscos sueltos que puedan quedar
  html = html.replace(/\s+\*\s+/g, ' ')
  html = html.replace(/^\*\s+/gm, '')
  html = html.replace(/\s+\*$/gm, '')
  html = html.replace(/^\*$/gm, '')
  
  // PASO 6: Dividir en líneas y procesar estructura
  const lines = html.split('\n')
  let result = []
  let currentSection = null
  let currentList = []
  let currentParagraph = []
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    // Filtrar líneas que solo contengan asteriscos o caracteres especiales
    if (trimmed === '*' || trimmed === '**' || trimmed === '***' || /^[*\s-]+$/.test(trimmed)) {
      return
    }
    
    // Detectar inicio de sección
    if (trimmed.includes('prediction-historical-section') || 
        trimmed.includes('prediction-month') || 
        trimmed.includes('prediction-section')) {
      // Cerrar listas y párrafos pendientes
      if (currentList.length > 0) {
        result.push(`<ul class="prediction-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      result.push(trimmed)
      currentSection = trimmed
      return
    }
    
    // Detectar subsecciones
    if (trimmed.includes('prediction-subsection')) {
      if (currentList.length > 0) {
        result.push(`<ul class="prediction-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      result.push(trimmed)
      return
    }
    
    // Detectar detalles de predicción
    if (trimmed.includes('prediction-detail') || trimmed.includes('prediction-observations')) {
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      result.push(trimmed)
      return
    }
    
    // Detectar cierre de sección
    if (trimmed === '</div>') {
      if (currentList.length > 0) {
        result.push(`<ul class="prediction-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      result.push(trimmed)
      return
    }
    
    // Detectar encabezados
    if (trimmed.startsWith('<h3') || trimmed.startsWith('<h4') || trimmed.startsWith('<h5')) {
      if (currentList.length > 0) {
        result.push(`<ul class="prediction-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      result.push(trimmed)
      return
    }
    
    // Línea vacía - eliminar espacios innecesarios
    if (!trimmed) {
      // Solo agregar espacio si hay contenido previo y siguiente
      if (currentList.length > 0) {
        result.push(`<ul class="prediction-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      // No agregar spacer, solo continuar
      return
    }
    
    // Detectar listas
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      let content = trimmed.replace(/^[-•]\s*/, '').trim()
      // Eliminar asteriscos del contenido de la lista
      content = content.replace(/^\*\s*/, '').replace(/\s*\*$/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
      if (content && content !== '*' && !/^[*\s]+$/.test(content)) {
        currentList.push(`<li class="prediction-item">${content}</li>`)
      }
      return
    }
    
    // Párrafo normal
    if (trimmed.length > 0 && !trimmed.startsWith('<')) {
      // Eliminar TODOS los asteriscos del contenido
      let cleanTrimmed = trimmed
        .replace(/^\*\s*/, '')
        .replace(/\s*\*$/, '')
        .replace(/\*\*/g, '')
        .replace(/\s+\*\s+/g, ' ')
        .replace(/\*\s+/g, ' ')
        .replace(/\s+\*/g, ' ')
        .replace(/\*/g, '')
        .trim()
      
      // Filtrar párrafos vacíos o sin contenido relevante
      if (cleanTrimmed.length === 0 || 
          cleanTrimmed === '*' || 
          /^[*\s\-\.\,\:\;]+$/.test(cleanTrimmed) ||
          cleanTrimmed.length < 10 || // Párrafos muy cortos probablemente no son útiles
          /^[\d\.\s]+$/.test(cleanTrimmed) || // Solo números y puntos
          /^[^\w\s]+$/.test(cleanTrimmed)) { // Solo signos de puntuación
        return
      }
      
      // Si es muy largo, dividir por oraciones
      if (cleanTrimmed.length > 200) {
        if (currentParagraph.length > 0) {
          result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
          currentParagraph = []
        }
        const sentences = cleanTrimmed.match(/[^.!?]+[.!?]+/g) || [cleanTrimmed]
        sentences.forEach(s => {
          const cleanSentence = s.trim()
            .replace(/^\*\s*/, '')
            .replace(/\s*\*$/, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .trim()
          if (cleanSentence.length > 0 && cleanSentence !== '*' && !/^[*\s]+$/.test(cleanSentence)) {
            result.push(`<p class="prediction-paragraph">${cleanSentence}</p>`)
          }
        })
      } else {
        currentParagraph.push(cleanTrimmed)
      }
    } else if (trimmed.startsWith('<')) {
      // HTML ya procesado
      if (currentList.length > 0) {
        result.push(`<ul class="prediction-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      if (currentParagraph.length > 0) {
        result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
        currentParagraph = []
      }
      result.push(trimmed)
    }
  })
  
  // Cerrar elementos pendientes
  if (currentList.length > 0) {
    result.push(`<ul class="prediction-list">${currentList.join('')}</ul>`)
  }
  if (currentParagraph.length > 0) {
    result.push(`<p class="prediction-paragraph">${currentParagraph.join(' ')}</p>`)
  }
  
  // Agregar wrapper inicial y limpiar TODOS los asteriscos sueltos
  let finalHtml = result.join('\n')
  
  // Eliminar asteriscos sueltos que puedan quedar (solo líneas que solo contengan asteriscos)
  // Eliminar párrafos vacíos o con solo espacios/puntuación
  finalHtml = finalHtml.replace(/<p[^>]*>\s*<\/p>/gi, '')
  finalHtml = finalHtml.replace(/<p[^>]*>\s*\*\s*<\/p>/gi, '')
  finalHtml = finalHtml.replace(/<p[^>]*>\s*\*\*\s*<\/p>/gi, '')
  finalHtml = finalHtml.replace(/<p[^>]*>\s*\*\*\*\s*<\/p>/gi, '')
  finalHtml = finalHtml.replace(/<p[^>]*>[\s\-\.\,\:\;]+<\/p>/gi, '')
  
  // Eliminar párrafos con contenido muy corto o sin sentido
  finalHtml = finalHtml.replace(/<p[^>]*>([^<]{0,15})<\/p>/gi, (match, content) => {
    const trimmed = content.trim()
      .replace(/<strong[^>]*>.*?<\/strong>/gi, '') // Remover negritas para evaluar
      .replace(/<span[^>]*>.*?<\/span>/gi, '') // Remover spans
      .trim()
    
    // Si después de limpiar HTML queda muy poco o solo signos, eliminar
    if (trimmed.length < 10 || 
        /^[\d\.\s\-]+$/.test(trimmed) || 
        /^[^\w\s]+$/.test(trimmed) ||
        /^[\s\-\.\,\:\;\(\)]+$/.test(trimmed)) {
      return ''
    }
    return match
  })
  
  // Eliminar párrafos que solo contengan números, puntos o guiones
  finalHtml = finalHtml.replace(/<p[^>]*>[\d\.\s\-]+<\/p>/gi, '')
  
  finalHtml = finalHtml.replace(/<div[^>]*>\s*\*\s*<\/div>/gi, '')
  finalHtml = finalHtml.replace(/<li[^>]*>\s*\*\s*<\/li>/gi, '')
  finalHtml = finalHtml.replace(/<span[^>]*>\s*\*\s*<\/span>/gi, '')
  finalHtml = finalHtml.replace(/\n\s*\*\s*\n/g, '\n')
  finalHtml = finalHtml.replace(/\n\s*\*\*\s*\n/g, '\n')
  
  // Limpiar asteriscos al inicio y final de párrafos
  finalHtml = finalHtml.replace(/(<p[^>]*>)\s*\*\s*/gi, '$1')
  finalHtml = finalHtml.replace(/(<p[^>]*>)\s*\*\*\s*/gi, '$1')
  finalHtml = finalHtml.replace(/\s*\*\s*(<\/p>)/gi, '$1')
  finalHtml = finalHtml.replace(/\s*\*\*\s*(<\/p>)/gi, '$1')
  
  // Limpiar asteriscos dentro del contenido de párrafos
  finalHtml = finalHtml.replace(/(<p[^>]*>)([^<]*?)\s*\*\s*([^<]*?)(<\/p>)/gi, (match, open, before, after, close) => {
    return open + before.trim() + (before.trim() && after.trim() ? ' ' : '') + after.trim() + close
  })
  
  // Limpiar asteriscos entre etiquetas
  finalHtml = finalHtml.replace(/>\s*\*\s*</g, '><')
  finalHtml = finalHtml.replace(/>\s*\*\*\s*</g, '><')
  
  // Limpiar asteriscos sueltos en el contenido (pero no dentro de etiquetas HTML como <strong>, <span>, etc.)
  finalHtml = finalHtml.replace(/([^<>])\s*\*\s*([^<>])/g, '$1 $2')
  finalHtml = finalHtml.replace(/([^<>])\s*\*\*\s*([^<>])/g, '$1 $2')
  
  // Limpiar asteriscos que queden solos en líneas
  finalHtml = finalHtml.replace(/^\s*\*\s*$/gm, '')
  finalHtml = finalHtml.replace(/^\s*\*\*\s*$/gm, '')
  
  if (!finalHtml.startsWith('<div class="prediction-content-wrapper">')) {
    finalHtml = '<div class="prediction-content-wrapper">' + finalHtml
  }
  if (!finalHtml.endsWith('</div>')) {
    finalHtml += '</div>'
  }
  
  return finalHtml
}

export default TrendPrediction

