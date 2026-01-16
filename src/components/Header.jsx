import React from 'react'
import { motion } from 'framer-motion'
import { getUser, logout as logoutService } from '../services/authService'
import './Header.css'

function Header({ onNuevoParto, onLogout }) {
  const user = getUser()

  const handleLogout = async () => {
    await logoutService()
    onLogout()
  }
  return (
    <motion.header 
      className="header"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="header-content">
        <motion.h1 
          className="header-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Libro de Partos
        </motion.h1>
        
        <div className="header-right">
          <motion.button
            className="nuevo-parto-btn"
            onClick={onNuevoParto}
            whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(255, 182, 193, 0.6)' }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <span className="btn-icon">+</span>
            <span className="btn-text">Nuevo Parto</span>
          </motion.button>

          <div className="user-info">
            <span className="user-name">{user?.nombreCompleto || user?.username}</span>
            {user?.rol === 'ADMIN' && <span className="user-role">ADMIN</span>}
            <motion.button
              className="logout-btn"
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Cerrar sesión"
            >
              Salir
            </motion.button>
          </div>
          
          <motion.div 
            className="logo-container logo-hospital"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <img 
              src="/hospital-quilpue-logo.png" 
              alt="Hospital Quilpué" 
              className="logo"
            />
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}

export default Header

