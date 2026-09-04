import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getHotelById,
  getFaq,
  getTravelTimes,
  getRestaurants,
} from "@/lib/google-sheets";
import type { TravelTime, FaqItem, Restaurant } from "@/lib/types";

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  const { area, id } = await params;
  let hotel;
  try {
    hotel = await getHotelById(id);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  if (!hotel || hotel.area.toUpperCase() !== area.toUpperCase()) notFound();

  // Travel times from this hotel to all golf courses
  let travelTimes: TravelTime[] = [];
  try {
    travelTimes = (await getTravelTimes(area.toUpperCase())).filter(
      (t) => t.hotel_id === id
    );
  } catch {
    travelTimes = [];
  }

  // Hotel-related FAQs
  let faqs: FaqItem[] = [];
  try {
    faqs = (await getFaq(area.toUpperCase(), "HOTEL")).filter(
      (f) =>
        f.question_scope === "AREA" ||
        (f.related_type === "HOTEL" && f.related_id === id)
    );
  } catch {
    faqs = [];
  }

  // Nearby restaurants
  let restaurants: Restaurant[] = [];
  try {
    restaurants = (await getRestaurants(area.toUpperCase())).filter(
      (r) => r.near_type === "HOTEL" && r.near_id === id
    );
  } catch {
    restaurants = [];
  }

  const infoItems = [
    { label: "체크인", value: hotel.check_in },
    { label: "체크아웃", value: hotel.check_out },
    { label: "조식", value: hotel.breakfast },
    { label: "호텔 식사", value: hotel.hotel_dining },
    { label: "목욕/스파", value: hotel.bath_spa },
    { label: "ATM/결제", value: hotel.atm_payment },
    { label: "교통", value: hotel.transport },
  ].filter((item) => item.value);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}/hotel`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← 호텔 목록
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-4">
          {hotel.official_name}
        </h1>

        {/* Map link */}
        {hotel.google_maps_url && (
          <a
            href={hotel.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary text-white px-5 py-3 rounded-[10px] text-[14px] font-medium mb-6 hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Google Maps에서 보기
          </a>
        )}

        {/* Info */}
        {infoItems.length > 0 && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-6">
            <div className="space-y-3">
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

        {/* Travel times to golf courses */}
        {travelTimes.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              골프장 이동시간
            </h2>
            <div className="space-y-3">
              {travelTimes.map((tt) => (
                <div
                  key={tt.id}
                  className="bg-surface border border-border rounded-[8px] p-3"
                >
                  <h3 className="text-[16px] font-bold text-text">
                    {tt.golf_name}
                  </h3>
                  <p className="text-[15px] text-muted">
                    예상 차량시간: 약 {tt.estimated_time}
                  </p>
                  {tt.google_maps_direction_url && (
                    <a
                      href={tt.google_maps_direction_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-primary mt-2 inline-block px-2 py-1 min-h-[44px] flex items-center"
                    >
                      실시간 길찾기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              호텔 관련 질문
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
