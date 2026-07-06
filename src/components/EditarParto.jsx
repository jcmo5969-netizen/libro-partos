import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import './NuevoParto.css'

const CAMPOS_DECIMALES = new Set([
  'pesoMaterno', 'tallaMaterna', 'eg',
  'peso', 'talla', 'cc',
  'peso2', 'talla2', 'cc2'
])

function calcularIMC(pesoKg, tallaCm) {
  const p = parseFloat(String(pesoKg ?? '').replace(',', '.'))
  const t = parseFloat(String(tallaCm ?? '').replace(',', '.'))
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return null
  const tallaMt = t / 100
  return Math.round((p / (tallaMt * tallaMt)) * 10) / 10
}

function clasificarIMC(imc) {
  if (imc === null) return null
  if (imc < 18.5) return { texto: 'Bajo peso', color: '#2196F3' }
  if (imc < 25)   return { texto: 'Normal', color: '#4CAF50' }
  if (imc < 30)   return { texto: 'Sobrepeso', color: '#FF9800' }
  return { texto: 'Obesidad', color: '#F44336' }
}

function EditarParto({ onClose, onSave, partoData }) {
  const [showGemelarModal, setShowGemelarModal] = useState(false)
  // Convierte 1/0/true/false/"SI"/"NO" a "SI" o "NO"
  const boolToSiNo = (val) => {
    if (val === 1 || val === true || (typeof val === 'string' && (val.toUpperCase() === 'SI' || val.toUpperCase() === 'SÍ'))) return 'SI'
    return 'NO'
  }

  const normalizeDateForInput = (value) => {
    if (!value) return ''

    if (typeof value === 'string') {
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
      }

      const slashParts = value.split('/')
      if (slashParts.length === 3) {
        const [month, day, year] = slashParts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    return ''
  }

  const [formData, setFormData] = useState({
    // Inicializar con datos vacíos
    nPartoAno: '',
    nPartoMes: '',
    fechaParto: '',
    horaParto: '',
    tipoParto: '',
    nombreYApellido: '',
    rut: '',
    edad: '',
    pesoMaterno: '',
    tallaMaterna: '',
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
    detalleAnestesiaCombinada: '',
    detalleAnestesiaPCA: '',
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
    tipoInduccion: '',
    induccionMecanica: '',
    induccionFarmacologica: '',
    induccionCombinada: '',
    detalleInduccion: '',
    peso: '',
    talla: '',
    cc: '',
    apgar1: '',
    apgar5: '',
    apgar10: '',
    sexo: '',
    malformaciones: 'NO',
    // Datos del segundo recién nacido (gemelar)
    peso2: '',
    talla2: '',
    cc2: '',
    apgar1_2: '',
    apgar5_2: '',
    apgar10_2: '',
    sexo2: '',
    malformaciones2: 'NO',
    medicoObstetra: '',
    medicoPediatra: '',
    medicoIndicaCesarea: '',
    medicoOperadorCesarea: '',
    clasificacionRobson: '',
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
    privadaDeLibertad: 'NO',
    transNoBinario: 'NO',
    destino: '',
    destino2: '',
    comentarios: '',
    horaParto2: ''
  })

  // Cargar datos del parto cuando se monta el componente
  useEffect(() => {
    if (partoData) {
      const fechaFormato = normalizeDateForInput(partoData.fechaParto || partoData.fecha)

      // Convertir hora de formato HH:MM:SS a formato de input time (HH:MM)
      let horaFormato = ''
      if (partoData.horaParto) {
        horaFormato = partoData.horaParto.split(':').slice(0, 2).join(':')
      }

      setFormData({
      // nPartoAno y nPartoMes se generan automáticamente en el backend
      fechaParto: fechaFormato,
        horaParto: horaFormato,
        tipoParto: partoData.tipoParto || '',
        nombreYApellido: partoData.nombreYApellido || partoData.nombre || '',
        rut: partoData.rut || '',
        edad: partoData.edad || '',
        pesoMaterno: partoData.pesoMaterno ?? partoData.peso_materno ?? '',
        tallaMaterna: partoData.tallaMaterna ?? partoData.talla_materna ?? '',
        puebloOriginario: boolToSiNo(partoData.puebloOriginario),
        nombrePuebloOriginario: partoData.nombrePuebloOriginario || '',
        migrante: boolToSiNo(partoData.migrante),
        nacionalidad: partoData.nacionalidad || '',
        discapacidad: boolToSiNo(partoData.discapacidad),
        telefono: partoData.telefono || '',
        comuna: partoData.comuna || '',
        consultorio: partoData.consultorio || '',
        paridad: partoData.paridad || '',
        cca: boolToSiNo(partoData.cca),
        presentacion: partoData.presentacion || '',
        gemela: boolToSiNo(partoData.gemela),
        eg: partoData.eg || partoData.semanasGestacion || '',
        dias: partoData.dias || '',
        planDeParto: boolToSiNo(partoData.planDeParto),
        induccion: boolToSiNo(partoData.induccion),
        tipoInduccion: partoData.tipoInduccion || '',
        induccionMecanica: partoData.induccionMecanica || '',
        induccionFarmacologica: partoData.induccionFarmacologica || '',
        induccionCombinada: partoData.induccionCombinada || '',
        detalleInduccion: partoData.detalleInduccion || '',
        trabajoDeParto: boolToSiNo(partoData.trabajoDeParto),
        conduccionOcitocica: boolToSiNo(partoData.conduccionOcitocica),
        libertadDeMovimientoOEnTDP: boolToSiNo(partoData.libertadDeMovimientoOEnTDP),
        motivoSinLibertadDeMovimiento: partoData.motivoSinLibertadDeMovimiento || '',
        regimenHidricoAmplioEnTDP: boolToSiNo(partoData.regimenHidricoAmplioEnTDP),
        episiotomia: boolToSiNo(partoData.episiotomia),
        desgarro: partoData.desgarro || 'NO',
        ligaduraTardiaCordon: boolToSiNo(partoData.ligaduraTardiaCordon),
        posicionMaternaEnElExpulsivo: partoData.posicionMaternaEnElExpulsivo || '',
        atencionConPertinenciaCultural: boolToSiNo(partoData.atencionConPertinenciaCultural),
        causaCesarea: partoData.causaCesarea || '',
        eq: boolToSiNo(partoData.eq),
        tipoDeAnestesia: partoData.tipoDeAnestesia || partoData.tipoAnestesia || 'SIN ANESTESIA',
        horaDeAnestesia: partoData.horaAnestesia || partoData.horaDeAnestesia || '',
        medicoAnestesista: partoData.medicoAnestesista || '',
        motivoNoAnestesia: partoData.motivoNoAnestesia || '',
        anestesiaLocal: boolToSiNo(partoData.anestesiaLocal),
        detalleAnestesiaCombinada: partoData.detalleAnestesiaCombinada || '',
        detalleAnestesiaPCA: partoData.detalleAnestesiaPCA || partoData.detallePCA || '',
        manejoFarmacologicoDelDolor: boolToSiNo(partoData.manejoFarmacologicoDelDolor),
        manejoNoFarmacologicoDelDolor: boolToSiNo(partoData.manejoNoFarmacologicoDelDolor),
        medidasNoFarmacologicasParaElDolorCuales: partoData.medidasNoFarmacologicasParaElDolorCuales || '',
        alumbramientoConducido: boolToSiNo(partoData.alumbramientoConducido),
        grupoRH: partoData.grupoSanguineo || partoData.grupoRH || partoData.grupoRh || partoData.grupo_rh || '',
        chagas: partoData.chagas || 'NEGATIVO',
        vih: partoData.vih || 'NEGATIVO',
        vihAlParto: partoData.vihAlParto || 'NEGATIVO',
        rprVdrl: partoData.rprVdrl || 'NEGATIVO',
        hepatitisB: partoData.hepatitisB || partoData.hbcAg || 'NEGATIVO',
        sgb: partoData.sgb || '',
        sgbConTratamientoAlParto: partoData.sgbConTratamientoAlParto || '',
        peso: partoData.peso || '',
        talla: partoData.talla || '',
        cc: partoData.cc || partoData.perimetroCefalico || '',
        apgar1: partoData.apgar1 || '',
        apgar5: partoData.apgar5 || '',
        apgar10: partoData.apgar10 || '',
        sexo: partoData.sexo || '',
        malformaciones: boolToSiNo(partoData.malformacion ?? partoData.malformaciones),
        peso2: partoData.peso2 || '',
        talla2: partoData.talla2 || '',
        cc2: partoData.cc2 || '',
        apgar1_2: partoData.apgar1_2 || '',
        apgar5_2: partoData.apgar5_2 || '',
        apgar10_2: partoData.apgar10_2 || '',
        sexo2: partoData.sexo2 || '',
        malformaciones2: boolToSiNo(partoData.malformaciones2),
        medicoObstetra: partoData.medicoObstetra || '',
        medicoPediatra: partoData.medicoPediatra || '',
        medicoIndicaCesarea: partoData.medicoIndicaCesarea || '',
        medicoOperadorCesarea: partoData.medicoOperadorCesarea || '',
        clasificacionRobson: partoData.clasificacionRobson || '',
        matronaPreparto: partoData.matronaPreparto || '',
        matronaParto: partoData.matronaParto || '',
        matronaRN: partoData.matronaRN || '',
        acompanamientoPreparto: boolToSiNo(partoData.acompanamientoPreparto),
        acompanamientoParto: boolToSiNo(partoData.acompanamientoParto),
        acompanamientoPuerperioInmediato: boolToSiNo(partoData.acompanamientoPuerperioInmediato),
        nombreAcompanante: partoData.nombreAcompanante || '',
        parentescoAcompananteRespectoAMadre: partoData.parentescoAcompanante || partoData.parentescoAcompananteRespectoAMadre || '',
        apegoConPiel30Min: partoData.apegoInmediato || partoData.apegoConPiel30Min || 'NO',
        causaNoApego: partoData.causaNoApego || '',
        acompanamientoRN: boolToSiNo(partoData.acompanamientoRN),
        parentescoAcompananteRespectoARN: partoData.parentescoAcompananteRespectoARN || '',
        lactanciaPrecoz60MinDeVida: boolToSiNo(partoData.lactanciaPrecoz60MinDeVida),
        embControlado: boolToSiNo(partoData.embControlado),
        privadaDeLibertad: boolToSiNo(partoData.privadaDeLibertad),
        transNoBinario: boolToSiNo(partoData.transNoBinario),
        destino: partoData.destino || partoData.lugarDeNacimiento || '',
        destino2: partoData.destino2 || '',
        comentarios: partoData.comentarios || partoData.observaciones || '',
        horaParto2: partoData.horaParto2 ? partoData.horaParto2.split(':').slice(0, 2).join(':') : ''
      })
    }
  }, [partoData])

  const handleChange = (e) => {
    const { name, value } = e.target
    let next = value
    if (CAMPOS_DECIMALES.has(name) && typeof value === 'string') {
      next = value.replace(',', '.')
    }
    setFormData(prev => ({
      ...prev,
      [name]: next
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const tipoIndUpper = String(formData.tipoInduccion || '').toUpperCase()

    // Mapear los datos del formulario.
    // IMPORTANTE: preservamos solo identidad/creación del parto original
    // (id, trace_id, creado_por, etc.). Evitar `...partoData` completo porque
    // arrastraba claves snakeToCamel (grupoRh, matronaRn) que colisionaban con
    // los mapeos explícitos del form y borraban campos al actualizar.
    const partoDataActualizado = {
      // Identidad y metadatos que no se editan desde el formulario
      id: partoData.id,
      _traceId: partoData._traceId || partoData.traceId || partoData.trace_id,
      correlativo: partoData.correlativo,
      creadoPor: partoData.creadoPor || partoData.creado_por,
      registradoPor: partoData.registradoPor,
      registradoPorUsername: partoData.registradoPorUsername || partoData.creadoPor || partoData.creado_por,
      // Datos generales
      // nPartoAno y nPartoMes se generan automáticamente en el backend
      fechaParto: formData.fechaParto || partoData.fechaParto,
      horaParto: formData.horaParto || partoData.horaParto,
      tipoParto: formData.tipoParto,
      nombreYApellido: formData.nombreYApellido,
      rut: formData.rut,
      edad: formData.edad ? parseInt(formData.edad) : partoData.edad,
      pesoMaterno:
        formData.pesoMaterno !== '' && formData.pesoMaterno != null
          ? parseFloat(formData.pesoMaterno)
          : partoData.pesoMaterno,
      tallaMaterna:
        formData.tallaMaterna !== '' && formData.tallaMaterna != null
          ? parseFloat(formData.tallaMaterna)
          : partoData.tallaMaterna,
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
      eg: formData.eg ? parseFloat(formData.eg) : partoData.eg,
      dias: formData.dias ? parseInt(formData.dias) : partoData.dias,
      planDeParto: formData.planDeParto,
      induccion: formData.induccion,
      tipoInduccion: formData.induccion === 'NO' ? '' : formData.tipoInduccion,
      // Limpiar campos de inducción que no corresponden al tipo seleccionado (valores del select en MAYÚSCULAS)
      induccionMecanica:
        formData.induccion === 'NO' || tipoIndUpper === 'FARMACOLOGICA' ? '' : formData.induccionMecanica,
      induccionFarmacologica:
        formData.induccion === 'NO' || tipoIndUpper === 'MECANICA' ? '' : formData.induccionFarmacologica,
      induccionCombinada:
        formData.induccion === 'NO' || tipoIndUpper !== 'COMBINADA' ? '' : formData.induccionCombinada,
      detalleInduccion: formData.induccion === 'NO' ? '' : formData.detalleInduccion,
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
      detalleAnestesiaCombinada: formData.detalleAnestesiaCombinada,
      detalleAnestesiaPCA: formData.detalleAnestesiaPCA,
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
      peso: formData.peso ? parseFloat(formData.peso) : partoData.peso,
      talla: formData.talla ? parseFloat(formData.talla) : partoData.talla,
      cc: formData.cc ? parseFloat(formData.cc) : partoData.cc,
      apgar1: formData.apgar1 ? parseInt(formData.apgar1) : partoData.apgar1,
      apgar5: formData.apgar5 ? parseInt(formData.apgar5) : partoData.apgar5,
      apgar10: formData.apgar10 ? parseInt(formData.apgar10) : partoData.apgar10,
      sexo: formData.sexo,
      malformaciones: formData.malformaciones,
      peso2: formData.peso2 ? parseFloat(formData.peso2) : partoData.peso2,
      talla2: formData.talla2 ? parseFloat(formData.talla2) : partoData.talla2,
      cc2: formData.cc2 ? parseFloat(formData.cc2) : partoData.cc2,
      apgar1_2: formData.apgar1_2 ? parseInt(formData.apgar1_2) : partoData.apgar1_2,
      apgar5_2: formData.apgar5_2 ? parseInt(formData.apgar5_2) : partoData.apgar5_2,
      apgar10_2: formData.apgar10_2 ? parseInt(formData.apgar10_2) : partoData.apgar10_2,
      sexo2: formData.sexo2,
      malformaciones2: formData.malformaciones2,
      medicoObstetra: formData.medicoObstetra,
      medicoPediatra: formData.medicoPediatra,
      medicoIndicaCesarea: formData.medicoIndicaCesarea,
      medicoOperadorCesarea: formData.medicoOperadorCesarea,
      clasificacionRobson: formData.clasificacionRobson,
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
      privadaDeLibertad: formData.privadaDeLibertad,
      transNoBinario: formData.transNoBinario,
      destino: formData.destino,
      destino2: formData.destino2 || null,
      comentarios: formData.comentarios,
      horaParto2: formData.horaParto2 || null,
      
      // Campos adicionales para compatibilidad
      numero: partoData.numero || partoData.nPartoAno?.toString(),
      fecha: formData.fechaParto || partoData.fechaParto,
      hora: formData.horaParto || partoData.horaParto,
      nombre: formData.nombreYApellido,
      semanasGestacion: formData.eg ? parseFloat(formData.eg) : partoData.eg,
      tipoAnestesia: formData.tipoDeAnestesia,
      perimetroCefalico: formData.cc ? parseFloat(formData.cc) : partoData.cc
    }
    
    onSave(partoDataActualizado)
    onClose()
  }

  // Reutilizar el mismo JSX que NuevoParto pero con título diferente
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
        className="nuevo-parto-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>✏️ Editar Parto</h2>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar">X</button>
        </div>

        <form onSubmit={handleSubmit} className="nuevo-parto-form">
          <div className="form-scroll">
            {/* Datos Generales */}
            <section className="form-section">
              <h3>Datos Generales</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha de Parto *</label>
                  <input type="date" name="fechaParto" value={formData.fechaParto} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>{formData.gemela === 'SI' ? 'Hora parto RN1 *' : 'Hora de Parto *'}</label>
                  <input type="time" name="horaParto" value={formData.horaParto} onChange={handleChange} required />
                </div>
                {formData.gemela === 'SI' && (
                  <div className="form-group">
                    <label>Hora parto RN2</label>
                    <input type="time" name="horaParto2" value={formData.horaParto2} onChange={handleChange} />
                  </div>
                )}
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

            {/* Datos de la Madre - Reutilizar el mismo código de NuevoParto */}
            <section className="form-section">
              <h3>Datos de la Madre</h3>
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
                  <label>Peso materna (kg)</label>
                  <input type="number" name="pesoMaterno" value={formData.pesoMaterno} onChange={handleChange} min="30" max="250" step="any" />
                </div>
                <div className="form-group">
                  <label>Talla materna (cm)</label>
                  <input type="number" name="tallaMaterna" value={formData.tallaMaterna} onChange={handleChange} min="120" max="220" step="any" />
                </div>
                {/* IMC calculado automáticamente */}
                {(() => {
                  const imc = calcularIMC(formData.pesoMaterno, formData.tallaMaterna)
                  const cls = clasificarIMC(imc)
                  return (
                    <div className="form-group">
                      <label>IMC Materno (calculado)</label>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: `2px solid ${cls ? cls.color : '#ccc'}`,
                        background: cls ? `${cls.color}15` : '#f5f5f5',
                        fontWeight: 700,
                        color: cls ? cls.color : '#999',
                        fontSize: '1rem'
                      }}>
                        {imc ? `${imc} — ${cls.texto}` : 'Ingrese peso y talla para calcular'}
                      </div>
                    </div>
                  )
                })()}
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
                  <label>EG (semanas)</label>
                  <input type="number" name="eg" value={formData.eg} onChange={handleChange} min="20" max="45" step="any" />
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
                <div className="form-group">
                  <label>EQ</label>
                  <select name="eq" value={formData.eq} onChange={handleChange}>
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
                  <input type="text" name="grupoRH" value={formData.grupoRH} onChange={handleChange} maxLength={50} />
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
                    <option value="NA">NA</option>
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
                  <label>SGB (Estreptococo)</label>
                  <select name="sgb" value={formData.sgb} onChange={handleChange}>
                    <option value="">Seleccione...</option>
                    <option value="NEGATIVO">NEGATIVO</option>
                    <option value="POSITIVO">POSITIVO</option>
                    <option value="TOMADO">TOMADO</option>
                    <option value="SIN EXAMEN">Sin examen</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>SGB (+) con Tratamiento al Parto</label>
                  <input type="text" name="sgbConTratamientoAlParto" value={formData.sgbConTratamientoAlParto} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>EMB Controlado</label>
                  <select name="embControlado" value={formData.embControlado} onChange={handleChange}>
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
              </div>
            </section>

            {/* Sección de Cesárea - Solo se muestra si es cesárea */}
            {(formData.tipoParto === 'CES ELE' || formData.tipoParto === 'CES URG') && (
              <section className="form-section" style={{ backgroundColor: 'rgba(255, 182, 193, 0.1)', borderRadius: '12px', padding: '1.5rem', marginTop: '1rem' }}>
                <h3>Información de Cesárea</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Clasificación de Robson</label>
                    <select 
                      name="clasificacionRobson" 
                      value={formData.clasificacionRobson} 
                      onChange={handleChange}
                    >
                      <option value="">Seleccione...</option>
                      <option value="Grupo 1">Grupo 1 - Nulípara, ≥37 semanas, parto único, cefálica, espontáneo</option>
                      <option value="Grupo 2">Grupo 2 - Nulípara, ≥37 semanas, parto único, cefálica, inducido o cesárea antes del trabajo de parto</option>
                      <option value="Grupo 3">Grupo 3 - Multipara (sin cesárea previa), ≥37 semanas, parto único, cefálica, espontáneo</option>
                      <option value="Grupo 4">Grupo 4 - Multipara (sin cesárea previa), ≥37 semanas, parto único, cefálica, inducido o cesárea antes del trabajo de parto</option>
                      <option value="Grupo 5">Grupo 5 - Con cesárea previa, ≥37 semanas, parto único, cefálica</option>
                      <option value="Grupo 6">Grupo 6 - Nulípara, parto único, podálica</option>
                      <option value="Grupo 7">Grupo 7 - Multipara (con o sin cesárea previa), parto único, podálica</option>
                      <option value="Grupo 8">Grupo 8 - Parto único, transversa u oblicua</option>
                      <option value="Grupo 9">Grupo 9 - Parto múltiple</option>
                      <option value="Grupo 10">Grupo 10 - Parto único, cefálica, &lt;37 semanas</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Causa de Cesárea *</label>
                    <textarea 
                      name="causaCesarea" 
                      value={formData.causaCesarea} 
                      onChange={handleChange} 
                      rows="3"
                      placeholder="Describa la causa de la cesárea..."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Médico que Indica Cesárea</label>
                    <input type="text" name="medicoIndicaCesarea" value={formData.medicoIndicaCesarea} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Médico que Opera Cesárea</label>
                    <input type="text" name="medicoOperadorCesarea" value={formData.medicoOperadorCesarea} onChange={handleChange} />
                  </div>
                </div>
              </section>
            )}

            {/* Sección de Anestesia */}
            <section className="form-section" style={{ backgroundColor: 'rgba(182, 193, 255, 0.1)', borderRadius: '12px', padding: '1.5rem', marginTop: '1rem' }}>
              <h3>Información de Anestesia</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo de Anestesia</label>
                  <select name="tipoDeAnestesia" value={formData.tipoDeAnestesia} onChange={handleChange}>
                    <option value="SIN ANESTESIA">SIN ANESTESIA</option>
                    <option value="RAQUIDEA">RAQUIDEA</option>
                    <option value="PERIDURAL">PERIDURAL</option>
                    <option value="COMBINADA">COMBINADA</option>
                    <option value="GENERAL">GENERAL</option>
                    <option value="PCA">PCA</option>
                  </select>
                </div>
                {formData.tipoDeAnestesia === 'COMBINADA' && (
                  <div className="form-group full-width">
                    <label>Detalle de Anestesia Combinada *</label>
                    <textarea 
                      name="detalleAnestesiaCombinada" 
                      value={formData.detalleAnestesiaCombinada || ''} 
                      onChange={handleChange} 
                      rows="2"
                      placeholder="Especifique la combinación (ej: Raquídea + Peridural, etc.)"
                      required
                    />
                  </div>
                )}
                {formData.tipoDeAnestesia === 'PCA' && (
                  <div className="form-group full-width">
                    <label>Detalle de PCA *</label>
                    <textarea 
                      name="detalleAnestesiaPCA" 
                      value={formData.detalleAnestesiaPCA || ''} 
                      onChange={handleChange} 
                      rows="2"
                      placeholder="Especifique los detalles de la analgesia controlada por el paciente"
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Hora de Anestesia</label>
                  <input type="time" name="horaDeAnestesia" value={formData.horaDeAnestesia} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Médico Anestesista</label>
                  <input type="text" name="medicoAnestesista" value={formData.medicoAnestesista} onChange={handleChange} />
                </div>
                {formData.tipoDeAnestesia === 'SIN ANESTESIA' && (
                  <div className="form-group full-width">
                    <label>Motivo No Anestesia</label>
                    <textarea name="motivoNoAnestesia" value={formData.motivoNoAnestesia} onChange={handleChange} rows="2" />
                  </div>
                )}
                <div className="form-group">
                  <label>Anestesia Local</label>
                  <select name="anestesiaLocal" value={formData.anestesiaLocal} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Datos del Recién Nacido */}
            <section className="form-section">
              <h3>Datos del Recién Nacido</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Peso (g) *</label>
                  <input type="number" name="peso" value={formData.peso} onChange={handleChange} min="500" max="6000" step="any" required />
                </div>
                <div className="form-group">
                  <label>Talla (cm)</label>
                  <input type="number" name="talla" value={formData.talla} onChange={handleChange} min="20" max="60" step="any" placeholder="Ej. 49.5" />
                </div>
                <div className="form-group">
                  <label>CC (cm)</label>
                  <input type="number" name="cc" value={formData.cc} onChange={handleChange} min="20" max="50" step="any" placeholder="Ej. 34.2" />
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
                  <label>Gemela</label>
                  <select 
                    name="gemela" 
                    value={formData.gemela} 
                    onChange={(e) => {
                      handleChange(e)
                      if (e.target.value === 'SI') {
                        setShowGemelarModal(true)
                      } else if (e.target.value === 'NO') {
                        // Limpiar datos del segundo recién nacido si se cambia a NO
                        setFormData(prev => ({
                          ...prev,
                          gemela: 'NO',
                          peso2: '',
                          talla2: '',
                          cc2: '',
                          apgar1_2: '',
                          apgar5_2: '',
                          apgar10_2: '',
                          sexo2: '',
                          malformaciones2: 'NO'
                        }))
                      }
                    }}
                  >
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
                {formData.gemela === 'SI' && (
                  <div className="form-group full-width">
                    <motion.button
                      type="button"
                      className="btn-gemelar"
                      onClick={() => setShowGemelarModal(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#ff6b9d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        justifyContent: 'center'
                      }}
                    >
                      Ingresar Datos del Segundo Recién Nacido
                    </motion.button>
                    {(formData.peso2 || formData.talla2) && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#e8f5e9',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        color: '#2e7d32'
                      }}>
                        ✓ Datos del segundo recién nacido guardados
                      </div>
                    )}
                  </div>
                )}
                <div className="form-group full-width">
                  <label>{formData.gemela === 'SI' ? 'Destino RN1' : 'Destino'}</label>
                  <input type="text" name="destino" value={formData.destino} onChange={handleChange} placeholder={formData.gemela === 'SI' ? 'Ej. Sala' : ''} />
                </div>
                {formData.gemela === 'SI' && (
                  <div className="form-group full-width">
                    <label>Destino RN2</label>
                    <input type="text" name="destino2" value={formData.destino2} onChange={handleChange} placeholder="Ej. Neo, Sala" />
                  </div>
                )}
                <div className="form-group full-width">
                  <label>Comentarios</label>
                  <textarea name="comentarios" value={formData.comentarios} onChange={handleChange} rows="4" />
                </div>
              </div>
            </section>

          </div>

          <div className="form-actions">
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
              Guardar Cambios
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Modal para Segundo Recién Nacido (Gemelar) */}
      {showGemelarModal && (
        <motion.div 
          className="gemelar-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowGemelarModal(false)
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(5px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <motion.div 
            className="gemelar-modal"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #ff6b9d, #ff8fb3)',
              color: 'white',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Datos del Segundo Recién Nacido (Gemelar)</h2>
              <button 
                onClick={() => setShowGemelarModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                X
              </button>
            </div>

            <div style={{
              padding: '1.5rem',
              overflowY: 'auto',
              flex: 1
            }}>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                  <label>Hora de nacimiento 2do RN (Gemelar)</label>
                  <input type="time" name="horaParto2" value={formData.horaParto2} onChange={handleChange} style={{ maxWidth: '160px' }} />
                </div>
                <div className="form-group">
                  <label>Peso (g)</label>
                  <input type="number" name="peso2" value={formData.peso2} onChange={handleChange} min="500" max="6000" step="any" />
                </div>
                <div className="form-group">
                  <label>Talla (cm)</label>
                  <input type="number" name="talla2" value={formData.talla2} onChange={handleChange} min="20" max="60" step="any" placeholder="Ej. 49.5" />
                </div>
                <div className="form-group">
                  <label>CC (cm)</label>
                  <input type="number" name="cc2" value={formData.cc2} onChange={handleChange} min="20" max="50" step="any" placeholder="Ej. 34.2" />
                </div>
                <div className="form-group">
                  <label>APGAR 1'</label>
                  <input type="number" name="apgar1_2" value={formData.apgar1_2} onChange={handleChange} min="0" max="10" />
                </div>
                <div className="form-group">
                  <label>APGAR 5'</label>
                  <input type="number" name="apgar5_2" value={formData.apgar5_2} onChange={handleChange} min="0" max="10" />
                </div>
                <div className="form-group">
                  <label>APGAR 10'</label>
                  <input type="number" name="apgar10_2" value={formData.apgar10_2} onChange={handleChange} min="0" max="10" />
                </div>
                <div className="form-group">
                  <label>Sexo</label>
                  <select name="sexo2" value={formData.sexo2} onChange={handleChange}>
                    <option value="">Seleccione...</option>
                    <option value="FEMENINO">FEMENINO</option>
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="INDETERMINADO">INDETERMINADO</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Malformaciones</label>
                  <select name="malformaciones2" value={formData.malformaciones2} onChange={handleChange}>
                    <option value="NO">NO</option>
                    <option value="SI">SI</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 182, 193, 0.2)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem'
            }}>
              <motion.button
                type="button"
                onClick={() => setShowGemelarModal(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Cerrar
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  if (formData.peso2 || formData.talla2) {
                    setShowGemelarModal(false)
                  } else {
                    alert('Por favor, ingresa al menos el peso o la talla del segundo recién nacido')
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #ff6b9d, #ff8fb3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Guardar Datos
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default EditarParto



