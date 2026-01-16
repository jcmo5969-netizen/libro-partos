-- Esquema de base de datos para Libro de Partos
-- PostgreSQL 12+

-- Crear extensión para UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear secuencia para correlativo
CREATE SEQUENCE IF NOT EXISTS partos_correlativo_seq;

-- Tabla principal de partos
CREATE TABLE IF NOT EXISTS partos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Campos de control
    correlativo INTEGER DEFAULT nextval('partos_correlativo_seq'),
    creado_por VARCHAR(255),
    
    -- Datos generales del parto
    n_parto_ano INTEGER,
    n_parto_mes INTEGER,
    fecha_parto DATE,
    hora_parto TIME,
    mes_parto INTEGER, -- Mes extraído para facilitar filtros
    tipo_parto VARCHAR(50),
    
    -- Datos de la madre
    nombre_y_apellido VARCHAR(255),
    rut VARCHAR(20),
    rut_normalized VARCHAR(20), -- RUT sin puntos ni guiones para búsquedas
    edad INTEGER,
    pueblo_originario INTEGER DEFAULT 0, -- 0 = NO, 1 = SI
    nombre_pueblo_originario VARCHAR(100),
    migrante INTEGER DEFAULT 0,
    nacionalidad VARCHAR(100),
    discapacidad INTEGER DEFAULT 0,
    telefono VARCHAR(50),
    comuna VARCHAR(100),
    consultorio VARCHAR(100),
    paridad VARCHAR(50), -- PRIMIPARA, MULTIPARA
    cca INTEGER DEFAULT 0, -- Cesárea anterior
    presentacion VARCHAR(50), -- CEFALICA, PODALICA, TRANSVERSA
    gemela INTEGER DEFAULT 0,
    
    -- Datos del embarazo y parto
    eg NUMERIC(5,2), -- Semanas de gestación
    dias INTEGER,
    rotura_membranas VARCHAR(50),
    induccion INTEGER DEFAULT 0,
    misotrol VARCHAR(50),
    conduccion_ocitocica INTEGER DEFAULT 0,
    monitoreo VARCHAR(50),
    libertad_movimiento_tdp INTEGER DEFAULT 0,
    posicion_materna_expulsivo VARCHAR(100),
    episiotomia INTEGER DEFAULT 0,
    desgarro VARCHAR(20), -- NO, GI, GII, GIII, GIV, FISURA
    medidas_no_farmacologicas_dolor VARCHAR(255),
    causa_cesarea TEXT,
    eq VARCHAR(50),
    
    -- Anestesia y analgesia
    tipo_anestesia VARCHAR(100),
    hora_anestesia TIME,
    medico_anestesista VARCHAR(255),
    anestesia_local INTEGER DEFAULT 0,
    manejo_farmacologico_dolor INTEGER DEFAULT 0,
    manejo_no_farmacologico_dolor INTEGER DEFAULT 0,
    motivo_no_anestesia TEXT,
    
    -- Plan de parto y prácticas
    plan_parto INTEGER DEFAULT 0,
    trabajo_parto INTEGER DEFAULT 0,
    motivo_sin_libertad_movimiento TEXT,
    regimen_hidrico_amplio_tdp INTEGER DEFAULT 0,
    ligadura_tardia_cordon INTEGER DEFAULT 0,
    atencion_pertinencia_cultural INTEGER DEFAULT 0,
    alumbramiento_conducido INTEGER DEFAULT 0,
    
    -- Exámenes de la madre
    grupo_rh VARCHAR(10),
    chagas INTEGER DEFAULT 0, -- 0 = NEGATIVO, 1 = POSITIVO
    vih INTEGER DEFAULT 0,
    vih_al_parto INTEGER DEFAULT 0,
    rpr_vdrl INTEGER DEFAULT 0,
    hepatitis_b INTEGER DEFAULT 0,
    sgb VARCHAR(50),
    sgb_tratamiento_al_parto VARCHAR(50),
    emb_controlado INTEGER DEFAULT 0, -- Embarazo controlado
    
    -- Datos del recién nacido
    peso NUMERIC(6,2),
    talla NUMERIC(5,2),
    cc NUMERIC(5,2), -- Perímetro cefálico
    apgar1 INTEGER,
    apgar5 INTEGER,
    apgar10 INTEGER,
    sexo VARCHAR(20), -- MASCULINO, FEMENINO, INDETERMINADO
    malformaciones INTEGER DEFAULT 0,
    
    -- Personal médico
    medico_obstetra VARCHAR(255),
    medico_pediatra VARCHAR(255),
    matrona_preparto VARCHAR(255),
    matrona_parto VARCHAR(255),
    matrona_rn VARCHAR(255),
    
    -- Acompañamiento y apego
    acompanamiento_preparto INTEGER DEFAULT 0,
    acompanamiento_parto INTEGER DEFAULT 0,
    acompanamiento_puerperio INTEGER DEFAULT 0,
    acompanamiento_rn INTEGER DEFAULT 0,
    nombre_acompanante VARCHAR(255),
    parentesco_acompanante_madre VARCHAR(100),
    parentesco_acompanante_rn VARCHAR(100),
    apego_piel_30min INTEGER DEFAULT 0, -- 0 = NO, 1 = MADRE, 2 = PADRE, 3 = OTRA
    causa_no_apego TEXT,
    
    -- Lactancia y destino
    lactancia_precoz_60min INTEGER DEFAULT 0,
    destino VARCHAR(255),
    alojamiento_conjunto INTEGER DEFAULT 0,
    
    -- Información adicional
    comentarios TEXT,
    taller_chcc INTEGER DEFAULT 0,
    privada_libertad INTEGER DEFAULT 0,
    trans_no_binario INTEGER DEFAULT 0,
    
    -- Metadatos de trazabilidad
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_line INTEGER,
    data_hash VARCHAR(255)
);

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_partos_rut_normalized ON partos(rut_normalized);
CREATE INDEX IF NOT EXISTS idx_partos_fecha_parto ON partos(fecha_parto);
CREATE INDEX IF NOT EXISTS idx_partos_mes_parto ON partos(mes_parto);
CREATE INDEX IF NOT EXISTS idx_partos_tipo_parto ON partos(tipo_parto);
CREATE INDEX IF NOT EXISTS idx_partos_paridad ON partos(paridad);
CREATE INDEX IF NOT EXISTS idx_partos_comuna ON partos(comuna);
CREATE INDEX IF NOT EXISTS idx_partos_consultorio ON partos(consultorio);
CREATE INDEX IF NOT EXISTS idx_partos_trace_id ON partos(trace_id);
CREATE INDEX IF NOT EXISTS idx_partos_created_at ON partos(created_at);
CREATE INDEX IF NOT EXISTS idx_partos_correlativo ON partos(correlativo);
CREATE INDEX IF NOT EXISTS idx_partos_creado_por ON partos(creado_por);

-- Establecer la secuencia como propietaria de la columna correlativo
ALTER SEQUENCE partos_correlativo_seq OWNED BY partos.correlativo;

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_partos_fecha_tipo ON partos(fecha_parto, tipo_parto);
CREATE INDEX IF NOT EXISTS idx_partos_rut_fecha ON partos(rut_normalized, fecha_parto);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_partos_updated_at ON partos;
CREATE TRIGGER update_partos_updated_at BEFORE UPDATE ON partos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla para relaciones entre partos (misma madre)
CREATE TABLE IF NOT EXISTS partos_relaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parto_id UUID NOT NULL REFERENCES partos(id) ON DELETE CASCADE,
    relacionado_con_id UUID NOT NULL REFERENCES partos(id) ON DELETE CASCADE,
    tipo_relacion VARCHAR(50), -- 'misma_madre', 'mismo_consultorio', 'misma_comuna', 'mismo_mes'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parto_id, relacionado_con_id, tipo_relacion)
);

CREATE INDEX IF NOT EXISTS idx_partos_relaciones_parto_id ON partos_relaciones(parto_id);
CREATE INDEX IF NOT EXISTS idx_partos_relaciones_relacionado_con_id ON partos_relaciones(relacionado_con_id);
CREATE INDEX IF NOT EXISTS idx_partos_relaciones_tipo ON partos_relaciones(tipo_relacion);

-- Comentarios en las tablas para documentación
COMMENT ON TABLE partos IS 'Tabla principal que almacena todos los registros de partos';
COMMENT ON TABLE partos_relaciones IS 'Tabla que almacena relaciones entre partos para análisis de trazabilidad';

