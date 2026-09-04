import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurants } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji } from "@/lib/display";

const VALID_AREAS = ["dos", "beppu"];
const AREA_LABELS: Record<string, string> = { dos: "도스", beppu: "벳푸" };

export default async function RestaurantListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const areaCode = area.toUpperCase();
  let restaurants;
  try {
    restaurants = await getRestaurants(areaCode);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  // Group by near_type
  const hotelRestaurants = restaurants.filter((r) => r.near_type === "HOTEL");
  const golfRestaurants = restaurants.filter((r) => r.near_type === "GOLF");
  const areaRestaurants = restaurants.filter(
    (r) => r.near_type === "AREA" || (!r.near_type && !r.near_id)
  );

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getAreaEmoji(areaCode)} {AREA_LABELS[area]}
        </Link>
        <h1 className="text-[24px] font-bold text-text mb-6">
          {getAreaEmoji(areaCode)} {AREA_LABELS[area]} {getCategoryEmoji("RESTAURANT")} 맛집
        </h1>

        {restaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted">등록된 맛집이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {hotelRestaurants.length > 0 && (
              <section>
                <h2 className="text-[18px] font-bold text-text mb-3">
                  호텔 근처
                </h2>
                <div className="space-y-3">
                  {hotelRestaurants.map((rest) => (
                    <RestaurantCard key={rest.id} restaurant={rest} area={area} />
                  ))}
                </div>
              </section>
            )}

            {golfRestaurants.length > 0 && (
              <section>
                <h2 className="text-[18px] font-bold text-text mb-3">
                  골프장 근처
                </h2>
                <div className="space-y-3">
                  {golfRestaurants.map((rest) => (
                    <RestaurantCard key={rest.id} restaurant={rest} area={area} />
                  ))}
                </div>
              </section>
            )}

            {areaRestaurants.length > 0 && (
              <section>
                <h2 className="text-[18px] font-bold text-text mb-3">
                  지역 맛집
                </h2>
                <div className="space-y-3">
                  {areaRestaurants.map((rest) => (
                    <RestaurantCard key={rest.id} restaurant={rest} area={area} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function RestaurantCard({
  restaurant,
  area,
}: {
  restaurant: {
    id: string;
    name: string;
    category: string;
    distance: string;
    address: string;
    hours: string;
    phone: string;
    google_maps_url: string;
  };
  area: string;
}) {
  return (
    <Link
      href={`/${area}/restaurant/${restaurant.id}`}
      className="block bg-surface border border-border rounded-[12px] p-4 hover:border-primary transition-colors"
    >
      <h3 className="text-[16px] font-bold text-text mb-1">
        {restaurant.name}
      </h3>
      {restaurant.category && (
        <p className="text-[14px] text-muted">{restaurant.category}</p>
      )}
      {restaurant.distance && (
        <p className="text-[14px] text-muted">차량 약 {restaurant.distance}</p>
      )}
      <span className="text-[13px] text-primary mt-2 inline-block">
        자세히 보기 →
      </span>
    </Link>
  );
}
