import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommonCategories, getFaq } from "@/lib/google-sheets";
import { getCategoryEmoji, getCategoryColor } from "@/lib/display";
import GuideFaqClient from "@/components/GuideFaqClient";

export default async function GuideCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  const categories = await getCommonCategories();
  const currentCategory = categories.find(
    (c) => c.code.toLowerCase() === category
  );
  if (!currentCategory) notFound();

  const categoryCode = currentCategory.code;
  const categoryLabel = currentCategory.label;

  let faqs;
  try {
    faqs = await getFaq("ALL", categoryCode);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>
        </div>
      </main>
    );
  }

  const displayFaqs = faqs.filter(
    (f) => f.area === "ALL" && (f.question_scope === "AREA" || !f.related_id)
  );

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href="/guide"
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← 📋 공통 안내
        </Link>
        <h1 className="text-[24px] font-bold mb-6" style={{ color: getCategoryColor(categoryCode) }}>
          {getCategoryEmoji(categoryCode)} {categoryLabel}
        </h1>

        <GuideFaqClient
          initialFaqs={displayFaqs}
          categoryCode={categoryCode}
          categoryLabel={categoryLabel}
        />
      </div>
    </main>
  );
}