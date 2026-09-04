import Link from "next/link";
import { notFound } from "next/navigation";
import { getFaq } from "@/lib/google-sheets";

const VALID_AREAS = ["dos", "beppu"];
const AREA_LABELS: Record<string, string> = { dos: "도스", beppu: "벳푸" };

const CATEGORY_MAP: Record<string, { code: string; label: string }> = {
  onsen: { code: "ONSEN", label: "온천" },
  driver: { code: "DRIVER", label: "차량" },
  refund: { code: "REFUND", label: "환불" },
  money: { code: "MONEY", label: "환전" },
  extra_payment: { code: "EXTRA_PAYMENT", label: "추가결제" },
  general: { code: "GENERAL", label: "기타" },
};

export default async function FaqCategoryPage({
  params,
}: {
  params: Promise<{ area: string; category: string }>;
}) {
  const { area, category } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const catInfo = CATEGORY_MAP[category];
  if (!catInfo) notFound();

  const areaCode = area.toUpperCase();
  let faqs;
  try {
    faqs = await getFaq(areaCode, catInfo.code);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  // Only show AREA scope or empty scope (common for this area)
  const displayFaqs = faqs.filter(
    (f) => f.question_scope === "AREA" || !f.related_id
  );

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← {AREA_LABELS[area]}
        </Link>
        <h1 className="text-[24px] font-bold text-text mb-6">
          {catInfo.label}
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
                className="bg-surface border border-border rounded-[12px] group"
              >
                <summary className="p-4 flex justify-between items-center font-medium text-[15px] text-text cursor-pointer">
                  <span>Q. {faq.question}</span>
                  <span className="chevron-icon text-muted transition-transform ml-2 shrink-0">
                    ▼
                  </span>
                </summary>
                <div className="px-4 pb-4 text-[15px] text-text leading-[1.6] border-t border-border pt-3">
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
