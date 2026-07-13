import { getUser } from "@/lib/session";
import { analizarArchivo } from "@/lib/ai";

// Vercel: permitir hasta 60s porque Gemini puede tardar unos segundos con archivos
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // límite de body en Vercel: 4.5 MB

export async function POST(request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

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

  try {
    const resultado = await analizarArchivo(buffer, archivo.type);
    return Response.json(resultado);
  } catch (e) {
    // analizarArchivo lanza Error con mensaje amigable
    const status = /GEMINI_API_KEY/.test(e.message) ? 500 : 502;
    return Response.json({ error: e.message }, { status });
  }
}
