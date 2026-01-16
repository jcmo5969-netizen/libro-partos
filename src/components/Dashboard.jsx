import React, { useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import DashboardInsights from './DashboardInsights'
import ComparativeAnalysis from './ComparativeAnalysis'
import PeriodRecommendations from './PeriodRecommendations'
import DataVisualizer from './DataVisualizer'
import './Dashboard.css'

function Dashboard({ data, onFilterChange }) {
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedKPI, setSelectedKPI] = useState(null)
  const cardRefs = useRef({})

  // Filtrar datos por mes si hay un mes seleccionado
  const filteredDataByMonth = useMemo(() => {
    if (selectedMonth === 'all') return data
    
    const monthNumber = parseInt(selectedMonth)
    if (isNaN(monthNumber)) return data
    
    return data.filter(item => {
      // Usar mesParto si está disponible (más eficiente)
      if (item.mesParto !== undefined && item.mesParto !== null) {
        return item.mesParto === monthNumber
      }
      
      // Fallback: parsear desde fechaParto
      if (!item.fechaParto) return false
      
      // La fecha está en formato M/D/YYYY o MM/DD/YYYY
      const dateParts = item.fechaParto.split('/')
      if (dateParts.length !== 3) return false
      
      // Validar que el mes sea válido (1-12)
      const month = parseInt(dateParts[0])
      if (isNaN(month) || month < 1 || month > 12) {
        console.warn(`Fecha inválida: ${item.fechaParto}`)
        return false
      }
      
      return month === monthNumber
    })
  }, [data, selectedMonth])

  const stats = useMemo(() => {
    const dataToUse = filteredDataByMonth
    
    // Si no hay datos, retornar estadísticas con valores en 0
    if (!dataToUse || dataToUse.length === 0) {
      console.log('Dashboard: No hay datos disponibles, mostrando 0 en todos los KPIs')
      return {
        total: 0,
        totales: 0,
        vaginales: 0,
        cesareasElectivas: 0,
        cesareasUrgentes: 0,
        extrahospitalarios: 0,
        primiparas: 0,
        multiparas: 0,
        conPlanParto: 0,
        conInduccion: 0
      }
    }

    console.log(`Dashboard: Procesando ${dataToUse.length} registros`)
    const total = dataToUse.length
    
    // Tipos de parto - usando nombres exactos (case-insensitive)
    const vaginales = dataToUse.filter(item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase().trim() : ''
      return tipo.includes('VAGINAL')
    }).length
    
    const cesareasElectivas = dataToUse.filter(item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase().trim() : ''
      return tipo.includes('CES ELE') || tipo === 'CES ELE'
    }).length
    
    const cesareasUrgentes = dataToUse.filter(item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase().trim() : ''
      return tipo.includes('CES URG') || tipo === 'CES URG'
    }).length
    
    const extrahospitalarios = dataToUse.filter(item => {
      const tipo = item.tipoParto ? String(item.tipoParto).toUpperCase().trim() : ''
      return tipo.includes('EXTRAHOSPITALARIO')
    }).length
    
    // Paridad - usando nombres exactos (case-insensitive)
    const primiparas = dataToUse.filter(item => {
      const paridad = item.paridad ? String(item.paridad).toUpperCase().trim() : ''
      return paridad.includes('PRIMIPARA') || paridad === 'PRIMIPARA'
    }).length
    
    const multiparas = dataToUse.filter(item => {
      const paridad = item.paridad ? String(item.paridad).toUpperCase().trim() : ''
      return paridad.includes('MULTIPARA') || paridad === 'MULTIPARA'
    }).length
    
    // Plan de parto y otros - manejar valores numéricos (1 = SI, 0 = NO) y strings
    const conPlanParto = dataToUse.filter(item => {
      if (typeof item.planDeParto === 'number') {
        return item.planDeParto === 1
      }
      const plan = item.planDeParto ? String(item.planDeParto).toUpperCase().trim() : ''
      return plan === 'SI' || plan === 'SÍ' || plan === '1'
    }).length
    
    const conInduccion = dataToUse.filter(item => {
      if (typeof item.induccion === 'number') {
        return item.induccion === 1
      }
      const ind = item.induccion ? String(item.induccion).toUpperCase().trim() : ''
      return ind === 'SI' || ind === 'SÍ' || ind === '1'
    }).length

    return {
      total,
      totales: total,
      vaginales,
      cesareasElectivas,
      cesareasUrgentes,
      extrahospitalarios,
      primiparas,
      multiparas,
      conPlanParto,
      conInduccion
    }
  }, [filteredDataByMonth])

  // stats siempre debe existir ahora (nunca será null)
  if (!stats) {
    // Fallback por si acaso
    return (
      <div className="dashboard-container">
        <div className="loading-message">Cargando estadísticas...</div>
      </div>
    )
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.4,
        ease: "easeOut"
      }
    })
  }

  const handleCardClick = (cardLabel, cardIndex) => {
    const card = cards[cardIndex]
    console.log('handleCardClick llamado con:', cardLabel, 'index:', cardIndex, 'clickable:', card?.clickable);
    
    // Verificar que la tarjeta existe y coincide
    if (!card || card.label !== cardLabel) {
      console.log('Tarjeta no coincide, ignorando click');
      return;
    }
    
    // Si la tarjeta no es clickeable, no hacer nada
    if (!card.clickable) {
      console.log('Tarjeta no es clickeable, ignorando click');
      return;
    }
    
    if (onFilterChange) {
      let filter = {}
      
      switch (card.label) {
        case 'TOTAL PARTOS':
          filter = {} // Sin filtro para mostrar todos los partos
          break
        case 'PARTOS VAGINALES':
          filter = { tipoParto: 'VAGINAL' }
          break
        case 'CESÁREAS ELECTIVAS':
          filter = { tipoParto: 'CES ELE' }
          break
        case 'CESÁREAS URGENTES':
          filter = { tipoParto: 'CES URG' }
          break
        case 'EXTRAHOSPITALARIOS':
          filter = { tipoParto: 'EXTRAHOSPITALARIO' }
          break
        case 'PRIMÍPARAS':
          filter = { paridad: 'PRIMIPARA' }
          break
        case 'MULTÍPARAS':
          filter = { paridad: 'MULTIPARA' }
          break
        case 'CON PLAN DE PARTO':
          filter = { planDeParto: 'SI' }
          break
        case 'CON INDUCCIÓN':
          filter = { induccion: 'SI' }
          break
        default:
          filter = {} // Sin filtro por defecto
      }
      
      // Si hay un mes seleccionado, agregarlo al filtro
      if (selectedMonth !== 'all') {
        filter.mes = selectedMonth
      }
      
      console.log('Filtro aplicado para:', card.label, filter)
      onFilterChange(filter)
      
      // Establecer KPI seleccionado para mostrar insights
      setSelectedKPI({
        label: card.label,
        value: card.value,
        filter: filter
      })
    }
  }

  const handleMonthChange = (event) => {
    const month = event.target.value
    console.log('Mes seleccionado:', month)
    setSelectedMonth(month)
    
    // Si hay un callback de filtro, aplicar el filtro de mes (solo visual, no cambia a tabla)
    if (onFilterChange) {
      const filter = month === 'all' ? {} : { mes: month }
      console.log('Filtro de mes aplicado:', filter)
      onFilterChange(filter)
    }
  }

  // Calcular porcentajes para mostrar en las tarjetas
  const totalPartos = stats.total || 1 // Evitar división por cero
  
  const cards = [
    { 
      label: 'TOTAL PARTOS', 
      value: stats.total, 
      icon: '👶',
      gradient: 'linear-gradient(135deg, #ff6b9d, #ff8fb3)',
      iconBg: 'rgba(255, 107, 157, 0.15)',
      hasDropdown: true,
      percentage: null,
      clickable: true,
      trend: null
    },
    { 
      label: 'PARTOS VAGINALES', 
      value: stats.vaginales, 
      icon: '💚',
      gradient: 'linear-gradient(135deg, #4caf50, #66bb6a)',
      iconBg: 'rgba(76, 175, 80, 0.15)',
      percentage: totalPartos > 0 ? ((stats.vaginales / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'positive'
    },
    { 
      label: 'CESÁREAS ELECTIVAS', 
      value: stats.cesareasElectivas, 
      icon: '🩺',
      gradient: 'linear-gradient(135deg, #ff9800, #ffb74d)',
      iconBg: 'rgba(255, 152, 0, 0.15)',
      percentage: totalPartos > 0 ? ((stats.cesareasElectivas / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'neutral'
    },
    { 
      label: 'CESÁREAS URGENTES', 
      value: stats.cesareasUrgentes, 
      icon: '⚠️',
      gradient: 'linear-gradient(135deg, #f44336, #e57373)',
      iconBg: 'rgba(244, 67, 54, 0.15)',
      percentage: totalPartos > 0 ? ((stats.cesareasUrgentes / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'attention'
    },
    { 
      label: 'EXTRAHOSPITALARIOS', 
      value: stats.extrahospitalarios, 
      icon: '🏥',
      gradient: 'linear-gradient(135deg, #2196f3, #64b5f6)',
      iconBg: 'rgba(33, 150, 243, 0.15)',
      percentage: totalPartos > 0 ? ((stats.extrahospitalarios / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'neutral'
    },
    { 
      label: 'PRIMÍPARAS', 
      value: stats.primiparas, 
      icon: '👩',
      gradient: 'linear-gradient(135deg, #9c27b0, #ba68c8)',
      iconBg: 'rgba(156, 39, 176, 0.15)',
      percentage: totalPartos > 0 ? ((stats.primiparas / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'positive'
    },
    { 
      label: 'MULTÍPARAS', 
      value: stats.multiparas, 
      icon: '👨‍👩‍👧',
      gradient: 'linear-gradient(135deg, #e91e63, #f06292)',
      iconBg: 'rgba(233, 30, 99, 0.15)',
      percentage: totalPartos > 0 ? ((stats.multiparas / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'positive'
    },
    { 
      label: 'CON PLAN DE PARTO', 
      value: stats.conPlanParto, 
      icon: '📋',
      gradient: 'linear-gradient(135deg, #00bcd4, #4dd0e1)',
      iconBg: 'rgba(0, 188, 212, 0.15)',
      percentage: totalPartos > 0 ? ((stats.conPlanParto / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'positive'
    },
    { 
      label: 'CON INDUCCIÓN', 
      value: stats.conInduccion, 
      icon: '💉',
      gradient: 'linear-gradient(135deg, #ff5722, #ff8a65)',
      iconBg: 'rgba(255, 87, 34, 0.15)',
      percentage: totalPartos > 0 ? ((stats.conInduccion / totalPartos) * 100).toFixed(1) : '0',
      clickable: true,
      trend: 'neutral'
    }
  ]

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        {cards.map((card, index) => (
          <motion.div
            key={`card-${index}-${card.label}`}
            ref={(el) => {
              if (el) {
                cardRefs.current[card.label] = el;
              }
            }}
            className={`dashboard-card ${card.clickable ? 'clickable' : ''}`}
            data-card-label={card.label}
            data-card-index={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={index}
            whileHover={card.clickable ? { 
              scale: 1.05, 
              y: -8,
              boxShadow: '0 12px 40px rgba(255, 182, 193, 0.5)',
              cursor: 'pointer'
            } : {
              scale: 1.03, 
              y: -5,
              boxShadow: '0 12px 40px rgba(255, 182, 193, 0.4)'
            }}
            onClick={(e) => {
              // Verificar que el click realmente ocurrió en esta tarjeta
              const clickedElement = e.target;
              const cardElement = e.currentTarget;
              
              // Verificar que el elemento clickeado está dentro de esta tarjeta
              if (!cardElement.contains(clickedElement) && clickedElement !== cardElement) {
                console.log('Click fuera de la tarjeta, ignorando');
                return;
              }
              
              e.stopPropagation();
              e.preventDefault();
              
              // Usar el card del map directamente, no del DOM
              const cardFromMap = cards[index];
              
              console.log('Click detectado en tarjeta:', {
                cardFromMapLabel: cardFromMap?.label,
                cardFromMapIndex: index,
                cardFromMapClickable: cardFromMap?.clickable,
                eventTarget: clickedElement?.className,
                currentTarget: cardElement?.getAttribute('data-card-label'),
                mouseX: e.clientX,
                mouseY: e.clientY
              });
              
              // Verificar que la tarjeta del map es clickeable
              if (cardFromMap && cardFromMap.clickable) {
                // Usar directamente el índice del map, no del DOM
                handleCardClick(cardFromMap.label, index);
              } else {
                console.log('Click ignorado - tarjeta no clickeable');
              }
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              const target = e.currentTarget;
              // Solo cambiar z-index si la tarjeta es clickeable
              if (card.clickable) {
                target.style.zIndex = '10';
                // Asegurar que otras tarjetas vuelvan a z-index 1
                const allCards = document.querySelectorAll('.dashboard-card');
                allCards.forEach(c => {
                  if (c !== target) {
                    c.style.zIndex = '1';
                  }
                });
              } else {
                // Tarjetas no clickeables mantienen z-index bajo
                target.style.zIndex = '1';
              }
            }}
            onMouseLeave={(e) => {
              e.stopPropagation();
              e.currentTarget.style.zIndex = '1';
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            style={{ 
              '--card-gradient': card.gradient,
              '--card-icon-bg': card.iconBg
            }}
          >
            <div 
              className="card-header"
              onClick={(e) => {
                if (!card.clickable) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
              onMouseDown={(e) => {
                if (!card.clickable) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
            >
              <div 
                className="card-icon-wrapper" 
                style={{ background: card.iconBg }}
                onClick={(e) => {
                  if (!card.clickable) {
                    e.stopPropagation();
                    e.preventDefault();
                  }
                }}
              >
                <motion.div 
                  className="card-icon"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1, type: "spring", stiffness: 200 }}
                  onClick={(e) => {
                    if (!card.clickable) {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                  }}
                >
                  {card.icon}
                </motion.div>
                <div className="card-icon-glow" style={{ background: card.gradient }}></div>
              </div>
              {card.percentage !== null && (
                <motion.div 
                  className="card-percentage"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                >
                  <span className="percentage-value">{card.percentage}%</span>
                  <div className="percentage-badge"></div>
                </motion.div>
              )}
            </div>
            <div 
              className="card-content"
              onClick={(e) => {
                if (!card.clickable) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
              onMouseDown={(e) => {
                if (!card.clickable) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
            >
              <motion.div 
                className="card-value-wrapper"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.12 }}
              >
                <div className="card-value" style={{ background: card.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {card.value.toLocaleString('es-CL')}
                </div>
                <div className="card-value-shadow" style={{ background: card.gradient }}></div>
              </motion.div>
              <motion.div 
                className="card-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.18 }}
              >
                {card.label}
              </motion.div>
              {card.percentage !== null && (
                <div className="card-progress-container">
                  <div className="card-progress-bar">
                    <motion.div 
                      className="card-progress-fill"
                      style={{ background: card.gradient }}
                      initial={{ width: 0 }}
                      animate={{ width: `${card.percentage}%` }}
                      transition={{ duration: 1.5, delay: index * 0.15, ease: "easeOut" }}
                    />
                    <motion.div 
                      className="card-progress-glow"
                      style={{ background: card.gradient }}
                      initial={{ width: 0 }}
                      animate={{ width: `${card.percentage}%` }}
                      transition={{ duration: 1.5, delay: index * 0.15, ease: "easeOut" }}
                    />
                  </div>
                  <motion.div 
                    className="card-progress-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                  >
                    {card.percentage}% del total
                  </motion.div>
                </div>
              )}
              {card.trend && (
                <motion.div 
                  className={`card-trend card-trend-${card.trend}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                >
                  {card.trend === 'positive' && '📈 Tendencia positiva'}
                  {card.trend === 'attention' && '⚠️ Requiere atención'}
                  {card.trend === 'neutral' && '➡️ Estable'}
                </motion.div>
              )}
            </div>
            {card.hasDropdown && (
              <div 
                className="card-dropdown"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <select 
                  className="dropdown-select"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <option value="all">Todos los meses</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Componente de Insights Inteligentes */}
      <DashboardInsights 
        data={data} 
        selectedKPI={selectedKPI}
        selectedMonth={selectedMonth}
      />
      
      {/* Análisis Comparativo */}
      <ComparativeAnalysis data={data} selectedMonth={selectedMonth} />
      
      {/* Recomendaciones Personalizadas por Período */}
      <PeriodRecommendations data={data} selectedMonth={selectedMonth} />
      
      {/* Visualizador de Datos con Gráficos */}
      <DataVisualizer data={data} />
    </div>
  )
}

export default Dashboard

