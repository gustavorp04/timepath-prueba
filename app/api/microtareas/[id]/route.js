import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";

// PATCH: marca/desmarca una microtarea (solo si pertenece al usuario)
export async function PATCH(request, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { completada: completadaRaw } = await request.json();
  const completada = !!completadaRaw;

  if (completada) {
    // Las tareas en modo exigente solo pueden completarse vía /verificar
    const estado = await sql`
      SELECT m.modo_estricto, m.verificada
      FROM microtareas m
      JOIN proyectos p ON p.id = m.proyecto_id
      WHERE m.id = ${id} AND p.usuario_id = ${user.id}
    `;
    if (estado.length === 0) {
      return Response.json({ error: "Microtarea no encontrada" }, { status: 404 });
    }
    if (estado[0].modo_estricto && !estado[0].verificada) {
      return Response.json(
        { error: "Esta tarea requiere evidencia verificada por IA" },
        { status: 409 }
      );
    }
  }

  // Al desmarcar, se limpia la verificación previa (hay que volver a probar)
  const rows = completada
    ? await sql`
        UPDATE microtareas m
        SET completada = TRUE
        FROM proyectos p
        WHERE m.id = ${id} AND p.id = m.proyecto_id AND p.usuario_id = ${user.id}
        RETURNING m.id, m.completada
      `
    : await sql`
        UPDATE microtareas m
        SET completada = FALSE, verificada = FALSE
        FROM proyectos p
        WHERE m.id = ${id} AND p.id = m.proyecto_id AND p.usuario_id = ${user.id}
        RETURNING m.id, m.completada
      `;

  if (rows.length === 0) {
    return Response.json({ error: "Microtarea no encontrada" }, { status: 404 });
  }

  return Response.json({ ok: true, microtarea: rows[0] });
}
