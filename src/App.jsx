import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Login from './components/Login'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Tabla from './components/Tabla'
import REM from './components/REM'
import NuevoParto from './components/NuevoParto'
import EditarParto from './components/EditarParto'
import NotificationSystem from './components/NotificationSystem'
import GestionUsuarios from './components/GestionUsuarios'
import { checkAlerts } from './utils/dataParser'
import { getPartos, createParto, updateParto, deleteParto, checkApiHealth } from './services/apiService'
import { isAuthenticated, verifyToken, isAdmin } from './services/authService'
import './App.css'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [showNuevoParto, setShowNuevoParto] = useState(false)
  const [editingParto, setEditingParto] = useState(null)
  const [filter, setFilter] = useState({})
  const [alerts, setAlerts] = useState([])

  // Verificar autenticación al iniciar
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        const user = await verifyToken()
        if (user) {
          setAuthenticated(true)
        } else {
          setAuthenticated(false)
        }
      } else {
        setAuthenticated(false)
      }
      setCheckingAuth(false)
    }
    checkAuth()
  }, [])

  // Cargar datos cuando el usuario esté autenticado
  useEffect(() => {
    if (!authenticated) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        setApiError(null)
        
        // Intentar cargar desde la API primero
        console.log('🔄 Intentando cargar datos desde la API...')
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        console.log(`📡 URL de API configurada: ${API_URL}`)
        
        try {
          // Cargar datos desde la API
          const partos = await getPartos({ limit: 10000 }) // Obtener todos los partos
          console.log(`✅ Datos cargados desde API: ${partos.length} registros`)
          setData(partos)
          
          // Verificar alertas
          const detectedAlerts = checkAlerts(partos)
          setAlerts(detectedAlerts)
          return // Éxito, salir de la función
        } catch (apiError) {
          console.error('❌ Error cargando desde API:', apiError)
          console.warn('⚠️ API no disponible, intentando cargar desde archivo como fallback...')
          
          // Fallback: intentar cargar desde archivo si la API no está disponible
          try {
            const response = await fetch('/datos.txt')
            if (response.ok) {
              const text = await response.text()
              const { parseData } = await import('./utils/dataParser')
              const parsedData = parseData(text)
              console.log(`⚠️ Datos cargados desde archivo (fallback): ${parsedData.length} registros`)
              setData(parsedData)
              const detectedAlerts = checkAlerts(parsedData)
              setAlerts(detectedAlerts)
              setApiError(`⚠️ API no disponible (${apiError.message}). Usando datos del archivo local.`)
              
              // Agregar alerta informativa
              setAlerts(prev => [{
                type: 'warning',
                title: '⚠️ Modo Fallback Activo',
                message: `No se pudo conectar con la API (${API_URL}). Los datos se están cargando desde el archivo local. Asegúrate de que el servidor backend esté ejecutándose en el puerto 5000.`
              }, ...prev])
              return
            }
          } catch (fileError) {
            console.error('❌ Error cargando archivo:', fileError)
          }
          
          // Si ambos fallan, lanzar error
          throw new Error(`No se pudo conectar con la API (${apiError.message}) ni cargar datos del archivo`)
        }
      } catch (error) {
        console.error('❌ Error cargando datos:', error)
        setApiError(error.message || 'Error al cargar los datos')
        setAlerts([{
          type: 'error',
          title: '❌ Error de Conexión',
          message: `No se pudieron cargar los datos. Verifica que el servidor backend esté ejecutándose en http://localhost:5000`
        }])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [authenticated])

  const handleLoginSuccess = () => {
    setAuthenticated(true)
    setCurrentView('dashboard') // Asegurar que la vista por defecto sea el dashboard
  }

  const handleLogout = () => {
    setAuthenticated(false)
    setData([])
    setAlerts([])
  }

  // Manejar nuevo parto
  const handleNuevoParto = () => {
    setShowNuevoParto(true)
    }
    
  const handleSaveParto = async (newParto) => {
    try {
      console.log('💾 Guardando nuevo parto...')
      const savedParto = await createParto(newParto)
      console.log('✅ Parto guardado exitosamente:', savedParto.id || savedParto._traceId)
      setData([...data, savedParto])
      setShowNuevoParto(false)
      // Actualizar alertas
      const updatedAlerts = checkAlerts([...data, savedParto])
      setAlerts(updatedAlerts)
    } catch (error) {
      console.error('❌ Error guardando parto:', error)
      const errorMessage = error.message || 'No se pudo guardar el parto'
      console.error('📋 Mensaje de error completo:', errorMessage)
      setAlerts([{
        type: 'error',
        title: 'Error al Guardar',
        message: errorMessage
      }])
      // No cerrar el modal si hay error, para que el usuario pueda corregir
    }
        }

  const handleCloseNuevoParto = () => {
    setShowNuevoParto(false)
  }

  // Manejar edición
  const handleEdit = (parto) => {
    setEditingParto(parto)
  }

  const handleSaveEdit = async (updatedParto) => {
    try {
      const id = updatedParto.id || updatedParto._traceId
      const savedParto = await updateParto(id, updatedParto)
      const updatedData = data.map(item => 
        (item.id === savedParto.id || item._traceId === savedParto._traceId) ? savedParto : item
      )
      setData(updatedData)
      setEditingParto(null)
      // Actualizar alertas
      const updatedAlerts = checkAlerts(updatedData)
      setAlerts(updatedAlerts)
    } catch (error) {
      console.error('Error actualizando parto:', error)
      setAlerts([{
        type: 'error',
        title: 'Error al Actualizar',
        message: error.message || 'No se pudo actualizar el parto'
      }])
    }
  }

  const handleCloseEdit = () => {
    setEditingParto(null)
    }
    
  // Manejar eliminación
  const handleDelete = async (traceId) => {
    try {
      await deleteParto(traceId)
      const updatedData = data.filter(item => item._traceId !== traceId && item.id !== traceId)
      setData(updatedData)
      // Actualizar alertas
      const updatedAlerts = checkAlerts(updatedData)
      setAlerts(updatedAlerts)
    } catch (error) {
      console.error('Error eliminando parto:', error)
      setAlerts([{
        type: 'error',
        title: 'Error al Eliminar',
        message: error.message || 'No se pudo eliminar el parto'
      }])
    }
  }

  // Manejar filtros del dashboard
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
  }

  const handleClearFilter = () => {
    setFilter({})
  }

  // Mostrar login si no está autenticado
  if (checkingAuth) {
    return (
      <div className="loading-container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loading-spinner"
        >
          <div className="spinner"></div>
          <p>Verificando sesión...</p>
        </motion.div>
      </div>
    )
  }

  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="loading-spinner"
        >
          <div className="spinner"></div>
          <p>Cargando datos...</p>
          {apiError && <p style={{ color: '#f44336', marginTop: '10px' }}>{apiError}</p>}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="App">
      <Header onNuevoParto={handleNuevoParto} onLogout={handleLogout} />
      
      <NotificationSystem notifications={alerts} />
      
      <main className="main-content">
        <div className="view-selector">
          <motion.button
            className={currentView === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentView('dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Dashboard
          </motion.button>
          <motion.button
            className={currentView === 'tabla' ? 'active' : ''}
            onClick={() => setCurrentView('tabla')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Tabla
          </motion.button>
            <motion.button
            className={currentView === 'rem' ? 'active' : ''}
            onClick={() => setCurrentView('rem')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
            REM
            </motion.button>
            {isAdmin() && (
              <motion.button
                className={currentView === 'usuarios' ? 'active' : ''}
                onClick={() => setCurrentView('usuarios')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Usuarios
              </motion.button>
            )}
      </div>

        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {currentView === 'dashboard' && (
            <Dashboard 
              data={data} 
              onFilterChange={handleFilterChange}
            />
          )}
          
          {currentView === 'tabla' && (
            <Tabla 
              data={data}
              onDelete={handleDelete}
              onEdit={handleEdit}
              filter={filter}
              onClearFilter={handleClearFilter}
            />
          )}
          
          {currentView === 'rem' && (
            <REM data={data} />
          )}
          
          {currentView === 'usuarios' && isAdmin() && (
            <GestionUsuarios />
          )}
        </motion.div>
      </main>
      
      {showNuevoParto && (
        <NuevoParto
          onClose={handleCloseNuevoParto}
          onSave={handleSaveParto}
          data={data}
        />
      )}

      {editingParto && (
        <EditarParto
          partoData={editingParto}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
          data={data}
        />
      )}
    </div>
  )
}

export default App
