// Cerebro compartido: analiza un archivo (PDF/imagen/audio) con Gemini y
// devuelve la tarea fraccionada. Lo usan tanto la captura web (app/api/capturar)
// como el chatbot de WhatsApp (app/api/whatsapp/webhook).

function construirPrompt(hoy) {
  return `Analiza el archivo adjunto (puede ser un sílabo o enunciado en PDF, una foto de una pizarra o diapositiva, una diapositiva/PPT de teoría, o un audio donde un estudiante o profesor describe una tarea). Hoy es ${hoy}.

Identifica LA tarea o proyecto académico principal y fracciónalo en microtareas pequeñas y accionables, pensadas para que un estudiante universitario no procrastine por abrumamiento.

Además, determina si el material es TEÓRICO (una diapositiva de teoría, apuntes de clase, foto de pizarra con conceptos, un tema para estudiar) en cuyo caso genera un resumen de clase explicado para que el estudiante entienda el tema antes de trabajarlo.

Responde SOLO con JSON válido con esta forma exacta:
{
  "curso": "nombre corto del curso, o null si no se menciona",
  "descripcion": "título corto de la tarea (máximo 40 caracteres)",
  "fecha_entrega": "YYYY-MM-DD, o null si no se menciona. Si dicen fechas relativas como 'el viernes' o 'en dos semanas', calcúlala respecto a hoy",
  "es_material_teorico": true o false,
  "resumen_clase": "solo si es_material_teorico es true: una explicación clara del tema en 100-200 palabras, en español sencillo, como si le explicaras a un compañero. Si es_material_teorico es false, pon null",
  "microtareas": [
    { "titulo": "acción concreta (máximo 45 caracteres)", "descripcion": "1 o 2 frases explicando exactamente qué hacer", "tiempo_min": 15 }
  ]
}

Genera entre 2 y 4 microtareas, cada una de 15 a 45 minutos, ordenadas lógicamente, todo en español.`;
}

// Normaliza el mime type que mandan navegadores/WhatsApp a algo que Gemini acepte.
// Devuelve { mimeType, tipoParte } o { error } si el formato no es soportado.
export function normalizarMime(mimeCrudo) {
  let mimeType = (mimeCrudo || "application/octet-stream").split(";")[0].trim();
  if (mimeType === "audio/mp4" || mimeType === "audio/x-m4a") mimeType = "audio/m4a";

  if (mimeType === "audio/webm") {
    return {
      error:
        "Ese formato de audio no lo soporta la IA. Usa Chrome o Edge en Windows/Android, o envía una nota de voz de WhatsApp.",
    };
  }

  const tipoParte = mimeType.startsWith("image/")
    ? "image"
    : mimeType.startsWith("audio/")
      ? "audio"
      : "document";

  return { mimeType, tipoParte };
}

// Llama a Gemini con el archivo y devuelve la tarea estructurada.
// Lanza Error con mensaje amigable si algo falla.
export async function analizarArchivo(buffer, mimeCrudo) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
  }

  const norm = normalizarMime(mimeCrudo);
  if (norm.error) throw new Error(norm.error);
  const { mimeType, tipoParte } = norm;

  const hoy = new Date().toISOString().slice(0, 10);

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
    throw new Error("La IA no pudo procesar el archivo. Intenta con otro.");
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
    throw new Error("La IA devolvió una respuesta inválida. Intenta de nuevo.");
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

  const resumen =
    parsed.es_material_teorico && typeof parsed.resumen_clase === "string" && parsed.resumen_clase.trim()
      ? parsed.resumen_clase.trim().slice(0, 1000)
      : null;

  return {
    curso: parsed.curso ? String(parsed.curso).slice(0, 40) : null,
    descripcion: String(parsed.descripcion || "Tarea detectada").slice(0, 60),
    fecha_entrega: fechaValida,
    resumen_clase: resumen,
    microtareas,
  };
}
