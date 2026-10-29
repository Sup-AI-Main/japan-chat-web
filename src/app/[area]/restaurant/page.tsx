import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurants, getFaq, resolveArea, getAdminOptions } from "@/lib/supabase-cms";
import { getAreaEmoji, getCategoryEmoji } from "@/lib/display";
import { getDynamicLabels } from "@/lib/dynamic-labels";
import RestaurantListClient from "./RestaurantListClient";
import { routes } from "@/lib/routes";
import AreaFaqClient from "@/components/AreaFaqClient";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const options = await getAdminOptions().catch((error) => {
      console.error("[RESTAURANT_OPTIONS_LOAD_ERROR]", error);
      return [];
    });
    const areas = options.filter(o => o.option_type === 'AREA' && o.active !== 'FALSE' && o.code !== 'ALL');
    return areas.map((a) => ({ area: a.code.toLowerCase() }));
  } catch {
    return [{ area: 'dos' }, { area: 'beppu' }];
  }
}

export default async function RestaurantListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const currentArea = await resolveArea(area);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;
  const areaLabel = currentArea.label;
  const [restaurantsResult, labelsResult, faqResult] = await Promise.allSettled([
    getRestaurants(areaCode), getDynamicLabels("RESTAURANT"), getFaq(areaCode, "RESTAURANT"),
  ]);
  if (restaurantsResult.status === "rejected") {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  const restaurants = restaurantsResult.value;
  const dynamicLabels = labelsResult.status === "fulfilled" ? labelsResult.value : { sections: [], fieldMap: {} };
  if (faqResult.status === "rejected") throw faqResult.reason;
  const faqRows = faqResult.value;
  const faqs = faqRows.filter((faq) => faq.area === areaCode && faq.question_scope === "AREA");

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={routes.area(area)}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getAreaEmoji(areaCode)} {areaLabel}
        </Link>
        <h1 className="text-[24px] font-bold text-text mb-6">
          {getAreaEmoji(areaCode)} {areaLabel} {getCategoryEmoji("RESTAURANT")} 음식점
        </h1>

        <AreaFaqClient area={areaCode} category="RESTAURANT" initialFaqs={faqs} />
        <RestaurantListClient
          restaurants={restaurants}
          area={area}
          areaLabel={areaLabel}
          areaEmoji={getAreaEmoji(areaCode)}
          dynamicLabels={dynamicLabels}
        />
      </div>
    </main>
  );
}
