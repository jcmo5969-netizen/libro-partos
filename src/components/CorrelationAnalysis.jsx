import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './CorrelationAnalysis.css'

function CorrelationAnalysis({ data }) {
  const [correlations, setCorrelations] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (data && data.length > 0) {
      loadCorrelations()
    }
  }, [data])

  const loadCorrelations = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Preparar datos para análisis de correlaciones
      const correlationData = {
        edadVsTipoParto: {},
        paridadVsTipoParto: {},
        edadVsPeso: [],
        semanasVsPeso: [],
        tipoPartoVsApgar: {},
        edadVsParidad: {}
      }

      data.forEach(item => {
        const edad = item.edad ? parseInt(item.edad) : null
        const tipoParto = item.tipoParto?.toUpperCase() || 'DESCONOCIDO'
        const paridad = item.paridad?.toUpperCase() || 'DESCONOCIDO'
        const peso = item.peso ? parseFloat(item.peso) : null
        const semanas = item.eg || item.semanasGestacion ? parseFloat(item.eg || item.semanasGestacion) : null
        const apgar = item.apgar5 ? parseFloat(item.apgar5) : null

        // Edad vs Tipo de Parto
        if (edad) {
          const grupoEdad = edad < 25 ? '<25' : edad < 30 ? '25-29' : edad < 35 ? '30-34' : '≥35'
          if (!correlationData.edadVsTipoParto[grupoEdad]) {
            correlationData.edadVsTipoParto[grupoEdad] = {}
          }
          correlationData.edadVsTipoParto[grupoEdad][tipoParto] = 
            (correlationData.edadVsTipoParto[grupoEdad][tipoParto] || 0) + 1
        }

        // Paridad vs Tipo de Parto
        if (paridad !== 'DESCONOCIDO') {
          if (!correlationData.paridadVsTipoParto[paridad]) {
            correlationData.paridadVsTipoParto[paridad] = {}
          }
          correlationData.paridadVsTipoParto[paridad][tipoParto] = 
            (correlationData.paridadVsTipoParto[paridad][tipoParto] || 0) + 1
        }

        // Edad vs Peso
        if (edad && peso) {
          correlationData.edadVsPeso.push({ edad, peso })
        }

        // Semanas vs Peso
        if (semanas && peso) {
          correlationData.semanasVsPeso.push({ semanas, peso })
        }

        // Tipo de Parto vs Apgar
        if (tipoParto !== 'DESCONOCIDO' && apgar !== null) {
          if (!correlationData.tipoPartoVsApgar[tipoParto]) {
            correlationData.tipoPartoVsApgar[tipoParto] = []
          }
          correlationData.tipoPartoVsApgar[tipoParto].push(apgar)
        }
      })

      // Calcular promedios
      Object.keys(correlationData.tipoPartoVsApgar).forEach(tipo => {
        const apgars = correlationData.tipoPartoVsApgar[tipo]
        if (apgars.length > 0) {
          const promedio = apgars.reduce((a, b) => a + b, 0) / apgars.length
          correlationData.tipoPartoVsApgar[tipo] = {
            promedio: promedio.toFixed(2),
            total: apgars.length
          }
        }
      })

      const prompt = `Analiza las siguientes correlaciones entre variables en los datos de partos y proporciona insights sobre las relaciones identificadas.

Datos de correlaciones:
${JSON.stringify(correlationData, null, 2)}

Proporciona:
1. **Correlaciones Identificadas**: Lista las relaciones más significativas encontradas
2. **Interpretación**: Explica qué significan estas correlaciones en el contexto clínico
3. **Patrones Observados**: Describe patrones interesantes o inesperados
4. **Implicaciones Clínicas**: Qué implicaciones tienen estas correlaciones para la práctica clínica
5. **Recomendaciones**: Sugerencias basadas en los hallazgos

Formato de respuesta:
**Correlaciones Identificadas:**
- [Correlación 1]
- [Correlación 2]

**Interpretación:**
[texto explicativo]

**Patrones Observados:**
- [Patrón 1]
- [Patrón 2]

**Implicaciones Clínicas:**
[texto]

**Recomendaciones:**
- [Recomendación 1]
- [Recomendación 2]

Responde en español de forma técnica pero accesible.`

      const analysis = await analyzeDataWithAI(data, prompt)
      setCorrelations(analysis)
    } catch (err) {
      console.error('Error cargando correlaciones:', err)
      setError('No se pudieron analizar las correlaciones. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!data || data.length === 0) return null

  return (
    <motion.div
      className="correlation-analysis"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="correlation-header">
        <h3>🔗 Análisis de Correlaciones</h3>
        <button 
          className="refresh-correlation-btn"
          onClick={loadCorrelations}
          disabled={isLoading}
        >
          {isLoading ? '🔄 Analizando...' : '🔄 Actualizar'}
        </button>
      </div>

      {isLoading && (
        <div className="correlation-loading">
          <div className="loading-spinner"></div>
          <p>Analizando correlaciones entre variables...</p>
        </div>
      )}

      {error && (
        <div className="correlation-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {correlations && !isLoading && (
        <motion.div
          className="correlation-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div 
            className="correlation-text"
            dangerouslySetInnerHTML={{ __html: formatCorrelations(correlations) }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function formatCorrelations(text) {
  // Dividir párrafos largos
  let html = text
  const paragraphs = html.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
  let processed = []
  
  paragraphs.forEach(para => {
    const trimmed = para.trim()
    
    if (trimmed.match(/^\*\*[^*]+:\*\*$/i)) {
      processed.push(trimmed)
    } else if (trimmed.length > 200) {
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed]
      sentences.forEach(s => {
        if (s.trim().length > 0) processed.push(s.trim())
      })
    } else {
      processed.push(trimmed)
    }
  })
  
  html = processed.join('\n\n')
  
  // Procesar negritas
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="correlation-bold">$1</strong>')
  
  // Procesar secciones
  html = html.replace(/\*\*Correlaciones Identificadas:\*\*/gi, '<div class="correlation-section"><h4 class="correlation-section-title">🔗 Correlaciones Identificadas</h4>')
  html = html.replace(/\*\*Interpretación:\*\*/gi, '</div><div class="correlation-section"><h4 class="correlation-section-title">💡 Interpretación</h4>')
  html = html.replace(/\*\*Patrones Observados:\*\*/gi, '</div><div class="correlation-section"><h4 class="correlation-section-title">📊 Patrones Observados</h4>')
  html = html.replace(/\*\*Implicaciones Clínicas:\*\*/gi, '</div><div class="correlation-section"><h4 class="correlation-section-title">🏥 Implicaciones Clínicas</h4>')
  html = html.replace(/\*\*Recomendaciones:\*\*/gi, '</div><div class="correlation-section"><h4 class="correlation-section-title">✅ Recomendaciones</h4>')
  
  html = html.replace(/^/, '<div class="correlation-section">')
  html += '</div>'
  
  // Procesar párrafos y listas
  const finalLines = html.split('\n')
  let result = []
  let currentList = []
  
  finalLines.forEach(line => {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('-')) {
      currentList.push(`<li class="correlation-item">${trimmed.substring(1).trim()}</li>`)
    } else {
      if (currentList.length > 0) {
        result.push(`<ul class="correlation-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      
      if (!trimmed) {
        result.push('<div class="correlation-spacer"></div>')
      } else if (trimmed.startsWith('<div') || trimmed.startsWith('<h4') || trimmed.startsWith('</div')) {
        result.push(trimmed)
      } else {
        result.push(`<p class="correlation-paragraph">${trimmed}</p>`)
      }
    }
  })
  
  if (currentList.length > 0) {
    result.push(`<ul class="correlation-list">${currentList.join('')}</ul>`)
  }
  
  return result.join('\n')
}

export default CorrelationAnalysis

