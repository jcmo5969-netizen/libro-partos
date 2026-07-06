-- Migración: Agregar campo imc_materno (Índice de Masa Corporal)
-- PostgreSQL 12+

ALTER TABLE partos
ADD COLUMN IF NOT EXISTS imc_materno NUMERIC(5,2);

COMMENT ON COLUMN partos.imc_materno IS 'IMC materno calculado: peso_materno / (talla_materna/100)^2';
