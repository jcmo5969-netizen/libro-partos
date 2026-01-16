// Implementación alternativa usando fetch directo a la API REST de Gemini
// Esto evita problemas con la versión del SDK

// Obtener API key desde variables de entorno o usar la hardcodeada como fallback
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '***REMOVED-SECRET***'

// Lista de modelos a intentar en orden de preferencia
// Nota: Algunos modelos pueden no estar disponibles, se verificarán dinámicamente
const MODEL_OPTIONS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
]

/**
 * Obtiene la lista de modelos disponibles desde la API
 */
async function getAvailableModels() {
  try {
    // Intentar con v1beta primero, luego v1
    const versions = ['v1beta', 'v1']
    
    for (const version of versions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`
        console.log(`🔍 Consultando modelos disponibles con ${version}...`)
        const response = await fetch(url)
        
        if (!response.ok) {
          console.log(`⚠️ ${version} no disponible: HTTP ${response.status}`)
          continue
        }
        
        const data = await response.json()
        if (data.models && Array.isArray(data.models)) {
          // Obtener todos los modelos que soportan generateContent
          const allAvailable = data.models
            .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
            .map(model => {
              // El nombre puede venir como "models/gemini-pro" o "gemini-pro"
              const name = model.name.replace(/^models\//, '')
              return name
            })
          
          console.log(`📋 Todos los modelos disponibles (${version}):`, allAvailable)
          
          // Filtrar solo los que están en nuestra lista de preferencia
          const preferredModels = allAvailable.filter(name => MODEL_OPTIONS.includes(name))
          
          if (preferredModels.length > 0) {
            console.log(`✅ Modelos preferidos disponibles:`, preferredModels)
            return preferredModels
          }
          
          // Si no hay modelos preferidos, usar cualquier modelo disponible que contenga "gemini"
          const geminiModels = allAvailable.filter(name => name.toLowerCase().includes('gemini'))
          if (geminiModels.length > 0) {
            console.log(`✅ Modelos Gemini encontrados:`, geminiModels)
            return geminiModels
          }
        }
      } catch (error) {
        console.log(`⚠️ Error con ${version}:`, error.message)
        continue
      }
    }
    
    console.log(`⚠️ No se pudieron obtener modelos disponibles, usando lista por defecto`)
    return MODEL_OPTIONS
  } catch (error) {
    console.log(`⚠️ Error obteniendo modelos disponibles:`, error.message)
    return MODEL_OPTIONS // Fallback a la lista por defecto
  }
}

/**
 * Llama directamente a la API REST de Gemini usando fetch
 * Intenta con v1 y v1beta para máxima compatibilidad
 */
async function callGeminiAPI(modelName, prompt) {
  // Intentar primero con v1, luego con v1beta
  const apiVersions = ['v1', 'v1beta']
  
  for (const version of apiVersions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${API_KEY}`
      
      console.log(`🔗 Intentando con ${version}: ${url.substring(0, 80)}...`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })

      const responseText = await response.text()
      console.log(`📥 Respuesta HTTP ${response.status} de ${version}`)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error?.message || errorMessage
          console.log(`❌ Error de ${version}:`, errorMessage)
        } catch (e) {
          console.log(`❌ Error de ${version} (sin JSON):`, responseText.substring(0, 200))
        }
        
        // Si es 404 o el modelo no está disponible, intentar con la siguiente versión
        if (response.status === 404 || errorMessage.includes('not found') || errorMessage.includes('not supported')) {
          if (version === 'v1') {
            console.log(`   → Modelo no disponible en v1, intentando v1beta...`)
            continue
          } else {
            // Si ya intentamos ambas versiones, lanzar el error
            throw new Error(errorMessage)
          }
        }
        
        // Para otros errores, lanzar inmediatamente
        throw new Error(errorMessage)
      }

      const data = JSON.parse(responseText)
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('La API no devolvió una respuesta válida')
      }

      const text = data.candidates[0].content.parts[0].text
      if (!text || text.trim() === '') {
        throw new Error('La respuesta está vacía')
      }

      console.log(`✅ Éxito con ${version} y modelo ${modelName}`)
      return text
    } catch (error) {
      // Si es el último intento, relanzar el error
      if (version === apiVersions[apiVersions.length - 1]) {
        throw error
      }
      // Si no, continuar con la siguiente versión
      console.log(`⚠️ ${version} falló, intentando siguiente versión...`)
      continue
    }
  }
}

export async function analyzeDataWithAI(data, customPrompt = null) {
  try {
    if (!data || data.length === 0) {
      throw new Error('No hay datos para analizar')
    }

    console.log('🔄 Iniciando análisis de IA...')
    console.log(`📊 Total de registros a analizar: ${data.length}`)
    
    // Si hay un prompt personalizado, usarlo directamente
    if (customPrompt) {
      console.log('📝 Usando prompt personalizado')
      const summary = prepareDataSummary(data)
      const fullPrompt = `${customPrompt}\n\nDatos del resumen:\n${JSON.stringify(summary, null, 2)}`
      
      // Obtener modelos disponibles
      const availableModels = await getAvailableModels()
      if (availableModels.length === 0) {
        throw new Error('No se encontraron modelos disponibles. Verifica tu API key en https://aistudio.google.com/')
      }
      
      // Intentar con cada modelo
      let lastError = null
      for (const modelName of availableModels) {
        try {
          console.log(`🔄 Intentando con modelo: ${modelName}...`)
          const text = await callGeminiAPI(modelName, fullPrompt)
          console.log(`✅ Análisis recibido exitosamente con modelo: ${modelName}`)
          return text
        } catch (error) {
          lastError = error
          const errorMsg = error.message || error.toString()
          console.log(`⚠️ Modelo ${modelName} falló: ${errorMsg.substring(0, 200)}`)
          if (errorMsg.includes('404') || errorMsg.includes('not found')) {
            continue
          }
          if (errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('API_KEY')) {
            throw new Error('Error de autenticación con la API. Verifica que tu API key sea válida.')
          }
          continue
        }
      }
      
      if (lastError) {
        throw lastError
      }
    }
    
    // Preparar resumen de datos para el análisis
    const summary = prepareDataSummary(data)
    console.log('📋 Resumen de datos preparado:', Object.keys(summary))
    
    const prompt = `Eres un analista de datos médicos especializado en obstetricia y ginecología. 
Analiza los siguientes datos de partos hospitalarios y proporciona un análisis técnico, objetivo y profesional.

IMPORTANTE - TRAZABILIDAD DE DATOS:
Los datos incluyen información de trazabilidad que permite rastrear relaciones entre registros:
- Cada registro tiene un ID único (_traceId) para identificación persistente
- Los registros están relacionados por RUT de la madre (_relations.relatedPartos) para rastrear múltiples partos de la misma madre
- Existen relaciones por consultorio, comuna, mes, médico y matrona para análisis cruzados
- Los datos están estructurados en _structuredData para facilitar análisis específicos por categoría (madre, parto, recién nacido, indicadores)
- Puedes usar esta información para hacer análisis de trazabilidad, seguimiento de pacientes, y correlaciones entre partos relacionados

Datos del resumen:
${JSON.stringify(summary, null, 2)}

IMPORTANTE - VARIABLES CALCULADAS AUTOMÁTICAMENTE:
Los siguientes datos han sido calculados automáticamente y DEBES usarlos en tu análisis:

**PARTOS SEGÚN EDAD DE LA MADRE:**
- < 15 años: ${summary.partosPorEdad?.menos15 || 0}
- 15-19 años: ${summary.partosPorEdad?.entre15y19 || 0}
- 20-34 años: ${summary.partosPorEdad?.entre20y34 || 0}
- ≥35 años: ${summary.partosPorEdad?.mayor35 || 0}

**PARTOS PREMATUROS (≥22 semanas):**
- < 24 semanas: ${summary.prematurosPorRango?.menos24 || 0}
- 24-28 semanas: ${summary.prematurosPorRango?.entre24y28 || 0}
- 29-32 semanas: ${summary.prematurosPorRango?.entre29y32 || 0}
- 33-36 semanas: ${summary.prematurosPorRango?.entre33y36 || 0}

**TIPOS DE PARTO DETALLADOS:**
- Vaginal: ${summary.tipoPartoDetallado?.vaginal || 0}
- Instrumental: ${summary.tipoPartoDetallado?.instrumental || 0}
- Cesárea Electiva: ${summary.tipoPartoDetallado?.cesareaElectiva || 0}
- Cesárea Urgencia: ${summary.tipoPartoDetallado?.cesareaUrgencia || 0}
- Prehospitalario: ${summary.tipoPartoDetallado?.prehospitalario || 0}
- Fuera de Red de Salud: ${summary.tipoPartoDetallado?.fueraRedSalud || 0}

**PARTOS EN DOMICILIO:**
- Con atención profesional: ${summary.partoDomicilio?.conAtencion || 0}
- Sin atención profesional: ${summary.partoDomicilio?.sinAtencion || 0}

**ANESTESIA Y/O ANALGESIA:**
- Oxitocina profiláctica: ${summary.oxitocinaProfilactica || 0}
- Neuroaxial (Raquídea/Peridural): ${summary.anestesiaAnalgesia?.neuroaxial || 0}
- Óxido nitroso: ${summary.anestesiaAnalgesia?.oxidoNitroso || 0}
- Analgesia endovenosa: ${summary.anestesiaAnalgesia?.endovenosa || 0}
- General: ${summary.anestesiaAnalgesia?.general || 0}
- Local: ${summary.anestesiaAnalgesia?.local || 0}
- Medidas no farmacológicas: ${summary.anestesiaAnalgesia?.noFarmacologica || 0}

**CONTACTO PIEL A PIEL >30 MINUTOS:**
- Con la Madre - RN ≤2.499 grs.: ${summary.contactoPiel?.conMadre?.rnMenor2500 || 0}
- Con la Madre - RN ≥2.500 grs.: ${summary.contactoPiel?.conMadre?.rnMayor2500 || 0}
- Con padre/acompañante - RN ≤2.499 grs.: ${summary.contactoPiel?.conPadreAcompanante?.rnMenor2500 || 0}
- Con padre/acompañante - RN ≥2.500 grs.: ${summary.contactoPiel?.conPadreAcompanante?.rnMayor2500 || 0}

**OTROS INDICADORES:**
- Plan de parto: ${summary.planParto || 0}
- Entrega de placenta a solicitud: ${summary.entregaPlacenta || 0}
- Embarazo no controlado: ${summary.embNoControlado || 0}
- Ligadura tardía del cordón (>60s): ${summary.ligaduraTardia || 0}
- Lactancia precoz (60 min, RN ≥2500g): ${summary.lactanciaPrecoz || 0}
- Alojamiento conjunto: ${summary.alojamientoConjunto || 0}
- Atención con pertinencia cultural: ${summary.pertinenciaCultural || 0}
- Pueblos originarios: ${summary.pueblosOriginarios || 0}
- Migrantes: ${summary.migrantes || 0}
- Discapacidad: ${summary.discapacidad || 0}
- Privada de libertad: ${summary.privadaLibertad || 0}
- Identidad de género - Trans masculino: ${summary.identidadGenero?.transMasculino || 0}
- Identidad de género - No binarie: ${summary.identidadGenero?.noBinarie || 0}

**PARTOS VAGINALES (SECCIÓN A.1):**
- Total partos vaginales: ${summary.partosVaginales?.total || 0}
- Espontáneo: ${summary.partosVaginales?.espontaneo || 0}
- Inducidos - Total: ${summary.partosVaginales?.inducidos?.total || 0}
- Inducidos - Mecánica: ${summary.partosVaginales?.inducidos?.mecanica || 0}
- Inducidos - Farmacológica: ${summary.partosVaginales?.inducidos?.farmacologica || 0}
- Conducción oxitócica: ${summary.partosVaginales?.conduccionOxitocica || 0}
- Libertad de movimiento: ${summary.partosVaginales?.libertadMovimiento || 0}
- Régimen hídrico amplio: ${summary.partosVaginales?.regimenHidricoAmplio || 0}
- Manejo del dolor - No farmacológico: ${summary.partosVaginales?.manejoDolor?.noFarmacologico || 0}
- Manejo del dolor - Farmacológico: ${summary.partosVaginales?.manejoDolor?.farmacologico || 0}
- Posición expulsivo - Litotomía: ${summary.partosVaginales?.posicionExpulsivo?.litotomia || 0}
- Posición expulsivo - Otras posiciones: ${summary.partosVaginales?.posicionExpulsivo?.otrasPosiciones || 0}
- Episiotomía: ${summary.partosVaginales?.episiotomia || 0}
- Acompañamiento - Durante trabajo de parto: ${summary.partosVaginales?.acompanamiento?.duranteTrabajoParto || 0}
- Acompañamiento - Sólo en expulsivo: ${summary.partosVaginales?.acompanamiento?.soloExpulsivo || 0}

**PARTOS VAGINALES POR SEMANAS DE GESTACIÓN:**
- <28 semanas - Total: ${summary.partosVaginales?.porSemanas?.menos28?.total || 0}
- <28 semanas - Espontáneo: ${summary.partosVaginales?.porSemanas?.menos28?.espontaneo || 0}
- <28 semanas - Inducidos: ${summary.partosVaginales?.porSemanas?.menos28?.inducidos || 0}
- 28-37 semanas - Total: ${summary.partosVaginales?.porSemanas?.entre28y37?.total || 0}
- 28-37 semanas - Espontáneo: ${summary.partosVaginales?.porSemanas?.entre28y37?.espontaneo || 0}
- 28-37 semanas - Inducidos: ${summary.partosVaginales?.porSemanas?.entre28y37?.inducidos || 0}
- ≥38 semanas - Total: ${summary.partosVaginales?.porSemanas?.mas38?.total || 0}
- ≥38 semanas - Espontáneo: ${summary.partosVaginales?.porSemanas?.mas38?.espontaneo || 0}
- ≥38 semanas - Inducidos: ${summary.partosVaginales?.porSemanas?.mas38?.inducidos || 0}

**RECIÉN NACIDOS VIVOS (SECCIÓN D.1):**
- Total nacidos vivos: ${summary.recienNacidosVivos?.total || 0}
- Peso al nacer - Menos de 500 grs.: ${summary.recienNacidosVivos?.porPeso?.menos500 || 0}
- Peso al nacer - 500 a 999 grs.: ${summary.recienNacidosVivos?.porPeso?.entre500y999 || 0}
- Peso al nacer - 1.000 a 1.499 grs.: ${summary.recienNacidosVivos?.porPeso?.entre1000y1499 || 0}
- Peso al nacer - 1.500 a 1.999 grs.: ${summary.recienNacidosVivos?.porPeso?.entre1500y1999 || 0}
- Peso al nacer - 2.000 a 2.499 grs.: ${summary.recienNacidosVivos?.porPeso?.entre2000y2499 || 0}
- Peso al nacer - 2.500 a 2.999 grs.: ${summary.recienNacidosVivos?.porPeso?.entre2500y2999 || 0}
- Peso al nacer - 3.000 a 3.999 grs.: ${summary.recienNacidosVivos?.porPeso?.entre3000y3999 || 0}
- Peso al nacer - 4.000 y más grs.: ${summary.recienNacidosVivos?.porPeso?.mas4000 || 0}
- Anomalía Congénita: ${summary.recienNacidosVivos?.anomaliaCongenita || 0}

DEBES incluir estos datos calculados en tu análisis y crear tablas estructuradas cuando sea apropiado.

INSTRUCCIONES DE ESTILO:
- Usa un tono formal, técnico y objetivo
- Evita lenguaje conversacional o diálogo directo
- Presenta información de manera directa y concisa
- Usa terminología médica apropiada
- Mantén un enfoque profesional y serio
- Evita frases como "Es importante", "Debemos", "Se recomienda" - en su lugar, presenta hechos y conclusiones directamente

Proporciona un análisis estructurado con el siguiente formato:

## 📊 ANÁLISIS GENERAL

### Resumen Ejecutivo
Resumen ejecutivo conciso de 2 párrafos máximo que presente los hallazgos principales de manera objetiva y directa, sin lenguaje conversacional. Incluir datos numéricos clave.

### Comparación con Estándares Internacionales
Análisis comparativo conciso de los 3-4 indicadores más relevantes respecto a los estándares de la OMS. 

**FORMATO OBLIGATORIO - Usar listas con viñetas:**
- **Tasa de Cesáreas:** [valor actual] vs [estándar OMS] - [breve conclusión]
- **Tasa de Prematuridad:** [valor actual] vs [estándar internacional] - [breve conclusión]
- **Tasa de Bajo Peso al Nacer:** [valor actual] vs [estándar OMS] - [breve conclusión]
- **Apgar Bajo:** [valor actual] vs [estándar de calidad] - [breve conclusión]

Máximo 4 comparaciones. Cada indicador debe estar en formato de lista con el nombre en negrita seguido de ":" y luego el análisis.

## ✅ ASPECTOS POSITIVOS Y FORTALEZAS

Identificación de aspectos positivos, fortalezas y buenas prácticas observadas en los datos.

**FORMATO PARA CADA ASPECTO POSITIVO - Usar listas:**

- **Título del Aspecto Positivo:**
  - **Dato numérico:** [valor específico con porcentaje o cantidad]
  - **Justificación Técnica:** [explicación breve y técnica del por qué es positivo]
  - **Impacto Cuantificable:** [impacto medible en salud materno-infantil]

Ejemplo:
- **Alta Tasa de Partos Vaginales:**
  - **Dato numérico:** Se registraron 286 partos vaginales, representando el 42.4% del total.
  - **Justificación Técnica:** La promoción del parto vaginal se asocia con menores tasas de morbilidad materna y neonatal en comparación con la cesárea, siempre y cuando no existan contraindicaciones médicas.
  - **Impacto Cuantificable:** Contribuye a una mejor recuperación postparto materna y menor riesgo de complicaciones quirúrgicas.

Presentar de forma concisa, máximo 3-4 aspectos positivos principales. Cada aspecto debe estar en formato de lista.

## ⚠️ ÁREAS DE MEJORA Y OPORTUNIDADES

Identificación de áreas que requieren atención.

**FORMATO PARA CADA ÁREA DE MEJORA - Usar listas:**

- **Título del Área de Mejora:**
  - **Indicador actual:** [valor específico con porcentaje o cantidad]
  - **Estándar de referencia:** [valor recomendado por OMS u organización internacional]
  - **Impacto Potencial:** [impacto medible si se mejora]
  - **Prioridad:** [ALTA/MEDIA/BAJA]

Presentar de forma concisa, máximo 4-5 áreas principales, priorizando las de ALTA prioridad. Cada área debe estar en formato de lista.

## 💡 RECOMENDACIONES ESTRATÉGICAS

Recomendaciones concretas, accionables y priorizadas basadas en evidencia.

**FORMATO OBLIGATORIO PARA CADA RECOMENDACIÓN:**

Título de la Recomendación (ALTA)
Contenido técnico en párrafos continuos que incluya: justificación basada en evidencia, objetivo específico con métricas, acciones concretas, recursos necesarios, tiempo estimado e indicadores de éxito medibles. Presentar de forma directa y técnica, sin lenguaje conversacional.

**EJEMPLO DEL FORMATO REQUERIDO:**

Reducir la Tasa de Cesáreas a Niveles Recomendados por la OMS (ALTA)
La tasa actual de cesáreas (X%) excede significativamente la recomendación de la OMS (10-15%). La implementación de programas de educación para profesionales de la salud sobre indicaciones apropiadas de cesárea y riesgos asociados es necesaria. Se requiere fomentar el uso de partogramas, apoyo continuo durante el trabajo de parto, estrategias para parto vaginal (VBAC), auditorías de cesáreas por grupo de Robson para identificar grupos contribuyentes, y establecimiento de un comité de revisión de cesáreas para justificación clínica.

Organizar las recomendaciones por prioridad (ALTA primero, luego MEDIA, luego BAJA) y categorías:
- Prácticas clínicas
- Educación y capacitación
- Políticas y protocolos
- Recursos y equipamiento
- Monitoreo y evaluación

IMPORTANTE: Cada recomendación debe seguir EXACTAMENTE el formato: "Título (PRIORIDAD)" seguido de párrafos técnicos continuos, sin listas ni viñetas. Usar lenguaje formal y objetivo.

## 📈 INSIGHTS Y TENDENCIAS

### Análisis por Categorías

**Tipos de Parto:**
- Distribución detallada con porcentajes (Vaginal, Instrumental, Cesárea Electiva, Cesárea Urgencia, Prehospitalario, Fuera de Red de Salud)
- Comparación con estándares (OMS recomienda 10-15% cesáreas)
- Análisis de indicaciones y justificación clínica
- Tendencias observadas
- Partos en domicilio (con y sin atención profesional)

**Edad Materna y Paridad:**
- Distribución por grupos etarios específicos (<15 años, 15-19 años, 20-34 años, ≥35 años)
- Relación entre edad y tipo de parto
- Análisis de paridad y su impacto
- Observaciones sobre grupos de riesgo

**Recién Nacido:**
- Peso promedio y distribución (comparar con estándares: 2500-4000g normal)
- Semanas de gestación promedio (prematuridad <37 semanas)
- Distribución por sexo
- Análisis de casos especiales (bajo peso, prematuros, Apgar bajo)
- Tasa de complicaciones neonatales
- **Partos Prematuros por Rangos (≥22 semanas):**
  - Menos de 24 semanas
  - 24-28 semanas
  - 29-32 semanas
  - 33-36 semanas

**Anestesia y/o Analgesia del Parto:**
- Uso de oxitocina profiláctica
- Anestesia neuroaxial (Raquídea/Peridural)
- Óxido nitroso
- Analgesia endovenosa
- Anestesia general
- Anestesia local
- Medidas no farmacológicas para el dolor

**Prácticas de Humanización:**
- Plan de parto
- Entrega de placenta a solicitud
- Embarazo controlado vs no controlado
- Ligadura tardía del cordón (>60 segundos)
- Libertad de movimiento
- Apego piel a piel >30 minutos (con desglose por peso del RN y si es con madre o padre/acompañante)
- Lactancia materna precoz (60 min de vida, RN ≥2500g)
- Alojamiento conjunto en puerperio inmediato
- Restricción de episiotomía

**Atención con Pertinencia Cultural y Diversidad:**
- Atención con pertinencia cultural
- Pueblos originarios
- Migrantes
- Discapacidad
- Privada de libertad
- Identidad de género (Trans masculino, No binarie)

**Partos Vaginales - Modelo de Atención (Sección A.1):**
- Partos espontáneos vs inducidos (mecánica y farmacológica)
- Conducción oxitócica
- Libertad de movimiento durante el trabajo de parto
- Régimen hídrico amplio
- Manejo del dolor (farmacológico y no farmacológico)
- Posición materna en el expulsivo (litotomía vs otras posiciones)
- Uso de episiotomía
- Acompañamiento (durante trabajo de parto y solo en expulsivo)
- Desglose por semanas de gestación (<28, 28-37, ≥38 semanas)

**Recién Nacidos Vivos (Sección D.1):**
- Distribución por peso al nacer en rangos específicos (menos de 500g, 500-999g, 1000-1499g, 1500-1999g, 2000-2499g, 2500-2999g, 3000-3999g, 4000g y más)
- Tasa de anomalías congénitas
- Análisis de distribución de peso y su relación con otros indicadores

### 📊 TABLAS DE CONTINGENCIA Y ANÁLISIS CRUZADOS

**OBLIGATORIO:** Debes crear y analizar tablas de contingencia detalladas usando los datos proporcionados en "tablasContingencia". Presenta cada tabla con números exactos y porcentajes.

**1. Anestesia por Grupos de Edad:**
- Crea una tabla de contingencia mostrando la distribución de tipos de anestesia (General, Raquídea, Peridural, Sin anestesia, etc.) por grupos de edad (< 25, 25-29, 30-34, ≥ 35 años)
- Calcula y presenta el número exacto de personas en cada celda de la tabla
- Analiza patrones: ¿Qué grupo de edad recibe más anestesia general? ¿Hay diferencias significativas?
- Ejemplo de formato requerido:
  | Grupo de Edad | Anestesia General | Raquídea | Peridural | Sin Anestesia | Total |
  |---------------|------------------|----------|-----------|---------------|-------|
  | < 25 años     | X (Y%)           | X (Y%)   | X (Y%)    | X (Y%)        | X     |
  | 25-29 años    | X (Y%)           | X (Y%)   | X (Y%)    | X (Y%)        | X     |
  | ...           | ...              | ...      | ...       | ...           | ...   |

**2. Tipo de Parto por Grupos de Edad:**
- Tabla cruzando tipo de parto (Vaginal, Cesárea Electiva, Cesárea Urgente, etc.) con grupos de edad
- Identifica si hay grupos de edad con mayor tasa de cesáreas
- Calcula porcentajes por fila y columna

**3. Tipo de Parto por Paridad:**
- Tabla cruzando tipo de parto con paridad (Primípara, Multípara)
- Analiza diferencias en tasas de cesárea entre primíparas y multíparas
- Calcula riesgos relativos si es relevante

**4. Anestesia por Tipo de Parto:**
- Tabla mostrando qué tipo de anestesia se usa más frecuentemente según el tipo de parto
- Identifica patrones: ¿Las cesáreas siempre usan anestesia general o raquídea?

**5. Peso al Nacer por Edad Materna:**
- Tabla cruzando grupos de edad materna con categorías de peso (Bajo peso <2500g, Normal 2500-4000g, Macrosomía ≥4000g)
- Presenta promedios de peso por grupo de edad
- Analiza si la edad materna influye en el peso del recién nacido

**6. Prematuridad por Tipo de Parto:**
- Tabla cruzando tipo de parto con prematuridad (Prematuro <37 semanas, A término ≥37 semanas)
- Analiza si ciertos tipos de parto están asociados con mayor prematuridad
- Calcula tasas de prematuridad por tipo de parto

**7. Apgar Bajo por Tipo de Parto:**
- Tabla cruzando tipo de parto con Apgar bajo (<7) vs normal (≥7)
- Identifica si hay tipos de parto asociados con peores resultados neonatales

**8. Episiotomía por Paridad:**
- Tabla cruzando paridad con presencia de episiotomía
- Analiza si las primíparas tienen mayor tasa de episiotomía

**INSTRUCCIONES PARA TABLAS DE CONTINGENCIA:**
- Cada tabla debe incluir números absolutos y porcentajes
- Calcula porcentajes por fila (distribución dentro de cada grupo) y por columna (distribución dentro de cada categoría)
- Identifica las celdas con mayor frecuencia y analiza por qué
- Compara las distribuciones entre grupos y busca diferencias significativas
- Si una tabla muestra que "7 personas recibieron anestesia general" y hay "180 personas < 25 años", calcula exactamente cuántas de esas 7 están en cada grupo de edad
- Si no es posible determinar la distribución exacta desde los datos agregados, indica claramente esta limitación y explica qué análisis adicional sería necesario

### Correlaciones y Patrones Avanzados
- Identifica relaciones estadísticas entre variables usando las tablas de contingencia
- Calcula riesgos relativos cuando sea apropiado
- Identifica factores de riesgo y factores protectores
- Analiza interacciones entre variables (ej: edad + paridad + tipo de parto)

## 🎯 PLAN DE ACCIÓN SUGERIDO

Proporciona un plan de acción priorizado con:
1. Acciones inmediatas (0-3 meses)
2. Acciones a corto plazo (3-6 meses)
3. Acciones a mediano plazo (6-12 meses)
4. Acciones a largo plazo (12+ meses)

Para cada acción, indica responsables sugeridos y recursos necesarios.

## 📊 MÉTRICAS DE SEGUIMIENTO

Sugiere indicadores clave para monitorear el progreso:
- Indicadores de proceso
- Indicadores de resultado
- Frecuencia de medición
- Metas específicas

## 🔍 ALERTAS Y CASOS ESPECIALES

Identifica casos que requieren atención inmediata o seguimiento especial, incluyendo:
- Indicadores críticos que superan umbrales de seguridad
- Tendencias preocupantes
- Casos atípicos que requieren investigación

---

INSTRUCCIONES DE FORMATO:
- Usar formato markdown con encabezados, listas y énfasis
- Incluir números, porcentajes y comparaciones específicas con precisión
- Mantener un tono técnico, formal y objetivo
- Ser específico y evitar generalidades o lenguaje vago
- Presentar información de manera directa, sin diálogo
- Proporcionar contexto técnico y justificación basada en evidencia para cada recomendación
- Evitar frases como "Es importante notar que", "Debemos considerar", "Se sugiere" - presentar hechos directamente
- Usar voz pasiva o tercera persona cuando sea apropiado para mantener formalidad

Responde completamente en español con un estilo técnico y profesional.`

    // Primero, obtener la lista de modelos disponibles
    console.log('🔍 Obteniendo lista de modelos disponibles...')
    const availableModels = await getAvailableModels()
    console.log(`📋 Modelos a intentar:`, availableModels)
    
    if (availableModels.length === 0) {
      throw new Error('No se encontraron modelos disponibles. Verifica tu API key en https://aistudio.google.com/')
    }
    
    // Intentar con cada modelo disponible hasta que uno funcione
    let lastError = null
    let successfulModel = null
    
    for (const modelName of availableModels) {
      try {
        console.log(`🔄 Intentando con modelo: ${modelName}...`)
        console.log(`💬 Enviando prompt a la IA con modelo ${modelName}...`)
        
        // Llamar directamente a la API REST
        const text = await callGeminiAPI(modelName, prompt)
        
        successfulModel = modelName
        console.log(`✅ Análisis recibido exitosamente con modelo: ${modelName}`)
        console.log(`📝 Longitud de la respuesta: ${text.length} caracteres`)
        return text
      } catch (error) {
        lastError = error
        const errorMsg = error.message || error.toString()
        console.log(`⚠️ Modelo ${modelName} falló: ${errorMsg.substring(0, 200)}`)
        
        // Si es un error 404, continuar con el siguiente modelo
        if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('is not found')) {
          console.log(`   → Modelo ${modelName} no encontrado (404), intentando siguiente...`)
          continue
        }
        
        // Si es un error de autenticación, no intentar más modelos
        if (errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('API_KEY') || errorMsg.includes('authentication') || errorMsg.includes('invalid') || errorMsg.includes('API key not valid') || errorMsg.includes('401')) {
          console.log(`   → Error de autenticación detectado, deteniendo intentos`)
          throw new Error('Error de autenticación con la API. Verifica que tu API key sea válida y tenga acceso a los modelos de Gemini. Puedes verificar esto en https://aistudio.google.com/')
        }
        
        // Para otros errores, continuar con el siguiente modelo
        continue
      }
    }
    
    // Si llegamos aquí, todos los modelos fallaron
    if (!successfulModel) {
      const errorDetails = lastError ? (lastError.message || lastError.toString()) : 'Error desconocido'
      console.error('❌ Todos los modelos fallaron. Último error:', errorDetails)
      
      // Mensaje más útil para el usuario
      let userMessage = 'No se pudo conectar con ningún modelo de IA disponible.\n\n'
      userMessage += 'Posibles soluciones:\n'
      userMessage += '1. Verifica que tu API key sea válida en https://aistudio.google.com/\n'
      userMessage += '2. Asegúrate de que la API key tenga acceso a los modelos de Gemini\n'
      userMessage += '3. Verifica que no haya restricciones de red o firewall bloqueando las solicitudes\n'
      userMessage += '4. Intenta generar una nueva API key en Google AI Studio\n\n'
      if (errorDetails.includes('404')) {
        userMessage += `Error específico: Los modelos no están disponibles (404). ${errorDetails.substring(0, 150)}`
      } else if (errorDetails.includes('403') || errorDetails.includes('permission')) {
        userMessage += `Error específico: Problema de permisos. ${errorDetails.substring(0, 150)}`
      } else if (errorDetails.includes('API_KEY') || errorDetails.includes('authentication')) {
        userMessage += `Error específico: Problema de autenticación. ${errorDetails.substring(0, 150)}`
      } else if (errorDetails.includes('network') || errorDetails.includes('fetch') || errorDetails.includes('connection')) {
        userMessage += `Error específico: Problema de conexión. ${errorDetails.substring(0, 150)}`
      } else {
        userMessage += `Error: ${errorDetails.substring(0, 200)}`
      }
      
      throw new Error(userMessage)
    }
  } catch (error) {
    console.error('❌ Error en análisis de IA:', error)
    
    // Re-lanzar el error si ya tiene un mensaje útil
    if (error.message && (error.message.includes('No se pudo conectar') || error.message.includes('Posibles soluciones'))) {
      throw error
    }
    
    // Mensaje de error más descriptivo y útil
    let errorMessage = 'No se pudo completar el análisis de IA.'
    
    if (error.message) {
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        errorMessage = 'El modelo de IA no está disponible para esta versión de la API. Por favor, verifica la configuración o intenta más tarde.'
      } else if (errorMsg.includes('403') || errorMsg.includes('permission') || errorMsg.includes('forbidden')) {
        errorMessage = 'Error de permisos con la API. Verifica que la clave de API tenga los permisos necesarios y esté activa.'
      } else if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
        errorMessage = 'Se ha excedido el límite de uso de la API. Por favor, espera unos minutos e intenta más tarde.'
      } else if (errorMsg.includes('api_key') || errorMsg.includes('authentication') || errorMsg.includes('invalid') || errorMsg.includes('api key not valid')) {
        errorMessage = 'Error de autenticación con la API. Verifica que la clave de API sea válida y esté correctamente configurada.'
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection') || errorMsg.includes('failed to fetch')) {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.'
      } else if (errorMsg.includes('timeout')) {
        errorMessage = 'La solicitud tardó demasiado. Por favor, intenta nuevamente.'
      } else {
        errorMessage = `Error: ${error.message}`
      }
    } else if (error.toString().includes('API_KEY') || error.toString().includes('authentication')) {
      errorMessage = 'Error de autenticación con la API. Verifica la clave de API.'
    } else if (error.toString().includes('network') || error.toString().includes('fetch')) {
      errorMessage = 'Error de conexión. Verifica tu conexión a internet.'
    }
    
    throw new Error(errorMessage)
  }
}

export async function getInsightsForCategory(data, category) {
  try {
    if (!data || data.length === 0) {
      return null
    }

    const categoryData = getCategoryData(data, category)
    
    const prompt = `Analiza los siguientes datos de ${category} en partos hospitalarios:

${JSON.stringify(categoryData, null, 2)}

Proporciona insights específicos sobre esta categoría, incluyendo:
- Tendencias observadas
- Comparaciones relevantes
- Análisis estadístico
- Recomendaciones específicas basadas en los datos

Responde en español de forma concisa y profesional.`

    // Intentar con cada modelo hasta que uno funcione
    for (const modelName of MODEL_OPTIONS) {
      try {
        const text = await callGeminiAPI(modelName, prompt)
        return text
      } catch (error) {
        const errorMsg = error.message || error.toString()
        if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          continue
        }
        continue
      }
    }
    
    return null
  } catch (error) {
    console.error('Error en análisis de categoría:', error)
    return null
  }
}

function prepareDataSummary(data) {
  if (!data || data.length === 0) return {}

  const total = data.length
  
  // Información de trazabilidad
  const traceabilityInfo = {
    totalRegistros: total,
    madresUnicas: new Set(data.filter(item => item._rutNormalized).map(item => item._rutNormalized)).size,
    registrosConRelaciones: data.filter(item => item._relationCounts && item._relationCounts.totalRelatedPartos > 0).length,
    promedioRelacionesPorRegistro: data.length > 0 
      ? (data.reduce((sum, item) => sum + (item._relationCounts?.totalRelatedPartos || 0), 0) / data.length).toFixed(2)
      : 0
  }
  
  // Tipos de parto
  const tipoParto = {}
  data.forEach(item => {
    const tipo = item.tipoParto || 'Desconocido'
    tipoParto[tipo] = (tipoParto[tipo] || 0) + 1
  })
  
  // Paridad
  const paridad = {
    primiparas: data.filter(item => item.paridad && item.paridad.includes('PRIMIPARA')).length,
    multiparas: data.filter(item => item.paridad && item.paridad.includes('MULTIPARA')).length
  }
  
  // Edad materna
  const edades = data
    .filter(item => item.edad && !isNaN(item.edad))
    .map(item => parseInt(item.edad))
  const edadPromedio = edades.length > 0 
    ? (edades.reduce((a, b) => a + b, 0) / edades.length).toFixed(1)
    : null
  const edadMin = edades.length > 0 ? Math.min(...edades) : null
  const edadMax = edades.length > 0 ? Math.max(...edades) : null
  
  // Distribución por grupos de edad (según tablas)
  const gruposEdad = {
    '< 25': edades.filter(e => e < 25).length,
    '25-29': edades.filter(e => e >= 25 && e < 30).length,
    '30-34': edades.filter(e => e >= 30 && e < 35).length,
    '≥ 35': edades.filter(e => e >= 35).length
  }
  
  // Partos según edad de la madre (grupos específicos de las tablas)
  const partosPorEdad = {
    menos15: edades.filter(e => e < 15).length,
    entre15y19: edades.filter(e => e >= 15 && e < 20).length,
    entre20y34: edades.filter(e => e >= 20 && e < 35).length,
    mayor35: edades.filter(e => e >= 35).length
  }
  
  // Peso al nacer
  const pesos = data
    .filter(item => item.peso && !isNaN(item.peso))
    .map(item => parseFloat(item.peso))
  const pesoPromedio = pesos.length > 0
    ? (pesos.reduce((a, b) => a + b, 0) / pesos.length).toFixed(0)
    : null
  const pesoMin = pesos.length > 0 ? Math.min(...pesos).toFixed(0) : null
  const pesoMax = pesos.length > 0 ? Math.max(...pesos).toFixed(0) : null
  
  // Semanas de gestación
  const semanas = data
    .filter(item => (item.semanasGestacion || item.eg) && !isNaN(item.semanasGestacion || item.eg))
    .map(item => parseFloat(item.semanasGestacion || item.eg))
  const semanasPromedio = semanas.length > 0
    ? (semanas.reduce((a, b) => a + b, 0) / semanas.length).toFixed(1)
    : null
  
  // Sexo del recién nacido (solo valores válidos)
  const sexo = {
    masculino: data.filter(item => item.sexo === 'MASCULINO').length,
    femenino: data.filter(item => item.sexo === 'FEMENINO').length,
    indeterminado: data.filter(item => item.sexo === 'INDETERMINADO').length
  }
  
  // Anestesia
  const anestesia = {}
  data.forEach(item => {
    const tipo = item.tipoAnestesia || item.tipoDeAnestesia || 'Sin anestesia'
    anestesia[tipo] = (anestesia[tipo] || 0) + 1
  })
  
  // Casos especiales
  const bajoPeso = data.filter(item => item.peso && item.peso < 2500).length
  const prematuros = data.filter(item => {
    const semanas = item.semanasGestacion || item.eg
    return semanas && semanas < 37
  }).length
  const apgarBajo = data.filter(item => {
    const apgar1 = item.apgar1 ? parseInt(item.apgar1) : null
    const apgar5 = item.apgar5 ? parseInt(item.apgar5) : null
    return (apgar1 !== null && apgar1 < 7) || (apgar5 !== null && apgar5 < 7)
  }).length
  
  // Partos prematuros por rangos (considerar sobre 22 semanas)
  const prematurosPorRango = {
    menos24: data.filter(item => {
      const semanas = item.semanasGestacion || item.eg
      return semanas && semanas >= 22 && semanas < 24
    }).length,
    entre24y28: data.filter(item => {
      const semanas = item.semanasGestacion || item.eg
      return semanas && semanas >= 24 && semanas < 29
    }).length,
    entre29y32: data.filter(item => {
      const semanas = item.semanasGestacion || item.eg
      return semanas && semanas >= 29 && semanas < 33
    }).length,
    entre33y36: data.filter(item => {
      const semanas = item.semanasGestacion || item.eg
      return semanas && semanas >= 33 && semanas < 37
    }).length
  }
  
  // Tipos de parto detallados
  const tipoPartoDetallado = {
    vaginal: data.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL')
    }).length,
    instrumental: data.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      return tipo.includes('INSTRUMENTAL') || tipo.includes('VACUUM') || tipo.includes('FORCEPS')
    }).length,
    cesareaElectiva: data.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      return tipo.includes('CES ELE') || tipo.includes('CESAREA ELE')
    }).length,
    cesareaUrgencia: data.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      return tipo.includes('CES URG') || tipo.includes('CESAREA URG')
    }).length,
    prehospitalario: data.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      const comentarios = String(item.comentarios || '').toUpperCase()
      return tipo.includes('EXTRAHOSPITALARIO') || tipo.includes('PREHOSPITALARIO') || 
             comentarios.includes('AMBULANCIA') || comentarios.includes('PREHOSPITALARIO')
    }).length,
    fueraRedSalud: data.filter(item => {
      const tipo = String(item.tipoParto || '').toUpperCase()
      const comentarios = String(item.comentarios || '').toUpperCase()
      return tipo.includes('FUERA RED') || comentarios.includes('FUERA RED SALUD')
    }).length
  }
  
  // Parto en domicilio
  const partoDomicilio = {
    conAtencion: data.filter(item => {
      const comentarios = String(item.comentarios || '').toUpperCase()
      const medicoObstetra = String(item.medicoObstetra || '').toUpperCase()
      const matronaParto = String(item.matronaParto || '').toUpperCase()
      return (comentarios.includes('DOMICILIO') && (comentarios.includes('ATENCION') || comentarios.includes('PROFESIONAL'))) ||
             (medicoObstetra && comentarios.includes('DOMICILIO')) ||
             (matronaParto && comentarios.includes('DOMICILIO'))
    }).length,
    sinAtencion: data.filter(item => {
      const comentarios = String(item.comentarios || '').toUpperCase()
      return comentarios.includes('DOMICILIO') && comentarios.includes('SIN ATENCION')
    }).length
  }
  
  // Plan de parto
  const planParto = data.filter(item => {
    const plan = item.planDeParto
    return plan === 1 || String(plan).toUpperCase() === 'SI'
  }).length
  
  // Entrega de placenta a solicitud
  const entregaPlacenta = data.filter(item => {
    const comentarios = String(item.comentarios || '').toUpperCase()
    return comentarios.includes('PLACENTA') && (comentarios.includes('SOLICITUD') || comentarios.includes('ENTREGA'))
  }).length
  
  // Embarazo no controlado (embControlado = 0 o NO)
  const embNoControlado = data.filter(item => {
    const emb = item.embControlado
    return emb === 0 || String(emb).toUpperCase() === 'NO'
  }).length
  
  // Uso de oxitocina profiláctica
  const oxitocinaProfilactica = data.filter(item => {
    const conduccion = item.conduccionOcitocica
    return conduccion === 1 || String(conduccion).toUpperCase() === 'SI'
  }).length
  
  // Anestesia y/o analgesia del parto
  const anestesiaAnalgesia = {
    neuroaxial: data.filter(item => {
      const tipo = String(item.tipoAnestesia || item.tipoDeAnestesia || '').toUpperCase()
      return tipo.includes('RAQUIDEA') || tipo.includes('PERIDURAL') || tipo.includes('NEUROAXIAL')
    }).length,
    oxidoNitroso: data.filter(item => {
      const tipo = String(item.tipoAnestesia || item.tipoDeAnestesia || '').toUpperCase()
      const comentarios = String(item.comentarios || '').toUpperCase()
      return tipo.includes('OXIDO NITROSO') || tipo.includes('N2O') || comentarios.includes('OXIDO NITROSO')
    }).length,
    endovenosa: data.filter(item => {
      const tipo = String(item.tipoAnestesia || item.tipoDeAnestesia || '').toUpperCase()
      const comentarios = String(item.comentarios || '').toUpperCase()
      return tipo.includes('ENDOVENOSA') || tipo.includes('IV') || comentarios.includes('ENDOVENOSA')
    }).length,
    general: data.filter(item => {
      const tipo = String(item.tipoAnestesia || item.tipoDeAnestesia || '').toUpperCase()
      return tipo.includes('GENERAL')
    }).length,
    local: data.filter(item => {
      const anestesiaLocal = item.anestesiaLocal
      return anestesiaLocal === 1 || String(anestesiaLocal).toUpperCase() === 'SI'
    }).length,
    noFarmacologica: data.filter(item => {
      const manejo = item.manejoNoFarmacologicoDelDolor
      return manejo === 1 || String(manejo).toUpperCase() === 'SI'
    }).length
  }
  
  // Medidas no farmacológicas para el dolor
  const medidasNoFarmacologicas = data.filter(item => {
    const manejo = item.manejoNoFarmacologicoDelDolor
    return manejo === 1 || String(manejo).toUpperCase() === 'SI'
  }).length
  
  // Ligadura tardía del cordón (>60 segundos)
  const ligaduraTardia = data.filter(item => {
    const ligadura = item.ligaduraTardiaCordon
    return ligadura === 1 || String(ligadura).toUpperCase() === 'SI'
  }).length
  
  // Contacto piel a piel >30 minutos
  const contactoPiel = {
    conMadre: {
      rnMenor2500: data.filter(item => {
        const apego = item.apegoConPiel30Min
        const peso = item.peso ? parseFloat(item.peso) : null
        return (apego === 1 || String(apego).toUpperCase() === 'MADRE') && peso !== null && peso <= 2499
      }).length,
      rnMayor2500: data.filter(item => {
        const apego = item.apegoConPiel30Min
        const peso = item.peso ? parseFloat(item.peso) : null
        return (apego === 1 || String(apego).toUpperCase() === 'MADRE') && peso !== null && peso >= 2500
      }).length
    },
    conPadreAcompanante: {
      rnMenor2500: data.filter(item => {
        const apego = item.apegoConPiel30Min
        const peso = item.peso ? parseFloat(item.peso) : null
        return (apego === 2 || apego === 3 || String(apego).toUpperCase() === 'PADRE' || 
                String(apego).toUpperCase().includes('ACOMPAÑANTE')) && peso !== null && peso <= 2499
      }).length,
      rnMayor2500: data.filter(item => {
        const apego = item.apegoConPiel30Min
        const peso = item.peso ? parseFloat(item.peso) : null
        return (apego === 2 || apego === 3 || String(apego).toUpperCase() === 'PADRE' || 
                String(apego).toUpperCase().includes('ACOMPAÑANTE')) && peso !== null && peso >= 2500
      }).length
    }
  }
  
  // Lactancia materna en los primeros 60 minutos de vida (RN con peso ≥2500g)
  const lactanciaPrecoz = data.filter(item => {
    const lactancia = item.lactanciaPrecoz60MinDeVida
    const peso = item.peso ? parseFloat(item.peso) : null
    return (lactancia === 1 || String(lactancia).toUpperCase() === 'SI') && peso !== null && peso >= 2500
  }).length
  
  // Alojamiento conjunto en puerperio inmediato
  const alojamientoConjunto = data.filter(item => {
    const destino = String(item.destino || '').toUpperCase()
    const alojamiento = item.alojamientoConjunto
    return (alojamiento === 1 || String(alojamiento).toUpperCase() === 'SI') ||
           destino.includes('SALA') || destino.includes('ALOJAMIENTO')
  }).length
  
  // Atención con pertinencia cultural
  const pertinenciaCultural = data.filter(item => {
    const pertinencia = item.atencionConPertinenciaCultural
    return pertinencia === 1 || String(pertinencia).toUpperCase() === 'SI'
  }).length
  
  // Pueblos originarios
  const pueblosOriginarios = data.filter(item => {
    const pueblo = item.puebloOriginario
    const nombrePueblo = String(item.nombrePuebloOriginario || '').trim()
    return (pueblo === 1 || String(pueblo).toUpperCase() === 'SI') || nombrePueblo.length > 0
  }).length
  
  // Migrantes
  const migrantes = data.filter(item => {
    const migrante = item.migrante
    const nacionalidad = String(item.nacionalidad || '').toUpperCase()
    return (migrante === 1 || String(migrante).toUpperCase() === 'SI') ||
           (nacionalidad !== 'CHILENA' && nacionalidad.length > 0)
  }).length
  
  // Discapacidad
  const discapacidad = data.filter(item => {
    const disc = item.discapacidad
    const comentarios = String(item.comentarios || '').toUpperCase()
    return (disc === 1 || String(disc).toUpperCase() === 'SI') ||
           comentarios.includes('DISCAPACIDAD')
  }).length
  
  // Privada de libertad
  const privadaLibertad = data.filter(item => {
    const privada = item.privadaDeLibertad
    const comentarios = String(item.comentarios || '').toUpperCase()
    return (privada === 1 || String(privada).toUpperCase() === 'SI') ||
           comentarios.includes('PRIVADA') || comentarios.includes('LIBERTAD')
  }).length
  
  // Identidad de género
  const identidadGenero = {
    transMasculino: data.filter(item => {
      const trans = item.transNoBinario
      const comentarios = String(item.comentarios || '').toUpperCase()
      return (trans === 1 || String(trans).toUpperCase() === 'SI') &&
             (comentarios.includes('TRANS MASCULINO') || comentarios.includes('TRANS MASCULINA'))
    }).length,
    noBinarie: data.filter(item => {
      const trans = item.transNoBinario
      const comentarios = String(item.comentarios || '').toUpperCase()
      return (trans === 1 || String(trans).toUpperCase() === 'SI') &&
             (comentarios.includes('NO BINARIO') || comentarios.includes('NO BINARIE') || 
              comentarios.includes('NO BINARIA'))
    }).length
  }
  
  // Tipo de parto más común
  const tipoPartoMasComun = Object.entries(tipoParto)
    .sort((a, b) => b[1] - a[1])[0]
  
  // ===== TABLAS DE CONTINGENCIA CRUZADAS =====
  // Anestesia por grupos de edad
  const anestesiaPorEdad = {}
  data.forEach(item => {
    const edad = item.edad ? parseInt(item.edad) : null
    if (edad !== null) {
      const grupoEdad = edad < 25 ? '< 25' : edad < 30 ? '25-29' : edad < 35 ? '30-34' : '≥ 35'
      const tipoAnestesia = item.tipoAnestesia || item.tipoDeAnestesia || 'Sin anestesia'
      
      if (!anestesiaPorEdad[grupoEdad]) {
        anestesiaPorEdad[grupoEdad] = {}
      }
      anestesiaPorEdad[grupoEdad][tipoAnestesia] = (anestesiaPorEdad[grupoEdad][tipoAnestesia] || 0) + 1
    }
  })
  
  // Tipo de parto por grupos de edad
  const tipoPartoPorEdad = {}
  data.forEach(item => {
    const edad = item.edad ? parseInt(item.edad) : null
    if (edad !== null) {
      const grupoEdad = edad < 25 ? '< 25' : edad < 30 ? '25-29' : edad < 35 ? '30-34' : '≥ 35'
      const tipo = item.tipoParto || 'Desconocido'
      
      if (!tipoPartoPorEdad[grupoEdad]) {
        tipoPartoPorEdad[grupoEdad] = {}
      }
      tipoPartoPorEdad[grupoEdad][tipo] = (tipoPartoPorEdad[grupoEdad][tipo] || 0) + 1
    }
  })
  
  // Tipo de parto por paridad
  const tipoPartoPorParidad = {}
  data.forEach(item => {
    const paridadItem = item.paridad || 'Desconocida'
    const tipo = item.tipoParto || 'Desconocido'
    
    if (!tipoPartoPorParidad[paridadItem]) {
      tipoPartoPorParidad[paridadItem] = {}
    }
    tipoPartoPorParidad[paridadItem][tipo] = (tipoPartoPorParidad[paridadItem][tipo] || 0) + 1
  })
  
  // Anestesia por tipo de parto
  const anestesiaPorTipoParto = {}
  data.forEach(item => {
    const tipo = item.tipoParto || 'Desconocido'
    const tipoAnestesia = item.tipoAnestesia || item.tipoDeAnestesia || 'Sin anestesia'
    
    if (!anestesiaPorTipoParto[tipo]) {
      anestesiaPorTipoParto[tipo] = {}
    }
    anestesiaPorTipoParto[tipo][tipoAnestesia] = (anestesiaPorTipoParto[tipo][tipoAnestesia] || 0) + 1
  })
  
  // Peso al nacer por grupos de edad materna
  const pesoPorEdad = {}
  data.forEach(item => {
    const edad = item.edad ? parseInt(item.edad) : null
    const peso = item.peso ? parseFloat(item.peso) : null
    
    if (edad !== null && peso !== null) {
      const grupoEdad = edad < 25 ? '< 25' : edad < 30 ? '25-29' : edad < 35 ? '30-34' : '≥ 35'
      
      if (!pesoPorEdad[grupoEdad]) {
        pesoPorEdad[grupoEdad] = {
          total: 0,
          suma: 0,
          bajoPeso: 0,
          normal: 0,
          macrosomia: 0
        }
      }
      pesoPorEdad[grupoEdad].total++
      pesoPorEdad[grupoEdad].suma += peso
      if (peso < 2500) pesoPorEdad[grupoEdad].bajoPeso++
      else if (peso >= 2500 && peso < 4000) pesoPorEdad[grupoEdad].normal++
      else if (peso >= 4000) pesoPorEdad[grupoEdad].macrosomia++
    }
  })
  
  // Calcular promedios de peso por grupo de edad
  Object.keys(pesoPorEdad).forEach(grupo => {
    if (pesoPorEdad[grupo].total > 0) {
      pesoPorEdad[grupo].promedio = (pesoPorEdad[grupo].suma / pesoPorEdad[grupo].total).toFixed(0)
    }
  })
  
  // Prematuridad por tipo de parto
  const prematuridadPorTipoParto = {}
  data.forEach(item => {
    const tipo = item.tipoParto || 'Desconocido'
    const semanas = item.semanasGestacion || item.eg
    const esPrematuro = semanas && semanas < 37
    
    if (!prematuridadPorTipoParto[tipo]) {
      prematuridadPorTipoParto[tipo] = {
        total: 0,
        prematuros: 0,
        aTermino: 0
      }
    }
    prematuridadPorTipoParto[tipo].total++
    if (esPrematuro) {
      prematuridadPorTipoParto[tipo].prematuros++
    } else {
      prematuridadPorTipoParto[tipo].aTermino++
    }
  })
  
  // Apgar bajo por tipo de parto
  const apgarPorTipoParto = {}
  data.forEach(item => {
    const tipo = item.tipoParto || 'Desconocido'
    const apgar1 = item.apgar1 ? parseInt(item.apgar1) : null
    const apgar5 = item.apgar5 ? parseInt(item.apgar5) : null
    const apgarBajoItem = (apgar1 !== null && apgar1 < 7) || (apgar5 !== null && apgar5 < 7)
    
    if (!apgarPorTipoParto[tipo]) {
      apgarPorTipoParto[tipo] = {
        total: 0,
        apgarBajo: 0,
        apgarNormal: 0
      }
    }
    apgarPorTipoParto[tipo].total++
    if (apgarBajoItem) {
      apgarPorTipoParto[tipo].apgarBajo++
    } else {
      apgarPorTipoParto[tipo].apgarNormal++
    }
  })
  
  // Episiotomía por paridad
  const episiotomiaPorParidad = {}
  data.forEach(item => {
    const paridadItem = item.paridad || 'Desconocida'
    const tieneEpisiotomia = item.episiotomia === 1 || String(item.episiotomia).toUpperCase() === 'SI'
    
    if (!episiotomiaPorParidad[paridadItem]) {
      episiotomiaPorParidad[paridadItem] = {
        total: 0,
        conEpisiotomia: 0,
        sinEpisiotomia: 0
      }
    }
    episiotomiaPorParidad[paridadItem].total++
    if (tieneEpisiotomia) {
      episiotomiaPorParidad[paridadItem].conEpisiotomia++
    } else {
      episiotomiaPorParidad[paridadItem].sinEpisiotomia++
    }
  })
  
  return {
    total,
    // Información de trazabilidad para análisis de IA
    traceability: traceabilityInfo,
    // Estructura de datos disponible para análisis
    dataStructure: {
      hasTraceability: data.some(item => item._traceId),
      hasRelations: data.some(item => item._relations),
      hasStructuredData: data.some(item => item._structuredData),
      sampleTraceId: data[0]?._traceId || null,
      sampleRelations: data[0]?._relations || null
    },
    tipoParto,
    tipoPartoMasComun: tipoPartoMasComun ? {
      tipo: tipoPartoMasComun[0],
      cantidad: tipoPartoMasComun[1],
      porcentaje: ((tipoPartoMasComun[1] / total) * 100).toFixed(1)
    } : null,
    paridad,
    edad: {
      promedio: edadPromedio,
      minimo: edadMin,
      maximo: edadMax,
      grupos: gruposEdad
    },
    peso: {
      promedio: pesoPromedio,
      minimo: pesoMin,
      maximo: pesoMax
    },
    semanasPromedio,
    sexo,
    anestesia,
    casosEspeciales: {
      bajoPeso,
      prematuros,
      apgarBajo
    },
    porcentajes: {
      bajoPeso: ((bajoPeso / total) * 100).toFixed(1),
      prematuros: ((prematuros / total) * 100).toFixed(1),
      apgarBajo: ((apgarBajo / total) * 100).toFixed(1)
    },
    // Variables adicionales para tablas de indicadores
    partosPorEdad,
    prematurosPorRango,
    tipoPartoDetallado,
    partoDomicilio,
    planParto,
    entregaPlacenta,
    embNoControlado,
    oxitocinaProfilactica,
    anestesiaAnalgesia,
    medidasNoFarmacologicas,
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
    // Partos vaginales - Sección A.1
    partosVaginales: {
      // Filtrar solo partos vaginales
      total: data.filter(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL')
      }).length,
      // Espontáneo (sin inducción)
      espontaneo: data.filter(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        const induccion = item.induccion
        return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
               (induccion === 0 || String(induccion).toUpperCase() === 'NO' || !induccion)
      }).length,
      // Inducidos
      inducidos: {
        total: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const induccion = item.induccion
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 (induccion === 1 || String(induccion).toUpperCase() === 'SI')
        }).length,
        // Mecánica (verificar en comentarios o trabajo de parto)
        mecanica: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const induccion = item.induccion
          const comentarios = String(item.comentarios || '').toUpperCase()
          const trabajoParto = String(item.trabajoDeParto || '').toUpperCase()
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 (induccion === 1 || String(induccion).toUpperCase() === 'SI') &&
                 (comentarios.includes('MECANICA') || trabajoParto.includes('MECANICA') ||
                  comentarios.includes('AMNIOTOMIA') || comentarios.includes('ROTURA ARTIFICIAL'))
        }).length,
        // Farmacológica (MISOTROL u otros)
        farmacologica: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const induccion = item.induccion
          const comentarios = String(item.comentarios || '').toUpperCase()
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 (induccion === 1 || String(induccion).toUpperCase() === 'SI') &&
                 (comentarios.includes('MISOTROL') || comentarios.includes('OXITOCINA') ||
                  comentarios.includes('PROSTAGLANDINA') || comentarios.includes('FARMACOLOGICA'))
        }).length
      },
      // Conducción oxitócica
      conduccionOxitocica: data.filter(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        const conduccion = item.conduccionOcitocica
        return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
               (conduccion === 1 || String(conduccion).toUpperCase() === 'SI')
      }).length,
      // Libertad de movimiento
      libertadMovimiento: data.filter(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        const libertad = item.libertadDeMovimientoOEnTDP
        return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
               (libertad === 1 || String(libertad).toUpperCase() === 'SI')
      }).length,
      // Régimen hídrico amplio
      regimenHidricoAmplio: data.filter(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        const regimen = item.regimenHidricoAmplioEnTDP
        return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
               (regimen === 1 || String(regimen).toUpperCase() === 'SI')
      }).length,
      // Manejo del dolor
      manejoDolor: {
        noFarmacologico: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const manejo = item.manejoNoFarmacologicoDelDolor
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 (manejo === 1 || String(manejo).toUpperCase() === 'SI')
        }).length,
        farmacologico: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const manejo = item.manejoFarmacologicoDelDolor
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 (manejo === 1 || String(manejo).toUpperCase() === 'SI')
        }).length
      },
      // Posición al momento del expulsivo
      posicionExpulsivo: {
        litotomia: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const posicion = String(item.posicionMaternaEnElExpulsivo || '').toUpperCase()
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 (posicion.includes('LITOTOMIA') || posicion.includes('LITOTOMÍA'))
        }).length,
        otrasPosiciones: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const posicion = String(item.posicionMaternaEnElExpulsivo || '').toUpperCase()
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 posicion.length > 0 && !posicion.includes('LITOTOMIA') && !posicion.includes('LITOTOMÍA')
        }).length
      },
      // Episiotomía
      episiotomia: data.filter(item => {
        const tipo = String(item.tipoParto || '').toUpperCase()
        const episiotomia = item.episiotomia
        return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
               (episiotomia === 1 || String(episiotomia).toUpperCase() === 'SI')
      }).length,
      // Acompañamiento
      acompanamiento: {
        duranteTrabajoParto: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const acompanamiento = item.acompanamientoParto
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                 (acompanamiento === 1 || String(acompanamiento).toUpperCase() === 'SI')
        }).length,
        soloExpulsivo: data.filter(item => {
          const tipo = String(item.tipoParto || '').toUpperCase()
          const acompanamientoParto = item.acompanamientoParto
          const acompanamientoPuerperio = item.acompanamientoPuerperioInmediato
          // Si tiene acompañamiento en puerperio pero no en parto, probablemente solo en expulsivo
          const soloEnExpulsivo = (acompanamientoParto === 0 || String(acompanamientoParto).toUpperCase() === 'NO') &&
                                  (acompanamientoPuerperio === 1 || String(acompanamientoPuerperio).toUpperCase() === 'SI')
          return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') && soloEnExpulsivo
        }).length
      },
      // Desglose por semanas de gestación
      porSemanas: {
        menos28: {
          total: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas < 28
          }).length,
          espontaneo: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            const induccion = item.induccion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas < 28 &&
                   (induccion === 0 || String(induccion).toUpperCase() === 'NO' || !induccion)
          }).length,
          inducidos: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            const induccion = item.induccion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas < 28 &&
                   (induccion === 1 || String(induccion).toUpperCase() === 'SI')
          }).length
        },
        entre28y37: {
          total: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas >= 28 && semanas < 38
          }).length,
          espontaneo: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            const induccion = item.induccion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas >= 28 && semanas < 38 &&
                   (induccion === 0 || String(induccion).toUpperCase() === 'NO' || !induccion)
          }).length,
          inducidos: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            const induccion = item.induccion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas >= 28 && semanas < 38 &&
                   (induccion === 1 || String(induccion).toUpperCase() === 'SI')
          }).length
        },
        mas38: {
          total: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas >= 38
          }).length,
          espontaneo: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            const induccion = item.induccion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas >= 38 &&
                   (induccion === 0 || String(induccion).toUpperCase() === 'NO' || !induccion)
          }).length,
          inducidos: data.filter(item => {
            const tipo = String(item.tipoParto || '').toUpperCase()
            const semanas = item.eg || item.semanasGestacion
            const induccion = item.induccion
            return tipo.includes('VAGINAL') && !tipo.includes('INSTRUMENTAL') &&
                   semanas && semanas >= 38 &&
                   (induccion === 1 || String(induccion).toUpperCase() === 'SI')
          }).length
        }
      }
    },
    // Sección D.1: Información General de Recién Nacidos Vivos
    recienNacidosVivos: {
      total: data.filter(item => {
        // Todos los registros son nacidos vivos (asumiendo que si hay registro, el RN nació vivo)
        // Podríamos filtrar por malformaciones o estado, pero por ahora contamos todos
        return true
      }).length,
      porPeso: {
        menos500: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso < 500
        }).length,
        entre500y999: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso >= 500 && peso < 1000
        }).length,
        entre1000y1499: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso >= 1000 && peso < 1500
        }).length,
        entre1500y1999: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso >= 1500 && peso < 2000
        }).length,
        entre2000y2499: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso >= 2000 && peso < 2500
        }).length,
        entre2500y2999: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso >= 2500 && peso < 3000
        }).length,
        entre3000y3999: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso >= 3000 && peso < 4000
        }).length,
        mas4000: data.filter(item => {
          const peso = item.peso ? parseFloat(item.peso) : null
          return peso !== null && peso >= 4000
        }).length
      },
      anomaliaCongenita: data.filter(item => {
        const malformaciones = item.malformaciones
        const comentarios = String(item.comentarios || '').toUpperCase()
        return (malformaciones === 1 || String(malformaciones).toUpperCase() === 'SI') ||
               comentarios.includes('MALFORMACION') || comentarios.includes('ANOMALIA') ||
               comentarios.includes('CONGENITA') || comentarios.includes('CONGÉNITA')
      }).length
    },
    // TABLAS DE CONTINGENCIA CRUZADAS
    tablasContingencia: {
      anestesiaPorEdad,
      tipoPartoPorEdad,
      tipoPartoPorParidad,
      anestesiaPorTipoParto,
      pesoPorEdad,
      prematuridadPorTipoParto,
      apgarPorTipoParto,
      episiotomiaPorParidad
    }
  }
}

function getCategoryData(data, category) {
  switch (category) {
    case 'tipoParto':
      const tipos = {}
      data.forEach(item => {
        const tipo = item.tipoParto || 'Desconocido'
        tipos[tipo] = (tipos[tipo] || 0) + 1
      })
      return tipos
    case 'edad':
      return data
        .filter(item => item.edad && !isNaN(item.edad))
        .map(item => ({ edad: parseInt(item.edad) }))
    case 'peso':
      return data
        .filter(item => item.peso && !isNaN(item.peso))
        .map(item => ({ peso: parseFloat(item.peso) }))
    default:
      return {}
  }
}
