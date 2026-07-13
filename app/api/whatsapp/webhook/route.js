import { after } from "next/server";
import { sql } from "@/lib/db";
import { analizarArchivo } from "@/lib/ai";
import { guardarProyecto } from "@/lib/proyectos";
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

function resumenMicrotareas(micros) {
  return micros.map((m, i) => `${i + 1}. ${m.titulo} (${m.tiempo})`).join("\n");
}

// Guarda el proyecto y confirma por WhatsApp
async function finalizar(usuario, captura, from) {
  await guardarProyecto(usuario.id, {
    curso: captura.curso,
    fecha: captura.fecha,
    descripcion: captura.descripcion,
    microtareas: captura.microtareas,
    resumen: captura.resumen,
    modoExigente: !!captura.modoExigente,
  });
  await sql`UPDATE usuarios SET captura_pendiente = NULL WHERE id = ${usuario.id}`;

  let msg = `✅ *${captura.descripcion}* (${captura.curso}) para el ${captura.fecha}.\n\nLa dividí en:\n${resumenMicrotareas(
    captura.microtareas
  )}\n\nÁbrela en la app para ver el detalle y marcar tu avance. 💪`;
  if (captura.modoExigente) {
    msg += `\n\n🛡️ *Modo exigente activado*: cada microtarea te pedirá evidencia verificada por IA antes de poder completarse.`;
  }
  if (captura.resumen) {
    msg += `\n\n📘 Además te dejé un resumen de clase de este tema en la app.`;
  }
  await enviarMensaje(from, msg);
}

const BOTONES_MODO_EXIGENTE = [
  { id: "modo_si", title: "Sí" },
  { id: "modo_no", title: "No" },
  { id: "modo_cancelar", title: "Cancelar" },
];

// Pregunta si activar modo exigente antes de guardar (una vez ya hay curso y fecha)
async function preguntarModoExigente(usuario, captura, from) {
  await sql`UPDATE usuarios SET captura_pendiente = ${JSON.stringify({
    ...captura,
    preguntandoModo: true,
  })} WHERE id = ${usuario.id}`;

  await enviarBotones(
    from,
    `Detecté todo: *${captura.descripcion}* (${captura.curso}) para el ${captura.fecha}.\n\n¿Activar *modo exigente*? Cada microtarea pedirá evidencia (foto/texto) verificada por IA antes de poder completarse.`,
    BOTONES_MODO_EXIGENTE
  );
}

// Si ya hay curso y fecha, pregunta el modo exigente; si no, pide lo que falte.
async function avanzar(usuario, captura, from) {
  if (captura.curso && captura.fecha) {
    await preguntarModoExigente(usuario, captura, from);
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

  // ---- CASO 2a: está esperando la respuesta de "modo exigente" (botón o texto) ----
  if (pendiente?.preguntandoModo) {
    const idBoton = message.type === "interactive" ? message.interactive?.button_reply?.id : null;
    const texto = (message.text?.body || "").trim().toLowerCase();

    const esSi = idBoton === "modo_si" || texto === "si" || texto === "sí";
    const esNo = idBoton === "modo_no" || texto === "no";
    const esCancelar = idBoton === "modo_cancelar" || texto === "cancelar";

    if (esSi || esNo) {
      const captura = { ...pendiente };
      delete captura.preguntandoModo;
      captura.modoExigente = esSi;
      await finalizar(usuario, captura, from);
      return;
    }
    if (esCancelar) {
      await sql`UPDATE usuarios SET captura_pendiente = NULL WHERE id = ${usuario.id}`;
      await enviarMensaje(from, "Listo, cancelé esa captura. Mándame otra foto, PDF o nota de voz cuando quieras. 📚");
      return;
    }
    await enviarBotones(
      from,
      "No te entendí 😅. ¿Activar *modo exigente* para esta tarea?",
      BOTONES_MODO_EXIGENTE
    );
    return;
  }

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

// Lista los proyectos recientes del usuario con sus microtareas (✅/⬜)
async function verTareas(usuario, from) {
  const proyectos = await sql`
    SELECT id, curso, descripcion, to_char(fecha_entrega, 'YYYY-MM-DD') AS fecha_entrega
    FROM proyectos WHERE usuario_id = ${usuario.id} ORDER BY id DESC LIMIT 5
  `;
  if (proyectos.length === 0) {
    await enviarMensaje(
      from,
      "Todavía no tienes tareas guardadas. Mándame una foto, PDF o nota de voz para crear la primera. 📚"
    );
    return;
  }

  const micros = await sql`
    SELECT m.proyecto_id, m.titulo, m.completada
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE p.usuario_id = ${usuario.id}
    ORDER BY m.orden, m.id
  `;

  const bloques = proyectos.map((p) => {
    const propias = micros.filter((m) => m.proyecto_id === p.id);
    const lista = propias.map((m) => `${m.completada ? "✅" : "⬜"} ${m.titulo}`).join("\n");
    return `*${p.descripcion}* (${p.curso})${p.fecha_entrega ? ` — entrega ${p.fecha_entrega}` : ""}\n${lista}`;
  });

  await enviarMensaje(from, `📋 Tus últimas tareas:\n\n${bloques.join("\n\n")}`);
}
