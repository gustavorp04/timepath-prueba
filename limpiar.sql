-- =============================================================
-- TimePath - Limpieza total: deja la app "como nueva"
-- Mantiene los 15 usuarios (misma contraseña) y la vinculación
-- de WhatsApp, pero borra TODAS las tareas y pone las rachas en 0.
-- Pega este archivo en el SQL Editor de Neon y ejecútalo.
-- =============================================================

-- Borra todas las tareas de todos los usuarios (arrastra sus microtareas)
TRUNCATE proyectos RESTART IDENTITY CASCADE;

-- Rachas a cero y sin capturas a medias: usuarios como recién creados
UPDATE usuarios SET racha = 0, racha_actualizada = NULL, captura_pendiente = NULL;

-- (Opcional) Si también quieres desvincular WhatsApp, quita el "--" de abajo:
-- UPDATE usuarios SET whatsapp_wa_id = NULL;
