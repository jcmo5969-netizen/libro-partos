import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './PeriodRecommendations.css'

function PeriodRecommendations({ data, selectedMonth }) {
  const [recommendations, setRecommendations] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadRecommendations = async () => {
    setIsLoading(true)
    setError(null)
    setRecommendations(null)
    
    try {
      if (!data || data.length === 0) {
        throw new Error('No hay datos disponibles para generar recomendaciones')
      }

      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      
      let filteredData = data
      let periodLabel = 'Todos los períodos'
      
      if (selectedMonth && selectedMonth !== 'all') {
        const monthNumber = parseInt(selectedMonth)
        if (!isNaN(monthNumber) && monthNumber >= 1 && monthNumber <= 12) {
          filteredData = data.filter(item => {
            const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
            return month === monthNumber
          })
          periodLabel = monthNames[monthNumber - 1]
        }
      }
      
      if (filteredData.length === 0) {
        filteredData = data
        periodLabel = 'Todos los períodos'
      }
      
      if (filteredData.length === 0) {
        throw new Error('No hay datos disponibles para el período seleccionado')
      }

      // Función auxiliar para convertir a string y luego a mayúsculas de forma segura
      const safeToUpper = (value) => {
        if (value == null) return ''
        return String(value).toUpperCase()
      }

      const stats = {
        total: filteredData.length,
        vaginales: filteredData.filter(i => safeToUpper(i.tipoParto).includes('VAGINAL')).length,
        cesareas: filteredData.filter(i => safeToUpper(i.tipoParto).includes('CES')).length,
        cesareasElectivas: filteredData.filter(i => safeToUpper(i.tipoParto).includes('CES ELE')).length,
        cesareasUrgentes: filteredData.filter(i => safeToUpper(i.tipoParto).includes('CES URG')).length,
        primiparas: filteredData.filter(i => safeToUpper(i.paridad).includes('PRIMIPARA')).length,
        multiparas: filteredData.filter(i => safeToUpper(i.paridad).includes('MULTIPARA')).length,
        conPlanParto: filteredData.filter(i => safeToUpper(i.planDeParto) === 'SI').length,
        conInduccion: filteredData.filter(i => safeToUpper(i.induccion) === 'SI').length
      }

      const tasaCesareas = stats.total > 0 ? ((stats.cesareas / stats.total) * 100).toFixed(1) : '0'
      const tasaVaginales = stats.total > 0 ? ((stats.vaginales / stats.total) * 100).toFixed(1) : '0'

      const prompt = `Genera recomendaciones estratégicas específicas y accionables para el período: ${periodLabel}

Datos del período:
${JSON.stringify({
  ...stats,
  tasaCesareas: `${tasaCesareas}%`,
  tasaVaginales: `${tasaVaginales}%`
}, null, 2)}

Formato de respuesta (usa este formato exacto):

**Recomendación 1: [Título de la Recomendación]**
**Acción:** [Descripción detallada de la acción a realizar]
**Justificación:** [Explicación de por qué es importante esta acción]

**Recomendación 2: [Título de la Recomendación]**
**Acción:** [Descripción detallada de la acción a realizar]
**Justificación:** [Explicación de por qué es importante esta acción]

**Recomendación 3: [Título de la Recomendación]**
**Acción:** [Descripción detallada de la acción a realizar]
**Justificación:** [Explicación de por qué es importante esta acción]

Proporciona 3-5 recomendaciones estratégicas específicas, considerando:
1. Los indicadores actuales
2. Comparación con estándares de la OMS
3. Tendencias observadas
4. Áreas de mejora identificadas

Responde completamente en español, siendo específico y accionable.`

      console.log(`📊 Generando recomendaciones para: ${periodLabel} (${filteredData.length} registros)`)
      const analysis = await analyzeDataWithAI(filteredData, prompt)
      
      if (!analysis || analysis.trim().length === 0) {
        throw new Error('La respuesta de la IA está vacía')
      }
      
      setRecommendations(analysis)
      console.log('✅ Recomendaciones generadas exitosamente')
    } catch (err) {
      console.error('❌ Error cargando recomendaciones:', err)
      const errorMessage = err.message || err.toString()
      
      if (errorMessage.includes('No hay datos')) {
        setError('No hay datos disponibles para generar recomendaciones. Verifica que haya registros en el período seleccionado.')
      } else if (errorMessage.includes('API') || errorMessage.includes('authentication') || errorMessage.includes('404')) {
        setError('Error de conexión con la IA. Verifica la configuración de la API.')
      } else {
        setError(`No se pudieron generar las recomendaciones: ${errorMessage.substring(0, 100)}. Intenta nuevamente.`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!data || data.length === 0) return null

  return (
    <motion.div
      className="period-recommendations"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="recommendations-header">
        <h3>💡 Recomendaciones Estratégicas</h3>
        <button 
          className="refresh-recommendations-btn"
          onClick={loadRecommendations}
          disabled={isLoading || !data || data.length === 0}
        >
          {isLoading ? '🔄 Generando...' : '📊 Generar Recomendaciones'}
        </button>
      </div>
      
      {isLoading && (
        <div className="recommendations-loading">
          <div className="loading-spinner"></div>
          <p>Generando recomendaciones personalizadas...</p>
        </div>
      )}

      {error && (
        <div className="recommendations-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {recommendations && !isLoading && (
        <motion.div
          className="recommendations-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div 
            className="recommendations-text"
            dangerouslySetInnerHTML={{ __html: formatRecommendations(recommendations) }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function formatRecommendations(text) {
  let html = text
  
  // Extraer y destacar números
  html = html.replace(/(\d+\.?\d*%)/g, '<span class="recommendations-number">$1</span>')
  html = html.replace(/(\d+)\s*(meses?|años?|semanas?|días?)/gi, '<span class="recommendations-number">$1</span> $2')
  
  // Procesar recomendaciones con formato: **Recomendación X: Título** o **X. Título**
  html = html.replace(/\*\*Recomendación\s+(\d+):\s*([^*]+?)\*\*/gi, 
    '</div><div class="recommendation-card"><div class="recommendation-number">$1</div><h4 class="recommendation-title">$2</h4>')
  html = html.replace(/\*\*(\d+)\.\s*([^*]+?):\*\*/gi, 
    '</div><div class="recommendation-card"><div class="recommendation-number">$1</div><h4 class="recommendation-title">$2</h4>')
  
  // Procesar títulos de recomendaciones sin número
  html = html.replace(/\*\*([^*]+?):\*\*(?=\s*\*\*Acción:)/gi, 
    '</div><div class="recommendation-card"><h4 class="recommendation-title">$1</h4>')
  
  // Procesar secciones Acción, Justificación, Objetivo, Métrica (con o sin dos puntos)
  html = html.replace(/\*\*Acción:\*\*/gi, '<div class="recommendation-section"><div class="recommendation-section-label">📋 Acción</div><div class="recommendation-section-content">')
  html = html.replace(/\*\*Acción\*\*/gi, '<div class="recommendation-section"><div class="recommendation-section-label">📋 Acción</div><div class="recommendation-section-content">')
  html = html.replace(/\*\*Justificación:\*\*/gi, '</div></div><div class="recommendation-section"><div class="recommendation-section-label">💡 Justificación</div><div class="recommendation-section-content">')
  html = html.replace(/\*\*Justificación\*\*/gi, '</div></div><div class="recommendation-section"><div class="recommendation-section-label">💡 Justificación</div><div class="recommendation-section-content">')
  html = html.replace(/\*\*Objetivo:\*\*/gi, '</div></div><div class="recommendation-section"><div class="recommendation-section-label">🎯 Objetivo</div><div class="recommendation-section-content">')
  html = html.replace(/\*\*Objetivo\*\*/gi, '</div></div><div class="recommendation-section"><div class="recommendation-section-label">🎯 Objetivo</div><div class="recommendation-section-content">')
  html = html.replace(/\*\*Métrica:\*\*/gi, '</div></div><div class="recommendation-section"><div class="recommendation-section-label">📊 Métrica</div><div class="recommendation-section-content">')
  html = html.replace(/\*\*Métrica\*\*/gi, '</div></div><div class="recommendation-section"><div class="recommendation-section-label">📊 Métrica</div><div class="recommendation-section-content">')
  
  // Procesar negritas restantes (pero no las que ya procesamos)
  html = html.replace(/\*\*([^*]+?)\*\*/g, (match, content) => {
    // Si ya fue procesado como sección, no procesar
    if (content.includes('Acción') || content.includes('Justificación') || 
        content.includes('Objetivo') || content.includes('Métrica') ||
        content.includes('Recomendación')) {
      return match
    }
    return '<strong class="recommendations-bold">' + content + '</strong>'
  })
  
  // Dividir en líneas para procesar
  const lines = html.split('\n')
  let result = []
  let currentParagraph = []
  let inSection = false
  let currentSectionContent = []
  
  lines.forEach((line) => {
    const trimmed = line.trim()
    
    // Si la línea está vacía, procesar párrafo actual
    if (!trimmed) {
      if (currentParagraph.length > 0) {
        const paragraph = currentParagraph.join(' ').trim()
          .replace(/^\*\s*/, '').replace(/\s*\*$/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
        if (paragraph.length >= 10 && !/^[\d\.\s\-]+$/.test(paragraph) && !/^[^\w\s]+$/.test(paragraph)) {
          if (inSection) {
            currentSectionContent.push(`<p class="recommendation-text">${paragraph}</p>`)
          } else {
            result.push(`<p class="recommendation-text">${paragraph}</p>`)
          }
        }
        currentParagraph = []
      }
      return
    }
    
    // Si empieza con HTML (ya procesado), agregarlo directamente
    if (trimmed.startsWith('<')) {
      // Cerrar párrafo pendiente
      if (currentParagraph.length > 0) {
        const paragraph = currentParagraph.join(' ').trim()
          .replace(/^\*\s*/, '').replace(/\s*\*$/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
        if (paragraph.length >= 10 && !/^[\d\.\s\-]+$/.test(paragraph) && !/^[^\w\s]+$/.test(paragraph)) {
          if (inSection) {
            currentSectionContent.push(`<p class="recommendation-text">${paragraph}</p>`)
          } else {
            result.push(`<p class="recommendation-text">${paragraph}</p>`)
          }
        }
        currentParagraph = []
      }
      
      // Detectar inicio de sección
      if (trimmed.includes('recommendation-section-content')) {
        inSection = true
        currentSectionContent = []
        result.push(trimmed.replace('recommendation-section-content">', 'recommendation-section-content">'))
        return
      }
      
      // Detectar cierre de sección
      if (trimmed.includes('</div></div>') && inSection) {
        // Agregar contenido de la sección
        if (currentSectionContent.length > 0) {
          result.push(...currentSectionContent)
        }
        result.push('</div></div>')
        inSection = false
        currentSectionContent = []
        return
      }
      
      // Detectar inicio de card
      if (trimmed.includes('recommendation-card')) {
        if (inSection) {
          // Cerrar sección anterior
          if (currentSectionContent.length > 0) {
            result.push(...currentSectionContent)
          }
          result.push('</div></div>')
          inSection = false
          currentSectionContent = []
        }
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
      .replace(/^\*\s*/, '').replace(/\s*\*$/, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
    if (paragraph.length >= 10 && !/^[\d\.\s\-]+$/.test(paragraph) && !/^[^\w\s]+$/.test(paragraph)) {
      if (inSection) {
        currentSectionContent.push(`<p class="recommendation-text">${paragraph}</p>`)
      } else {
        result.push(`<p class="recommendation-text">${paragraph}</p>`)
      }
    }
  }
  
  // Cerrar última sección si está abierta
  if (inSection && currentSectionContent.length > 0) {
    result.push(...currentSectionContent)
    result.push('</div></div>')
  }
  
  // Agregar wrapper inicial
  let finalHtml = result.join('\n')
  if (!finalHtml.includes('recommendation-card')) {
    finalHtml = '<div class="recommendations-wrapper">' + finalHtml + '</div>'
  } else {
    finalHtml = '<div class="recommendations-wrapper">' + finalHtml + '</div>'
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
  
  // Cerrar secciones abiertas
  finalHtml = finalHtml.replace(/(<div class="recommendation-section-content">)([^<]*?)(?=<div class="recommendation-section"|<\/div>|$)/gi, 
    (match, open, content) => {
      if (content.trim().length >= 10) {
        return open + content.trim() + '</div></div>'
      }
      return ''
    })
  
  return finalHtml
}

export default PeriodRecommendations
