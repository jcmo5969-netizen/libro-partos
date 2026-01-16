import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './AnalisisIA.css'

function AnalisisIA({ data }) {
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  // No cargar automáticamente para evitar bloqueos
  // El usuario puede hacer clic en el botón para cargar el análisis

  const loadAIAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    try {
      console.log('🔄 Iniciando análisis de IA...')
      const analysis = await analyzeDataWithAI(data)
      if (analysis && analysis.trim()) {
        setAiAnalysis(analysis)
        console.log('✅ Análisis de IA completado exitosamente')
      } else {
        throw new Error('La respuesta de la IA está vacía')
      }
    } catch (error) {
      console.error('❌ Error cargando análisis de IA:', error)
      const errorMessage = error.message || error.toString()
      
      // Mensaje de error más específico
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setAnalysisError('El modelo de IA no está disponible. Verificando modelos alternativos...')
      } else if (errorMessage.includes('403') || errorMessage.includes('permission')) {
        setAnalysisError('Error de permisos con la API. Verifica que la clave de API tenga los permisos necesarios.')
      } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        setAnalysisError('Se ha excedido el límite de uso de la API. Por favor, intenta más tarde.')
      } else if (errorMessage.includes('API_KEY') || errorMessage.includes('authentication')) {
        setAnalysisError('Error de autenticación. Verifica la clave de API en la configuración.')
      } else {
        setAnalysisError(`Error al cargar el análisis: ${errorMessage.substring(0, 150)}`)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null

    const total = data.length
    const tipoParto = {}
    const porEdad = {}
    const porSexo = { MASCULINO: 0, FEMENINO: 0 }
    const pesoPromedio = []
    const semanasGestacion = []

    data.forEach(item => {
      // Tipo de parto - usando nombres exactos
      const tipo = item.tipoParto || 'Desconocido'
      tipoParto[tipo] = (tipoParto[tipo] || 0) + 1

      // Por edad - usando nombres exactos
      const edad = item.edad ? parseInt(item.edad) : null
      if (edad) {
        const grupo = edad < 25 ? '< 25' : edad < 30 ? '25-29' : edad < 35 ? '30-34' : '≥ 35'
        porEdad[grupo] = (porEdad[grupo] || 0) + 1
      }

      // Por sexo - solo contar valores válidos
      if (item.sexo && (item.sexo === 'FEMENINO' || item.sexo === 'MASCULINO' || item.sexo === 'INDETERMINADO')) {
        porSexo[item.sexo] = (porSexo[item.sexo] || 0) + 1
      }

      // Peso - usando nombres exactos
      if (item.peso && !isNaN(item.peso)) {
        pesoPromedio.push(parseFloat(item.peso))
      }

      // Semanas de gestación - usando nombres exactos (eg)
      const semanas = item.eg || item.semanasGestacion
      if (semanas && !isNaN(semanas)) {
        semanasGestacion.push(parseFloat(semanas))
      }
    })

    const pesoProm = pesoPromedio.length > 0
      ? (pesoPromedio.reduce((a, b) => a + b, 0) / pesoPromedio.length).toFixed(0)
      : 0

    const semanasProm = semanasGestacion.length > 0
      ? (semanasGestacion.reduce((a, b) => a + b, 0) / semanasGestacion.length).toFixed(1)
      : 0

    return {
      total,
      tipoParto,
      porEdad,
      porSexo,
      pesoProm,
      semanasProm
    }
  }, [data])

  if (!stats) {
    return (
      <div className="analisis-container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loading-message"
        >
          Cargando análisis...
        </motion.div>
      </div>
    )
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  }

  return (
    <div className="analisis-container">
      <motion.h2 
        className="analisis-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Análisis Inteligente de Datos
      </motion.h2>

      <div className="stats-grid">
        <motion.div
          className="stat-card stat-card-primary"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          whileHover={{ scale: 1.08, y: -10, rotateY: 5 }}
        >
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <motion.div 
              className="stat-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 200 }}
            >
              📊
            </motion.div>
            <div className="stat-icon-glow"></div>
          </div>
          <motion.div 
            className="stat-value-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="stat-value">{stats.total.toLocaleString('es-CL')}</div>
            <div className="stat-value-shadow"></div>
          </motion.div>
          <motion.div 
            className="stat-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Total de Registros
          </motion.div>
          <div className="stat-decoration"></div>
        </motion.div>

        <motion.div
          className="stat-card stat-card-secondary"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          whileHover={{ scale: 1.08, y: -10, rotateY: -5 }}
        >
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <motion.div 
              className="stat-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 200 }}
            >
              ⚖️
            </motion.div>
            <div className="stat-icon-glow"></div>
          </div>
          <motion.div 
            className="stat-value-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="stat-value">{stats.pesoProm}g</div>
            <div className="stat-value-shadow"></div>
          </motion.div>
          <motion.div 
            className="stat-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Peso Promedio
          </motion.div>
          <div className="stat-decoration"></div>
        </motion.div>

        <motion.div
          className="stat-card stat-card-tertiary"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2}
          whileHover={{ scale: 1.08, y: -10, rotateY: 5 }}
        >
          <div className="stat-card-background"></div>
          <div className="stat-icon-wrapper">
            <motion.div 
              className="stat-icon"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.3, type: "spring", stiffness: 200 }}
            >
              📅
            </motion.div>
            <div className="stat-icon-glow"></div>
          </div>
          <motion.div 
            className="stat-value-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="stat-value">{stats.semanasProm}</div>
            <div className="stat-value-shadow"></div>
          </motion.div>
          <motion.div 
            className="stat-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            Semanas Promedio
          </motion.div>
          <div className="stat-decoration"></div>
        </motion.div>
      </div>

      <div className="charts-grid">
        <motion.div
          className="chart-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <h3 className="chart-title">Distribución por Tipo de Parto</h3>
          <div className="chart-content">
            {Object.entries(stats.tipoParto)
              .sort((a, b) => b[1] - a[1])
              .map(([tipo, count], index) => {
                const percentage = ((count / stats.total) * 100).toFixed(1)
                const colors = [
                  'linear-gradient(90deg, #ff6b9d, #ff8fb3)',
                  'linear-gradient(90deg, #ffb6c1, #ffc0cb)',
                  'linear-gradient(90deg, #ffc0cb, #ffd1dc)',
                  'linear-gradient(90deg, #ffd1dc, #ffe0e6)',
                  'linear-gradient(90deg, #ffe0e6, #ffeff2)'
                ]
                return (
                  <div key={tipo} className="bar-item">
                    <div className="bar-label">
                      <span>{tipo}</span>
                      <span className="bar-count">{count} ({percentage}%)</span>
                    </div>
                    <div className="bar-container">
                      <motion.div
                        className="bar"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.2, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                        style={{
                          background: colors[index % colors.length]
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>

        <motion.div
          className="chart-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={4}
        >
          <h3 className="chart-title">Distribución por Edad</h3>
          <div className="chart-content">
            {Object.entries(stats.porEdad)
              .sort((a, b) => {
                const order = { '< 25': 0, '25-29': 1, '30-34': 2, '≥ 35': 3 }
                return (order[a[0]] || 999) - (order[b[0]] || 999)
              })
              .map(([grupo, count], index) => {
                const percentage = ((count / stats.total) * 100).toFixed(1)
                const colors = [
                  'linear-gradient(90deg, #ff8fb3, #ffa8c4)',
                  'linear-gradient(90deg, #ffa8c4, #ffb6c1)',
                  'linear-gradient(90deg, #ffb6c1, #ffc0cb)',
                  'linear-gradient(90deg, #ffc0cb, #ffd1dc)'
                ]
                return (
                  <div key={grupo} className="bar-item">
                    <div className="bar-label">
                      <span>{grupo} años</span>
                      <span className="bar-count">{count} ({percentage}%)</span>
                    </div>
                    <div className="bar-container">
                      <motion.div
                        className="bar"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1.2, delay: 0.4 + index * 0.1, ease: "easeOut" }}
                        style={{
                          background: colors[index % colors.length]
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>

        <motion.div
          className="chart-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={5}
        >
          <h3 className="chart-title">Distribución por Sexo</h3>
          <div className="chart-content pie-chart">
            {Object.entries(stats.porSexo)
              .sort((a, b) => b[1] - a[1])
              .map(([sexo, count]) => {
                const percentage = ((count / stats.total) * 100).toFixed(1)
                const colorMap = {
                  'MASCULINO': '#ff6b9d',
                  'FEMENINO': '#ff8fb3'
                }
                return (
                  <motion.div 
                    key={sexo} 
                    className="pie-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    <div className="pie-label">
                      <span className="pie-color" style={{
                        backgroundColor: colorMap[sexo] || '#ffb6c1'
                      }}></span>
                      <span>{sexo}</span>
                    </div>
                    <div className="pie-value">
                      {count} ({percentage}%)
                    </div>
                  </motion.div>
                )
              })}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="insights-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={6}
      >
        <div className="insights-header">
          <h3 className="insights-title">🤖 Análisis Inteligente con IA</h3>
          <motion.button
            className="refresh-analysis-btn"
            onClick={loadAIAnalysis}
            disabled={isAnalyzing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isAnalyzing ? '⏳ Analizando...' : '🔄 Actualizar Análisis'}
          </motion.button>
        </div>
        
        {isAnalyzing && (
          <div className="analysis-loading">
            <div className="loading-spinner"></div>
            <p>Generando análisis inteligente...</p>
          </div>
        )}
        
        {analysisError && (
          <div className="analysis-error">
            <p>⚠️ {analysisError}</p>
          </div>
        )}
        
        {aiAnalysis && !isAnalyzing && (
          <div className="ai-analysis-content">
            <div className="ai-text" dangerouslySetInnerHTML={{ 
              __html: formatAIText(aiAnalysis) 
            }} />
          </div>
        )}
        
        {!aiAnalysis && !isAnalyzing && !analysisError && (
          <div className="insights-content">
            <p>
              • El tipo de parto más común es <strong>{Object.entries(stats.tipoParto).sort((a, b) => b[1] - a[1])[0]?.[0]}</strong> con {Object.entries(stats.tipoParto).sort((a, b) => b[1] - a[1])[0]?.[1]} casos.
            </p>
            <p>
              • El grupo etario predominante es <strong>{Object.entries(stats.porEdad).sort((a, b) => b[1] - a[1])[0]?.[0]} años</strong>.
            </p>
            <p>
              • La distribución por sexo muestra un equilibrio con <strong>{stats.porSexo.MASCULINO}</strong> masculinos y <strong>{stats.porSexo.FEMENINO}</strong> femeninos.
            </p>
            <p>
              • El peso promedio de los recién nacidos es de <strong>{stats.pesoProm}g</strong>, lo cual está dentro del rango normal.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function formatAIText(text) {
  // PASO 1: Procesar recomendaciones primero (formato especial de tarjetas)
  const recommendationPattern = /(?:^|\n)([^\n]+?)\s*\((ALTA|MEDIA|BAJA)\)\s*\n([\s\S]*?)(?=\n(?:[^\n]+?)\s*\((?:ALTA|MEDIA|BAJA)\)|\n##|\n###|\n####|$)/g
  let recommendations = []
  let match
  recommendationPattern.lastIndex = 0
  
  while ((match = recommendationPattern.exec(text)) !== null) {
    const title = match[1].trim()
    const priority = match[2]
    let content = match[3].trim()
    
    content = content.replace(/^\d+\.\s*/gm, '')
    content = content.replace(/^[-•*]\s*/gm, '')
    content = content.replace(/^\s*[-•*]\s*/gm, '')
    content = content.replace(/\n{3,}/g, '\n\n')
    content = content.trim()
    
    if (content.length < 50 && match.index + match[0].length < text.length) {
      const nextMatch = text.substring(match.index + match[0].length).match(/\n(?:[^\n]+?)\s*\((?:ALTA|MEDIA|BAJA)\)|\n##|\n###|\n####/)
      if (nextMatch) {
        const additionalContent = text.substring(match.index + match[0].length, match.index + match[0].length + nextMatch.index).trim()
        if (additionalContent.length > content.length) {
          content = additionalContent
        }
      }
    }
    
    recommendations.push({
      title,
      priority,
      content,
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }
  
  // Reemplazar recomendaciones con marcadores temporales
  let processedText = text
  if (recommendations.length > 0) {
    let offset = 0
    recommendations.forEach((rec) => {
      const placeholder = `__RECOMMENDATION_${rec.startIndex}__`
      processedText = processedText.substring(0, rec.startIndex + offset) + 
                      placeholder + 
                      processedText.substring(rec.endIndex + offset)
      offset += placeholder.length - (rec.endIndex - rec.startIndex)
    })
  }
  
  // PASO 2: Procesar encabezados markdown
  let html = processedText
  html = html.replace(/^####\s+([^\n]+)$/gim, '<h4 class="ai-heading-4">$1</h4>')
  html = html.replace(/^###\s+([^\n]+)$/gim, '<h3 class="ai-heading-3">$1</h3>')
  html = html.replace(/^##\s+([^\n]+)$/gim, '<h2 class="ai-heading-2">$1</h2>')
  html = html.replace(/^#\s+([^\n]+)$/gim, '<h1 class="ai-heading-1">$1</h1>')
  
  // PASO 3: Detectar y convertir líneas con **texto:** a formato de lista ANTES de procesar negritas
  // Esto asegura que se detecten correctamente
  html = html.replace(/^\*\*([^*:]+?):\*\*\s*(.*)$/gim, (match, title, content) => {
    const isIndicator = title.toLowerCase().includes('tasa') ||
                        title.toLowerCase().includes('rate') ||
                        title.toLowerCase().includes('porcentaje') ||
                        title.toLowerCase().includes('percentage') ||
                        title.toLowerCase().includes('indicador') ||
                        title.toLowerCase().includes('indicator') ||
                        title.toLowerCase().includes('dato') ||
                        title.toLowerCase().includes('data') ||
                        title.toLowerCase().includes('estándar') ||
                        title.toLowerCase().includes('standard') ||
                        title.toLowerCase().includes('impacto') ||
                        title.toLowerCase().includes('impact') ||
                        title.toLowerCase().includes('justificación') ||
                        title.toLowerCase().includes('justification') ||
                        title.toLowerCase().includes('prioridad') ||
                        title.toLowerCase().includes('priority') ||
                        title.toLowerCase().includes('apgar') ||
                        title.toLowerCase().includes('prematuridad') ||
                        title.toLowerCase().includes('prematurity') ||
                        title.toLowerCase().includes('cesárea') ||
                        title.toLowerCase().includes('cesarean') ||
                        title.toLowerCase().includes('peso') ||
                        title.toLowerCase().includes('weight')
    
    if (isIndicator && title.length < 60) {
      return `- **${title.trim()}:** ${content.trim()}`
    }
    return match
  })
  
  // PASO 4: Procesar listas markdown (debe ir ANTES de procesar negritas)
  html = html.replace(/^(\d+)\.\s+(.*)$/gim, '<li class="ai-list-item-numbered"><span class="list-number">$1.</span><span class="list-content">$2</span></li>')
  html = html.replace(/^[-•*]\s+(.*)$/gim, '<li class="ai-list-item-bullet"><span class="list-bullet">•</span><span class="list-content">$1</span></li>')
  html = html.replace(/^\s{2,}[-•*]\s+(.*)$/gim, '<li class="ai-list-item-sub"><span class="list-bullet">◦</span><span class="list-content">$1</span></li>')
  
  // PASO 5: Procesar texto en negrita
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="ai-bold">$1</strong>')
  
  // PASO 6: Procesar etiquetas estructuradas
  html = html.replace(/\*\*Dato numérico:\*\*/gi, '<div class="structured-label">Dato numérico:</div>')
  html = html.replace(/\*\*Justificación Técnica:\*\*/gi, '<div class="structured-label">Justificación Técnica:</div>')
  html = html.replace(/\*\*Impacto Cuantificable:\*\*/gi, '<div class="structured-label">Impacto Cuantificable:</div>')
  html = html.replace(/\*\*Indicador actual:\*\*/gi, '<div class="structured-label">Indicador actual:</div>')
  html = html.replace(/\*\*Estándar de referencia:\*\*/gi, '<div class="structured-label">Estándar de referencia:</div>')
  html = html.replace(/\*\*Impacto Potencial:\*\*/gi, '<div class="structured-label">Impacto Potencial:</div>')
  html = html.replace(/\*\*Prioridad:\*\*/gi, '<div class="structured-label priority-label">Prioridad:</div>')
  
  // PASO 7: Procesar texto en cursiva
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
  
  // PASO 8: Restaurar recomendaciones
  if (recommendations.length > 0) {
    recommendations.forEach((rec) => {
      const placeholder = `__RECOMMENDATION_${rec.startIndex}__`
      const recommendationHtml = `<div class="recommendation-card">
        <div class="recommendation-header">
          <div class="recommendation-icon">💡</div>
          <h3 class="recommendation-title">${rec.title} (${rec.priority})</h3>
        </div>
        <div class="recommendation-body">${formatRecommendationContent(rec.content)}</div>
      </div>`
      html = html.replace(placeholder, recommendationHtml)
    })
  }
  
  // PASO 9: Procesar líneas y agrupar listas correctamente
  const lines = html.split('\n')
  let result = []
  let currentList = []
  let listType = null // 'numbered', 'bullet', 'sub', null
  
  const closeList = () => {
    if (currentList.length > 0) {
      const listClass = listType === 'numbered' ? 'ai-list-numbered' : 
                       listType === 'sub' ? 'ai-list-sub' : 'ai-list-bullet'
      result.push(`<ul class="${listClass}">${currentList.join('')}</ul>`)
      currentList = []
      listType = null
    }
  }
  
  lines.forEach((line) => {
    const trimmed = line.trim()
    
    // Saltar líneas vacías
    if (!trimmed) {
      closeList()
      result.push('<div class="ai-spacer"></div>')
      return
    }
    
    // Recomendaciones (ya procesadas)
    if (trimmed.includes('recommendation-card')) {
      closeList()
      result.push(trimmed)
      return
    }
    
    // Encabezados
    if (trimmed.startsWith('<h')) {
      closeList()
      result.push(trimmed)
      return
    }
    
    // Items de lista - agrupar por tipo
    if (trimmed.startsWith('<li class="ai-list-item-numbered"')) {
      if (listType !== 'numbered') {
        closeList()
        listType = 'numbered'
      }
      currentList.push(trimmed)
      return
    }
    
    if (trimmed.startsWith('<li class="ai-list-item-bullet"')) {
      if (listType !== 'bullet') {
        closeList()
        listType = 'bullet'
      }
      currentList.push(trimmed)
      return
    }
    
    if (trimmed.startsWith('<li class="ai-list-item-sub"')) {
      if (listType !== 'sub') {
        closeList()
        listType = 'sub'
      }
      currentList.push(trimmed)
      return
    }
    
    if (trimmed.startsWith('<li')) {
      if (listType !== 'bullet') {
        closeList()
        listType = 'bullet'
      }
      currentList.push(trimmed)
      return
    }
    
    // Cerrar lista si encontramos otro elemento
    closeList()
    
    // Secciones estructuradas
    if (trimmed.includes('structured-label') || trimmed.includes('indicator-section')) {
      result.push(trimmed)
      return
    }
    
    // Párrafos normales
    if (!trimmed.startsWith('<')) {
      if (trimmed.length > 3) {
        result.push(`<p class="ai-paragraph">${trimmed}</p>`)
      }
    } else {
      result.push(trimmed)
    }
  })
  
  // Cerrar cualquier lista pendiente
  closeList()
  
  let finalHtml = result.join('\n')
  
  // PASO 10: Aplicar formato de indicadores
  finalHtml = formatIndicators(finalHtml)
  
  return finalHtml
}

// Función mejorada para detectar y formatear indicadores después del procesamiento
function formatIndicators(html) {
  // Buscar patrones de indicadores: "Título:" seguido de párrafo
  // Mejorar la detección para capturar mejor los indicadores
  const lines = html.split('\n')
  let result = []
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i].trim()
    
    // Buscar párrafos que contienen títulos de indicadores (terminan con ":")
    if (line.includes('<p') && line.match(/[A-ZÁÉÍÓÚÑ][^:]*:\s*</)) {
      const titleMatch = line.match(/>([^<:]+):\s*</)
      if (titleMatch) {
        const title = titleMatch[1].trim()
        const indicatorKeywords = ['tasa', 'rate', 'porcentaje', 'percentage', 'edad', 'age', 'peso', 'weight', 'apgar', 'prematuridad', 'prematurity', 'cesárea', 'cesarean', 'materna', 'maternal', 'bajo peso', 'low birth']
        const isIndicator = indicatorKeywords.some(keyword => title.toLowerCase().includes(keyword))
        
        if (isIndicator && title.length < 50 && title.split(/\s+/).length <= 6) {
          // Extraer el contenido del párrafo siguiente
          let content = ''
          let j = i + 1
          
          while (j < lines.length && j < i + 3) {
            const nextLine = lines[j].trim()
            if (nextLine.includes('<p') && !nextLine.includes('indicator')) {
              // Extraer el texto del párrafo
              const textMatch = nextLine.match(/>([^<]+)</)
              if (textMatch) {
                content = textMatch[1].trim()
                if (content.length > 20) {
                  result.push(`<div class="indicator-section">
                    <h4 class="indicator-title">${title}:</h4>
                    <div class="indicator-content">${content}</div>
                  </div>`)
                  i = j + 1
                  break
                }
              }
            }
            j++
          }
          
          if (content) {
            continue
          }
        }
      }
    }
    
    result.push(lines[i])
    i++
  }
  
  return result.join('\n')
}

function formatRecommendationContent(content) {
  // Formatear el contenido de la recomendación como párrafos continuos
  let formatted = content.trim()
  
  // Limpiar el contenido: eliminar viñetas, números y listas
  formatted = formatted.replace(/^\d+\.\s*/gm, '')
  formatted = formatted.replace(/^[-•*]\s*/gm, '')
  formatted = formatted.replace(/^\s*[-•*]\s*/gm, '')
  
  // Dividir por saltos de línea dobles o múltiples para crear párrafos
  // Pero mantener párrafos largos juntos si no hay separación clara
  let paragraphs = []
  
  // Primero, intentar dividir por saltos de línea dobles
  const doubleLineBreak = formatted.split(/\n\s*\n+/)
  
  if (doubleLineBreak.length > 1) {
    // Hay párrafos separados por líneas en blanco
    paragraphs = doubleLineBreak.filter(p => p.trim().length > 0)
  } else {
    // No hay separación clara, tratar todo como un párrafo continuo
    // Pero dividir si hay saltos de línea simples con mucho texto
    const lines = formatted.split('\n').filter(l => l.trim().length > 0)
    
    // Si hay muchas líneas cortas, combinarlas en párrafos
    if (lines.length > 3) {
      // Combinar líneas relacionadas
      let currentParagraph = ''
      lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (trimmed.length < 50 && index < lines.length - 1) {
          // Línea corta, probablemente parte de un párrafo más largo
          currentParagraph += (currentParagraph ? ' ' : '') + trimmed
        } else {
          // Línea larga o última línea
          if (currentParagraph) {
            paragraphs.push(currentParagraph + ' ' + trimmed)
            currentParagraph = ''
          } else {
            paragraphs.push(trimmed)
          }
        }
      })
      if (currentParagraph) {
        paragraphs.push(currentParagraph)
      }
    } else {
      // Pocas líneas, combinarlas en un solo párrafo
      paragraphs = [lines.join(' ')]
    }
  }
  
  // Si no hay párrafos, usar todo el contenido como un párrafo
  if (paragraphs.length === 0) {
    paragraphs = [formatted]
  }
  
  // Formatear cada párrafo
  return paragraphs.map(para => {
    const trimmed = para.trim()
    if (!trimmed || trimmed.length < 10) return ''
    
    // Limpiar espacios múltiples
    const cleaned = trimmed.replace(/\s+/g, ' ')
    
    // Convertir negritas (pero mantener el formato simple)
    let processed = cleaned.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Convertir cursivas
    processed = processed.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
    
    return `<p class="recommendation-text">${processed}</p>`
  }).join('')
}

export default AnalisisIA

