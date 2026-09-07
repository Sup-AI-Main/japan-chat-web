import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurants, getActiveAreas } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji } from "@/lib/display";
import RestaurantListClient from "./RestaurantListClient";

export default async function RestaurantListPage({
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

  let restaurants;
  try {
    restaurants = await getRestaurants(areaUp);
  } catch {
    return (
      <main className="min-h-screen px-4 py-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-muted">현재 정보를 불러오지 못했습니다.</p>
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
        <h1 className="text-[24px] font-bold text-text mb-6">
          {getAreaEmoji(areaUp)} {areaLabel} {getCategoryEmoji("RESTAURANT")} 맛집
        </h1>

        <RestaurantListClient
          restaurants={restaurants}
          area={area}
          areaLabel={areaLabel}
          areaEmoji={getAreaEmoji(areaUp)}
        />
      </div>
    </main>
  );
}
