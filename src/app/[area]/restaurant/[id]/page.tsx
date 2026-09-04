import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantById } from "@/lib/google-sheets";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  const { area, id } = await params;
  let restaurant;
  try {
    restaurant = await getRestaurantById(id);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  if (!restaurant || restaurant.area.toUpperCase() !== area.toUpperCase())
    notFound();

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}/restaurant`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-block"
        >
          ← 맛집 목록
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-4">
          {restaurant.name}
        </h1>

        {restaurant.google_maps_url && (
          <a
            href={restaurant.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary text-white px-5 py-3 rounded-[10px] text-[14px] font-medium mb-6 hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Google Maps에서 보기
          </a>
        )}

        <div className="bg-surface border border-border rounded-[12px] p-4">
          <div className="space-y-3">
            {restaurant.category && (
              <div>
                <h3 className="text-[15px] font-bold text-text">음식 종류</h3>
                <p className="text-[15px] text-text">{restaurant.category}</p>
              </div>
            )}
            {restaurant.distance && (
              <div>
                <h3 className="text-[15px] font-bold text-text">거리</h3>
                <p className="text-[15px] text-text">차량 약 {restaurant.distance}</p>
              </div>
            )}
            {restaurant.address && (
              <div>
                <h3 className="text-[15px] font-bold text-text">주소</h3>
                <p className="text-[15px] text-text">{restaurant.address}</p>
              </div>
            )}
            {restaurant.hours && (
              <div>
                <h3 className="text-[15px] font-bold text-text">영업시간</h3>
                <p className="text-[15px] text-text">{restaurant.hours}</p>
              </div>
            )}
            {restaurant.phone && (
              <div>
                <h3 className="text-[15px] font-bold text-text">전화</h3>
                <a
                  href={`tel:${restaurant.phone}`}
                  className="text-[15px] text-primary px-2 py-1 min-h-[44px] inline-flex items-center"
                >
                  {restaurant.phone}
                </a>
              </div>
            )}
            {restaurant.price_range && (
              <div>
                <h3 className="text-[15px] font-bold text-text">가격대</h3>
                <p className="text-[15px] text-text">{restaurant.price_range}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
