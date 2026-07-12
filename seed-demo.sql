-- =============================================================
-- TimePath - Datos DEMO (opcional)
-- Simula que cada usuario ya usó la app varios días:
-- rachas distintas, un proyecto pasado ya completado y uno activo a medias.
-- Ejecutar en el SQL Editor de Neon DESPUÉS de schema.sql.
--
-- OJO: no dejes a ningún usuario con TODAS sus microtareas completadas,
-- porque al entrar le saldría de inmediato la pantalla de "¡Día conquistado!".
-- Por eso cada usuario tiene un proyecto activo con tareas pendientes.
-- =============================================================

-- Rachas distintas por usuario
UPDATE usuarios SET racha = 7,  racha_actualizada = NULL WHERE username = 'usuario1';
UPDATE usuarios SET racha = 12, racha_actualizada = NULL WHERE username = 'usuario2';
UPDATE usuarios SET racha = 3,  racha_actualizada = NULL WHERE username = 'usuario3';
UPDATE usuarios SET racha = 9,  racha_actualizada = NULL WHERE username = 'usuario4';
UPDATE usuarios SET racha = 5,  racha_actualizada = NULL WHERE username = 'usuario5';

-- ---------- usuario1 ----------
WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario1'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Cálculo Avanzado', 'Taller de Integrales', CURRENT_DATE - 2, now() - interval '3 days' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Resolver guía de ejercicios', 'Resolver los 10 ejercicios de integrales por partes de la guía del profesor.', '30 min', 1, TRUE),
  ('Verificar con solucionario', 'Comparar resultados con el solucionario y corregir los que salieron mal.', '15 min', 2, TRUE)
) AS x(titulo, descripcion, tiempo, orden, completada);

WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario1'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Algoritmos y Estructuras', 'Proyecto Backend Final', CURRENT_DATE + 5, now() - interval '1 day' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Diseñar el modelo de datos', 'Dibujar el diagrama entidad-relación con las 4 tablas principales del proyecto.', '25 min', 1, TRUE),
  ('Implementar endpoints CRUD', 'Programar los endpoints de crear y listar usando el framework visto en clase.', '40 min', 2, FALSE),
  ('Escribir pruebas básicas', 'Probar los endpoints con 3 casos: éxito, dato inválido y recurso inexistente.', '20 min', 3, FALSE)
) AS x(titulo, descripcion, tiempo, orden, completada);

-- ---------- usuario2 ----------
WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario2'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Física III', 'Informe Lab de Ondas', CURRENT_DATE - 1, now() - interval '4 days' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Tabular datos del laboratorio', 'Pasar las mediciones del cuaderno a una hoja de cálculo con sus unidades.', '20 min', 1, TRUE),
  ('Graficar y concluir', 'Generar las 2 gráficas de frecuencia y escribir las conclusiones del informe.', '30 min', 2, TRUE)
) AS x(titulo, descripcion, tiempo, orden, completada);

WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario2'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Emprendimiento', 'Pitch Deck MVP', CURRENT_DATE + 3, now() - interval '6 hours' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Redactar propuesta de valor', 'Escribir en una oración el problema y cómo el producto lo resuelve.', '15 min', 1, TRUE),
  ('Armar 5 diapositivas clave', 'Problema, solución, mercado, modelo de negocio y equipo.', '35 min', 2, FALSE)
) AS x(titulo, descripcion, tiempo, orden, completada);

-- ---------- usuario3 ----------
WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario3'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Historia Crítica', 'Ensayo Comparativo', CURRENT_DATE + 4, now() - interval '2 days' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Leer las 2 fuentes asignadas', 'Lectura activa subrayando las tesis principales de cada autor.', '30 min', 1, TRUE),
  ('Esquema del ensayo', 'Definir introducción, 3 argumentos comparativos y conclusión.', '20 min', 2, FALSE),
  ('Redactar primer borrador', 'Escribir sin editar, siguiendo el esquema, mínimo 600 palabras.', '40 min', 3, FALSE)
) AS x(titulo, descripcion, tiempo, orden, completada);

-- ---------- usuario4 ----------
WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario4'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Cálculo Avanzado', 'Examen Parcial 2', CURRENT_DATE - 3, now() - interval '5 days' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Repasar series de Taylor', 'Rehacer los 5 ejemplos vistos en clase sin mirar la solución.', '30 min', 1, TRUE),
  ('Simulacro cronometrado', 'Resolver el parcial del ciclo pasado en 90 minutos reales.', '45 min', 2, TRUE)
) AS x(titulo, descripcion, tiempo, orden, completada);

WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario4'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Algoritmos y Estructuras', 'Lab de Grafos', CURRENT_DATE + 2, now() - interval '1 day' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Implementar BFS', 'Programar el recorrido en anchura sobre la lista de adyacencia dada.', '30 min', 1, FALSE),
  ('Probar con el grafo de ejemplo', 'Ejecutar con el caso del enunciado y validar la salida esperada.', '15 min', 2, FALSE)
) AS x(titulo, descripcion, tiempo, orden, completada);

-- ---------- usuario5 ----------
WITH u AS (SELECT id FROM usuarios WHERE username = 'usuario5'),
p AS (
  INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, creado_en)
  SELECT id, 'Emprendimiento', 'Lienzo 6x6', CURRENT_DATE + 6, now() - interval '12 hours' FROM u
  RETURNING id
)
INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, completada)
SELECT p.id, x.* FROM p, (VALUES
  ('Definir propuesta de valor', 'Identificar el problema principal del cliente y cómo el producto lo resuelve.', '20 min', 1, TRUE),
  ('Estructurar segmentos clave', 'Crear el arquetipo del cliente ideal: edad, demografía e intereses.', '25 min', 2, FALSE)
) AS x(titulo, descripcion, tiempo, orden, completada);
