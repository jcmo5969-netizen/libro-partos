import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../services/userService'
import './GestionUsuarios.css'

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombreCompleto: '',
    email: '',
    rol: 'USUARIO',
    activo: true
  })

  useEffect(() => {
    loadUsuarios()
  }, [])

  const loadUsuarios = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getUsuarios()
      setUsuarios(data)
    } catch (err) {
      setError(err.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingUsuario) {
        await updateUsuario(editingUsuario.id, formData)
      } else {
        await createUsuario(formData)
      }
      setShowForm(false)
      setEditingUsuario(null)
      resetForm()
      loadUsuarios()
    } catch (err) {
      setError(err.message || 'Error al guardar usuario')
    }
  }

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario)
    setFormData({
      username: usuario.username,
      password: '', // No mostrar contraseña
      nombreCompleto: usuario.nombreCompleto,
      email: usuario.email || '',
      rol: usuario.rol,
      activo: usuario.activo
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return
    }

    try {
      await deleteUsuario(id)
      loadUsuarios()
    } catch (err) {
      setError(err.message || 'Error al eliminar usuario')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nombreCompleto: '',
      email: '',
      rol: 'USUARIO',
      activo: true
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingUsuario(null)
    resetForm()
  }

  if (loading) {
    return (
      <div className="gestion-usuarios-loading">
        <div className="spinner"></div>
        <p>Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <div className="gestion-usuarios">
      <div className="gestion-usuarios-header">
        <h2>Gestión de Usuarios</h2>
        <motion.button
          className="btn-nuevo-usuario"
          onClick={() => {
            resetForm()
            setShowForm(true)
            setEditingUsuario(null)
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          + Nuevo Usuario
        </motion.button>
      </div>

      {error && (
        <motion.div
          className="error-message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {showForm && (
        <motion.div
          className="usuario-form-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleCancel}
        >
          <motion.div
            className="usuario-form"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Usuario *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={!!editingUsuario}
                />
              </div>

              <div className="form-group">
                <label>Contraseña {editingUsuario ? '(dejar vacío para no cambiar)' : '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUsuario}
                />
              </div>

              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombreCompleto}
                  onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Rol *</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  required
                >
                  <option value="USUARIO">USUARIO</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  />
                  Usuario Activo
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  {editingUsuario ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <div className="usuarios-table-container">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">No hay usuarios registrados</td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.username}</td>
                  <td>{usuario.nombreCompleto}</td>
                  <td>{usuario.email || '-'}</td>
                  <td>
                    <span className={`rol-badge ${usuario.rol.toLowerCase()}`}>
                      {usuario.rol}
                    </span>
                  </td>
                  <td>
                    <span className={`estado-badge ${usuario.activo ? 'activo' : 'inactivo'}`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {usuario.lastLogin
                      ? new Date(usuario.lastLogin).toLocaleString('es-CL')
                      : 'Nunca'}
                  </td>
                  <td>
                    <div className="acciones">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(usuario)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(usuario.id)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default GestionUsuarios

