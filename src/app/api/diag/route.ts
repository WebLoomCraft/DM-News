import { NextResponse } from "next/server";
import {
  countLatestArticles,
  getActiveCategories,
  getArticleBySlug,
  getLatestArticles,
  getSettings,
  getTrendingArticles,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const cases: Array<[string, () => Promise<unknown>]> = [
    ["getSettings", () => getSettings()],
    ["getLatestArticles(12)", () => getLatestArticles({ limit: 12 })],
    ["countLatestArticles", () => countLatestArticles({})],
    ["getTrendingArticles(5)", () => getTrendingArticles(5)],
    ["getActiveCategories", () => getActiveCategories()],
    ["getArticleBySlug", () => getArticleBySlug("dm-news-network-opens-its-247-digital-newsroom-for-readers-nationwide")],
  ];

  const results: Record<string, unknown> = {};
  for (const [name, run] of cases) {
    try {
      const value = await run();
      results[name] = {
        ok: true,
        kind: Array.isArray(value) ? `array(${value.length})` : typeof value,
      };
    } catch (error) {
      const err = error as Error & { cause?: unknown; code?: string };
      results[name] = {
        ok: false,
        name: err?.name,
        message: err?.message,
        code: err?.code,
        cause: err?.cause ? String(err.cause) : undefined,
      };
    }
  }

  return NextResponse.json({
    env: {
      hasDb: Boolean(process.env.DATABASE_URL),
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL ?? null,
      region: process.env.VERCEL_REGION ?? null,
    },
    results,
  });
}
