import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './ReportGenerator.css'

function ReportGenerator({ data, selectedMonth }) {
  const [report, setReport] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [reportType, setReportType] = useState('monthly')

  const generateReport = async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      
      let filteredData = data
      let periodLabel = 'Todos los períodos'
      
      if (selectedMonth && selectedMonth !== 'all') {
        const monthNumber = parseInt(selectedMonth)
        filteredData = data.filter(item => {
          const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
          return month === monthNumber
        })
        periodLabel = monthNames[monthNumber - 1]
      } else if (reportType === 'monthly') {
        const currentMonth = new Date().getMonth() + 1
        filteredData = data.filter(item => {
          const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
          return month === currentMonth
        })
        periodLabel = monthNames[currentMonth - 1]
      }
      
      const prompt = `Genera un reporte ejecutivo profesional sobre los datos de partos del siguiente período.

Período: ${periodLabel}
Total de registros: ${filteredData.length}

Datos del período:
${JSON.stringify({
  total: filteredData.length,
  vaginales: filteredData.filter(i => i.tipoParto?.toUpperCase().includes('VAGINAL')).length,
  cesareas: filteredData.filter(i => i.tipoParto?.toUpperCase().includes('CES')).length,
  cesareasElectivas: filteredData.filter(i => i.tipoParto?.toUpperCase().includes('CES ELE')).length,
  cesareasUrgentes: filteredData.filter(i => i.tipoParto?.toUpperCase().includes('CES URG')).length,
  primiparas: filteredData.filter(i => i.paridad?.toUpperCase().includes('PRIMIPARA')).length,
  multiparas: filteredData.filter(i => i.paridad?.toUpperCase().includes('MULTIPARA')).length
}, null, 2)}

Genera un reporte ejecutivo con el siguiente formato:

**REPORTE EJECUTIVO - ${periodLabel.toUpperCase()}**

**1. RESUMEN EJECUTIVO**
[2-3 párrafos con los hallazgos principales]

**2. INDICADORES CLAVE**
- Total de partos: [número]
- Tasa de cesáreas: [%]
- Tasa de partos vaginales: [%]
- Distribución por paridad: [datos]
- Otros indicadores relevantes

**3. ANÁLISIS DE TENDENCIAS**
[Análisis de tendencias observadas]

**4. COMPARACIÓN CON ESTÁNDARES**
[Comparación con estándares de la OMS]

**5. HALLAZGOS PRINCIPALES**
- [Hallazgo 1]
- [Hallazgo 2]
- [Hallazgo 3]

**6. RECOMENDACIONES**
- [Recomendación 1]
- [Recomendación 2]
- [Recomendación 3]

**7. CONCLUSIÓN**
[Párrafo conclusivo]

Responde en español de forma profesional y técnica.`

      const generatedReport = await analyzeDataWithAI(filteredData, prompt)
      setReport(generatedReport)
    } catch (err) {
      console.error('Error generando reporte:', err)
      setError('No se pudo generar el reporte. Intenta nuevamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadReport = () => {
    if (!report) return
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-partos-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      className="report-generator"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="report-header">
        <h3>📄 Generador de Reportes</h3>
        <div className="report-controls">
          <select 
            className="report-type-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            disabled={isGenerating}
          >
            <option value="monthly">Mes Actual</option>
            <option value="all">Todos los Períodos</option>
          </select>
          <button 
            className="generate-report-btn"
            onClick={generateReport}
            disabled={isGenerating}
          >
            {isGenerating ? '🔄 Generando...' : '📊 Generar Reporte'}
          </button>
          {report && (
            <button 
              className="download-report-btn"
              onClick={downloadReport}
            >
              💾 Descargar
            </button>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <p>Generando reporte ejecutivo...</p>
        </div>
      )}

      {error && (
        <div className="report-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {report && !isGenerating && (
        <motion.div
          className="report-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div 
            className="report-text"
            dangerouslySetInnerHTML={{ __html: formatReport(report) }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

function formatReport(text) {
  // Dividir párrafos largos
  let html = text
  const paragraphs = html.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
  let processed = []
  
  paragraphs.forEach(para => {
    const trimmed = para.trim()
    
    if (trimmed.match(/^\*\*\d+\.\s+[^*]+\*\*$/i)) {
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
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="report-bold">$1</strong>')
  
  // Procesar secciones numeradas
  html = html.replace(/\*\*(\d+)\.\s+([^*]+?)\*\*/g, '</div><div class="report-section"><h4 class="report-section-title">$1. $2</h4>')
  
  html = html.replace(/^/, '<div class="report-section">')
  html += '</div>'
  
  // Procesar párrafos y listas
  const finalLines = html.split('\n')
  let result = []
  let currentList = []
  
  finalLines.forEach(line => {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('-')) {
      currentList.push(`<li class="report-item">${trimmed.substring(1).trim()}</li>`)
    } else {
      if (currentList.length > 0) {
        result.push(`<ul class="report-list">${currentList.join('')}</ul>`)
        currentList = []
      }
      
      if (!trimmed) {
        result.push('<div class="report-spacer"></div>')
      } else if (trimmed.startsWith('<div') || trimmed.startsWith('<h4') || trimmed.startsWith('</div')) {
        result.push(trimmed)
      } else {
        result.push(`<p class="report-paragraph">${trimmed}</p>`)
      }
    }
  })
  
  if (currentList.length > 0) {
    result.push(`<ul class="report-list">${currentList.join('')}</ul>`)
  }
  
  return result.join('\n')
}

export default ReportGenerator

