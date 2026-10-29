import Link from "next/link";
import { notFound } from "next/navigation";
import { getGolfCourses, getFaq, resolveArea, getAdminOptions } from "@/lib/supabase-cms";
import { getAreaEmoji } from "@/lib/display";
import { getDynamicLabels } from "@/lib/dynamic-labels";
import GolfListClient from "./GolfListClient";
import { routes } from "@/lib/routes";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const options = await getAdminOptions().catch((error) => {
      console.error("[GOLF_OPTIONS_LOAD_ERROR]", error);
      return [];
    });
    const areas = options.filter(o => o.option_type === 'AREA' && o.active !== 'FALSE' && o.code !== 'ALL');
    return areas.map((a) => ({ area: a.code.toLowerCase() }));
  } catch {
    return [{ area: 'dos' }, { area: 'beppu' }];
  }
}

export default async function GolfListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const currentArea = await resolveArea(area);
  if (!currentArea) notFound();

  const areaCode = currentArea.code;
  const areaLabel = currentArea.label;
  const [coursesResult, labelsResult, faqResult] = await Promise.allSettled([
    getGolfCourses(areaCode), getDynamicLabels("GOLF"), getFaq(areaCode, "GOLF"),
  ]);
  if (coursesResult.status === "rejected") {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.</p>
        </div>
      </main>
    );
  }

  const courses = coursesResult.value;
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
        <GolfListClient
          courses={courses}
          faqs={faqs}
          area={area}
          areaLabel={areaLabel}
          areaEmoji={getAreaEmoji(areaCode)}
          dynamicLabels={dynamicLabels}
        />
      </div>
    </main>
  );
}
