import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveArea, getAreaCategories, getFaq, getCommonCategories, getTravelTimes, getAreaEntitySummaries } from "@/lib/supabase-cms";
import { getAreaEmoji, getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder } from "@/lib/display";
import type { FaqItem, TravelTime } from "@/lib/types";
import AreaTravelTimesClient from "@/components/AreaTravelTimesClient";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function AreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const currentArea = await resolveArea(area);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;
  const areaLabel = currentArea.label;

  // 병렬 fetch: 독립적인 데이터를 동시에 가져옴
  const [categories, allFaq, travelTimes, hotelsSummary, golfSummary, commonCats] = await Promise.all([
    getAreaCategories(),
    getFaq(areaCode).catch(() => [] as FaqItem[]),
    getTravelTimes(areaCode).catch(() => [] as TravelTime[]),
    getAreaEntitySummaries(areaCode, 'HOTEL').catch(() => [] as { id: string; name: string }[]),
    getAreaEntitySummaries(areaCode, 'GOLF').catch(() => [] as { id: string; name: string }[]),
    getCommonCategories(),
  ]);

  const categoryLinks = categories.map((cat) => ({
    ...cat,
    slug: cat.code.toLowerCase(),
  }));

  const popularFaqs = allFaq.slice(0, 3);
  const hotels = hotelsSummary;
  const golfCourses = golfSummary;
  const commonCodes = new Set(commonCats.map((c) => c.code));

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <div className="mb-6">
          <Link
            href={routes.home()}
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
              key={cat.code}
              href={`/${area}/${cat.slug}`}
              prefetch={false}
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

        <AreaTravelTimesClient
          initialTravelTimes={travelTimes}
          hotels={hotels}
          golfCourses={golfCourses}
          area={areaCode}
        />

        {popularFaqs.length > 0 && (
          <div className="border-t border-border pt-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              ❓ 자주 찾는 질문
            </h2>
            <div className="space-y-2">
              {popularFaqs.map((faq) => {
                const isCommon = commonCodes.has(faq.category);
                const faqLink = isCommon
                  ? routes.guideCategory(faq.category.toLowerCase())
                  : `/${area}/${faq.category.toLowerCase()}`;
                return (
                  <Link
                    key={faq.id}
                    href={faqLink}
                    prefetch={false}
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
