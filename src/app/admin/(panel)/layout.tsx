import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { capabilitiesFor, ROLE_LABELS } from "@/lib/permissions";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  return (
    <AdminShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] ?? user.role,
        avatarUrl: user.avatarUrl,
      }}
      capabilities={capabilitiesFor(user)}
    >
      {children}
    </AdminShell>
  );
}
