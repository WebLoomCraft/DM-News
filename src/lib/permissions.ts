import type { SessionUser } from "./session";

export type Capability =
  | "articles.create"
  | "articles.editAny"
  | "articles.delete"
  | "articles.publish"
  | "media.manage"
  | "media.delete"
  | "taxonomy.manage"
  | "authors.manage"
  | "videos.manage"
  | "homepage.manage"
  | "settings.manage"
  | "users.manage"
  | "subscribers.manage"
  | "messages.manage";

const ROLE_LEVEL: Record<string, number> = {
  author: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

const MATRIX: Record<string, Capability[]> = {
  author: ["articles.create", "media.manage"],
  editor: [
    "articles.create",
    "articles.editAny",
    "articles.delete",
    "articles.publish",
    "media.manage",
    "media.delete",
    "taxonomy.manage",
    "authors.manage",
    "videos.manage",
    "subscribers.manage",
    "messages.manage",
  ],
  admin: [
    "articles.create",
    "articles.editAny",
    "articles.delete",
    "articles.publish",
    "media.manage",
    "media.delete",
    "taxonomy.manage",
    "authors.manage",
    "videos.manage",
    "homepage.manage",
    "settings.manage",
    "subscribers.manage",
    "messages.manage",
  ],
  super_admin: [
    "articles.create",
    "articles.editAny",
    "articles.delete",
    "articles.publish",
    "media.manage",
    "media.delete",
    "taxonomy.manage",
    "authors.manage",
    "videos.manage",
    "homepage.manage",
    "settings.manage",
    "users.manage",
    "subscribers.manage",
    "messages.manage",
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  author: "Author",
};

export function roleLevel(role: string): number {
  return ROLE_LEVEL[role] ?? 0;
}

export function can(user: SessionUser | null | undefined, capability: Capability): boolean {
  if (!user) return false;
  return (MATRIX[user.role] || []).includes(capability);
}

export const ALL_CAPABILITIES: Capability[] = [
  "articles.create",
  "articles.editAny",
  "articles.delete",
  "articles.publish",
  "media.manage",
  "media.delete",
  "taxonomy.manage",
  "authors.manage",
  "videos.manage",
  "homepage.manage",
  "settings.manage",
  "users.manage",
  "subscribers.manage",
  "messages.manage",
];

export function capabilitiesFor(user: SessionUser | null | undefined): string[] {
  if (!user) return [];
  return ALL_CAPABILITIES.filter((cap) => can(user, cap));
}

export function canPublish(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  if (can(user, "articles.publish")) return true;
  return user.role === "author" && Boolean(user.canPublish);
}

/** Authors may only touch their own records unless they hold editAny. */
export function canEditRecord(
  user: SessionUser | null | undefined,
  recordOwnerId: number | null | undefined,
): boolean {
  if (!user) return false;
  if (can(user, "articles.editAny")) return true;
  return recordOwnerId != null && recordOwnerId === user.id;
}
