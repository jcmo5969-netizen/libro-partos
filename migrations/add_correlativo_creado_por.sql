-- Migración: Agregar campos correlativo y creado_por a la tabla partos
-- PostgreSQL 12+

-- Agregar campo correlativo (serial autoincrementable)
-- Primero crear la secuencia si no existe
CREATE SEQUENCE IF NOT EXISTS partos_correlativo_seq;

-- Agregar la columna correlativo con valor por defecto de la secuencia
ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS correlativo INTEGER;

-- Establecer el valor por defecto para nuevos registros
ALTER TABLE partos 
ALTER COLUMN correlativo SET DEFAULT nextval('partos_correlativo_seq');

-- Establecer el valor de la secuencia al máximo valor existente + 1
-- (solo si hay registros existentes)
DO $$
DECLARE
    max_correlativo INTEGER;
BEGIN
    SELECT COALESCE(MAX(correlativo), 0) INTO max_correlativo FROM partos;
    IF max_correlativo > 0 THEN
        PERFORM setval('partos_correlativo_seq', max_correlativo, true);
    END IF;
END $$;

-- Actualizar registros existentes sin correlativo
UPDATE partos 
SET correlativo = nextval('partos_correlativo_seq')
WHERE correlativo IS NULL;

-- Agregar campo creado_por (VARCHAR)
ALTER TABLE partos 
ADD COLUMN IF NOT EXISTS creado_por VARCHAR(255);

-- Crear índice para mejorar búsquedas por correlativo
CREATE INDEX IF NOT EXISTS idx_partos_correlativo ON partos(correlativo);

-- Crear índice para mejorar búsquedas por creado_por
CREATE INDEX IF NOT EXISTS idx_partos_creado_por ON partos(creado_por);

-- Comentarios en las columnas
COMMENT ON COLUMN partos.correlativo IS 'Número correlativo autoincrementable del parto';
COMMENT ON COLUMN partos.creado_por IS 'Usuario que creó el registro';
