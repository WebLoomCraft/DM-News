import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canPublish } from "@/lib/permissions";
import ArticleForm from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit article" };

type Props = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isFinite(articleId)) redirect("/admin/articles");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Edit article</h2>
          <p className="mt-1 text-sm text-slate-500">
            Changes go live as soon as you save a published story.{" "}
            <Link href="/admin/articles" className="underline hover:text-[var(--accent)]">
              Back to article list
            </Link>
          </p>
        </div>
      </div>
      <ArticleForm articleId={articleId} canPublishArticles={canPublish(user)} />
    </div>
  );
}
