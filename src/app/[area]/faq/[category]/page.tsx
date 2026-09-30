import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveArea, resolveCategoryFromAdmin, getFaq } from "@/lib/supabase-cms";
import { getCategoryEmoji, getCategoryColor } from "@/lib/display";
import { routes } from "@/lib/routes";

export const revalidate = 300;

export default async function AreaFaqCategoryPage({
  params,
}: {
  params: Promise<{ area: string; category: string }>;
}) {
  const { area, category } = await params;

  const [currentArea, currentCategory] = await Promise.all([
    resolveArea(area),
    resolveCategoryFromAdmin(category),
  ]);

  if (!currentArea) notFound();
  if (!currentCategory) notFound();

  // Only allow AREA group categories with AREA template_type
  if (currentCategory.group !== 'AREA' || !currentCategory.template_type || currentCategory.template_type === 'COMMON') {
    notFound();
  }

  const areaCode = currentArea.code;
  const categoryCode = currentCategory.code;
  const categoryLabel = currentCategory.label;

  let faqs;
  try {
    faqs = await getFaq(areaCode, categoryCode);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={routes.area(area.toLowerCase())}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {currentArea.label}
        </Link>
        <h1 className="text-[24px] font-bold mb-6" style={{ color: getCategoryColor(categoryCode) }}>
          {getCategoryEmoji(categoryCode)} {categoryLabel}
        </h1>

        {faqs.length === 0 ? (
          <p className="text-muted text-[15px]">등록된 정보가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.id}
                className="bg-surface border border-border rounded-[8px] overflow-hidden group"
              >
                <summary className="p-3 text-[15px] text-text cursor-pointer list-none flex items-center justify-between gap-2 hover:text-primary">
                  {faq.question}
                  <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">
                    ▼
                  </span>
                </summary>
                <div className="px-3 pb-3 pt-2 text-[15px] text-text leading-[1.6] border-t border-border">
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