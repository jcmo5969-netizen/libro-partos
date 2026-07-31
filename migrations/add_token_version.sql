-- Permite revocar sesiones JWT ya emitidas sin esperar a que expiren (7 días por
-- defecto). Se incrementa en cambio de contraseña (propio o forzado por ADMIN);
-- el JWT lleva tokenVersion y authenticateToken lo compara contra esta columna.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
