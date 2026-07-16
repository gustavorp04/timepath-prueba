import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";

// POST: reemplaza una microtarea por los subpasos más pequeños que propuso
// la IA (botón de desatoro). Los subpasos heredan el día y el orden del original.
export async function POST(request, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const subpasos = Array.isArray(body.subpasos)
    ? body.subpasos.filter((s) => s?.titulo).slice(0, 3)
    : [];
  if (subpasos.length < 2) {
    return Response.json({ error: "Se necesitan al menos 2 subpasos" }, { status: 400 });
  }

  const rows = await sql`
    SELECT m.id, m.proyecto_id, m.orden, to_char(m.fecha_asignada, 'YYYY-MM-DD') AS fecha_asignada
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE m.id = ${id} AND p.usuario_id = ${user.id}
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Microtarea no encontrada" }, { status: 404 });
  }
  const original = rows[0];

  for (const s of subpasos) {
    await sql`
      INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, fecha_asignada)
      VALUES (
        ${original.proyecto_id},
        ${String(s.titulo).slice(0, 60)},
        ${String(s.descripcion || "Avanzar con esta parte del paso.").slice(0, 300)},
        ${String(s.tiempo || "15 min").slice(0, 20)},
        ${original.orden},
        ${original.fecha_asignada}
      )
    `;
  }
  await sql`DELETE FROM microtareas WHERE id = ${original.id}`;

  return Response.json({ ok: true });
}
