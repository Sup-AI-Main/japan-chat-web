import Link from "next/link";
import { notFound } from "next/navigation";
import { getGolfCourseById, getFaq, getRestaurants } from "@/lib/google-sheets";
import type { FaqItem, Restaurant } from "@/lib/types";

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

  const infoItems = [
    { label: "코스 안내", value: course.course_summary },
    { label: "플레이/카트", value: course.play_cart },
    { label: "클럽하우스 식사", value: course.clubhouse_dining },
    { label: "목욕/샤워", value: course.bath_shower },
    { label: "렌탈", value: course.rental },
    { label: "복장", value: course.dress_code },
  ].filter((item) => item.value);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}/golf`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← 골프장 목록
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-1">
          {course.display_name || course.official_name}
        </h1>
        {course.official_name && course.display_name !== course.official_name && (
          <p className="text-[16px] text-muted mb-4">{course.official_name}</p>
        )}

        {/* Map link */}
        {course.google_maps_url && (
          <a
            href={course.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary text-white px-5 py-3 rounded-[10px] text-[14px] font-medium mb-6 hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Google Maps에서 보기
          </a>
        )}

        {/* Address & Phone */}
        <div className="space-y-2 mb-6">
          {course.address && (
            <p className="text-[15px] text-text">
              <span className="text-muted mr-2">주소:</span>
              {course.address}
            </p>
          )}
          {course.phone && (
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-muted">전화:</span>
              <a
                href={`tel:${course.phone}`}
                className="text-[15px] text-primary px-2 py-1 min-h-[44px] flex items-center"
              >
                {course.phone}
              </a>
            </div>
          )}
        </div>

        {/* Info sections */}
        {infoItems.length > 0 && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-6">
            <div className="space-y-4">
              {infoItems.map((item) => (
                <div key={item.label}>
                  <h3 className="text-[15px] font-bold text-text mb-1">
                    {item.label}
                  </h3>
                  <p className="text-[15px] text-text leading-relaxed">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              자주 묻는 질문
            </h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.id}
                  className="bg-surface border border-border rounded-[8px] group"
                >
                  <summary className="p-3 flex justify-between items-center font-medium text-[15px] text-text">
                    <span>Q. {faq.question}</span>
                    <span className="chevron-icon text-muted transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-3 pb-3 text-[15px] text-text leading-[1.6] border-t border-border pt-3">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Nearby restaurants */}
        {restaurants.length > 0 && (
          <div className="border-t border-border pt-6">
            <h2 className="text-[18px] font-bold text-text mb-4">주변 맛집</h2>
            <div className="space-y-3">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="bg-surface border border-border rounded-[8px] p-3"
                >
                  <h3 className="text-[16px] font-bold text-text">{rest.name}</h3>
                  {rest.distance && (
                    <p className="text-[14px] text-muted">
                      차량 약 {rest.distance}
                    </p>
                  )}
                  {rest.google_maps_url && (
                    <a
                      href={rest.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-primary mt-1 inline-block"
                    >
                      지도 보기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
