-- Trazabilidad de acceso a PHI (quién hizo qué, sobre qué registro, cuándo).
-- Cubre el gap de "Repudiation"/HIPAA-equivalente: antes solo existía trazabilidad
-- de creado_por/updated_at para escrituras, pero ninguna para lecturas.
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID,
    username VARCHAR(100),
    accion VARCHAR(20) NOT NULL, -- READ, LIST, CREATE, UPDATE, DELETE
    parto_id VARCHAR(255),
    detalle VARCHAR(255),
    ip VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_parto_id ON audit_log(parto_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
