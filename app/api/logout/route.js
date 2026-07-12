import { clearUser } from "@/lib/session";

export async function POST() {
  await clearUser();
  return Response.json({ ok: true });
}
