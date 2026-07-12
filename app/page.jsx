import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import AppShell from "@/components/AppShell";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <AppShell username={user.username} />;
}
