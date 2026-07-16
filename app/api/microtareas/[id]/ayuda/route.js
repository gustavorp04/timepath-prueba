import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";
import { pedirAyuda } from "@/lib/ai";

// Vercel: permitir hasta 60s porque Gemini puede tardar unos segundos
export const maxDuration = 60;

// POST: el estudiante reporta un bloqueo en una microtarea.
// La IA responde una guía de desatoro o una propuesta de re-fraccionamiento.
export async function POST(request, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const texto = typeof body.texto === "string" ? body.texto.trim().slice(0, 300) : "";

  const rows = await sql`
    SELECT m.titulo, m.descripcion, m.tiempo, p.curso
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE m.id = ${id} AND p.usuario_id = ${user.id}
  `;
  if (rows.length === 0) {
    return Response.json({ error: "Microtarea no encontrada" }, { status: 404 });
  }

  try {
    const ayuda = await pedirAyuda({ ...rows[0], texto });
    return Response.json(ayuda);
  } catch (e) {
    const status = /GEMINI_API_KEY/.test(e.message) ? 500 : 502;
    return Response.json({ error: e.message }, { status });
  }
}
