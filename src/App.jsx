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
import { getPartos, getAllPartos, createParto, updateParto, deleteParto, checkApiHealth, mergePartoAfterUpdate } from './services/apiService'
import {
  isAuthenticated,
  verifyToken,
  isAdmin,
  getUser,
  getUserDisplayName,
  puedeEditarParto,
  puedeEliminarParto,
} from './services/authService'
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
  const [notificationLog, setNotificationLog] = useState([])

  const addErrorToLog = (title, message) => {
    const entry = { type: 'error', title, message, time: new Date().toLocaleString() }
    setNotificationLog(prev => [...prev.slice(-99), entry])
  }

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

  // Cuando el token expira (ej. al guardar), cerrar sesión y volver a login
  useEffect(() => {
    const handler = () => setAuthenticated(false)
    window.addEventListener('auth:token-expired', handler)
    return () => window.removeEventListener('auth:token-expired', handler)
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
          // Cargar TODOS los partos (paginando por lotes, sin tope que recorte registros)
          const partos = await getAllPartos()
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
        const errMsg = `No se pudieron cargar los datos. Verifica que el servidor backend esté ejecutándose.`
        setAlerts([{ type: 'error', title: '❌ Error de Conexión', message: errMsg }])
        addErrorToLog('Error de Conexión', errMsg)
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
      const user = getUser()
      const nombreResp = getUserDisplayName()
      const payload = {
        ...newParto,
        registradoPor: nombreResp || user?.username,
        registradoPorUsername: user?.username || undefined,
      }
      console.log('💾 Guardando nuevo parto...')
      const savedParto = await createParto(payload)
      const merged = mergePartoAfterUpdate(payload, savedParto)
      console.log('✅ Parto guardado exitosamente:', merged.id || merged._traceId)
      setData([...data, merged])
      setShowNuevoParto(false)
      const systemAlerts = checkAlerts([...data, merged])
      setAlerts([
        {
          type: 'success',
          title: 'Parto guardado',
          message: `Registro cargado correctamente. Responsable del llenado: ${nombreResp || user?.username || '—'}.`,
        },
        ...systemAlerts,
      ])
    } catch (error) {
      console.error('❌ Error guardando parto:', error)
      const errorMessage = error.message || 'No se pudo guardar el parto'
      console.error('📋 Mensaje de error completo:', errorMessage)
      setAlerts([{ type: 'error', title: 'Error al Guardar', message: errorMessage }])
      addErrorToLog('Error al Guardar', errorMessage)
    }
  }

  const handleCloseNuevoParto = () => {
    setShowNuevoParto(false)
  }

  // Manejar edición
  const handleEdit = (parto) => {
    if (!puedeEditarParto(parto)) {
      setAlerts([
        {
          type: 'warning',
          title: 'Sin permiso',
          message: 'Solo puede editar los partos registrados con su usuario. Consulte a un administrador.',
        },
      ])
      return
    }
    setEditingParto(parto)
  }

  const handleSaveEdit = async (updatedParto) => {
    if (!puedeEditarParto(updatedParto)) {
      setAlerts([
        {
          type: 'warning',
          title: 'Sin permiso',
          message: 'No tiene permiso para guardar cambios en este registro.',
        },
      ])
      return
    }
    const idToUpdate = updatedParto._traceId || updatedParto.id
    const findItemIndex = () => {
      if (idToUpdate != null && idToUpdate !== '') {
        const idx = data.findIndex(
          item =>
            (item._traceId != null && item._traceId === idToUpdate) ||
            (item.id != null && String(item.id) === String(idToUpdate))
        )
        if (idx >= 0) return idx
      }
      const fechaA = (updatedParto.fechaParto || updatedParto.fecha || '').toString().trim()
      const rutA = (updatedParto.rut || '').toString().trim()
      const numeroA = (updatedParto.numero || '').toString().trim()
      return data.findIndex(item => {
        const fechaB = (item.fechaParto || item.fecha || '').toString().trim()
        const rutB = (item.rut || '').toString().trim()
        const numeroB = (item.numero || item.correlativo || '').toString().trim()
        return (numeroA && numeroB && numeroA === numeroB) || (fechaA && rutA && fechaA === fechaB && rutA === rutB)
      })
    }

    try {
      const user = getUser()
      const payload = {
        ...updatedParto,
        ultimaModificacionPor: getUserDisplayName() || user?.username,
        ultimaModificacionUsername: user?.username,
      }
      const idForApi = idToUpdate || updatedParto.numero || updatedParto.correlativo
      const savedParto = idForApi ? await updateParto(idForApi, payload) : null
      const mergedParto = savedParto ? mergePartoAfterUpdate(payload, savedParto) : payload
      const idx = findItemIndex()
      const updatedData =
        idx >= 0
          ? data.map((item, i) => (i === idx ? mergedParto : item))
          : data.map(item =>
              (item._traceId != null && item._traceId === idToUpdate) ||
              (item.id != null && String(item.id) === String(idToUpdate))
                ? mergedParto
                : item
            )
      setData(updatedData)
      setEditingParto(null)
      const updatedAlerts = checkAlerts(updatedData)
      setAlerts(updatedAlerts)
    } catch (error) {
      console.error('Error actualizando parto:', error)
      const errorMessage = error.message || 'No se pudo actualizar el parto'
      setAlerts([{ type: 'error', title: 'Error al Actualizar', message: errorMessage }])
      addErrorToLog('Error al Actualizar', errorMessage)
      const idx = findItemIndex()
      if (idx >= 0) {
        setData(prev => prev.map((item, i) => (i === idx ? { ...updatedParto } : item)))
        setEditingParto(null)
        setAlerts(prev => [
          ...prev,
          { type: 'warning', title: 'Cambios solo en pantalla', message: 'Los cambios se aplicaron en la tabla pero no se guardaron en el servidor. Comprueba la conexión con la API.' }
        ])
      }
    }
  }

  const handleCloseEdit = () => {
    setEditingParto(null)
  }
    
  // Manejar eliminación
  const handleDelete = async (traceId, partoItem) => {
    const item =
      partoItem ||
      data.find(
        (p) =>
          p.numero === traceId ||
          p.id === traceId ||
          p._traceId === traceId ||
          String(p.correlativo) === String(traceId)
      )
    if (item && !puedeEliminarParto(item)) {
      setAlerts([
        {
          type: 'warning',
          title: 'Sin permiso',
          message: 'Solo puede eliminar los partos registrados con su usuario.',
        },
      ])
      return
    }
    const apiDeleteId = item
      ? (item.id ?? item._traceId ?? item.traceId ?? traceId)
      : traceId
    try {
      const result = await deleteParto(apiDeleteId)
      const deletedId = result?.id
      const updatedData = deletedId
        ? data.filter((row) => String(row.id) !== String(deletedId))
        : data.filter(
            (row) =>
              row._traceId !== apiDeleteId &&
              row.id !== apiDeleteId &&
              String(row.traceId) !== String(apiDeleteId)
          )
      setData(updatedData)
      // Actualizar alertas
      const updatedAlerts = checkAlerts(updatedData)
      setAlerts(updatedAlerts)
    } catch (error) {
      console.error('Error eliminando parto:', error)
      const errorMessage = error.message || 'No se pudo eliminar el parto'
      setAlerts([{ type: 'error', title: 'Error al Eliminar', message: errorMessage }])
      addErrorToLog('Error al Eliminar', errorMessage)
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
      
      <NotificationSystem
        notifications={alerts}
        notificationLog={notificationLog}
        onClearLog={() => setNotificationLog([])}
      />
      
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
