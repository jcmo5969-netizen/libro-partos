import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './NotificationSystem.css'

const AUTO_CLOSE_MS = { error: 12000, warning: 8000, info: 5000 }

function NotificationSystem({ notifications, notificationLog = [], onClearLog }) {
  const [visibleNotifications, setVisibleNotifications] = useState([])
  const [showLog, setShowLog] = useState(false)

  useEffect(() => {
    if (notifications.length > 0) {
      const newNotifications = notifications.filter(
        (notif, index) => !visibleNotifications.some(vn => vn.id === notif.id)
      )
      if (newNotifications.length > 0) {
        const withIds = newNotifications.map((notif, idx) => ({
          ...notif,
          id: Date.now() + idx
        }))
        setVisibleNotifications(prev => [...prev, ...withIds])
      }
    }
  }, [notifications])

  useEffect(() => {
    const timers = visibleNotifications.map(notif => {
      const ms = AUTO_CLOSE_MS[notif.type] ?? 5000
      return setTimeout(() => {
        setVisibleNotifications(prev => prev.filter(n => n.id !== notif.id))
      }, ms)
    })
    return () => timers.forEach(t => clearTimeout(t))
  }, [visibleNotifications])

  const dismiss = (id) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id))
  }

  const logCount = notificationLog.length
  const hasErrors = logCount > 0

  return (
    <>
      <div className="notifications-container">
        {hasErrors && (
          <button
            type="button"
            className="notification-log-btn"
            onClick={() => setShowLog(true)}
            title="Ver historial de notificaciones y errores"
          >
            📋 Historial ({logCount})
          </button>
        )}
        <AnimatePresence>
          {visibleNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              className={`notification ${notification.type}`}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="notification-icon">
                {notification.type === 'error' ? '❌' : notification.type === 'warning' ? '⚠️' : '🔔'}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
              </div>
              <button
                type="button"
                className="notification-dismiss"
                onClick={() => dismiss(notification.id)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showLog && (
        <div className="notification-log-overlay" onClick={() => setShowLog(false)}>
          <motion.div
            className="notification-log-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="notification-log-header">
              <h3>Historial de notificaciones y errores</h3>
              <div>
                {onClearLog && logCount > 0 && (
                  <button type="button" className="btn-clear-log" onClick={onClearLog}>
                    Limpiar historial
                  </button>
                )}
                <button type="button" className="btn-close-log" onClick={() => setShowLog(false)}>Cerrar</button>
              </div>
            </div>
            <div className="notification-log-list">
              {notificationLog.length === 0 ? (
                <p className="notification-log-empty">No hay registros en el historial.</p>
              ) : (
                [...notificationLog].reverse().map((entry, i) => (
                  <div key={i} className={`notification-log-item ${entry.type}`}>
                    <span className="notification-log-time">{entry.time}</span>
                    <strong>{entry.title}</strong>
                    <p>{entry.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

export default NotificationSystem
