import { sql } from "@/lib/db";
import { setUser } from "@/lib/session";

export async function POST(request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return Response.json({ error: "Completa usuario y contraseña" }, { status: 400 });
  }

  const rows = await sql`
    SELECT id, username FROM usuarios
    WHERE username = ${username} AND password = ${password}
  `;

  if (rows.length === 0) {
    return Response.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  await setUser(rows[0]);
  return Response.json({ ok: true, username: rows[0].username });
}
