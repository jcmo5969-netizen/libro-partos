-- Horario de parto y destino por recién nacido en partos gemelares
ALTER TABLE partos ADD COLUMN IF NOT EXISTS hora_parto_2 TIME;
ALTER TABLE partos ADD COLUMN IF NOT EXISTS destino_2 VARCHAR(255);
COMMENT ON COLUMN partos.hora_parto_2 IS 'Hora de nacimiento del segundo recién nacido (gemelar)';
COMMENT ON COLUMN partos.destino_2 IS 'Destino del segundo recién nacido (gemelar)';
