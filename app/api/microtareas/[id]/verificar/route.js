import { sql } from "@/lib/db";
import { getUser } from "@/lib/session";
import { verificarEvidencia } from "@/lib/ai";

// Vercel: permitir hasta 60s porque Gemini puede tardar unos segundos con archivos
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // límite de body en Vercel: 4.5 MB

// POST: recibe evidencia (archivo y/o texto) de una microtarea en modo exigente,
// la manda a Gemini y solo la marca completada si la IA la aprueba.
export async function POST(request, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const micros = await sql`
    SELECT m.id, m.titulo, m.descripcion, m.modo_estricto
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE m.id = ${id} AND p.usuario_id = ${user.id}
  `;
  if (micros.length === 0) {
    return Response.json({ error: "Microtarea no encontrada" }, { status: 404 });
  }
  const micro = micros[0];
  if (!micro.modo_estricto) {
    return Response.json({ error: "Esta tarea no requiere verificación" }, { status: 400 });
  }

  const form = await request.formData();
  const archivo = form.get("archivo");
  const textoRaw = form.get("texto");
  const tieneArchivo = archivo && typeof archivo !== "string";
  const texto = typeof textoRaw === "string" ? textoRaw.trim().slice(0, 500) : "";

  if (!tieneArchivo && !texto) {
    return Response.json(
      { error: "Agrega una foto, documento o describe lo que hiciste" },
      { status: 400 }
    );
  }
  if (tieneArchivo && archivo.size > MAX_BYTES) {
    return Response.json({ error: "El archivo pesa más de 4 MB. Usa uno más liviano." }, { status: 400 });
  }

  let veredicto;
  try {
    veredicto = await verificarEvidencia({
      titulo: micro.titulo,
      descripcion: micro.descripcion,
      buffer: tieneArchivo ? Buffer.from(await archivo.arrayBuffer()) : null,
      mimeCrudo: tieneArchivo ? archivo.type : null,
      texto: texto || null,
    });
  } catch (e) {
    const status = /GEMINI_API_KEY/.test(e.message) ? 500 : 502;
    return Response.json({ error: e.message }, { status });
  }

  const actualizado = veredicto.cumple
    ? await sql`
        UPDATE microtareas
        SET intentos = intentos + 1, motivo_rechazo = NULL, verificada = TRUE, completada = TRUE
        WHERE id = ${id}
        RETURNING id, completada, verificada, intentos, motivo_rechazo
      `
    : await sql`
        UPDATE microtareas
        SET intentos = intentos + 1, motivo_rechazo = ${veredicto.motivo}, verificada = FALSE
        WHERE id = ${id}
        RETURNING id, completada, verificada, intentos, motivo_rechazo
      `;

  return Response.json({
    ok: true,
    cumple: veredicto.cumple,
    motivo: veredicto.motivo,
    microtarea: actualizado[0],
  });
}
