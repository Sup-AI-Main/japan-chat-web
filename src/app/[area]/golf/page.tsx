import Link from "next/link";
import { notFound } from "next/navigation";
import { getGolfCourses, resolveArea, getAdminOptions } from "@/lib/supabase-cms";
import { getAreaEmoji } from "@/lib/display";
import GolfListClient from "./GolfListClient";
import { routes } from "@/lib/routes";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const options = await getAdminOptions();
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

  let courses;
  try {
    courses = await getGolfCourses(areaCode);
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
          href={routes.area(area)}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getAreaEmoji(areaCode)} {areaLabel}
        </Link>
        <GolfListClient
          courses={courses}
          area={area}
          areaLabel={areaLabel}
          areaEmoji={getAreaEmoji(areaCode)}
        />
      </div>
    </main>
  );
}
