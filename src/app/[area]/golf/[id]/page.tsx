import { notFound } from "next/navigation";
import { getGolfCourseById, getGolfCourses, getFaqForEntity, getRestaurantsNearEntity, getContentSections } from "@/lib/supabase-cms";
import { getDynamicLabels } from "@/lib/dynamic-labels";
import type { FaqItem, Restaurant, ContentSection } from "@/lib/types";
import type { DynamicLabelsResult } from "@/lib/dynamic-labels";
import { GolfDetailClient } from "./GolfDetailClient";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const courses = await getGolfCourses();
    return courses.map((c) => ({ area: c.area.toLowerCase(), id: c.slug }));
  } catch {
    return [];
  }
}

export default async function GolfDetailPage({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  const { area, id } = await params;
  let course;
  try {
    course = await getGolfCourseById(id);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  if (!course || course.area.toUpperCase() !== area.toUpperCase()) notFound();

  // Parallel fetch: all independent queries run concurrently
  const results = await Promise.allSettled([
    getFaqForEntity(area.toUpperCase(), "GOLF", id),
    getRestaurantsNearEntity(area.toUpperCase(), "GOLF", id),
    getContentSections("GOLF", id),
    getDynamicLabels("GOLF"),
  ]);

  const faqs: FaqItem[] = results[0].status === "fulfilled" ? results[0].value : [];
  const restaurants: Restaurant[] = results[1].status === "fulfilled" ? results[1].value : [];
  const contentSections: ContentSection[] = results[2].status === "fulfilled" ? results[2].value : [];
  const dynamicLabels: DynamicLabelsResult = results[3].status === "fulfilled" ? results[3].value : { sections: [], fieldMap: {} };

  return (
    <GolfDetailClient
      course={course}
      area={area}
      faqs={faqs}
      restaurants={restaurants}
      contentSections={contentSections}
      dynamicLabels={dynamicLabels}
    />
  );
}
