import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsroom sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");
  return <LoginForm />;
}
