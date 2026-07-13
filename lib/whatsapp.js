// Helpers para hablar con la WhatsApp Cloud API (Meta).
const GRAPH = "https://graph.facebook.com/v23.0";

// Envía un mensaje de texto a un número de WhatsApp.
export async function enviarMensaje(to, texto) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error("Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID");
    return;
  }

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto.slice(0, 4000) },
    }),
  });

  if (!res.ok) {
    console.error("Error enviando WhatsApp:", res.status, await res.text());
  }
}

// Descarga un archivo que el usuario mandó por WhatsApp.
// Meta manda un media_id; hay que pedir la URL temporal y luego descargarla.
// Devuelve { buffer, mimeType } o lanza Error.
export async function descargarMedia(mediaId) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error("Falta WHATSAPP_TOKEN");

  const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    throw new Error(`No se pudo obtener la info del archivo (${metaRes.status})`);
  }
  const meta = await metaRes.json();

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    throw new Error(`No se pudo descargar el archivo (${fileRes.status})`);
  }

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return { buffer, mimeType: meta.mime_type || "application/octet-stream" };
}
