import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analyzeDataWithAI } from '../services/aiService'
import './AIChatbot.css'

function AIChatbot({ data }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de IA. Puedes preguntarme sobre los datos de partos. Por ejemplo: "¿Cuál es la tasa de cesáreas?" o "¿Cuántos partos hubo este mes?"'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Preparar resumen completo de datos con todas las variables solicitadas
      const total = data.length
      
      // TIPOS DE PARTO (mejorado para usar valores normalizados y detectar mejor)
      const tipoParto = {
        vaginal: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          // Vaginal puro (sin instrumental)
          return (tipo === 'VAGINAL' || tipo.includes('VAGINAL')) && 
                 !tipo.includes('INSTRUMENTAL') && 
                 !tipo.includes('VACUUM') && 
                 !tipo.includes('FORCEPS') &&
                 !tipo.includes('CES')
        }).length,
        instrumental: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          // Instrumental: puede estar en tipoParto o en comentarios
          return tipo.includes('INSTRUMENTAL') || 
                 tipo.includes('VACUUM') || 
                 tipo.includes('FORCEPS') ||
                 comentarios.includes('INSTRUMENTAL') ||
                 comentarios.includes('VACUUM') ||
                 comentarios.includes('FORCEPS')
        }).length,
        cesareaElectiva: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          return tipo === 'CES ELE' || 
                 tipo === 'CESAREA ELE' ||
                 tipo.includes('CES ELE') ||
                 tipo.includes('CESAREA ELE') ||
                 (tipo.includes('CES') && tipo.includes('ELE'))
        }).length,
        cesareaUrgencia: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          return tipo === 'CES URG' || 
                 tipo === 'CESAREA URG' ||
                 tipo.includes('CES URG') ||
                 tipo.includes('CESAREA URG') ||
                 (tipo.includes('CES') && (tipo.includes('URG') || tipo.includes('URGENTE')))
        }).length,
        prehospitalario: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          const destino = String(i.destino || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          return tipo.includes('EXTRAHOSPITALARIO') || 
                 tipo.includes('PREHOSPITALARIO') ||
                 destino.includes('AMBULANCIA') || 
                 destino.includes('ESTABLECIMIENTO') ||
                 destino.includes('PREHOSPITALARIO') ||
                 comentarios.includes('AMBULANCIA') ||
                 comentarios.includes('PREHOSPITALARIO')
        }).length,
        fueraRedSalud: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          const destino = String(i.destino || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          return tipo.includes('FUERA') || 
                 tipo.includes('DOMICILIO') ||
                 destino.includes('FUERA') ||
                 destino.includes('DOMICILIO') ||
                 comentarios.includes('FUERA DE RED') ||
                 comentarios.includes('DOMICILIO')
        }).length
      }
      
      // PARTOS EN DOMICILIO (mejorado para detectar mejor)
      const partoDomicilio = {
        conAtencion: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          const destino = String(i.destino || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          const esDomicilio = tipo.includes('DOMICILIO') || 
                             destino.includes('DOMICILIO') ||
                             comentarios.includes('DOMICILIO')
          // Tiene atención si hay médico, matrona, o se menciona en comentarios
          const tieneAtencion = i.medicoObstetra || 
                               i.matronaParto || 
                               i.matronaPreparto ||
                               comentarios.includes('MEDICO') ||
                               comentarios.includes('MATRONA') ||
                               comentarios.includes('ATENCION')
          return esDomicilio && tieneAtencion
        }).length,
        sinAtencion: data.filter(i => {
          const tipo = String(i.tipoParto || '').toUpperCase().trim()
          const destino = String(i.destino || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          const esDomicilio = tipo.includes('DOMICILIO') || 
                             destino.includes('DOMICILIO') ||
                             comentarios.includes('DOMICILIO')
          // No tiene atención si no hay médico ni matrona
          const sinAtencion = !i.medicoObstetra && 
                             !i.matronaParto && 
                             !i.matronaPreparto &&
                             !comentarios.includes('MEDICO') &&
                             !comentarios.includes('MATRONA') &&
                             !comentarios.includes('ATENCION')
          return esDomicilio && sinAtencion
        }).length
      }
      
      // PLAN DE PARTO (mejorado para usar valores normalizados)
      const planParto = data.filter(i => {
        const plan = i.planDeParto
        // Puede ser 1 (normalizado) o 'SI' (string)
        return plan === 1 || 
               String(plan).toUpperCase().trim() === 'SI' ||
               String(plan).toUpperCase().trim() === 'SÍ'
      }).length
      
      // ENTREGA DE PLACENTA A SOLICITUD (mejorado para buscar mejor)
      const entregaPlacenta = data.filter(i => {
        const comentarios = String(i.comentarios || '').toUpperCase()
        const alumbramiento = i.alumbramientoConducido
        // Buscar en comentarios o en alumbramiento conducido
        return comentarios.includes('PLACENTA') || 
               comentarios.includes('ENTREGA') ||
               comentarios.includes('ENTREGA PLACENTA') ||
               (alumbramiento === 1 || String(alumbramiento).toUpperCase() === 'SI')
      }).length
      
      // EMBARAZO NO CONTROLADO (mejorado)
      const embNoControlado = data.filter(i => {
        const controlado = i.embControlado
        // Puede ser 0 (normalizado) o 'NO' (string), o null/vacío
        return controlado === 0 || 
               controlado === null ||
               controlado === '' ||
               String(controlado).toUpperCase().trim() === 'NO' ||
               String(controlado).toUpperCase().trim() === 'N'
      }).length
      
      // PARTOS SEGÚN EDAD DE LA MADRE
      const partosPorEdad = {
        menos15: data.filter(i => {
          const edad = parseInt(i.edad)
          return !isNaN(edad) && edad < 15
        }).length,
        entre15y19: data.filter(i => {
          const edad = parseInt(i.edad)
          return !isNaN(edad) && edad >= 15 && edad < 20
        }).length,
        entre20y34: data.filter(i => {
          const edad = parseInt(i.edad)
          return !isNaN(edad) && edad >= 20 && edad < 35
        }).length,
        mayor35: data.filter(i => {
          const edad = parseInt(i.edad)
          return !isNaN(edad) && edad >= 35
        }).length
      }
      
      // PARTOS PREMATUROS (considerar sobre 22 semanas)
      const prematuros = {
        menos24: data.filter(i => {
          const semanas = parseFloat(i.eg || i.semanasGestacion || 0)
          return semanas >= 22 && semanas < 24
        }).length,
        entre24y28: data.filter(i => {
          const semanas = parseFloat(i.eg || i.semanasGestacion || 0)
          return semanas >= 24 && semanas < 29
        }).length,
        entre29y32: data.filter(i => {
          const semanas = parseFloat(i.eg || i.semanasGestacion || 0)
          return semanas >= 29 && semanas < 33
        }).length,
        entre33y36: data.filter(i => {
          const semanas = parseFloat(i.eg || i.semanasGestacion || 0)
          return semanas >= 33 && semanas < 37
        }).length
      }
      
      // USO DE OXITOCINA PROFILÁCTICA (mejorado)
      const oxitocinaProfilactica = data.filter(i => {
        const oxitocina = i.conduccionOcitocica
        // Puede ser 1 (normalizado) o 'SI' (string)
        return oxitocina === 1 || 
               String(oxitocina).toUpperCase().trim() === 'SI' ||
               String(oxitocina).toUpperCase().trim() === 'SÍ'
      }).length
      
      // ANESTESIA Y/O ANALGESIA (mejorado para detectar mejor)
      const anestesiaAnalgesia = {
        neuroaxial: data.filter(i => {
          const tipo = String(i.tipoDeAnestesia || i.tipoAnestesia || '').toUpperCase().trim()
          return tipo.includes('RAQUIDEA') || 
                 tipo.includes('PERIDURAL') || 
                 tipo.includes('NEUROAXIAL') ||
                 tipo.includes('EPIDURAL') ||
                 tipo === 'RAQUIDEA' ||
                 tipo === 'PERIDURAL'
        }).length,
        oxidoNitroso: data.filter(i => {
          const tipo = String(i.tipoDeAnestesia || i.tipoAnestesia || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          return tipo.includes('OXIDO') || 
                 tipo.includes('NITROSO') ||
                 tipo.includes('N2O') ||
                 comentarios.includes('OXIDO NITROSO')
        }).length,
        endovenosa: data.filter(i => {
          const tipo = String(i.tipoDeAnestesia || i.tipoAnestesia || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          return tipo.includes('ENDOVENOSA') || 
                 tipo.includes('IV') ||
                 tipo.includes('INTRAVENOSA') ||
                 comentarios.includes('ENDOVENOSA')
        }).length,
        general: data.filter(i => {
          const tipo = String(i.tipoDeAnestesia || i.tipoAnestesia || '').toUpperCase().trim()
          return tipo.includes('GENERAL') || 
                 tipo === 'GENERAL' ||
                 tipo.includes('ANESTESIA GENERAL')
        }).length,
        local: data.filter(i => {
          const tipo = String(i.tipoDeAnestesia || i.tipoAnestesia || '').toUpperCase().trim()
          const local = i.anestesiaLocal
          // Puede estar en tipo de anestesia o en campo específico
          return tipo.includes('LOCAL') || 
                 tipo === 'LOCAL' ||
                 local === 1 || 
                 String(local).toUpperCase().trim() === 'SI'
        }).length,
        noFarmacologica: data.filter(i => {
          const noFarm = i.manejoNoFarmacologicoDelDolor
          const medidas = String(i.medidasNoFarmacologicasParaElDolorCuales || '').toUpperCase()
          // Puede ser 1 (normalizado) o 'SI' (string), o tener medidas específicas
          return noFarm === 1 || 
                 String(noFarm).toUpperCase().trim() === 'SI' ||
                 medidas.length > 0
        }).length
      }
      
      // LIGADURA TARDÍA DEL CORDÓN (>60 segundos) (mejorado)
      const ligaduraTardia = data.filter(i => {
        const ligadura = i.ligaduraTardiaCordon
        // Puede ser 1 (normalizado) o 'SI' (string)
        return ligadura === 1 || 
               String(ligadura).toUpperCase().trim() === 'SI' ||
               String(ligadura).toUpperCase().trim() === 'SÍ'
      }).length
      
      // CONTACTO PIEL A PIEL >30 MINUTOS (desglosado por peso del RN, mejorado)
      const contactoPiel = {
        conMadre: {
          rnMenor2500: data.filter(i => {
            const peso = parseFloat(i.peso || 0)
            const apego = i.apegoConPiel30Min
            const apegoStr = String(apego || '').toUpperCase().trim()
            // Puede ser 1 (normalizado), 'MADRE' (string), o tener flag específico
            return peso > 0 && peso < 2500 && 
                   (apego === 1 || 
                    apegoStr === 'MADRE' ||
                    i.apegoConPiel30MinMadre === 1)
          }).length,
          rnMayor2500: data.filter(i => {
            const peso = parseFloat(i.peso || 0)
            const apego = i.apegoConPiel30Min
            const apegoStr = String(apego || '').toUpperCase().trim()
            return peso >= 2500 && 
                   (apego === 1 || 
                    apegoStr === 'MADRE' ||
                    i.apegoConPiel30MinMadre === 1)
          }).length
        },
        conPadreAcompanante: {
          rnMenor2500: data.filter(i => {
            const peso = parseFloat(i.peso || 0)
            const apego = i.apegoConPiel30Min
            const apegoStr = String(apego || '').toUpperCase().trim()
            // Puede ser 2 (padre), 3 (otra persona), o tener flag específico
            return peso > 0 && peso < 2500 && 
                   (apego === 2 || 
                    apego === 3 ||
                    apegoStr === 'PADRE' || 
                    apegoStr.includes('OTRA PERSONA') ||
                    apegoStr.includes('ACOMPAÑANTE') ||
                    i.apegoConPiel30MinPadre === 1)
          }).length,
          rnMayor2500: data.filter(i => {
            const peso = parseFloat(i.peso || 0)
            const apego = i.apegoConPiel30Min
            const apegoStr = String(apego || '').toUpperCase().trim()
            return peso >= 2500 && 
                   (apego === 2 || 
                    apego === 3 ||
                    apegoStr === 'PADRE' || 
                    apegoStr.includes('OTRA PERSONA') ||
                    apegoStr.includes('ACOMPAÑANTE') ||
                    i.apegoConPiel30MinPadre === 1)
          }).length
        }
      }
      
      // LACTANCIA MATERNA EN PRIMEROS 60 MINUTOS (RN ≥2500grs, mejorado)
      const lactanciaPrecoz = {
        rnMenor2500: data.filter(i => {
          const peso = parseFloat(i.peso || 0)
          const lactancia = i.lactanciaPrecoz60MinDeVida
          const lactanciaStr = String(lactancia || '').toUpperCase().trim()
          return peso > 0 && peso < 2500 && 
                 (lactancia === 1 || 
                  lactanciaStr === 'SI' ||
                  lactanciaStr === 'SÍ')
        }).length,
        rnMayor2500: data.filter(i => {
          const peso = parseFloat(i.peso || 0)
          const lactancia = i.lactanciaPrecoz60MinDeVida
          const lactanciaStr = String(lactancia || '').toUpperCase().trim()
          return peso >= 2500 && 
                 (lactancia === 1 || 
                  lactanciaStr === 'SI' ||
                  lactanciaStr === 'SÍ')
        }).length
      }
      
      // ALOJAMIENTO CONJUNTO EN PUERPERIO INMEDIATO (mejorado)
      const alojamientoConjunto = data.filter(i => {
        const alojamiento = i.alojamientoConjunto
        const destino = String(i.destino || '').toUpperCase().trim()
        const alojamientoStr = String(alojamiento || '').toUpperCase().trim()
        // Puede ser 1 (normalizado), 'SI' (string), o inferirse del destino
        return alojamiento === 1 || 
               alojamientoStr === 'SI' ||
               (destino.includes('SALA') && !destino.includes('NO'))
      }).length
      
      // ATENCIÓN CON PERTINENCIA CULTURAL (mejorado)
      const pertinenciaCultural = data.filter(i => {
        const pertinencia = i.atencionConPertinenciaCultural
        const pertinenciaStr = String(pertinencia || '').toUpperCase().trim()
        return pertinencia === 1 || 
               pertinenciaStr === 'SI' ||
               pertinenciaStr === 'SÍ'
      }).length
      
      // PUEBLOS ORIGINARIOS (mejorado)
      const pueblosOriginarios = data.filter(i => {
        const pueblo = i.puebloOriginario
        const puebloStr = String(pueblo || '').toUpperCase().trim()
        // Puede ser 1 (normalizado), 'SI' (string), o tener nombre de pueblo
        return pueblo === 1 || 
               puebloStr === 'SI' ||
               (i.nombrePuebloOriginario && String(i.nombrePuebloOriginario).trim().length > 0)
      }).length
      
      // MIGRANTES (mejorado)
      const migrantes = data.filter(i => {
        const migrante = i.migrante
        const migranteStr = String(migrante || '').toUpperCase().trim()
        const nacionalidad = String(i.nacionalidad || '').trim()
        // Puede ser 1 (normalizado), 'SI' (string), o tener nacionalidad diferente
        return migrante === 1 || 
               migranteStr === 'SI' ||
               migranteStr === 'SÍ' ||
               (nacionalidad.length > 0 && nacionalidad.toUpperCase() !== 'CHILE' && nacionalidad.toUpperCase() !== 'CHILENA')
      }).length
      
      // DISCAPACIDAD (mejorado)
      const discapacidad = data.filter(i => {
        const disc = i.discapacidad
        const discStr = String(disc || '').toUpperCase().trim()
        const comentarios = String(i.comentarios || '').toUpperCase()
        // Puede ser 1 (normalizado), 'SI' (string), o mencionarse en comentarios
        return disc === 1 || 
               discStr === 'SI' ||
               discStr === 'SÍ' ||
               comentarios.includes('DISCAPACIDAD')
      }).length
      
      // PRIVADA DE LIBERTAD (mejorado)
      const privadaLibertad = data.filter(i => {
        const privada = i.privadaDeLibertad
        const privadaStr = String(privada || '').toUpperCase().trim()
        const comentarios = String(i.comentarios || '').toUpperCase()
        // Puede ser 1 (normalizado), 'SI' (string), o mencionarse en comentarios
        return privada === 1 || 
               privadaStr === 'SI' ||
               privadaStr === 'SÍ' ||
               comentarios.includes('PRIVADA') ||
               comentarios.includes('LIBERTAD')
      }).length
      
      // IDENTIDAD DE GÉNERO (mejorado)
      const identidadGenero = {
        transMasculino: data.filter(i => {
          const identidad = String(i.identidadGenero || i.transNoBinario || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          return identidad.includes('TRANS') && identidad.includes('MASCULINO') ||
                 comentarios.includes('TRANS MASCULINO') ||
                 comentarios.includes('TRANSGENERO MASCULINO')
        }).length,
        noBinarie: data.filter(i => {
          const identidad = String(i.identidadGenero || i.transNoBinario || '').toUpperCase().trim()
          const comentarios = String(i.comentarios || '').toUpperCase()
          return identidad.includes('NO BINARIE') || 
                 identidad.includes('NO BINARIO') || 
                 identidad.includes('NOBINARIE') ||
                 identidad.includes('NON-BINARY') ||
                 comentarios.includes('NO BINARIE') ||
                 comentarios.includes('NO BINARIO')
        }).length
      }

      const stats = {
        total,
        tipoParto,
        partoDomicilio,
        planParto,
        entregaPlacenta,
        embNoControlado,
        partosPorEdad,
        prematuros,
        oxitocinaProfilactica,
        anestesiaAnalgesia,
        ligaduraTardia,
        contactoPiel,
        lactanciaPrecoz,
        alojamientoConjunto,
        pertinenciaCultural,
        pueblosOriginarios,
        migrantes,
        discapacidad,
        privadaLibertad,
        identidadGenero,
        porcentajes: {
          planParto: total > 0 ? ((planParto / total) * 100).toFixed(1) : '0',
          embNoControlado: total > 0 ? ((embNoControlado / total) * 100).toFixed(1) : '0',
          oxitocinaProfilactica: total > 0 ? ((oxitocinaProfilactica / total) * 100).toFixed(1) : '0',
          ligaduraTardia: total > 0 ? ((ligaduraTardia / total) * 100).toFixed(1) : '0',
          alojamientoConjunto: total > 0 ? ((alojamientoConjunto / total) * 100).toFixed(1) : '0',
          pertinenciaCultural: total > 0 ? ((pertinenciaCultural / total) * 100).toFixed(1) : '0'
        }
      }

      const prompt = `Eres un asistente de IA especializado en análisis de datos de partos hospitalarios. Responde la siguiente pregunta del usuario de forma clara, concisa y técnica usando EXACTAMENTE los datos proporcionados.

Pregunta del usuario: "${userMessage}"

Datos disponibles (usa estos datos exactos para responder):

**TIPOS DE PARTO:**
- Vaginal: ${stats.tipoParto.vaginal} (${total > 0 ? ((stats.tipoParto.vaginal / total) * 100).toFixed(1) : '0'}%)
- Instrumental: ${stats.tipoParto.instrumental} (${total > 0 ? ((stats.tipoParto.instrumental / total) * 100).toFixed(1) : '0'}%)
- Cesárea Electiva: ${stats.tipoParto.cesareaElectiva} (${total > 0 ? ((stats.tipoParto.cesareaElectiva / total) * 100).toFixed(1) : '0'}%)
- Cesárea Urgencia: ${stats.tipoParto.cesareaUrgencia} (${total > 0 ? ((stats.tipoParto.cesareaUrgencia / total) * 100).toFixed(1) : '0'}%)
- Parto prehospitalario: ${stats.tipoParto.prehospitalario} (${total > 0 ? ((stats.tipoParto.prehospitalario / total) * 100).toFixed(1) : '0'}%)
- Partos fuera de la red de salud: ${stats.tipoParto.fueraRedSalud} (${total > 0 ? ((stats.tipoParto.fueraRedSalud / total) * 100).toFixed(1) : '0'}%)

**PARTOS EN DOMICILIO:**
- Con atención profesional: ${stats.partoDomicilio.conAtencion}
- Sin atención profesional: ${stats.partoDomicilio.sinAtencion}

**PLAN DE PARTO:** ${stats.planParto} (${stats.porcentajes.planParto}%)

**ENTREGA DE PLACENTA A SOLICITUD:** ${stats.entregaPlacenta}

**EMBARAZO NO CONTROLADO:** ${stats.embNoControlado} (${stats.porcentajes.embNoControlado}%)

**PARTOS SEGÚN EDAD DE LA MADRE:**
- < 15 años: ${stats.partosPorEdad.menos15}
- 15-19 años: ${stats.partosPorEdad.entre15y19}
- 20-34 años: ${stats.partosPorEdad.entre20y34}
- ≥35 años: ${stats.partosPorEdad.mayor35}

**PARTOS PREMATUROS (≥22 semanas):**
- < 24 semanas: ${stats.prematuros.menos24}
- 24-28 semanas: ${stats.prematuros.entre24y28}
- 29-32 semanas: ${stats.prematuros.entre29y32}
- 33-36 semanas: ${stats.prematuros.entre33y36}

**USO DE OXITOCINA PROFILÁCTICA:** ${stats.oxitocinaProfilactica} (${stats.porcentajes.oxitocinaProfilactica}%)

**ANESTESIA Y/O ANALGESIA:**
- Neuroaxial (Raquídea/Peridural): ${stats.anestesiaAnalgesia.neuroaxial}
- Óxido nitroso: ${stats.anestesiaAnalgesia.oxidoNitroso}
- Analgesia endovenosa: ${stats.anestesiaAnalgesia.endovenosa}
- General: ${stats.anestesiaAnalgesia.general}
- Local: ${stats.anestesiaAnalgesia.local}
- Medidas no farmacológicas: ${stats.anestesiaAnalgesia.noFarmacologica}

**LIGADURA TARDÍA DEL CORDÓN (>60 segundos):** ${stats.ligaduraTardia} (${stats.porcentajes.ligaduraTardia}%)

**CONTACTO PIEL A PIEL >30 MINUTOS:**

**Con la Madre:**
- RN peso ≤2.499 grs.: ${stats.contactoPiel.conMadre.rnMenor2500}
- RN peso ≥2.500 grs.: ${stats.contactoPiel.conMadre.rnMayor2500}
- Total con la Madre: ${stats.contactoPiel.conMadre.rnMenor2500 + stats.contactoPiel.conMadre.rnMayor2500}

**Con el padre o acompañante significativo:**
- RN peso ≤2.499 grs.: ${stats.contactoPiel.conPadreAcompanante.rnMenor2500}
- RN peso ≥2.500 grs.: ${stats.contactoPiel.conPadreAcompanante.rnMayor2500}
- Total con padre/acompañante: ${stats.contactoPiel.conPadreAcompanante.rnMenor2500 + stats.contactoPiel.conPadreAcompanante.rnMayor2500}

**LACTANCIA MATERNA EN PRIMEROS 60 MINUTOS:**
- RN peso ≤2.499 grs.: ${stats.lactanciaPrecoz.rnMenor2500}
- RN peso ≥2.500 grs.: ${stats.lactanciaPrecoz.rnMayor2500}

**ALOJAMIENTO CONJUNTO EN PUERPERIO INMEDIATO:** ${stats.alojamientoConjunto} (${stats.porcentajes.alojamientoConjunto}%)

**ATENCIÓN CON PERTINENCIA CULTURAL:** ${stats.pertinenciaCultural} (${stats.porcentajes.pertinenciaCultural}%)

**PUEBLOS ORIGINARIOS:** ${stats.pueblosOriginarios}

**MIGRANTES:** ${stats.migrantes}

**DISCAPACIDAD:** ${stats.discapacidad}

**PRIVADA DE LIBERTAD:** ${stats.privadaLibertad}

**IDENTIDAD DE GÉNERO:**
- Trans masculino: ${stats.identidadGenero.transMasculino}
- No binarie: ${stats.identidadGenero.noBinarie}

**TOTAL DE REGISTROS:** ${total}

Instrucciones:
- Responde DIRECTAMENTE la pregunta usando los datos exactos proporcionados
- Si la pregunta requiere cálculos específicos (porcentajes, tasas, etc.), calcúlalos usando los números proporcionados
- Proporciona números absolutos y porcentajes cuando sea relevante
- Si la pregunta es sobre una variable específica, usa el dato exacto de esa variable
- Mantén la respuesta concisa pero completa (máximo 200 palabras)
- Usa un tono profesional pero accesible
- Si la pregunta requiere datos que no están disponibles, indícalo claramente

Responde en español.`

      const response = await analyzeDataWithAI(data, prompt)
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      console.error('Error en chatbot:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta nuevamente.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <motion.button
        className="chatbot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? '✕' : '💬'}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-container"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="chatbot-header">
              <h3>🤖 Asistente de IA</h3>
              <button onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="chatbot-messages">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  className={`message ${msg.role}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="message-content">{msg.content}</div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="message assistant">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chatbot-input">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta..."
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIChatbot



