"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  Newspaper,
  Settings as SettingsIcon,
  Tags as TagsIcon,
  UserCog,
  Users as UsersIcon,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { api } from "@/lib/admin-api";
import { Button, Field, Input, Modal, ToastHost, notify } from "./ui";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  avatarUrl: string | null;
};

type NavEntry = { href: string; label: string; icon: typeof Newspaper; capability?: string; group: string };

const NAV: NavEntry[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/admin/articles", label: "Articles", icon: Newspaper, capability: "articles.create", group: "Content" },
  { href: "/admin/media", label: "Media library", icon: ImageIcon, capability: "media.manage", group: "Content" },
  { href: "/admin/videos", label: "Videos", icon: VideoIcon, capability: "videos.manage", group: "Content" },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, capability: "taxonomy.manage", group: "Taxonomy" },
  { href: "/admin/tags", label: "Tags", icon: TagsIcon, capability: "taxonomy.manage", group: "Taxonomy" },
  { href: "/admin/authors", label: "Authors", icon: UsersIcon, capability: "authors.manage", group: "Taxonomy" },
  { href: "/admin/homepage", label: "Homepage", icon: MonitorSmartphone, capability: "homepage.manage", group: "Presentation" },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon, capability: "settings.manage", group: "Presentation" },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail, capability: "subscribers.manage", group: "Audience" },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare, capability: "messages.manage", group: "Audience" },
  { href: "/admin/users", label: "Team & roles", icon: UserCog, capability: "users.manage", group: "Team" },
];

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/articles": "Articles",
  "/admin/articles/new": "New article",
  "/admin/media": "Media library",
  "/admin/videos": "Video management",
  "/admin/categories": "Categories",
  "/admin/tags": "Tags",
  "/admin/authors": "Authors",
  "/admin/homepage": "Homepage editor",
  "/admin/settings": "Website settings",
  "/admin/subscribers": "Newsletter subscribers",
  "/admin/messages": "Contact messages",
  "/admin/users": "Team & roles",
};

export default function AdminShell({
  user,
  capabilities,
  children,
}: {
  user: AdminUser;
  capabilities: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMobileNav(false);
    setUserMenu(false);
  }, [pathname]);

  const visibleNav = useMemo(() => NAV.filter((item) => !item.capability || capabilities.includes(item.capability)), [capabilities]);
  const groups = useMemo(() => {
    const map = new Map<string, NavEntry[]>();
    for (const item of visibleNav) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [visibleNav]);

  const title = TITLES[pathname] || (pathname.startsWith("/admin/articles/") ? "Edit article" : "Newsroom");

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const changePassword = async () => {
    setBusy(true);
    try {
      const data = await api<{ message?: string }>("/api/auth/change-password", { method: "POST", json: pw });
      notify(data.message || "Password updated", "success");
      setPwOpen(false);
      setPw({ currentPassword: "", newPassword: "" });
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not change password", "error");
    } finally {
      setBusy(false);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0b1b33] text-white">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[var(--accent)] font-cond text-base font-bold">
          {initials("DM News")}
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[0.95rem] font-bold">DM News Network</span>
          <span className="block text-[0.62rem] uppercase tracking-[0.16em] text-white/45">Newsroom CMS</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 admin-scroll">
        {groups.map(([group, items]) => (
          <div key={group} className="mb-5">
            <p className="px-2 pb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/35">{group}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 text-sm transition-colors",
                        active ? "bg-white/12 font-semibold text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[var(--accent)]" : "text-white/45")} />
                      {item.label}
                      {active ? <span aria-hidden className="ml-auto h-4 w-[3px] bg-[var(--accent)]" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 px-2.5 py-2 text-sm text-white/65 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" /> View website
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-sm text-white/65 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f2f4f7]">
      <ToastHost />
      <div className="lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

        {mobileNav ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileNav(false)} />
            <div className="absolute inset-y-0 left-0 w-[80%] max-w-[280px]">{sidebar}</div>
          </div>
        ) : null}

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
            <button
              type="button"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 place-items-center border border-slate-300 text-slate-600 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="truncate text-sm font-bold uppercase tracking-[0.08em] text-slate-800">{title}</h1>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="hidden items-center gap-1.5 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#0b1b33] hover:text-[#0b1b33] sm:inline-flex"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View site
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-2 border border-slate-200 px-2 py-1.5 text-left hover:border-slate-300"
                  aria-haspopup="menu"
                  aria-expanded={userMenu}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" width={28} height={28} />
                  ) : (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0b1b33] text-[0.65rem] font-bold text-white">
                      {initials(user.name)}
                    </span>
                  )}
                  <span className="hidden leading-tight sm:block">
                    <span className="block text-xs font-semibold text-slate-800">{user.name}</span>
                    <span className="block text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">{user.roleLabel}</span>
                  </span>
                </button>
                {userMenu ? (
                  <div className="absolute right-0 top-full z-40 mt-1 w-52 border border-slate-200 bg-white py-1 shadow-lg">
                    <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">{user.email}</p>
                    <button type="button" className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setPwOpen(true); setUserMenu(false); }}>
                      Change password
                    </button>
                    <Link href="/admin/users" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      Manage team
                    </Link>
                    <button type="button" className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={logout}>
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>

      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={changePassword} loading={busy}>
              Update password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Current password" required>
            <Input type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" />
          </Field>
          <Field label="New password" required hint="At least 8 characters">
            <Input type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" />
          </Field>
        </div>
      </Modal>

      {mobileNav ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed right-4 top-4 z-[60] grid h-9 w-9 place-items-center border border-white/20 bg-slate-900/70 text-white lg:hidden"
          onClick={() => setMobileNav(false)}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
