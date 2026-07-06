-- Migración: Agregar campos para médicos (indica cesárea y opera), Robson y segundo recién nacido gemelar
-- PostgreSQL 12+

-- Agregar campos para diferenciar médico que indica cesárea vs médico que opera
ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS medico_indica_cesarea VARCHAR(255);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS medico_operador_cesarea VARCHAR(255);

-- Agregar campo de Clasificación de Robson (opcional)
ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS clasificacion_robson VARCHAR(50);

-- Agregar campos para segundo recién nacido (gemelar)
ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS peso2 NUMERIC(6,2);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS talla2 NUMERIC(5,2);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS cc2 NUMERIC(5,2);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS apgar1_2 INTEGER;

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS apgar5_2 INTEGER;

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS apgar10_2 INTEGER;

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS sexo2 VARCHAR(20);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS malformaciones2 INTEGER DEFAULT 0;

-- Agregar campos para inducción detallada si no existen
ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS tipo_induccion VARCHAR(50);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS induccion_mecanica VARCHAR(50);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS induccion_farmacologica VARCHAR(50);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS induccion_combinada VARCHAR(50);

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS detalle_induccion TEXT;

-- Agregar campos para detalles de anestesia combinada y PCA
ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS detalle_anestesia_combinada TEXT;

ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS detalle_anestesia_pca TEXT;

-- Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_partos_medico_indica_cesarea ON partos(medico_indica_cesarea);
CREATE INDEX IF NOT EXISTS idx_partos_medico_operador_cesarea ON partos(medico_operador_cesarea);
CREATE INDEX IF NOT EXISTS idx_partos_robson ON partos(clasificacion_robson);

-- Comentarios en las columnas
COMMENT ON COLUMN partos.medico_indica_cesarea IS 'Médico que indica la cesárea';
COMMENT ON COLUMN partos.medico_operador_cesarea IS 'Médico que realiza la operación de cesárea';
COMMENT ON COLUMN partos.clasificacion_robson IS 'Clasificación de Robson (opcional)';
COMMENT ON COLUMN partos.peso2 IS 'Peso del segundo recién nacido en caso de parto gemelar';
COMMENT ON COLUMN partos.talla2 IS 'Talla del segundo recién nacido en caso de parto gemelar';
COMMENT ON COLUMN partos.cc2 IS 'Perímetro cefálico del segundo recién nacido en caso de parto gemelar';
COMMENT ON COLUMN partos.detalle_anestesia_combinada IS 'Detalle de la anestesia combinada';
COMMENT ON COLUMN partos.detalle_anestesia_pca IS 'Detalle de la anestesia PCA (Analgesia Controlada por el Paciente)';
