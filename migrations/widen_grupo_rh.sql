-- Migración: Ampliar grupo_rh de VARCHAR(10) a VARCHAR(50)
-- PostgreSQL 12+
-- Motivo: el campo "Grupo RH" es texto libre en el formulario y valores como
-- "O RH POSITIVO" o "AB RH NEGATIVO" superan los 10 caracteres, provocando el
-- error "el valor es demasiado largo para el tipo character varying(10)".
-- Idempotente: re-ejecutar sobre una columna ya VARCHAR(50) no causa error.

ALTER TABLE partos
ALTER COLUMN grupo_rh TYPE VARCHAR(50);

COMMENT ON COLUMN partos.grupo_rh IS 'Grupo sanguíneo y factor RH (texto libre, ej: O+, A-, O RH POSITIVO)';
