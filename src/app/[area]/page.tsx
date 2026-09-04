import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveAreas, getAreaCategories, getFaq, getCommonCategories } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder } from "@/lib/display";
import type { FaqItem } from "@/lib/types";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;

  const areas = (await getActiveAreas()).filter((a) => a.code !== "ALL");
  const currentArea = areas.find((a) => a.code.toLowerCase() === area);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;
  const areaLabel = currentArea.label;

  // group=AREA 카테고리만 표시 (admin_options 기반)
  const categories = await getAreaCategories();

  const categoryLinks = categories.map((cat) => ({
    ...cat,
    slug: cat.code.toLowerCase(),
  }));

  // 인기 FAQ: 해당 지역의 모든 FAQ에서 상위 3개
  let popularFaqs: FaqItem[] = [];
  try {
    const allFaq = await getFaq(areaCode);
    popularFaqs = allFaq.slice(0, 3);
  } catch {
    // Silently handle
  }

  // 공통 카테고리 코드 목록 (FAQ 링크 분기용)
  const commonCats = await getCommonCategories();
  const commonCodes = new Set(commonCats.map((c) => c.code));

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
          >
            ← 지역 변경
          </Link>
          <h1 className="text-[24px] font-bold text-text">
            {getAreaEmoji(areaCode)} {areaLabel} 여행 가이드
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {categoryLinks.map((cat) => (
            <Link
              key={cat.id}
              href={`/${area}/${cat.slug}`}
              className="rounded-[12px] p-4 text-center transition-colors min-h-[56px] flex items-center justify-center"
              style={{
                backgroundColor: getCategoryBg(cat.code),
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: getCategoryBorder(cat.code),
              }}
            >
              <span className="text-[16px] font-medium whitespace-nowrap" style={{ color: getCategoryColor(cat.code) }}>
                {getCategoryEmoji(cat.code)} {cat.label}
              </span>
            </Link>
          ))}
        </div>

        {popularFaqs.length > 0 && (
          <div className="border-t border-border pt-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              ❓ 자주 찾는 질문
            </h2>
            <div className="space-y-2">
              {popularFaqs.map((faq) => {
                const isCommon = commonCodes.has(faq.category);
                const faqLink = isCommon
                  ? `/guide/${faq.category.toLowerCase()}`
                  : `/${area}/${faq.category.toLowerCase()}`;
                return (
                  <Link
                    key={faq.id}
                    href={faqLink}
                    className="block bg-surface border border-border rounded-[8px] p-3 hover:border-primary"
                  >
                    <span className="text-[15px] text-text">
                      {getCategoryEmoji(faq.category)} {faq.question}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
