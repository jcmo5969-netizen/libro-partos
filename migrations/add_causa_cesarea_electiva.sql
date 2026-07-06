-- Migración: Causa específica de cesárea electiva (texto libre o catálogo en frontend)
-- PostgreSQL 12+

ALTER TABLE partos
ADD COLUMN IF NOT EXISTS causa_cesarea_electiva TEXT;

COMMENT ON COLUMN partos.causa_cesarea_electiva IS 'Motivo o causa declarada de la cesárea electiva';
