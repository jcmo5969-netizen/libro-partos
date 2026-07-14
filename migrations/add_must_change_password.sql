-- Migración: forzar cambio de contraseña en el primer inicio de sesión
-- PostgreSQL 12+
--
-- IMPORTANTE: este archivo se ejecuta en CADA arranque del servidor (auto-migraciones),
-- por eso NO lleva un UPDATE masivo. `ADD COLUMN ... DEFAULT TRUE` ya marca a los usuarios
-- EXISTENTES al crear la columna (una sola vez). Un UPDATE aquí volvería a poner TRUE a
-- quienes ya cambiaron su contraseña en cada reinicio (bug de re-forzado).

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN usuarios.must_change_password IS 'Si es TRUE, el usuario debe cambiar su contraseña antes de usar el sistema';
