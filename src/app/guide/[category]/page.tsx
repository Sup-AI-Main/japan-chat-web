import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommonCategories, getFaq } from "@/lib/google-sheets";
import { getCategoryEmoji, getCategoryColor, getCategoryBorder } from "@/lib/display";

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
    // 공통 FAQ는 area=ALL만 조회
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

        {displayFaqs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted">등록된 질문이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayFaqs.map((faq) => (
              <details
                key={faq.id}
                className="bg-surface rounded-[12px] group"
                style={{
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: getCategoryBorder(categoryCode),
                }}
              >
                <summary className="p-4 flex justify-between items-center font-medium text-[15px] text-text cursor-pointer">
                  <span>Q. {faq.question}</span>
                  <span className="chevron-icon text-muted transition-transform ml-2 shrink-0">
                    ▼
                  </span>
                </summary>
                <div className="px-4 pb-4 text-[15px] text-text leading-[1.6] border-t pt-3" style={{ borderColor: getCategoryBorder(categoryCode) }}>
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
