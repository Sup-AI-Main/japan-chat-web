import Link from "next/link";
import { notFound } from "next/navigation";
import { getHotels, getActiveAreas } from "@/lib/google-sheets";
import { getAreaEmoji } from "@/lib/display";
import HotelListClient from "./HotelListClient";

const VALID_AREAS = ["dos", "beppu"];

export default async function HotelListPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  if (!VALID_AREAS.includes(area)) notFound();

  const areaCode = area.toUpperCase();
  const areas = await getActiveAreas();
  const currentArea = areas.find((a) => a.code.toUpperCase() === areaCode);
  const areaLabel = currentArea?.label || area;

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
          ← {getAreaEmoji(areaCode)} {areaLabel}
        </Link>
        <HotelListClient
          hotels={hotels}
          area={area}
          areaLabel={areaLabel}
          areaEmoji={getAreaEmoji(areaCode)}
        />
      </div>
    </main>
  );
}
