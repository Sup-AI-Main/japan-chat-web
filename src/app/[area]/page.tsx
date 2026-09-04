import Link from "next/link";
import { notFound } from "next/navigation";
import { getFaq } from "@/lib/google-sheets";
import type { FaqItem } from "@/lib/types";

const AREA_MAP: Record<string, string> = {
  dos: "도스",
  beppu: "벳푸",
};

const VALID_AREAS = ["dos", "beppu"];

const CATEGORIES = [
  { slug: "golf", label: "골프장", code: "GOLF" },
  { slug: "hotel", label: "호텔", code: "HOTEL" },
  { slug: "restaurant", label: "맛집", code: "RESTAURANT" },
  { slug: "faq/onsen", label: "온천", code: "ONSEN" },
  { slug: "faq/driver", label: "차량", code: "DRIVER" },
  { slug: "faq/refund", label: "환불", code: "REFUND" },
  { slug: "faq/money", label: "환전", code: "MONEY" },
  { slug: "faq/extra_payment", label: "추가결제", code: "EXTRA_PAYMENT" },
  { slug: "faq/general", label: "기타", code: "GENERAL" },
];

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const areaLabel = AREA_MAP[area];
  const areaCode = area.toUpperCase();

  // Fetch popular FAQs for this area
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
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
          >
            ← 지역 변경
          </Link>
          <h1 className="text-[24px] font-bold text-text">
            {areaLabel} 여행 가이드
          </h1>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${area}/${cat.slug}`}
              className="bg-surface border border-border rounded-[12px] p-4 text-center hover:border-primary hover:bg-primary-soft transition-colors min-h-[56px] flex items-center justify-center"
            >
              <span className="text-[16px] font-medium text-text">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Popular FAQs */}
        {popularFaqs.length > 0 && (
          <div className="border-t border-border pt-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              자주 찾는 질문
            </h2>
            <div className="space-y-2">
              {popularFaqs.map((faq) => {
                const catSlug =
                  CATEGORIES.find((c) => c.code === faq.category)?.slug ||
                  "faq/general";
                return (
                  <Link
                    key={faq.id}
                    href={`/${area}/${catSlug}`}
                    className="block bg-surface border border-border rounded-[8px] p-3 hover:border-primary"
                  >
                    <span className="text-[15px] text-text">{faq.question}</span>
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
