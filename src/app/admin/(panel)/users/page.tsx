"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import { Badge, Button, ConfirmDialog, EmptyRow, ErrorNote, Field, Input, Modal, Panel, Select, Spinner, Textarea, Toggle, notify } from "@/components/admin/ui";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
  canPublish: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

const blank = { name: "", email: "", password: "", role: "author", bio: "", avatarUrl: "", status: "active", canPublish: false };

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: User[] }>("/api/users");
      setItems(data.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      status: user.status,
      canPublish: user.canPublish,
    });
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        status: form.status,
        canPublish: form.canPublish,
      };
      if (!editing) payload.password = form.password;
      else if (form.password) payload.password = form.password;

      if (editing) {
        await api(`/api/users/${editing.id}`, { method: "PATCH", json: payload });
        notify("Account updated", "success");
      } else {
        await api("/api/users", { method: "POST", json: payload });
        notify("Account created", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save the account", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await api(`/api/users/${pendingDelete.id}`, { method: "DELETE" });
      notify("Account deleted", "success");
      setPendingDelete(null);
      load();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not delete the account", "error");
    }
  };

  const resetPassword = async () => {
    if (!resetting || newPassword.length < 8) {
      notify("Password must be at least 8 characters", "error");
      return;
    }
    setBusy(true);
    try {
      await api(`/api/users/${resetting.id}`, { method: "PATCH", json: { password: newPassword } });
      notify(`Password reset for ${resetting.email}`, "success");
      setResetting(null);
      setNewPassword("");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not reset the password", "error");
    } finally {
      setBusy(false);
    }
  };

  const roleTone = (role: string) => (role === "super_admin" ? "red" : role === "admin" ? "purple" : role === "editor" ? "blue" : "slate");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Team &amp; roles</h2>
          <p className="mt-1 text-sm text-slate-500">Role-based access is enforced on the server for every write operation.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm(blank);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </div>

      <Panel title="Permission matrix">
        <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} className="border border-slate-200 bg-slate-50 p-3">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
              <p className="mt-1">
                {role === "super_admin"
                  ? "Everything: content, settings, homepage, media and user accounts."
                  : role === "admin"
                    ? "All content, media, taxonomy, homepage and site settings."
                    : role === "editor"
                      ? "Create, edit, publish and delete any article; manage media, tags and videos."
                  : "Create and edit their own drafts; publishing is configurable per account."}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {error ? <ErrorNote message={error} onRetry={load} /> : null}

      <Panel>
        {loading ? (
          <Spinner label="Loading accounts…" />
        ) : items.length === 0 ? (
          <EmptyRow title="No accounts" hint="Create the first newsroom account." />
        ) : (
          <div className="overflow-x-auto admin-scroll">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[0.65rem] uppercase tracking-[0.1em] text-slate-400">
                  <th className="py-2 pr-3 font-semibold">Person</th>
                  <th className="py-2 pr-3 font-semibold">Role</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Can publish</th>
                  <th className="py-2 pr-3 font-semibold">Last sign-in</th>
                  <th className="py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge tone={roleTone(user.role) as "red" | "purple" | "blue" | "slate"}>{ROLE_LABELS[user.role] || user.role}</Badge>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge tone={user.status === "active" ? "green" : "amber"}>{user.status}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-slate-500">{user.canPublish ? "Yes" : "No"}</td>
                    <td className="py-3 pr-3 text-slate-500">{user.lastLoginAt ? formatDate(user.lastLoginAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" aria-label="Reset password" onClick={() => { setResetting(user); setNewPassword(""); }} className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-[#0b1b33]">
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Edit account" onClick={() => openEdit(user)} className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-[#0b1b33]">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Delete account" onClick={() => setPendingDelete(user)} className="grid h-8 w-8 place-items-center border border-slate-300 text-slate-500 hover:border-red-600 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add newsroom account"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={save} loading={busy}>
              {editing ? "Save changes" : "Create account"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" required>
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, canPublish: e.target.value !== "author" }))}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Account status">
              <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </Field>
          </div>
          <Field label={editing ? "New password (optional)" : "Password"} required={!editing} hint="Minimum 8 characters. Stored as a bcrypt hash.">
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
          </Field>
          <Field label="Avatar URL">
            <Input value={form.avatarUrl} onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))} />
          </Field>
          <Field label="Biography">
            <Textarea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </Field>
          <Toggle
            checked={form.canPublish}
            onChange={(v) => setForm((f) => ({ ...f, canPublish: v }))}
            label="Allowed to publish"
            description="Editors and admins can always publish. Enable this for an author who has been granted publishing rights."
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        title={`Reset password — ${resetting?.email ?? ""}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetting(null)}>
              Cancel
            </Button>
            <Button onClick={resetPassword} loading={busy}>
              Reset password
            </Button>
          </>
        }
      >
        <Field label="New password" required hint="Share it with the account owner over a secure channel.">
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name ?? ""}?`}
        message="The account is removed immediately. Articles they created stay published and lose their internal author link."
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
