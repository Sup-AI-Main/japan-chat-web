import Link from "next/link";
import { notFound } from "next/navigation";
import { getHotels } from "@/lib/google-sheets";
import { getAreaEmoji, getCategoryEmoji } from "@/lib/display";

const VALID_AREAS = ["dos", "beppu"];
const AREA_LABELS: Record<string, string> = { dos: "도스", beppu: "벳푸" };

export default async function HotelListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const areaCode = area.toUpperCase();
  let hotels;
  try {
    hotels = await getHotels(areaCode);
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
          ← {getAreaEmoji(areaCode)} {AREA_LABELS[area]}
        </Link>
        <h1 className="text-[24px] font-bold text-text mb-6">
          {getAreaEmoji(areaCode)} {AREA_LABELS[area]} {getCategoryEmoji("HOTEL")} 호텔
        </h1>

        {hotels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted">등록된 호텔이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hotels.map((hotel) => (
              <Link
                key={hotel.id}
                href={`/${area}/hotel/${hotel.id}`}
                className="block bg-surface border border-border rounded-[12px] p-4 hover:border-primary transition-colors"
              >
                <h2 className="text-[18px] font-bold text-text mb-1">
                  {hotel.official_name}
                </h2>
                {hotel.address && (
                  <p className="text-[14px] text-muted">{hotel.address}</p>
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
