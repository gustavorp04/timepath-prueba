import { sql } from "@/lib/db";

// Guardado compartido: inserta un proyecto + sus microtareas para un usuario.
// Lo usan la captura web (app/api/tareas POST) y el chatbot de WhatsApp.
// Si no llegan microtareas válidas, usa los textos fijos del prototipo.
export async function guardarProyecto(usuarioId, { curso, fecha, descripcion, microtareas, resumen, modoExigente }) {
  const exigente = !!modoExigente;
  const microsValidas =
    Array.isArray(microtareas) && microtareas.length > 0 && microtareas.every((m) => m?.titulo)
      ? microtareas.slice(0, 12)
      : null;

  const desc =
    typeof descripcion === "string" && descripcion.trim()
      ? descripcion.trim().slice(0, 60)
      : "Asignación Desconocida";

  const resumenLimpio =
    typeof resumen === "string" && resumen.trim() ? resumen.trim().slice(0, 1000) : null;

  const existentes = await sql`
    SELECT count(*)::int AS n FROM proyectos WHERE usuario_id = ${usuarioId}
  `;
  const eraPrimero = existentes[0].n === 0;

  const inserted = await sql`
    INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, resumen)
    VALUES (${usuarioId}, ${curso}, ${desc}, ${fecha || null}, ${resumenLimpio})
    RETURNING id
  `;
  const proyectoId = inserted[0].id;

  if (microsValidas) {
    let orden = 1;
    for (const m of microsValidas) {
      await sql`
        INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, modo_estricto)
        VALUES (
          ${proyectoId},
          ${String(m.titulo).slice(0, 60)},
          ${String(m.descripcion || "Avanzar con esta parte de la tarea.").slice(0, 300)},
          ${String(m.tiempo || "20 min").slice(0, 20)},
          ${orden++},
          ${exigente}
        )
      `;
    }
  } else {
    await sql`
      INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, modo_estricto) VALUES
      (${proyectoId}, 'Fase 1: Revisión analítica', 'Realizar una lectura rápida del material ingresado para identificar los 3 conceptos clave antes de empezar el desarrollo práctico.', '15 min', 1, ${exigente}),
      (${proyectoId}, 'Fase 2: Ejecución principal', 'Desarrollar la estructura base de la solución utilizando un temporizador Pomodoro estricto de concentración.', '30 min', 2, ${exigente})
    `;
  }

  // Igual que el HTML original: si era el primer proyecto (y sin IA de por medio),
  // se agrega uno extra cerrado para mostrar la funcionalidad de acordeón
  if (eraPrimero && !microsValidas) {
    const extra = await sql`
      INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega)
      VALUES (${usuarioId}, 'Emprendimiento', 'Lienzo 6x6', NULL)
      RETURNING id
    `;
    await sql`
      INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden) VALUES
      (${extra[0].id}, 'Definir propuesta de valor', 'Identificar el problema principal del cliente y escribir una oración corta de cómo tu producto resuelve esa fricción.', '20 min', 1),
      (${extra[0].id}, 'Estructurar segmentos clave', 'Crear el arquetipo visual de tu cliente ideal (edad, demografía e intereses) basándote en la teoría de clases.', '25 min', 2)
    `;
  }

  return proyectoId;
}
