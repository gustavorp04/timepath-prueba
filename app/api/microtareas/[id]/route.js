import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";

// PATCH: marca/desmarca una microtarea (solo si pertenece al usuario)
export async function PATCH(request, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { completada } = await request.json();

  const rows = await sql`
    UPDATE microtareas m
    SET completada = ${!!completada}
    FROM proyectos p
    WHERE m.id = ${id}
      AND p.id = m.proyecto_id
      AND p.usuario_id = ${user.id}
    RETURNING m.id, m.completada
  `;

  if (rows.length === 0) {
    return Response.json({ error: "Microtarea no encontrada" }, { status: 404 });
  }

  return Response.json({ ok: true, microtarea: rows[0] });
}
