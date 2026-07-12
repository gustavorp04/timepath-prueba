import { getUser } from "@/lib/session";

// Vercel: permitir hasta 60s porque Gemini puede tardar unos segundos con archivos
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // límite de body en Vercel: 4.5 MB

function construirPrompt(hoy) {
  return `Analiza el archivo adjunto (puede ser un sílabo o enunciado en PDF, una foto de una pizarra o diapositiva, o un audio donde un estudiante o profesor describe una tarea). Hoy es ${hoy}.

Identifica LA tarea o proyecto académico principal y fracciónalo en microtareas pequeñas y accionables, pensadas para que un estudiante universitario no procrastine por abrumamiento.

Responde SOLO con JSON válido con esta forma exacta:
{
  "curso": "nombre corto del curso, o null si no se menciona",
  "descripcion": "título corto de la tarea (máximo 40 caracteres)",
  "fecha_entrega": "YYYY-MM-DD, o null si no se menciona. Si dicen fechas relativas como 'el viernes' o 'en dos semanas', calcúlala respecto a hoy",
  "microtareas": [
    { "titulo": "acción concreta (máximo 45 caracteres)", "descripcion": "1 o 2 frases explicando exactamente qué hacer", "tiempo_min": 15 }
  ]
}

Genera entre 2 y 4 microtareas, cada una de 15 a 45 minutos, ordenadas lógicamente, todo en español.`;
}

export async function POST(request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Falta GEMINI_API_KEY en las variables de entorno" },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const archivo = form.get("archivo");
  if (!archivo || typeof archivo === "string") {
    return Response.json({ error: "No llegó ningún archivo" }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return Response.json(
      { error: "El archivo pesa más de 4 MB. Usa uno más liviano." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const mimeType = archivo.type || "application/octet-stream";
  const hoy = new Date().toISOString().slice(0, 10);

  const tipoParte = mimeType.startsWith("image/")
    ? "image"
    : mimeType.startsWith("audio/")
      ? "audio"
      : "document";

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: "gemini-3.5-flash",
      input: [
        { type: "text", text: construirPrompt(hoy) },
        { type: tipoParte, data: buffer.toString("base64"), mime_type: mimeType },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    console.error("Error de Gemini:", res.status, detalle);
    return Response.json(
      { error: "La IA no pudo procesar el archivo. Intenta con otro." },
      { status: 502 }
    );
  }

  const data = await res.json();
  const texto = (data?.steps || [])
    .flatMap((s) => s?.content || [])
    .map((c) => c?.text || "")
    .join("");

  let parsed;
  try {
    parsed = JSON.parse(texto);
  } catch {
    console.error("Respuesta de Gemini no es JSON:", texto);
    return Response.json(
      { error: "La IA devolvió una respuesta inválida. Intenta de nuevo." },
      { status: 502 }
    );
  }

  const microtareas = Array.isArray(parsed.microtareas)
    ? parsed.microtareas.slice(0, 4).map((m, i) => ({
        titulo: String(m.titulo || `Fase ${i + 1}`).slice(0, 60),
        descripcion: String(m.descripcion || "Avanzar con esta parte de la tarea.").slice(0, 300),
        tiempo: `${Math.min(60, Math.max(10, parseInt(m.tiempo_min, 10) || 20))} min`,
      }))
    : [];

  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(parsed.fecha_entrega || "")
    ? parsed.fecha_entrega
    : null;

  return Response.json({
    curso: parsed.curso ? String(parsed.curso).slice(0, 40) : null,
    descripcion: String(parsed.descripcion || "Tarea detectada").slice(0, 60),
    fecha_entrega: fechaValida,
    microtareas,
  });
}
