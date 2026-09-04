import { notFound } from "next/navigation";
import { getGolfCourseById, getFaq, getRestaurants } from "@/lib/google-sheets";
import type { FaqItem, Restaurant } from "@/lib/types";
import { GolfDetailClient } from "./GolfDetailClient";

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

  // Get related FAQs
  let faqs: FaqItem[] = [];
  try {
    faqs = (await getFaq(area.toUpperCase(), "GOLF")).filter(
      (f) =>
        f.question_scope === "AREA" ||
        (f.related_type === "GOLF" && f.related_id === id)
    );
  } catch {
    faqs = [];
  }

  // Get nearby restaurants
  let restaurants: Restaurant[] = [];
  try {
    restaurants = (await getRestaurants(area.toUpperCase())).filter(
      (r) => r.near_type === "GOLF" && r.near_id === id
    );
  } catch {
    restaurants = [];
  }

  return (
    <GolfDetailClient
      course={course}
      area={area}
      faqs={faqs}
      restaurants={restaurants}
    />
  );
}
