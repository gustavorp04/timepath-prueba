import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const rows = await sql`SELECT racha FROM usuarios WHERE id = ${user.id}`;
  return Response.json({ racha: rows[0]?.racha ?? 0 });
}

// POST: aumenta la racha en 1, máximo una vez por día
export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const updated = await sql`
    UPDATE usuarios
    SET racha = racha + 1, racha_actualizada = CURRENT_DATE
    WHERE id = ${user.id}
      AND (racha_actualizada IS NULL OR racha_actualizada < CURRENT_DATE)
    RETURNING racha
  `;

  if (updated.length > 0) {
    return Response.json({ racha: updated[0].racha, aumentada: true });
  }

  const rows = await sql`SELECT racha FROM usuarios WHERE id = ${user.id}`;
  return Response.json({ racha: rows[0]?.racha ?? 0, aumentada: false });
}
