import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import './NuevoParto.css'

function NuevoParto({ onClose, onSave, data = [] }) {
  const [isMinimized, setIsMinimized] = useState(false)
  const DRAFT_KEY = 'parto_draft'
  
  // Generar número de parto secuencial basado en el total de registros
  const getNextNumber = () => {
    if (data.length === 0) return 1
    // Obtener el número más alto y sumar 1, o usar la longitud + 1
    const maxNum = Math.max(...data.map(item => {
      const num = parseInt(item.numero) || 0
      return num
    }))
    return Math.max(maxNum + 1, data.length + 1)
  }

  // Cargar borrador guardado al montar
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        return draft
      }
    } catch (error) {
      console.error('Error cargando borrador:', error)
    }
    return null
  }

  // Guardar borrador
  const saveDraft = (data) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error guardando borrador:', error)
    }
  }

  // Limpiar borrador
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch (error) {
      console.error('Error limpiando borrador:', error)
    }
  }

  const [formData, setFormData] = useState(() => {
    const draft = loadDraft()
    return draft || {
    // Datos generales - usando nombres exactos de las variables
    fechaParto: '',
    horaParto: '',
    tipoParto: '',
    
    // Datos de la madre - nombres exactos
    nombreYApellido: '',
    rut: '',
    edad: '',
    puebloOriginario: 'NO',
    nombrePuebloOriginario: '',
    migrante: 'NO',
    nacionalidad: '',
    discapacidad: 'NO',
    telefono: '',
    comuna: '',
    consultorio: '',
    paridad: '',
    cca: 'NO',
    presentacion: '',
    gemela: 'NO',
    eg: '',
    dias: '',
    planDeParto: 'NO',
    induccion: 'NO',
    trabajoDeParto: 'NO',
    conduccionOcitocica: 'NO',
    libertadDeMovimientoOEnTDP: 'NO',
    motivoSinLibertadDeMovimiento: '',
    regimenHidricoAmplioEnTDP: 'NO',
    episiotomia: 'NO',
    desgarro: 'NO',
    ligaduraTardiaCordon: 'NO',
    posicionMaternaEnElExpulsivo: '',
    atencionConPertinenciaCultural: 'NO',
    causaCesarea: '',
    eq: 'NO',
    tipoDeAnestesia: 'SIN ANESTESIA',
    horaDeAnestesia: '',
    medicoAnestesista: '',
    motivoNoAnestesia: '',
    anestesiaLocal: 'NO',
    manejoFarmacologicoDelDolor: 'NO',
    manejoNoFarmacologicoDelDolor: 'NO',
    medidasNoFarmacologicasParaElDolorCuales: '',
    alumbramientoConducido: 'NO',
    grupoRH: '',
    chagas: 'NEGATIVO',
    vih: 'NEGATIVO',
    vihAlParto: 'NEGATIVO',
    rprVdrl: 'NEGATIVO',
    hepatitisB: 'NEGATIVO',
    sgb: '',
    sgbConTratamientoAlParto: '',
    
    // Inducción detallada
    tipoInduccion: '', // MECANICA, FARMACOLOGICA, COMBINADA
    induccionMecanica: '', // BALON_COOK, SONDA_FOLEY
    induccionFarmacologica: '', // DINOPROSTONA, MISOTROL, OXITOCINA
    induccionCombinada: '', // BALON_COOK_MISOTROL, BALON_COOK_OXITOCINA, SONDA_FOLEY_MISOTROL, SONDA_FOLEY_OXITOCINA
    detalleInduccion: '',
    
    // Datos del recién nacido - nombres exactos
    peso: '',
    talla: '',
    cc: '',
    apgar1: '',
    apgar5: '',
    apgar10: '',
    sexo: '',
    malformaciones: 'NO',
    
    medicoObstetra: '',
    medicoPediatra: '',
    matronaPreparto: '',
    matronaParto: '',
    matronaRN: '',
    acompanamientoPreparto: 'NO',
    acompanamientoParto: 'NO',
    acompanamientoPuerperioInmediato: 'NO',
    nombreAcompanante: '',
    parentescoAcompananteRespectoAMadre: '',
    apegoConPiel30Min: 'NO',
    causaNoApego: '',
    acompanamientoRN: 'NO',
    parentescoAcompananteRespectoARN: '',
    lactanciaPrecoz60MinDeVida: 'NO',
    embControlado: 'NO',
    tallerCHCC: 'NO',
    privadaDeLibertad: 'NO',
    transNoBinario: 'NO',
    destino: '',
    comentarios: '',
    
    // Inducción detallada
    tipoInduccion: '',
    induccionMecanica: '',
    induccionFarmacologica: '',
    induccionCombinada: '',
    detalleInduccion: ''
  }
  })

  // Guardar borrador automáticamente cuando cambian los datos
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(formData)
    }, 1000) // Guardar después de 1 segundo de inactividad
    
    return () => clearTimeout(timer)
  }, [formData])

  // Función para formatear RUT al formato chileno (XX.XXX.XXX-X)
  const formatRUT = (rut) => {
    // Eliminar todo excepto números y K
    let cleanRUT = rut.replace(/[^0-9kK]/g, '')
    
    if (cleanRUT.length === 0) return ''
    
    // Convertir K a mayúscula
    cleanRUT = cleanRUT.toUpperCase()
    
    // Separar el dígito verificador (último carácter)
    const dv = cleanRUT.slice(-1)
    const numbers = cleanRUT.slice(0, -1)
    
    if (numbers.length === 0) {
      return dv
    }
    
    // Formatear números con puntos
    let formatted = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    // Agregar el dígito verificador con guion
    return `${formatted}-${dv}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Formatear RUT automáticamente
    if (name === 'rut') {
      const formattedRUT = formatRUT(value)
      setFormData(prev => ({
        ...prev,
        [name]: formattedRUT
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSaveDraft = () => {
    saveDraft(formData)
    alert('Borrador guardado exitosamente')
  }

  const handleLoadDraft = () => {
    const draft = loadDraft()
    if (draft) {
      if (window.confirm('¿Deseas cargar el borrador guardado? Se perderán los datos actuales.')) {
        setFormData(draft)
      }
    } else {
      alert('No hay borrador guardado')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Limpiar borrador al guardar definitivamente
    clearDraft()
    
    // Mapear los datos del formulario usando los nombres exactos de las variables
    const partoData = {
      // Datos generales
      // nPartoAno y nPartoMes se generan automáticamente en el backend
      fechaParto: formData.fechaParto,
      horaParto: formData.horaParto,
      tipoParto: formData.tipoParto,
      
      // Datos de la madre - nombres exactos
      nombreYApellido: formData.nombreYApellido,
      rut: formData.rut,
      edad: formData.edad ? parseInt(formData.edad) : null,
      puebloOriginario: formData.puebloOriginario,
      nombrePuebloOriginario: formData.nombrePuebloOriginario,
      migrante: formData.migrante,
      nacionalidad: formData.nacionalidad,
      discapacidad: formData.discapacidad,
      telefono: formData.telefono,
      comuna: formData.comuna,
      consultorio: formData.consultorio,
      paridad: formData.paridad,
      cca: formData.cca,
      presentacion: formData.presentacion,
      gemela: formData.gemela,
      eg: formData.eg ? parseFloat(formData.eg) : null,
      dias: formData.dias ? parseInt(formData.dias) : null,
      planDeParto: formData.planDeParto,
      induccion: formData.induccion,
      tipoInduccion: formData.tipoInduccion,
      induccionMecanica: formData.induccionMecanica,
      induccionFarmacologica: formData.induccionFarmacologica,
      induccionCombinada: formData.induccionCombinada,
      detalleInduccion: formData.detalleInduccion,
      trabajoDeParto: formData.trabajoDeParto,
      conduccionOcitocica: formData.conduccionOcitocica,
      libertadDeMovimientoOEnTDP: formData.libertadDeMovimientoOEnTDP,
      motivoSinLibertadDeMovimiento: formData.motivoSinLibertadDeMovimiento,
      regimenHidricoAmplioEnTDP: formData.regimenHidricoAmplioEnTDP,
      episiotomia: formData.episiotomia,
      desgarro: formData.desgarro,
      ligaduraTardiaCordon: formData.ligaduraTardiaCordon,
      posicionMaternaEnElExpulsivo: formData.posicionMaternaEnElExpulsivo,
      atencionConPertinenciaCultural: formData.atencionConPertinenciaCultural,
      causaCesarea: formData.causaCesarea,
      eq: formData.eq,
      tipoDeAnestesia: formData.tipoDeAnestesia,
      horaDeAnestesia: formData.horaDeAnestesia,
      medicoAnestesista: formData.medicoAnestesista,
      motivoNoAnestesia: formData.motivoNoAnestesia,
      anestesiaLocal: formData.anestesiaLocal,
      manejoFarmacologicoDelDolor: formData.manejoFarmacologicoDelDolor,
      manejoNoFarmacologicoDelDolor: formData.manejoNoFarmacologicoDelDolor,
      medidasNoFarmacologicasParaElDolorCuales: formData.medidasNoFarmacologicasParaElDolorCuales,
      alumbramientoConducido: formData.alumbramientoConducido,
      grupoRH: formData.grupoRH,
      chagas: formData.chagas,
      vih: formData.vih,
      vihAlParto: formData.vihAlParto,
      rprVdrl: formData.rprVdrl,
      hepatitisB: formData.hepatitisB,
      sgb: formData.sgb,
      sgbConTratamientoAlParto: formData.sgbConTratamientoAlParto,
      
      // Datos del recién nacido - nombres exactos
      peso: formData.peso ? parseFloat(formData.peso) : null,
      talla: formData.talla ? parseFloat(formData.talla) : null,
      cc: formData.cc ? parseFloat(formData.cc) : null,
      apgar1: formData.apgar1 ? parseInt(formData.apgar1) : null,
      apgar5: formData.apgar5 ? parseInt(formData.apgar5) : null,
      apgar10: formData.apgar10 ? parseInt(formData.apgar10) : null,
      sexo: formData.sexo,
      malformaciones: formData.malformaciones,
      medicoObstetra: formData.medicoObstetra,
      medicoPediatra: formData.medicoPediatra,
      matronaPreparto: formData.matronaPreparto,
      matronaParto: formData.matronaParto,
      matronaRN: formData.matronaRN,
      acompanamientoPreparto: formData.acompanamientoPreparto,
      acompanamientoParto: formData.acompanamientoParto,
      acompanamientoPuerperioInmediato: formData.acompanamientoPuerperioInmediato,
      nombreAcompanante: formData.nombreAcompanante,
      parentescoAcompananteRespectoAMadre: formData.parentescoAcompananteRespectoAMadre,
      apegoConPiel30Min: formData.apegoConPiel30Min,
      causaNoApego: formData.causaNoApego,
      acompanamientoRN: formData.acompanamientoRN,
      parentescoAcompananteRespectoARN: formData.parentescoAcompananteRespectoARN,
      lactanciaPrecoz60MinDeVida: formData.lactanciaPrecoz60MinDeVida,
      embControlado: formData.embControlado,
      tallerCHCC: formData.tallerCHCC,
      privadaDeLibertad: formData.privadaDeLibertad,
      transNoBinario: formData.transNoBinario,
      destino: formData.destino,
      comentarios: formData.comentarios,
      
      // Campos adicionales para compatibilidad con el sistema existente
      numero: getNextNumber().toString(),
      id: getNextNumber().toString(),
      fecha: formData.fechaParto,
      hora: formData.horaParto,
      nombre: formData.nombreYApellido,
      semanasGestacion: formData.eg ? parseFloat(formData.eg) : null,
      tipoAnestesia: formData.tipoDeAnestesia,
      perimetroCefalico: formData.cc ? parseFloat(formData.cc) : null
    }
    
    onSave(partoData)
    onClose()
  }

  return (
      <motion.div 
        className="nuevo-parto-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          // Solo cerrar si el click es directamente en el overlay, no en elementos hijos
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        <motion.div 
          className={`nuevo-parto-modal ${isMinimized ? 'minimized' : ''}`}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
        <div 
          className="modal-header"
          onClick={isMinimized ? () => setIsMinimized(false) : undefined}
          style={{ cursor: isMinimized ? 'pointer' : 'move' }}
        >
          <h2>➕ Nuevo Parto</h2>
          <div className="header-actions">
            <button 
              className="minimize-btn" 
              onClick={(e) => {
                e.stopPropagation()
                setIsMinimized(!isMinimized)
              }}
              title={isMinimized ? "Restaurar" : "Minimizar"}
            >
              {isMinimized ? '□' : '—'}
            </button>
            <button 
              className="close-btn" 
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="nuevo-parto-form">
          <div className="form-scroll">
            {/* Datos Generales */}
            <section className="form-section">
              <h3>📋 Datos Generales</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha de Parto *</label>
                  <input type="date" name="fechaParto" value={formData.fechaParto} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Hora de Parto *</label>
                  <input type="time" name="horaParto" value={formData.horaParto} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Tipo de Parto *</label>
                  <select 
                    name="tipoParto" 
                    value={formData.tipoParto} 
                    onChange={handleChange} 
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    required
                  >
                    <option value="">Seleccione...</option>
                    <option value="VAGINAL">VAGINAL</option>
                    <option value="INSTRUMENTAL">INSTRUMENTAL</option>
                    <option value="CES ELE">CES ELE</option>
                    <option value="CES URG">CES URG</option>
                    <option value="EXTRAHOSPITALARIO">EXTRAHOSPITALARIO</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Datos de la Madre */}
            <section className="form-section">
              <h3>👩 Datos de la Madre</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nombre y Apellido *</label>
                  <input type="text" name="nombreYApellido" value={formData.nombreYApellido} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>RUT *</label>
                  <input type="text" name="rut" value={formData.rut} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Edad *</label>
                  <input type="number" name="edad" value={formData.edad} onChange={handleChange} min="10" max="60" required />
                </div>
                <div className="form-group">
                  <label>Pueblo Originario</label>
                  <select name="puebloOriginario" value={formData.puebloOriginario} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre de Pueblo Originario</label>
                  <input type="text" name="nombrePuebloOriginario" value={formData.nombrePuebloOriginario} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Migrante</label>
                  <select name="migrante" value={formData.migrante} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nacionalidad</label>
                  <input type="text" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Discapacidad</label>
                  <select name="discapacidad" value={formData.discapacidad} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Comuna</label>
                  <input type="text" name="comuna" value={formData.comuna} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Consultorio</label>
                  <input type="text" name="consultorio" value={formData.consultorio} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Paridad *</label>
                  <select name="paridad" value={formData.paridad} onChange={handleChange} required>
                    <option value="">Seleccione...</option>
                    <option value="PRIMIPARA">PRIMIPARA</option>
                    <option value="MULTIPARA">MULTIPARA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>CCA</label>
                  <select name="cca" value={formData.cca} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Presentación</label>
                  <select name="presentacion" value={formData.presentacion} onChange={handleChange}>
                    <option value="">Seleccione...</option>
                    <option value="CEFALICA">CEFALICA</option>
                    <option value="PODALICA">PODALICA</option>
                    <option value="TRANSVERSA">TRANSVERSA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Gemela</label>
                  <select name="gemela" value={formData.gemela} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>EG (semanas)</label>
                  <input type="number" name="eg" value={formData.eg} onChange={handleChange} min="20" max="45" />
                </div>
                <div className="form-group">
                  <label>Días</label>
                  <input type="number" name="dias" value={formData.dias} onChange={handleChange} min="0" max="6" />
                </div>
                <div className="form-group">
                  <label>Plan de Parto</label>
                  <select name="planDeParto" value={formData.planDeParto} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Inducción</label>
                  <select name="induccion" value={formData.induccion} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                {formData.induccion === 'SI' && (
                  <>
                    <div className="form-group">
                      <label>Tipo de Inducción *</label>
                      <select 
                        name="tipoInduccion" 
                        value={formData.tipoInduccion} 
                        onChange={handleChange}
                        required={formData.induccion === 'SI'}
                      >
                        <option value="">Seleccione...</option>
                        <option value="MECANICA">Mecánica</option>
                        <option value="FARMACOLOGICA">Farmacológica</option>
                        <option value="COMBINADA">Combinada</option>
                      </select>
                    </div>
                    {formData.tipoInduccion === 'MECANICA' && (
                      <div className="form-group">
                        <label>Método Mecánico *</label>
                        <select 
                          name="induccionMecanica" 
                          value={formData.induccionMecanica} 
                          onChange={handleChange}
                          required
                        >
                          <option value="">Seleccione...</option>
                          <option value="BALON_COOK">Balón de Cook</option>
                          <option value="SONDA_FOLEY">Sonda Foley</option>
                        </select>
                      </div>
                    )}
                    {formData.tipoInduccion === 'FARMACOLOGICA' && (
                      <div className="form-group">
                        <label>Método Farmacológico *</label>
                        <select 
                          name="induccionFarmacologica" 
                          value={formData.induccionFarmacologica} 
                          onChange={handleChange}
                          required
                        >
                          <option value="">Seleccione...</option>
                          <option value="DINOPROSTONA">Dinoprostona</option>
                          <option value="MISOTROL">Misotrol</option>
                          <option value="OXITOCINA">Oxitocina</option>
                        </select>
                      </div>
                    )}
                    {formData.tipoInduccion === 'COMBINADA' && (
                      <div className="form-group">
                        <label>Método Combinado *</label>
                        <select 
                          name="induccionCombinada" 
                          value={formData.induccionCombinada} 
                          onChange={handleChange}
                          required
                        >
                          <option value="">Seleccione...</option>
                          <option value="BALON_COOK_MISOTROL">Balón de Cook + Misotrol</option>
                          <option value="BALON_COOK_OXITOCINA">Balón de Cook + Oxitocina</option>
                          <option value="SONDA_FOLEY_MISOTROL">Sonda Foley + Misotrol</option>
                          <option value="SONDA_FOLEY_OXITOCINA">Sonda Foley + Oxitocina</option>
                        </select>
                      </div>
                    )}
                    <div className="form-group full-width">
                      <label>Detalle de la Inducción</label>
                      <textarea 
                        name="detalleInduccion" 
                        value={formData.detalleInduccion} 
                        onChange={handleChange} 
                        rows="3"
                        placeholder="Describa cómo se realizó la inducción..."
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Trabajo de Parto</label>
                  <select name="trabajoDeParto" value={formData.trabajoDeParto} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Conducción Ocitócica</label>
                  <select name="conduccionOcitocica" value={formData.conduccionOcitocica} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Libertad de Movimiento o en TDP</label>
                  <select name="libertadDeMovimientoOEnTDP" value={formData.libertadDeMovimientoOEnTDP} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Motivo Sin Libertad de Movimiento</label>
                  <textarea name="motivoSinLibertadDeMovimiento" value={formData.motivoSinLibertadDeMovimiento} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Régimen Hídrico Amplio en TDP</label>
                  <select name="regimenHidricoAmplioEnTDP" value={formData.regimenHidricoAmplioEnTDP} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Episiotomía</label>
                  <select name="episiotomia" value={formData.episiotomia} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Desgarro</label>
                  <select name="desgarro" value={formData.desgarro} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="GI">GI</option>
                    <option value="GII">GII</option>
                    <option value="GIII">GIII</option>
                    <option value="GIV">GIV</option>
                    <option value="FISURA">FISURA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ligadura Tardía Cordón (&gt;60)</label>
                  <select name="ligaduraTardiaCordon" value={formData.ligaduraTardiaCordon} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Posición Materna en el Expulsivo</label>
                  <input type="text" name="posicionMaternaEnElExpulsivo" value={formData.posicionMaternaEnElExpulsivo} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Atención con Pertinencia Cultural</label>
                  <select name="atencionConPertinenciaCultural" value={formData.atencionConPertinenciaCultural} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Causa Cesárea</label>
                  <textarea name="causaCesarea" value={formData.causaCesarea} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>EQ</label>
                  <select name="eq" value={formData.eq} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Anestesia</label>
                  <select name="tipoDeAnestesia" value={formData.tipoDeAnestesia} onChange={handleChange}>
                    <option value="SIN ANESTESIA">SIN ANESTESIA</option>
                    <option value="RAQUIDEA">RAQUIDEA</option>
                    <option value="PERIDURAL">PERIDURAL</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Hora de Anestesia</label>
                  <input type="time" name="horaDeAnestesia" value={formData.horaDeAnestesia} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Médico Anestesista</label>
                  <input type="text" name="medicoAnestesista" value={formData.medicoAnestesista} onChange={handleChange} />
                </div>
                <div className="form-group full-width">
                  <label>Motivo No Anestesia</label>
                  <textarea name="motivoNoAnestesia" value={formData.motivoNoAnestesia} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Anestesia Local</label>
                  <select name="anestesiaLocal" value={formData.anestesiaLocal} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Manejo Farmacológico del Dolor</label>
                  <select name="manejoFarmacologicoDelDolor" value={formData.manejoFarmacologicoDelDolor} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Manejo No Farmacológico del Dolor</label>
                  <select name="manejoNoFarmacologicoDelDolor" value={formData.manejoNoFarmacologicoDelDolor} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Medidas No Farmacológicas para el Dolor ¿Cuáles?</label>
                  <textarea name="medidasNoFarmacologicasParaElDolorCuales" value={formData.medidasNoFarmacologicasParaElDolorCuales} onChange={handleChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Alumbramiento Conducido</label>
                  <select name="alumbramientoConducido" value={formData.alumbramientoConducido} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Grupo RH</label>
                  <input type="text" name="grupoRH" value={formData.grupoRH} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Chagas</label>
                  <select name="chagas" value={formData.chagas} onChange={handleChange}>
                    <option value="NEGATIVO">NEGATIVO</option>
                    <option value="POSITIVO">POSITIVO</option>
                    <option value="TOMADO">TOMADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>VIH</label>
                  <select name="vih" value={formData.vih} onChange={handleChange}>
                    <option value="NEGATIVO">NEGATIVO</option>
                    <option value="POSITIVO">POSITIVO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>VIH al Parto</label>
                  <select name="vihAlParto" value={formData.vihAlParto} onChange={handleChange}>
                    <option value="NEGATIVO">NEGATIVO</option>
                    <option value="POSITIVO">POSITIVO</option>
                    <option value="TOMADO">TOMADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>RPR/VDRL</label>
                  <select name="rprVdrl" value={formData.rprVdrl} onChange={handleChange}>
                    <option value="NEGATIVO">NEGATIVO</option>
                    <option value="POSITIVO">POSITIVO</option>
                    <option value="TOMADO">TOMADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Hepatitis B</label>
                  <select name="hepatitisB" value={formData.hepatitisB} onChange={handleChange}>
                    <option value="NEGATIVO">NEGATIVO</option>
                    <option value="POSITIVO">POSITIVO</option>
                    <option value="TOMADO">TOMADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>SGB (+)</label>
                  <select name="sgb" value={formData.sgb} onChange={handleChange}>
                    <option value="">Seleccione...</option>
                    <option value="NEGATIVO">NEGATIVO</option>
                    <option value="POSITIVO">POSITIVO</option>
                    <option value="TOMADO">TOMADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>SGB (+) con Tratamiento al Parto</label>
                  <input type="text" name="sgbConTratamientoAlParto" value={formData.sgbConTratamientoAlParto} onChange={handleChange} />
                </div>
              </div>
            </section>

            {/* Datos del Recién Nacido */}
            <section className="form-section">
              <h3>👶 Datos del Recién Nacido</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Peso (g) *</label>
                  <input type="number" name="peso" value={formData.peso} onChange={handleChange} min="500" max="6000" required />
                </div>
                <div className="form-group">
                  <label>Talla (cm)</label>
                  <input type="number" name="talla" value={formData.talla} onChange={handleChange} min="20" max="60" />
                </div>
                <div className="form-group">
                  <label>CC (cm)</label>
                  <input type="number" name="cc" value={formData.cc} onChange={handleChange} min="20" max="50" />
                </div>
                <div className="form-group">
                  <label>APGAR 1'</label>
                  <input type="number" name="apgar1" value={formData.apgar1} onChange={handleChange} min="0" max="10" />
                </div>
                <div className="form-group">
                  <label>APGAR 5'</label>
                  <input type="number" name="apgar5" value={formData.apgar5} onChange={handleChange} min="0" max="10" />
                </div>
                <div className="form-group">
                  <label>APGAR 10'</label>
                  <input type="number" name="apgar10" value={formData.apgar10} onChange={handleChange} min="0" max="10" />
                </div>
                <div className="form-group">
                  <label>Sexo *</label>
                  <select name="sexo" value={formData.sexo} onChange={handleChange} required>
                    <option value="">Seleccione...</option>
                    <option value="FEMENINO">FEMENINO</option>
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="INDETERMINADO">INDETERMINADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Malformaciones</label>
                  <select name="malformaciones" value={formData.malformaciones} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Médico Obstetra</label>
                  <input type="text" name="medicoObstetra" value={formData.medicoObstetra} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Médico Pediatra</label>
                  <input type="text" name="medicoPediatra" value={formData.medicoPediatra} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Matrona Preparto</label>
                  <input type="text" name="matronaPreparto" value={formData.matronaPreparto} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Matrona Parto</label>
                  <input type="text" name="matronaParto" value={formData.matronaParto} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Matrona RN</label>
                  <input type="text" name="matronaRN" value={formData.matronaRN} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Acompañamiento Preparto</label>
                  <select name="acompanamientoPreparto" value={formData.acompanamientoPreparto} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Acompañamiento Parto</label>
                  <select name="acompanamientoParto" value={formData.acompanamientoParto} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Acompañamiento Puerperio Inmediato</label>
                  <select name="acompanamientoPuerperioInmediato" value={formData.acompanamientoPuerperioInmediato} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre Acompañante</label>
                  <input type="text" name="nombreAcompanante" value={formData.nombreAcompanante} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Parentesco Acompañante respecto a Madre</label>
                  <input type="text" name="parentescoAcompananteRespectoAMadre" value={formData.parentescoAcompananteRespectoAMadre} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Apego con Piel &gt;30 min</label>
                  <select name="apegoConPiel30Min" value={formData.apegoConPiel30Min} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="MADRE">MADRE</option>
                    <option value="PADRE">PADRE</option>
                    <option value="OTRA PERSONA SIGNIFICATIVA">OTRA PERSONA SIGNIFICATIVA</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Causa No Apego</label>
                  <textarea name="causaNoApego" value={formData.causaNoApego} onChange={handleChange} rows="2" />
                </div>
                <div className="form-group">
                  <label>Acompañamiento RN</label>
                  <select name="acompanamientoRN" value={formData.acompanamientoRN} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Parentesco Acompañante respecto a RN</label>
                  <input type="text" name="parentescoAcompananteRespectoARN" value={formData.parentescoAcompananteRespectoARN} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Lactancia Precoz (60 min de vida)</label>
                  <select name="lactanciaPrecoz60MinDeVida" value={formData.lactanciaPrecoz60MinDeVida} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>EMB Controlado</label>
                  <select name="embControlado" value={formData.embControlado} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Taller CHCC</label>
                  <select name="tallerCHCC" value={formData.tallerCHCC} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Privada de Libertad</label>
                  <select name="privadaDeLibertad" value={formData.privadaDeLibertad} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Trans/No Binario</label>
                  <select name="transNoBinario" value={formData.transNoBinario} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Destino</label>
                  <input type="text" name="destino" value={formData.destino} onChange={handleChange} />
                </div>
                <div className="form-group full-width">
                  <label>Comentarios</label>
                  <textarea name="comentarios" value={formData.comentarios} onChange={handleChange} rows="4" />
                </div>
              </div>
            </section>

          </div>

          <div className="form-actions">
            <div className="draft-actions">
              <motion.button
                type="button"
                className="btn-draft"
                onClick={handleSaveDraft}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Guardar borrador para continuar después"
              >
                💾 Guardar Borrador
              </motion.button>
              <motion.button
                type="button"
                className="btn-load-draft"
                onClick={handleLoadDraft}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Cargar borrador guardado"
              >
                📂 Cargar Borrador
              </motion.button>
            </div>
            <div className="main-actions">
              <motion.button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancelar
              </motion.button>
              <motion.button
                type="submit"
                className="btn-save"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Guardar Parto
              </motion.button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default NuevoParto

