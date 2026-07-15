-- =============================================================
-- TimePath - Esquema para Neon (Postgres)
-- Pega TODO este archivo en el SQL Editor de Neon y ejecútalo.
-- =============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,          -- texto plano a propósito: solo prototipo de pruebas
    racha INT NOT NULL DEFAULT 5,    -- días de racha "Sin Amanecidas"
    racha_actualizada DATE,          -- último día que aumentó la racha (evita doble aumento)
    whatsapp_wa_id TEXT UNIQUE,      -- número de WhatsApp vinculado a este usuario (chatbot)
    captura_pendiente JSONB          -- captura del bot a la que le falta curso o fecha
);

CREATE TABLE IF NOT EXISTS proyectos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    curso TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_entrega DATE,
    resumen TEXT,                    -- resumen de clase (IA), solo si el material es teórico
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS microtareas (
    id SERIAL PRIMARY KEY,
    proyecto_id INT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    tiempo TEXT NOT NULL,            -- ej: "15 min"
    orden INT NOT NULL DEFAULT 1,
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_asignada DATE,             -- día en que la IA agendó esta microtarea (dosis diaria)
    modo_estricto BOOLEAN NOT NULL DEFAULT FALSE,  -- pide evidencia verificada por IA antes de completar
    verificada BOOLEAN NOT NULL DEFAULT FALSE,     -- la IA aceptó la última evidencia enviada
    intentos INT NOT NULL DEFAULT 0,               -- cuántas veces se envió evidencia
    motivo_rechazo TEXT                            -- feedback de la IA en el último rechazo
);

-- Usuarios de prueba para los entrevistados (password "123")
INSERT INTO usuarios (username, password, racha) VALUES
    ('usuario1', '123', 5),
    ('usuario2', '123', 5),
    ('usuario3', '123', 5),
    ('usuario4', '123', 5),
    ('usuario5', '123', 5)
ON CONFLICT (username) DO NOTHING;

-- =============================================================
-- MIGRACIÓN (solo si YA creaste las tablas antes con la versión vieja).
-- Si acabas de correr el CREATE TABLE de arriba, estas columnas ya existen
-- y estos ALTER simplemente no harán nada. Es seguro ejecutarlos igual.
-- =============================================================
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS resumen TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS whatsapp_wa_id TEXT UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS captura_pendiente JSONB;
ALTER TABLE microtareas ADD COLUMN IF NOT EXISTS modo_estricto BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE microtareas ADD COLUMN IF NOT EXISTS verificada BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE microtareas ADD COLUMN IF NOT EXISTS intentos INT NOT NULL DEFAULT 0;
ALTER TABLE microtareas ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE microtareas ADD COLUMN IF NOT EXISTS fecha_asignada DATE;

-- Reparte las microtareas viejas (creadas antes de la dosis diaria): una por día desde hoy
UPDATE microtareas SET fecha_asignada = CURRENT_DATE + (orden - 1) WHERE fecha_asignada IS NULL;
