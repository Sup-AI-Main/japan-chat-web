import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { getAdminFaqs, getAdminOptions } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji, getCategoryColor } from "@/lib/display";
import type { FaqItem } from "@/lib/types";
import AdminFaqList from "./AdminFaqList";

export default async function AdminCategoryPage({
  params,
}: {
  params: Promise<{ area: string; category: string }>;
}) {
  const { area, category } = await params;

  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  const options = await getAdminOptions();

  const currentArea = options.find(
    (o) => o.option_type === "AREA" && o.code.toLowerCase() === area && o.active !== "FALSE"
  );
  if (!currentArea) notFound();

  const currentCategory = options.find(
    (o) => o.option_type === "CATEGORY" && o.code.toLowerCase() === category && o.active !== "FALSE"
  );
  if (!currentCategory) notFound();

  const areaCode = currentArea.code;
  const categoryCode = currentCategory.code;
  const areaLabel = currentArea.label;
  const categoryLabel = currentCategory.label;

  let faqs: FaqItem[] = [];
  try {
    faqs = await getAdminFaqs(areaCode === "ALL" ? undefined : areaCode, categoryCode);
    if (areaCode === "ALL") {
      faqs = faqs.filter((f) => f.area === "ALL");
    }
  } catch {
    faqs = [];
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[900px] mx-auto">
        <Link
          href={`/admin/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getAreaEmoji(areaCode)} {areaLabel}
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <h1 className="text-[20px] sm:text-[24px] font-bold" style={{ color: getCategoryColor(categoryCode) }}>
            {getAreaEmoji(areaCode)} {areaLabel} &gt; {getCategoryEmoji(categoryCode)} {categoryLabel}
          </h1>
          <Link
            href={`/admin/${area}/${category}/new`}
            className="bg-primary text-white px-4 py-3 rounded-[10px] text-[14px] font-medium hover:opacity-90 min-h-[44px] flex items-center justify-center sm:justify-start whitespace-nowrap"
          >
            + 질문 추가
          </Link>
        </div>

        <AdminFaqList
          area={area}
          category={category}
          faqs={faqs}
          categoryLabel={categoryLabel}
          categoryCode={categoryCode}
        />
      </div>
    </main>
  );
}
