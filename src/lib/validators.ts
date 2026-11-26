import { z } from "zod";

export const STATUS_VALUES = ["draft", "published", "scheduled", "archived"] as const;
export type ArticleStatus = (typeof STATUS_VALUES)[number];

export const loginSchema = z.object({
  email: z.string().trim().min(3).max(200),
  // Deliberately permissive so wrong passwords are rejected by the credential
  // check (401) instead of leaking password policy through a validation error.
  password: z.string().min(1).max(200),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().min(3).max(200),
});

/**
 * 48 bytes of CSPRNG output is 64 base64url characters; the ceiling stops an
 * attacker turning the confirm endpoint into a hashing amplifier.
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/, "Malformed token"),
  password: z.string().min(10).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(200).optional(),
  newPassword: z.string().min(10).max(200),
  userId: z.number().int().positive().optional(),
});

const nullableString = (max: number) => z.string().trim().max(max).nullable().optional();

export const articleSchema = z.object({
  title: z.string().trim().min(6).max(280),
  slug: nullableString(320),
  excerpt: nullableString(600),
  content: z.string().max(400_000).nullable().optional(),
  featuredImageUrl: nullableString(2000),
  imageAlt: nullableString(300),
  imageCaption: nullableString(400),
  categoryId: z.number().int().positive().nullable().optional(),
  authorId: z.number().int().positive().nullable().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  isFeatured: z.boolean().optional(),
  featuredRank: z.number().int().min(0).max(99).optional(),
  isBreaking: z.boolean().optional(),
  seoTitle: nullableString(200),
  seoDescription: nullableString(400),
  socialImageUrl: nullableString(2000),
  publishedAt: z.string().trim().max(40).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
});

export type ArticleInput = z.infer<typeof articleSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: nullableString(160),
  description: nullableString(600),
  imageUrl: nullableString(2000),
  color: nullableString(20),
  orderIndex: z.number().int().min(0).max(999).optional(),
  showOnHomepage: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: nullableString(160),
});

export const authorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: nullableString(200),
  photoUrl: nullableString(2000),
  bio: nullableString(1200),
  email: nullableString(200),
  designation: nullableString(160),
  facebookUrl: nullableString(500),
  xUrl: nullableString(500),
  userId: z.number().int().positive().nullable().optional(),
});

export const userSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().min(3).max(200),
  password: z.string().min(10).max(200).optional(),
  role: z.enum(["super_admin", "admin", "editor", "author"]),
  avatarUrl: nullableString(2000),
  bio: nullableString(1200),
  status: z.enum(["active", "suspended"]).optional(),
  canPublish: z.boolean().optional(),
});

export const mediaPatchSchema = z.object({
  alt: nullableString(400),
});

export const newsletterSchema = z.object({
  email: z.string().trim().min(5).max(240),
  consent: z.boolean().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().min(5).max(200),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(4000),
});

export const sectionSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1).max(160).optional(),
  enabled: z.boolean().optional(),
  orderIndex: z.number().int().min(0).max(999).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  limit: z.number().int().min(1).max(24).optional(),
  layout: z.string().trim().max(30).optional(),
});

export const sectionsUpdateSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(60),
});

export const settingsSchema = z
  .object({
    siteName: z.string().trim().min(2).max(160).optional(),
    tagline: nullableString(200),
    siteDescription: nullableString(600),
    siteUrl: nullableString(240),
    logoUrl: nullableString(2000),
    logoMarkText: nullableString(12),
    logoWordmark: nullableString(60),
    faviconUrl: nullableString(2000),
    colorPrimary: nullableString(20),
    colorAccent: nullableString(20),
    colorInk: nullableString(20),
    colorPaper: nullableString(20),
    navItems: z.array(z.object({ label: z.string().trim().min(1).max(60), href: z.string().trim().min(1).max(200), enabled: z.boolean().optional() })).max(40).optional(),
    showSearchIcon: z.boolean().optional(),
    showWatchLiveButton: z.boolean().optional(),
    watchLiveLabel: nullableString(60),
    liveStreamUrl: nullableString(1000),
    liveStreamEnabled: z.boolean().optional(),
    showLiveIndicator: z.boolean().optional(),
    showLanguageSelector: z.boolean().optional(),
    tickerEnabled: z.boolean().optional(),
    tickerLabel: nullableString(40),
    tickerSpeed: z.number().int().min(10).max(120).optional(),
    facebookUrl: nullableString(600),
    tiktokUrl: nullableString(600),
    youtubeUrl: nullableString(600),
    xUrl: nullableString(600),
    instagramUrl: nullableString(600),
    contactEmail: nullableString(200),
    contactPhone: nullableString(60),
    contactAddress: nullableString(600),
    footerAbout: nullableString(1200),
    footerColumns: z.array(z.object({ title: z.string().trim().min(1).max(60), links: z.array(z.object({ label: z.string().trim().min(1).max(60), href: z.string().trim().min(1).max(200) })).max(20) })).max(8).optional(),
    copyright: nullableString(240),
    newsletterEnabled: z.boolean().optional(),
    newsletterTitle: nullableString(160),
    newsletterDescription: nullableString(600),
    defaultSeoTitle: nullableString(200),
    defaultSeoDescription: nullableString(400),
    defaultSocialImage: nullableString(2000),
    adSlotHtml: z.string().max(20_000).nullable().optional(),
    showAdSlots: z.boolean().optional(),
    aboutContent: z.string().max(40_000).nullable().optional(),
    privacyContent: z.string().max(40_000).nullable().optional(),
    termsContent: z.string().max(40_000).nullable().optional(),
    analyticsSnippet: z.string().max(20_000).nullable().optional(),
  })
  .strict();

export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  // datetime-local strings are treated as UTC for editorial simplicity.
  const asUtc = new Date(`${value.replace(" ", "T")}:00Z`);
  return Number.isNaN(asUtc.getTime()) ? null : asUtc;
}

export function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
