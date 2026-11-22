import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canPublish } from "@/lib/permissions";
import ArticleForm from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New article" };

export default async function NewArticlePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">New article</h2>
        <p className="mt-1 text-sm text-slate-500">
          Write the story, add media, choose the section and publish. The homepage and section pages update automatically.
        </p>
      </div>
      <ArticleForm canPublishArticles={canPublish(user)} />
    </div>
  );
}
