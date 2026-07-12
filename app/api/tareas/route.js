import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";

// GET: lista los proyectos del usuario con sus microtareas + su racha
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const proyectos = await sql`
    SELECT id, curso, descripcion, to_char(fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega
    FROM proyectos
    WHERE usuario_id = ${user.id}
    ORDER BY id DESC
  `;

  const micros = await sql`
    SELECT m.id, m.proyecto_id, m.titulo, m.descripcion, m.tiempo, m.completada
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE p.usuario_id = ${user.id}
    ORDER BY m.orden, m.id
  `;

  const rachaRows = await sql`SELECT racha FROM usuarios WHERE id = ${user.id}`;

  const conMicros = proyectos.map((p) => ({
    ...p,
    microtareas: micros.filter((m) => m.proyecto_id === p.id),
  }));

  return Response.json({
    proyectos: conMicros,
    racha: rachaRows[0]?.racha ?? 0,
    username: user.username,
  });
}

// POST: crea un proyecto fraccionado. Si llegan microtareas (generadas por Gemini
// en /api/capturar) se usan esas; si no, se usan los textos fijos del prototipo.
export async function POST(request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { curso, fecha, tipo, descripcion: descIA, microtareas: microsIA } = await request.json();
  if (!curso || !fecha) {
    return Response.json({ error: "Faltan curso o fecha" }, { status: 400 });
  }

  const microsValidas =
    Array.isArray(microsIA) && microsIA.length > 0 && microsIA.every((m) => m?.titulo)
      ? microsIA.slice(0, 6)
      : null;

  let descripcion = typeof descIA === "string" && descIA.trim() ? descIA.trim().slice(0, 60) : "";
  if (!descripcion) {
    descripcion = "Asignación Desconocida";
    if (tipo === "pdf") descripcion = "Estructura de Documento";
    if (tipo === "foto") descripcion = "Resolución de Ejercicios";
    if (tipo === "audio") descripcion = "Esquema y Resumen";
  }

  const existentes = await sql`
    SELECT count(*)::int AS n FROM proyectos WHERE usuario_id = ${user.id}
  `;
  const eraPrimero = existentes[0].n === 0;

  const inserted = await sql`
    INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega)
    VALUES (${user.id}, ${curso}, ${descripcion}, ${fecha})
    RETURNING id
  `;
  const proyectoId = inserted[0].id;

  if (microsValidas) {
    let orden = 1;
    for (const m of microsValidas) {
      await sql`
        INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden)
        VALUES (
          ${proyectoId},
          ${String(m.titulo).slice(0, 60)},
          ${String(m.descripcion || "Avanzar con esta parte de la tarea.").slice(0, 300)},
          ${String(m.tiempo || "20 min").slice(0, 20)},
          ${orden++}
        )
      `;
    }
  } else {
    await sql`
      INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden) VALUES
      (${proyectoId}, 'Fase 1: Revisión analítica', 'Realizar una lectura rápida del material ingresado para identificar los 3 conceptos clave antes de empezar el desarrollo práctico.', '15 min', 1),
      (${proyectoId}, 'Fase 2: Ejecución principal', 'Desarrollar la estructura base de la solución utilizando un temporizador Pomodoro estricto de concentración.', '30 min', 2)
    `;
  }

  // Igual que el HTML original: si era el primer proyecto (y sin IA de por medio),
  // se agrega uno extra cerrado para mostrar la funcionalidad de acordeón
  if (eraPrimero && !microsValidas) {
    const extra = await sql`
      INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega)
      VALUES (${user.id}, 'Emprendimiento', 'Lienzo 6x6', NULL)
      RETURNING id
    `;
    await sql`
      INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden) VALUES
      (${extra[0].id}, 'Definir propuesta de valor', 'Identificar el problema principal del cliente y escribir una oración corta de cómo tu producto resuelve esa fricción.', '20 min', 1),
      (${extra[0].id}, 'Estructurar segmentos clave', 'Crear el arquetipo visual de tu cliente ideal (edad, demografía e intereses) basándote en la teoría de clases.', '25 min', 2)
    `;
  }

  return Response.json({ ok: true, proyectoId });
}
