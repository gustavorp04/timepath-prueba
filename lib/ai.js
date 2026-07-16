// Cerebro compartido: analiza un archivo (PDF/imagen/audio) con Gemini y
// devuelve la tarea fraccionada. Lo usan tanto la captura web (app/api/capturar)
// como el chatbot de WhatsApp (app/api/whatsapp/webhook).

function construirPrompt(hoy) {
  return `Analiza el archivo adjunto (puede ser un sílabo o enunciado en PDF, una foto de una pizarra o diapositiva, una diapositiva/PPT de teoría, o un audio donde un estudiante o profesor describe una tarea). Hoy es ${hoy}.

Identifica LA tarea o proyecto académico principal y fracciónalo en microtareas pequeñas y accionables, pensadas para que un estudiante universitario no procrastine por abrumamiento.

Si la tarea es grande o repetitiva (ej. "resolver 50 integrales" o "leer 6 capítulos"), NO la resumas en pocos bloques gigantes: agrúpala en tantas microtareas de 15 a 45 minutos como hagan falta para cubrir TODO el trabajo real (ej. "Resolver integrales 1 a 10", "Resolver integrales 11 a 20"...), hasta un máximo de 12. Si la tarea es pequeña, usa solo las 2 a 4 que de verdad necesite; no inventes pasos de relleno.

Además, determina si el material es TEÓRICO (una diapositiva de teoría, apuntes de clase, foto de pizarra con conceptos, un tema para estudiar) en cuyo caso genera un resumen de clase explicado para que el estudiante entienda el tema antes de trabajarlo.

Responde SOLO con JSON válido con esta forma exacta:
{
  "curso": "nombre corto de la MATERIA o ASIGNATURA (ej. 'Cálculo Integral', 'Historia Universal'), o null si no se menciona. IMPORTANTE: nunca pongas aquí el nivel/grado académico (ej. '2do Bachillerato', '10mo grado', 'Universidad') como si fuera el curso — eso no es una materia.",
  "descripcion": "título corto de la tarea (máximo 40 caracteres)",
  "fecha_entrega": "YYYY-MM-DD, o null si no se menciona. Si dicen fechas relativas como 'el viernes' o 'en dos semanas', calcúlala respecto a hoy",
  "es_material_teorico": true o false,
  "resumen_clase": "solo si es_material_teorico es true: una explicación clara del tema en 100-200 palabras, en español sencillo, como si le explicaras a un compañero. Si es_material_teorico es false, pon null",
  "microtareas": [
    { "titulo": "acción concreta (máximo 45 caracteres)", "descripcion": "1 o 2 frases explicando exactamente qué hacer", "tiempo_min": 15 }
  ]
}

Genera las microtareas que hagan falta (mínimo 2, máximo 12), cada una de 15 a 45 minutos, ordenadas lógicamente, todo en español.`;
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
      model: "gemini-3.1-flash-lite",
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
    ? parsed.microtareas.slice(0, 12).map((m, i) => ({
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

// Extrae el primer objeto JSON balanceado de un texto, ignorando lo que
// venga después (Gemini a veces agrega contenido extra tras el JSON cuando
// el input tiene varias partes de texto).
function extraerJSON(texto) {
  const inicio = texto.indexOf("{");
  if (inicio === -1) throw new Error("Sin JSON en la respuesta");
  let profundidad = 0;
  for (let i = inicio; i < texto.length; i++) {
    if (texto[i] === "{") profundidad++;
    else if (texto[i] === "}") {
      profundidad--;
      if (profundidad === 0) return texto.slice(inicio, i + 1);
    }
  }
  throw new Error("JSON sin cerrar en la respuesta");
}

function construirPromptAyuda({ curso, titulo, descripcion, tiempo, texto }) {
  return `Eres el asistente de una app de estudio para universitarios que evita la procrastinación. Un estudiante está ATASCADO en esta microtarea:

Curso: "${curso}"
Microtarea: "${titulo}" (duración estimada: ${tiempo})
Qué debía hacer: "${descripcion}"
${texto ? `El estudiante describe su bloqueo así: "${texto}"` : "El estudiante no explicó el motivo del bloqueo."}

Elige UNA de estas dos ayudas:
- "guia": si el bloqueo parece un problema puntual (un error técnico, no sabe por dónde empezar, no entiende un concepto o una herramienta): dale 3 o 4 pasos cortos, concretos y accionables para destrabarse AHORA MISMO. Nada genérico tipo "busca en internet": dile exactamente qué revisar, qué intentar o por dónde arrancar.
- "refraccionar": si el bloqueo suena a que el paso es demasiado grande, difuso o abrumador: divide la microtarea en 2 o 3 subpasos más pequeños, de 10 a 20 minutos cada uno, que juntos cubran el mismo trabajo, ordenados y empezando por el más fácil.

Responde SOLO con JSON válido con esta forma exacta:
{
  "tipo": "guia" o "refraccionar",
  "mensaje": "1 frase corta y empática para el estudiante (máximo 120 caracteres), sin sermones",
  "guia": ["paso concreto", "..."] (solo si tipo es "guia"; si no, null),
  "subpasos": [ { "titulo": "acción concreta (máximo 45 caracteres)", "descripcion": "1 frase de qué hacer exactamente", "tiempo_min": 15 } ] (solo si tipo es "refraccionar"; si no, null)
}

Todo en español sencillo, hablándole directo al estudiante.`;
}

// Pide a la IA una guía de desatoro o una propuesta de re-fraccionamiento
// para una microtarea en la que el estudiante reporta estar bloqueado.
export async function pedirAyuda({ curso, titulo, descripcion, tiempo, texto }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
  }

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: "gemini-3.1-flash-lite",
      input: [{ type: "text", text: construirPromptAyuda({ curso, titulo, descripcion, tiempo, texto }) }],
      response_format: {
        type: "text",
        mime_type: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    console.error("Error de Gemini (ayuda):", res.status, detalle);
    throw new Error("La IA no pudo generar la ayuda. Intenta de nuevo.");
  }

  const data = await res.json();
  const salida = (data?.steps || [])
    .flatMap((s) => s?.content || [])
    .map((c) => c?.text || "")
    .join("");

  let parsed;
  try {
    parsed = JSON.parse(extraerJSON(salida));
  } catch {
    console.error("Respuesta de Gemini no es JSON (ayuda):", salida);
    throw new Error("La IA devolvió una respuesta inválida. Intenta de nuevo.");
  }

  const guia = Array.isArray(parsed.guia)
    ? parsed.guia.slice(0, 4).map((p) => String(p).slice(0, 250)).filter(Boolean)
    : [];
  const subpasos = Array.isArray(parsed.subpasos)
    ? parsed.subpasos
        .filter((s) => s?.titulo)
        .slice(0, 3)
        .map((s) => ({
          titulo: String(s.titulo).slice(0, 60),
          descripcion: String(s.descripcion || "Avanzar con esta parte del paso.").slice(0, 300),
          tiempo: `${Math.min(30, Math.max(10, parseInt(s.tiempo_min, 10) || 15))} min`,
        }))
    : [];

  // Si la IA eligió re-fraccionar pero no mandó subpasos usables, cae a guía
  const tipo = parsed.tipo === "refraccionar" && subpasos.length >= 2 ? "refraccionar" : "guia";
  if (tipo === "guia" && guia.length === 0) {
    throw new Error("La IA devolvió una respuesta inválida. Intenta de nuevo.");
  }

  return {
    tipo,
    mensaje: String(parsed.mensaje || "Vamos a destrabar esto.").slice(0, 150),
    guia: tipo === "guia" ? guia : null,
    subpasos: tipo === "refraccionar" ? subpasos : null,
  };
}
