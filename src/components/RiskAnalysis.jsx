import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './RiskAnalysis.css'

function RiskAnalysis({ data }) {
  const [riskAnalysis, setRiskAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState(null)

  useEffect(() => {
    if (data && data.length > 0) {
      loadRiskAnalysis()
    }
  }, [data])

  const loadRiskAnalysis = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Identificar casos de alto riesgo
      const highRiskCases = data.filter(item => {
        const edad = item.edad ? parseInt(item.edad) : null
        const peso = item.peso ? parseFloat(item.peso) : null
        const semanas = item.eg || item.semanasGestacion ? parseFloat(item.eg || item.semanasGestacion) : null
        const apgar = item.apgar5 ? parseFloat(item.apgar5) : null
        
        // Criterios de alto riesgo
        const isHighRisk = 
          (edad && (edad < 18 || edad > 40)) ||
          (peso && peso < 2500) ||
          (semanas && semanas < 37) ||
          (apgar !== null && apgar < 7)
        
        return isHighRisk
      })

      const mediumRiskCases = data.filter(item => {
        const edad = item.edad ? parseInt(item.edad) : null
        const peso = item.peso ? parseFloat(item.peso) : null
        const semanas = item.eg || item.semanasGestacion ? parseFloat(item.eg || item.semanasGestacion) : null
        const apgar = item.apgar5 ? parseFloat(item.apgar5) : null
        
        // Criterios de riesgo medio
        const isMediumRisk = 
          (edad && (edad >= 35 && edad <= 40)) ||
          (peso && peso >= 2500 && peso < 3000) ||
          (semanas && semanas >= 37 && semanas < 38) ||
          (apgar !== null && apgar >= 7 && apgar < 8)
        
        return isMediumRisk && !highRiskCases.includes(item)
      })

      const riskData = {
        total: data.length,
        highRisk: highRiskCases.length,
        mediumRisk: mediumRiskCases.length,
        lowRisk: data.length - highRiskCases.length - mediumRiskCases.length,
        highRiskPercentage: data.length > 0 ? ((highRiskCases.length / data.length) * 100).toFixed(1) : '0',
        mediumRiskPercentage: data.length > 0 ? ((mediumRiskCases.length / data.length) * 100).toFixed(1) : '0',
        lowRiskPercentage: data.length > 0 ? (((data.length - highRiskCases.length - mediumRiskCases.length) / data.length) * 100).toFixed(1) : '0',
        highRiskSample: highRiskCases.slice(0, 5).map(item => ({
          edad: item.edad,
          peso: item.peso,
          semanas: item.eg || item.semanasGestacion,
          apgar: item.apgar5,
          tipoParto: item.tipoParto
        }))
      }

      const prompt = `Analiza los siguientes datos de clasificación de riesgo de partos y proporciona un análisis detallado.

Datos de riesgo:
${JSON.stringify(riskData, null, 2)}

Proporciona:
1. **Distribución de Riesgo**: Análisis de la distribución de casos por nivel de riesgo
2. **Factores de Riesgo Identificados**: Principales factores que contribuyen al riesgo alto
3. **Interpretación Clínica**: Qué significan estos niveles de riesgo
4. **Recomendaciones por Nivel**: Acciones específicas para cada nivel de riesgo
5. **Alertas**: Casos que requieren atención inmediata
6. **Prevención**: Estrategias para reducir el riesgo en futuros casos

Formato de respuesta:
**Distribución de Riesgo:**
- Alto riesgo: [número] ([%])
- Riesgo medio: [número] ([%])
- Bajo riesgo: [número] ([%])

**Factores de Riesgo Identificados:**
- [Factor 1]
- [Factor 2]

**Interpretación Clínica:**
[texto explicativo]

**Recomendaciones por Nivel:**
**Alto Riesgo:**
- [Recomendación 1]
- [Recomendación 2]

**Riesgo Medio:**
- [Recomendación 1]
- [Recomendación 2]

**Bajo Riesgo:**
- [Recomendación 1]

**Alertas:**
- [Alerta 1 si aplica]
- [Alerta 2 si aplica]

**Prevención:**
- [Estrategia 1]
- [Estrategia 2]

Responde en español de forma técnica pero accesible.`

      const analysis = await analyzeDataWithAI(data, prompt)
      setRiskAnalysis(analysis)
    } catch (err) {
      console.error('Error cargando análisis de riesgo:', err)
      setError('No se pudo realizar el análisis de riesgo. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!data || data.length === 0) return null

  return (
    <motion.div
      className="risk-analysis"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="risk-header">
        <h3>⚠️ Análisis de Riesgo por Caso</h3>
        <button 
          className="refresh-risk-btn"
          onClick={loadRiskAnalysis}
          disabled={isLoading}
        >
          {isLoading ? '🔄 Analizando...' : '🔄 Actualizar'}
        </button>
      </div>

      {isLoading && (
        <div className="risk-loading">
          <div className="loading-spinner"></div>
          <p>Analizando niveles de riesgo...</p>
        </div>
      )}

      {error && (
        <div className="risk-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {riskAnalysis && !isLoading && (
        <motion.div
          className="risk-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div 
            className="risk-text"
            dangerouslySetInnerHTML={{ __html: formatRiskAnalysis(riskAnalysis) }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function formatRiskAnalysis(text) {
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
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="risk-bold">$1</strong>')
  
  // Procesar secciones
  html = html.replace(/\*\*Distribución de Riesgo:\*\*/gi, '<div class="risk-section"><h4 class="risk-section-title">📊 Distribución de Riesgo</h4>')
  html = html.replace(/\*\*Factores de Riesgo Identificados:\*\*/gi, '</div><div class="risk-section"><h4 class="risk-section-title">🔍 Factores de Riesgo Identificados</h4>')
  html = html.replace(/\*\*Interpretación Clínica:\*\*/gi, '</div><div class="risk-section"><h4 class="risk-section-title">💡 Interpretación Clínica</h4>')
  html = html.replace(/\*\*Recomendaciones por Nivel:\*\*/gi, '</div><div class="risk-section"><h4 class="risk-section-title">✅ Recomendaciones por Nivel</h4>')
  html = html.replace(/\*\*Alto Riesgo:\*\*/gi, '<div class="risk-level risk-high"><h5 class="risk-level-title">🔴 Alto Riesgo</h5>')
  html = html.replace(/\*\*Riesgo Medio:\*\*/gi, '</div><div class="risk-level risk-medium"><h5 class="risk-level-title">🟡 Riesgo Medio</h5>')
  html = html.replace(/\*\*Bajo Riesgo:\*\*/gi, '</div><div class="risk-level risk-low"><h5 class="risk-level-title">🟢 Bajo Riesgo</h5>')
  html = html.replace(/\*\*Alertas:\*\*/gi, '</div></div><div class="risk-section"><h4 class="risk-section-title">⚠️ Alertas</h4>')
  html = html.replace(/\*\*Prevención:\*\*/gi, '</div><div class="risk-section"><h4 class="risk-section-title">🛡️ Prevención</h4>')
  
  html = html.replace(/^/, '<div class="risk-section">')
  html += '</div>'
  
  // Procesar párrafos y listas
  const finalLines = html.split('\n')
  let result = []
  let currentList = []
  
  finalLines.forEach(line => {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('-')) {
      currentList.push(`<li class="risk-item">${trimmed.substring(1).trim()}</li>`)
    } else {
      if (currentList.length > 0) {
        result.push(`<ul class="risk-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      
      if (!trimmed) {
        result.push('<div class="risk-spacer"></div>')
      } else if (trimmed.startsWith('<div') || trimmed.startsWith('<h4') || trimmed.startsWith('<h5') || trimmed.startsWith('</div')) {
        result.push(trimmed)
      } else {
        result.push(`<p class="risk-paragraph">${trimmed}</p>`)
      }
    }
  })
  
  if (currentList.length > 0) {
    result.push(`<ul class="risk-list">${currentList.join('')}</ul>`)
  }
  
  return result.join('\n')
}

export default RiskAnalysis

