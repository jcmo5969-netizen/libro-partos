import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './ComparativeAnalysis.css'

function ComparativeAnalysis({ data, selectedMonth }) {
  const [comparison, setComparison] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Calcular datos del mes actual vs mes anterior
  const comparisonData = useMemo(() => {
    if (!data || data.length === 0) return null
    
    const currentMonth = selectedMonth && selectedMonth !== 'all' ? parseInt(selectedMonth) : new Date().getMonth() + 1
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
    
    const current = data.filter(item => {
      const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
      return month === currentMonth
    })
    
    const previous = data.filter(item => {
      const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
      return month === previousMonth
    })
    
    const calculateStats = (arr) => {
      const total = arr.length
      const vaginales = arr.filter(i => i.tipoParto?.toUpperCase().includes('VAGINAL')).length
      const cesareas = arr.filter(i => i.tipoParto?.toUpperCase().includes('CES')).length
      const cesareasElectivas = arr.filter(i => i.tipoParto?.toUpperCase().includes('CES ELE')).length
      const cesareasUrgentes = arr.filter(i => i.tipoParto?.toUpperCase().includes('CES URG')).length
      const primiparas = arr.filter(i => i.paridad?.toUpperCase().includes('PRIMIPARA')).length
      const multiparas = arr.filter(i => i.paridad?.toUpperCase().includes('MULTIPARA')).length
      
      const pesos = arr.filter(i => i.peso && !isNaN(i.peso)).map(i => parseFloat(i.peso))
      const pesoPromedio = pesos.length > 0 ? pesos.reduce((a, b) => a + b, 0) / pesos.length : 0
      
      const semanas = arr.filter(i => (i.eg || i.semanasGestacion) && !isNaN(i.eg || i.semanasGestacion))
        .map(i => parseFloat(i.eg || i.semanasGestacion))
      const semanasPromedio = semanas.length > 0 ? semanas.reduce((a, b) => a + b, 0) / semanas.length : 0
      
      return {
        total,
        vaginales,
        cesareas,
        cesareasElectivas,
        cesareasUrgentes,
        primiparas,
        multiparas,
        pesoPromedio: pesoPromedio.toFixed(1),
        semanasPromedio: semanasPromedio.toFixed(1),
        tasaCesareas: total > 0 ? ((cesareas / total) * 100).toFixed(1) : '0',
        tasaVaginales: total > 0 ? ((vaginales / total) * 100).toFixed(1) : '0'
      }
    }
    
    return {
      currentMonth,
      previousMonth,
      current: calculateStats(current),
      previous: calculateStats(previous)
    }
  }, [data, selectedMonth])

  useEffect(() => {
    if (comparisonData && comparisonData.current.total > 0) {
      loadComparison()
    }
  }, [comparisonData])

  const loadComparison = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      
      const prompt = `Compara los siguientes datos de partos entre dos meses consecutivos y proporciona un análisis detallado.

**Mes Actual (${monthNames[comparisonData.currentMonth - 1]}):**
${JSON.stringify(comparisonData.current, null, 2)}

**Mes Anterior (${monthNames[comparisonData.previousMonth - 1]}):**
${JSON.stringify(comparisonData.previous, null, 2)}

Proporciona:
1. **Cambios Significativos**: Identifica aumentos o disminuciones importantes (>10% de cambio)
2. **Interpretación**: Explica qué significan estos cambios en el contexto clínico
3. **Causas Probables**: Sugiere posibles razones para los cambios observados
4. **Alertas**: Indica si algún indicador está en niveles preocupantes
5. **Recomendaciones**: Acciones sugeridas basadas en la comparación

Formato de respuesta:
**Cambios Significativos:**
- [cambio 1 con porcentaje]
- [cambio 2 con porcentaje]

**Interpretación:**
[texto explicativo]

**Causas Probables:**
- [causa 1]
- [causa 2]

**Alertas:**
- [alerta 1 si aplica]
- [alerta 2 si aplica]

**Recomendaciones:**
- [recomendación 1]
- [recomendación 2]

Responde en español de forma técnica pero accesible.`

      const analysis = await analyzeDataWithAI(data, prompt)
      setComparison(analysis)
    } catch (err) {
      console.error('Error cargando comparación:', err)
      setError('No se pudo generar la comparación. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!comparisonData || comparisonData.current.total === 0) return null

  return (
    <motion.div
      className="comparative-analysis"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="comparison-header">
        <h3>📊 Análisis Comparativo</h3>
        <button 
          className="refresh-comparison-btn"
          onClick={loadComparison}
          disabled={isLoading}
        >
          {isLoading ? '🔄 Analizando...' : '🔄 Actualizar'}
        </button>
      </div>

      {isLoading && (
        <div className="comparison-loading">
          <div className="loading-spinner"></div>
          <p>Comparando períodos...</p>
        </div>
      )}

      {error && (
        <div className="comparison-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {comparison && !isLoading && (
        <motion.div
          className="comparison-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div 
            className="comparison-text"
            dangerouslySetInnerHTML={{ __html: formatComparison(comparison) }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function formatComparison(text) {
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
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="comparison-bold">$1</strong>')
  
  // Procesar secciones
  html = html.replace(/\*\*Cambios Significativos:\*\*/gi, '<div class="comparison-section"><h4 class="comparison-section-title">📈 Cambios Significativos</h4>')
  html = html.replace(/\*\*Interpretación:\*\*/gi, '</div><div class="comparison-section"><h4 class="comparison-section-title">💡 Interpretación</h4>')
  html = html.replace(/\*\*Causas Probables:\*\*/gi, '</div><div class="comparison-section"><h4 class="comparison-section-title">🔍 Causas Probables</h4>')
  html = html.replace(/\*\*Alertas:\*\*/gi, '</div><div class="comparison-section"><h4 class="comparison-section-title">⚠️ Alertas</h4>')
  html = html.replace(/\*\*Recomendaciones:\*\*/gi, '</div><div class="comparison-section"><h4 class="comparison-section-title">✅ Recomendaciones</h4>')
  
  html = html.replace(/^/, '<div class="comparison-section">')
  html += '</div>'
  
  // Procesar párrafos y listas
  const finalLines = html.split('\n')
  let result = []
  let currentList = []
  
  finalLines.forEach(line => {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('-')) {
      currentList.push(`<li class="comparison-item">${trimmed.substring(1).trim()}</li>`)
    } else {
      if (currentList.length > 0) {
        result.push(`<ul class="comparison-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      
      if (!trimmed) {
        result.push('<div class="comparison-spacer"></div>')
      } else if (trimmed.startsWith('<div') || trimmed.startsWith('<h4') || trimmed.startsWith('</div')) {
        result.push(trimmed)
      } else {
        result.push(`<p class="comparison-paragraph">${trimmed}</p>`)
      }
    }
  })
  
  if (currentList.length > 0) {
    result.push(`<ul class="comparison-list">${currentList.join('')}</ul>`)
  }
  
  return result.join('\n')
}

export default ComparativeAnalysis

