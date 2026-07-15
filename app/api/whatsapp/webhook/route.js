import { after } from "next/server";
import { sql } from "@/lib/db";
import { analizarArchivo } from "@/lib/ai";
import { guardarProyecto, hoyLocal } from "@/lib/proyectos";
import { enviarMensaje, enviarBotones, descargarMedia } from "@/lib/whatsapp";

export const maxDuration = 60;

// ---- GET: verificación del webhook (handshake de Meta) ----
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ---- POST: mensajes entrantes ----
// Respondemos 200 de inmediato y procesamos en segundo plano (after), porque
// analizar con Gemini puede tardar y Meta reintenta si no recibe 200 rápido.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("OK", { status: 200 });
  }

  after(async () => {
    try {
      await procesar(body);
    } catch (e) {
      console.error("Error en webhook de WhatsApp:", e);
    }
  });

  return new Response("OK", { status: 200 });
}

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

// Intenta sacar una fecha YYYY-MM-DD de un texto libre. Devuelve null si no puede.
function parsearFecha(texto) {
  const t = (texto || "").trim().toLowerCase();

  let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = t.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (m) {
    const dia = m[1].padStart(2, "0");
    const mes = m[2].padStart(2, "0");
    let anio = m[3] || String(new Date().getFullYear());
    if (anio.length === 2) anio = "20" + anio;
    return `${anio}-${mes}-${dia}`;
  }

  m = t.match(/(\d{1,2})\s*(?:de\s*)?([a-zá]+)/);
  if (m && MESES[m[2]]) {
    const dia = m[1].padStart(2, "0");
    const mes = String(MESES[m[2]]).padStart(2, "0");
    const anio = new Date().getFullYear();
    return `${anio}-${mes}-${dia}`;
  }

  return null;
}

// Guarda el proyecto (repartido en dosis diarias) y confirma por WhatsApp
async function finalizar(usuario, captura, from) {
  const { micros } = await guardarProyecto(usuario.id, {
    curso: captura.curso,
    fecha: captura.fecha,
    descripcion: captura.descripcion,
    microtareas: captura.microtareas,
    resumen: captura.resumen,
  });
  await sql`UPDATE usuarios SET captura_pendiente = NULL WHERE id = ${usuario.id}`;

  const hoy = hoyLocal();
  const deHoy = micros.filter((m) => m.fecha_asignada === hoy);
  const listaHoy = deHoy.map((m) => `• ${m.titulo} (${m.tiempo})`).join("\n");
  const primerDia = micros[0]?.fecha_asignada;

  let msg = `✅ *${captura.descripcion}* (${captura.curso}) para el ${captura.fecha}.\n\nLa dividí en ${micros.length} pasos pequeños y los repartí en tu agenda para que no te satures.`;
  msg += deHoy.length
    ? `\n\n📌 Hoy solo te toca:\n${listaHoy}`
    : `\n\n📌 Hoy ya no te toca nada de esto: empiezas el ${primerDia}. 😌`;
  msg += `\n\nAbre la app para marcar tu avance. 💪`;
  if (captura.resumen) {
    msg += `\n\n📘 Además te dejé un resumen de clase de este tema en la app.`;
  }
  await enviarMensaje(from, msg);
}

// Si ya hay curso y fecha, guarda directo; si no, pide lo que falte.
async function avanzar(usuario, captura, from) {
  if (captura.curso && captura.fecha) {
    await finalizar(usuario, captura, from);
    return;
  }
  await sql`UPDATE usuarios SET captura_pendiente = ${JSON.stringify(captura)} WHERE id = ${usuario.id}`;
  if (!captura.curso) {
    await enviarMensaje(from, `Detecté: *${captura.descripcion}*.\n\n¿A qué *curso* pertenece? (escríbelo)`);
  } else {
    await enviarMensaje(
      from,
      `Detecté: *${captura.descripcion}* (${captura.curso}).\n\n¿Para qué *fecha* es la entrega? (ej: 2026-07-20 o 20/07)`
    );
  }
}

async function procesar(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return; // status updates u otros eventos: ignorar

  const from = message.from;

  // ¿Este número ya está vinculado a un usuario?
  const usuarios = await sql`
    SELECT id, username, captura_pendiente FROM usuarios WHERE whatsapp_wa_id = ${from}
  `;
  const usuario = usuarios[0];

  // ---- CASO 1: número NO vinculado ----
  if (!usuario) {
    const texto = message.text?.body?.trim() || "";
    const m = texto.match(/^(\w+)\s+(\S+)$/);
    if (m) {
      const filas = await sql`
        SELECT id, username FROM usuarios WHERE username = ${m[1]} AND password = ${m[2]}
      `;
      if (filas[0]) {
        await sql`UPDATE usuarios SET whatsapp_wa_id = ${from} WHERE id = ${filas[0].id}`;
        await enviarMensaje(
          from,
          `¡Listo, ${filas[0].username}! 🎉 Ya estás vinculado a TimePath.\n\nEnvíame una *foto*, un *PDF* o una *nota de voz* de tu tarea y la organizo por ti en micro-tareas. 📚`
        );
        return;
      }
    }
    await enviarMensaje(
      from,
      `Hola 👋 Soy TimePath. Para empezar, identifícate enviando tu usuario y clave así:\n\n*usuario1 123*`
    );
    return;
  }

  const pendiente = usuario.captura_pendiente;

  // ---- CASO 2: mandó un archivo (imagen / documento / audio) ----
  const media =
    message.type === "image"
      ? message.image
      : message.type === "document"
        ? message.document
        : message.type === "audio"
          ? message.audio
          : null;

  if (media) {
    await enviarMensaje(from, "📥 Recibido, analizando con la IA... dame unos segundos.");
    let resultado;
    try {
      const { buffer, mimeType } = await descargarMedia(media.id);
      resultado = await analizarArchivo(buffer, media.mime_type || mimeType);
    } catch (e) {
      await enviarMensaje(from, `❌ ${e.message}`);
      return;
    }

    const captura = {
      curso: resultado.curso,
      fecha: resultado.fecha_entrega,
      descripcion: resultado.descripcion,
      resumen: resultado.resumen_clase,
      microtareas: resultado.microtareas,
    };

    await avanzar(usuario, captura, from);
    return;
  }

  // ---- CASO 3: mandó texto ----
  const texto = message.text?.body?.trim() || "";

  if (pendiente) {
    const captura = { ...pendiente };
    if (!captura.curso) {
      captura.curso = texto.slice(0, 40);
    } else if (!captura.fecha) {
      const fecha = parsearFecha(texto);
      if (!fecha) {
        await enviarMensaje(
          from,
          `No entendí la fecha 😅. Envíala así: *2026-07-20* o *20/07*.`
        );
        return;
      }
      captura.fecha = fecha;
    }

    await avanzar(usuario, captura, from);
    return;
  }

  // ---- CASO 4: sin nada pendiente — menú principal ----
  const idMenu = message.type === "interactive" ? message.interactive?.button_reply?.id : null;

  if (idMenu === "menu_nueva") {
    await enviarMensaje(from, "Mándame una *foto*, un *PDF* o una *nota de voz* de tu tarea y la organizo por ti. 📚");
    return;
  }
  if (idMenu === "menu_ver") {
    await verTareas(usuario, from);
    return;
  }
  if (idMenu === "menu_cerrar") {
    await sql`UPDATE usuarios SET whatsapp_wa_id = NULL WHERE id = ${usuario.id}`;
    await enviarMensaje(
      from,
      `Listo, ${usuario.username}, cerré tu sesión de WhatsApp. Si quieres volver a vincularte, escribe tu usuario y clave así: *usuario1 123*`
    );
    return;
  }

  await enviarBotones(from, `Hola de nuevo, ${usuario.username} 👋 ¿Qué quieres hacer?`, BOTONES_MENU);
}

const BOTONES_MENU = [
  { id: "menu_nueva", title: "Nueva tarea" },
  { id: "menu_ver", title: "Ver tareas" },
  { id: "menu_cerrar", title: "Cerrar sesión" },
];

// Muestra solo la dosis de HOY (lo agendado para hoy + lo atrasado pendiente)
async function verTareas(usuario, from) {
  const hoy = hoyLocal();

  const micros = await sql`
    SELECT m.titulo, m.tiempo, m.completada, p.curso
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE p.usuario_id = ${usuario.id}
      AND (m.fecha_asignada IS NULL
           OR m.fecha_asignada = ${hoy}
           OR (m.fecha_asignada < ${hoy} AND m.completada = FALSE))
    ORDER BY m.proyecto_id, m.orden, m.id
  `;

  const futuras = await sql`
    SELECT count(*)::int AS n
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE p.usuario_id = ${usuario.id}
      AND m.completada = FALSE
      AND m.fecha_asignada > ${hoy}
  `;
  const enAgenda = futuras[0]?.n || 0;

  if (micros.length === 0 && enAgenda === 0) {
    await enviarMensaje(
      from,
      "Todavía no tienes tareas guardadas. Mándame una foto, PDF o nota de voz para crear la primera. 📚"
    );
    return;
  }

  let msg;
  if (micros.length === 0) {
    msg = `🎉 Hoy no tienes nada pendiente. Descansa sin culpa: ya hay ${enAgenda} pasos agendados para los próximos días.`;
  } else {
    const lista = micros
      .map((m) => `${m.completada ? "✅" : "⬜"} ${m.titulo} (${m.tiempo}) — _${m.curso}_`)
      .join("\n");
    msg = `📋 Tu dosis de HOY:\n\n${lista}`;
    if (enAgenda > 0) {
      msg += `\n\n😌 El resto (${enAgenda} pasos) ya está repartido en tu agenda. Hoy no pienses en eso.`;
    }
  }

  await enviarMensaje(from, msg);
  await enviarBotones(from, "¿Qué quieres hacer ahora?", BOTONES_MENU);
}
