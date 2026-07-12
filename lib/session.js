import { cookies } from "next/headers";

const COOKIE_NAME = "tp_session";

export async function getUser() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}

export async function setUser(user) {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify({ id: user.id, username: user.username }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
}

export async function clearUser() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
