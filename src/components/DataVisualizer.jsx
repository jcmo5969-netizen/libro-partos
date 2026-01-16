import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import './DataVisualizer.css'

function DataVisualizer({ data }) {
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [chartType, setChartType] = useState('bar')

  // Obtener años únicos de los datos
  const availableYears = useMemo(() => {
    const years = new Set()
    data.forEach(item => {
      if (item.fechaParto) {
        const dateParts = item.fechaParto.split('/')
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[2])
          if (!isNaN(year) && year >= 2000 && year <= 2100) {
            years.add(year)
          }
        }
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [data])

  // Filtrar datos según mes y año seleccionados
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Filtro por mes
      if (selectedMonth !== 'all') {
        const monthNumber = parseInt(selectedMonth)
        const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
        if (month !== monthNumber) return false
      }

      // Filtro por año
      if (selectedYear !== 'all') {
        const yearNumber = parseInt(selectedYear)
        if (item.fechaParto) {
          const dateParts = item.fechaParto.split('/')
          if (dateParts.length === 3) {
            const year = parseInt(dateParts[2])
            if (year !== yearNumber) return false
          }
        } else {
          return false
        }
      }

      return true
    })
  }, [data, selectedMonth, selectedYear])

  // Preparar datos para gráficos
  const chartData = useMemo(() => {
    // Datos por tipo de parto
    const tipoPartoData = {}
    filteredData.forEach(item => {
      const tipo = item.tipoParto?.toUpperCase() || 'DESCONOCIDO'
      if (tipo.includes('VAGINAL')) {
        tipoPartoData['Vaginal'] = (tipoPartoData['Vaginal'] || 0) + 1
      } else if (tipo.includes('CES ELE')) {
        tipoPartoData['Cesárea Electiva'] = (tipoPartoData['Cesárea Electiva'] || 0) + 1
      } else if (tipo.includes('CES URG')) {
        tipoPartoData['Cesárea Urgente'] = (tipoPartoData['Cesárea Urgente'] || 0) + 1
      } else if (tipo.includes('EXTRAHOSPITALARIO')) {
        tipoPartoData['Extrahospitalario'] = (tipoPartoData['Extrahospitalario'] || 0) + 1
      }
    })

    // Datos por paridad
    const paridadData = {}
    filteredData.forEach(item => {
      const paridad = item.paridad?.toUpperCase() || 'DESCONOCIDO'
      if (paridad.includes('PRIMIPARA')) {
        paridadData['Primípara'] = (paridadData['Primípara'] || 0) + 1
      } else if (paridad.includes('MULTIPARA')) {
        paridadData['Multípara'] = (paridadData['Multípara'] || 0) + 1
      }
    })

    // Datos por sexo
    const sexoData = {}
    filteredData.forEach(item => {
      const sexo = item.sexo?.toUpperCase() || 'DESCONOCIDO'
      if (sexo === 'FEMENINO' || sexo === 'MASCULINO' || sexo === 'INDETERMINADO') {
        sexoData[sexo] = (sexoData[sexo] || 0) + 1
      }
    })

    // Datos por edad materna
    const edadData = {}
    filteredData.forEach(item => {
      const edad = item.edad ? parseInt(item.edad) : null
      if (edad) {
        const grupo = edad < 25 ? '< 25' : edad < 30 ? '25-29' : edad < 35 ? '30-34' : edad < 40 ? '35-39' : '≥ 40'
        edadData[grupo] = (edadData[grupo] || 0) + 1
      }
    })

    // Datos por mes (para línea de tendencia)
    const monthlyData = {}
    filteredData.forEach(item => {
      const month = item.mesParto || (item.fechaParto ? parseInt(item.fechaParto.split('/')[0]) : null)
      if (month) {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const monthName = monthNames[month - 1]
        if (monthName) {
          monthlyData[monthName] = (monthlyData[monthName] || 0) + 1
        }
      }
    })

    return {
      tipoParto: Object.entries(tipoPartoData).map(([name, value]) => ({ name, value })),
      paridad: Object.entries(paridadData).map(([name, value]) => ({ name, value })),
      sexo: Object.entries(sexoData).map(([name, value]) => ({ name, value })),
      edad: Object.entries(edadData)
        .sort((a, b) => {
          const order = ['< 25', '25-29', '30-34', '35-39', '≥ 40']
          return order.indexOf(a[0]) - order.indexOf(b[0])
        })
        .map(([name, value]) => ({ name, value })),
      mensual: Object.entries(monthlyData)
        .sort((a, b) => {
          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          return monthNames.indexOf(a[0]) - monthNames.indexOf(b[0])
        })
        .map(([name, value]) => ({ name, value }))
    }
  }, [filteredData])

  const colors = [
    '#ff6b9d', '#ff8fb3', '#ffa8c4', '#ffb6c1', '#ffc0cb',
    '#ffd1dc', '#ffe0e6', '#d81b60', '#c2185b', '#ad1457'
  ]

  return (
    <motion.div
      className="data-visualizer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="visualizer-header">
        <h3>📊 Visualizador de Datos</h3>
        <div className="visualizer-filters">
          <select
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all">Todos los años</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
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
      </div>

      <div className="visualizer-stats">
        <div className="stat-badge">
          <span className="stat-label">Total de Registros</span>
          <span className="stat-value">{filteredData.length}</span>
        </div>
      </div>

      <div className="charts-grid">
        {/* Gráfico de Tipo de Parto */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="chart-title">📈 Distribución por Tipo de Parto</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.tipoParto}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 182, 193, 0.2)" />
              <XAxis dataKey="name" stroke="#c2185b" />
              <YAxis stroke="#c2185b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid rgba(255, 182, 193, 0.5)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#ff6b9d">
                {chartData.tipoParto.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Paridad */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h4 className="chart-title">👩 Distribución por Paridad</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.paridad}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.paridad.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid rgba(255, 182, 193, 0.5)',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Sexo */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h4 className="chart-title">👶 Distribución por Sexo</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.sexo}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.sexo.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid rgba(255, 182, 193, 0.5)',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Edad Materna */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h4 className="chart-title">📅 Distribución por Edad Materna</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.edad}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 182, 193, 0.2)" />
              <XAxis dataKey="name" stroke="#c2185b" />
              <YAxis stroke="#c2185b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid rgba(255, 182, 193, 0.5)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#ff8fb3">
                {chartData.edad.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gráfico de Tendencia Mensual */}
        {chartData.mensual.length > 0 && (
          <motion.div
            className="chart-card chart-card-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h4 className="chart-title">📊 Tendencia Mensual</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.mensual}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 182, 193, 0.2)" />
                <XAxis dataKey="name" stroke="#c2185b" />
                <YAxis stroke="#c2185b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '2px solid rgba(255, 182, 193, 0.5)',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#ff6b9d"
                  strokeWidth={3}
                  dot={{ fill: '#ff6b9d', r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default DataVisualizer



