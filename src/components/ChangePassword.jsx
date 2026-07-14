import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { changePassword, getUserDisplayName } from '../services/authService'
import './Login.css'

/**
 * Pantalla de cambio de contraseña obligatorio en el primer acceso.
 * Se muestra tras el login cuando el usuario tiene `mustChangePassword`.
 * Al completarse, llama a onDone() para continuar a la aplicación normal.
 */
function ChangePassword({ onDone }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña')
      return
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      onDone()
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <motion.div
        className="login-box"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="login-header">
          <img src="/hospital-quilpue-logo.png" alt="Hospital Quilpué" className="login-logo" />
          <h1 className="login-title">Cambiar contraseña</h1>
          <p className="login-subtitle">
            {getUserDisplayName() ? `${getUserDisplayName()} — ` : ''}
            Por seguridad, define una nueva contraseña para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <motion.div
              className="login-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <div className="form-group">
            <label htmlFor="currentPassword">Contraseña actual</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="La contraseña con la que ingresaste"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">Nueva contraseña</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              required
              minLength={8}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <motion.button
            type="submit"
            className="login-button"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? 'Guardando...' : 'Cambiar contraseña'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}

export default ChangePassword
