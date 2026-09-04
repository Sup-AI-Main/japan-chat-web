import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveAreas, getActiveCategories, getFaq } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder } from "@/lib/display";
import type { FaqItem } from "@/lib/types";

const CONTENT_CATEGORIES = ["GOLF", "HOTEL", "RESTAURANT"];

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

  const categories = await getActiveCategories();

  const categoryLinks = categories.map((cat) => {
    const slug = CONTENT_CATEGORIES.includes(cat.code)
      ? cat.code.toLowerCase()
      : `faq/${cat.code.toLowerCase()}`;
    return { ...cat, slug };
  });

  let popularFaqs: FaqItem[] = [];
  try {
    const allFaq = await getFaq(areaCode);
    popularFaqs = allFaq.slice(0, 3);
  } catch {
    // Silently handle
  }

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
                const catLink = categoryLinks.find((c) => c.code === faq.category);
                const catSlug = catLink?.slug || "faq/general";
                return (
                  <Link
                    key={faq.id}
                    href={`/${area}/${catSlug}`}
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
