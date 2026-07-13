import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";
import { guardarProyecto } from "@/lib/proyectos";

// GET: lista los proyectos del usuario con sus microtareas + su racha
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const proyectos = await sql`
    SELECT id, curso, descripcion, resumen, to_char(fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega
    FROM proyectos
    WHERE usuario_id = ${user.id}
    ORDER BY id DESC
  `;

  const micros = await sql`
    SELECT m.id, m.proyecto_id, m.titulo, m.descripcion, m.tiempo, m.completada,
           m.modo_estricto, m.verificada, m.intentos, m.motivo_rechazo
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

  const { curso, fecha, descripcion, microtareas, resumen, modoExigente } = await request.json();
  if (!curso || !fecha) {
    return Response.json({ error: "Faltan curso o fecha" }, { status: 400 });
  }

  const proyectoId = await guardarProyecto(user.id, {
    curso,
    fecha,
    descripcion,
    microtareas,
    resumen,
    modoExigente: !!modoExigente,
  });

  return Response.json({ ok: true, proyectoId });
}
