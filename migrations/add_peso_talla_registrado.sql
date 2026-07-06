-- Migración: Agregar campos peso_materno, talla_materna, registrado_por y registrado_por_username
-- PostgreSQL 12+

-- Agregar campo peso materno
ALTER TABLE partos
ADD COLUMN IF NOT EXISTS peso_materno NUMERIC(6,2);

-- Agregar campo talla materna
ALTER TABLE partos
ADD COLUMN IF NOT EXISTS talla_materna NUMERIC(5,2);

-- Agregar campo registrado_por (nombre completo del responsable del llenado)
ALTER TABLE partos
ADD COLUMN IF NOT EXISTS registrado_por VARCHAR(255);

-- Agregar campo registrado_por_username (username para control de propiedad)
ALTER TABLE partos
ADD COLUMN IF NOT EXISTS registrado_por_username VARCHAR(255);

-- Backfill: copiar creado_por a registrado_por_username para registros existentes
UPDATE partos
SET registrado_por_username = creado_por
WHERE registrado_por_username IS NULL AND creado_por IS NOT NULL;

-- Crear índice para búsquedas por registrado_por_username
CREATE INDEX IF NOT EXISTS idx_partos_registrado_por_username ON partos(registrado_por_username);

-- Comentarios en las columnas
COMMENT ON COLUMN partos.peso_materno IS 'Peso de la madre en kilogramos';
COMMENT ON COLUMN partos.talla_materna IS 'Talla de la madre en centímetros';
COMMENT ON COLUMN partos.registrado_por IS 'Nombre completo del responsable del llenado del registro';
COMMENT ON COLUMN partos.registrado_por_username IS 'Username del responsable del llenado (para control de permisos de edición)';
