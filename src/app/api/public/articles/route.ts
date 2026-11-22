import { handleApiError, ok, positiveInt } from "@/lib/api";
import { countLatestArticles, getCategoryBySlug, getLatestArticles } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const perPage = Math.min(positiveInt(url.searchParams.get("perPage"), 9), 24);
    const explicitOffset = url.searchParams.get("offset");
    const page = positiveInt(url.searchParams.get("page"), 1);
    const offset = explicitOffset !== null ? Math.max(0, Number.parseInt(explicitOffset, 10) || 0) : (page - 1) * perPage;
    const categorySlug = url.searchParams.get("category") || undefined;

    const category = categorySlug ? await getCategoryBySlug(categorySlug) : null;
    if (categorySlug && !category) {
      return ok({ items: [], pagination: { page, offset, perPage, total: 0, totalPages: 1 } });
    }

    const [items, total] = await Promise.all([
      getLatestArticles({ limit: perPage, offset, categoryId: category?.id }),
      countLatestArticles({ categoryId: category?.id }),
    ]);

    return ok({
      items,
      pagination: { page, offset, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
