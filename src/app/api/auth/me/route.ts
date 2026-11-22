import { getCurrentUser, toPublicUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null }, { status: 200 });
  return Response.json({
    user: { ...toPublicUser(user), roleLabel: ROLE_LABELS[user.role] ?? user.role },
  });
}
