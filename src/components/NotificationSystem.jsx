import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './NotificationSystem.css'

function NotificationSystem({ notifications }) {
  const [visibleNotifications, setVisibleNotifications] = useState([])

  useEffect(() => {
    // Agregar nuevas notificaciones
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
    // Eliminar notificaciones después de 2 segundos
    const timers = visibleNotifications.map(notif => {
      return setTimeout(() => {
        setVisibleNotifications(prev => prev.filter(n => n.id !== notif.id))
      }, 2000)
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [visibleNotifications])

  return (
    <div className="notifications-container">
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            className={`notification ${notification.type}`}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="notification-icon">
              {notification.type === 'warning' ? '⚠️' : '🔔'}
            </div>
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default NotificationSystem

