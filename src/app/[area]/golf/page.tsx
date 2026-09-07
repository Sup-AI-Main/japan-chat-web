import Link from "next/link";
import { notFound } from "next/navigation";
import { getGolfCourses, getActiveAreas } from "@/lib/google-sheets";
import { getAreaEmoji } from "@/lib/display";
import GolfListClient from "./GolfListClient";

export default async function GolfListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const areas = await getActiveAreas();
  const areaUp = area.toUpperCase();
  if (!areas.some((a) => a.code === areaUp)) notFound();

  const currentArea = areas.find((a) => a.code.toUpperCase() === areaUp);
  const areaLabel = currentArea?.label || area;

  let courses;
  try {
    courses = await getGolfCourses(areaUp);
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
          href={`/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getAreaEmoji(areaUp)} {areaLabel}
        </Link>
        <GolfListClient
          courses={courses}
          area={area}
          areaLabel={areaLabel}
          areaEmoji={getAreaEmoji(areaUp)}
        />
      </div>
    </main>
  );
}
