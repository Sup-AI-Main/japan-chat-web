import Link from "next/link";
import { notFound } from "next/navigation";
import { getGolfCourses } from "@/lib/google-sheets";

const VALID_AREAS = ["dos", "beppu"];
const AREA_LABELS: Record<string, string> = { dos: "도스", beppu: "벳푸" };

export default async function GolfListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const areaCode = area.toUpperCase();
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
          href={`/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← {AREA_LABELS[area]}
        </Link>
        <h1 className="text-[24px] font-bold text-text mb-6">
          {AREA_LABELS[area]} 골프장
        </h1>

        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted">등록된 골프장이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/${area}/golf/${course.id}`}
                className="block bg-surface border border-border rounded-[12px] p-4 hover:border-primary transition-colors"
              >
                <h2 className="text-[18px] font-bold text-text mb-1">
                  {course.display_name || course.official_name}
                </h2>
                {course.course_summary && (
                  <p className="text-[14px] text-muted line-clamp-2">
                    {course.course_summary}
                  </p>
                )}
                <span className="text-[13px] text-primary mt-2 inline-block">
                  자세히 보기 →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
