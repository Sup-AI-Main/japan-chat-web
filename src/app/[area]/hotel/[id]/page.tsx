import { notFound } from "next/navigation";
import {
  getHotelById,
  getHotels,
  getFaqForEntity,
  getContentSections,
} from "@/lib/supabase-cms";
import { getDynamicLabels } from "@/lib/dynamic-labels";
import type { FaqItem, ContentSection } from "@/lib/types";
import type { DynamicLabelsResult } from "@/lib/dynamic-labels";
import { HotelDetailClient } from "./HotelDetailClient";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const hotels = await getHotels();
    return hotels.map((h) => ({ area: h.area.toLowerCase(), id: h.slug }));
  } catch {
    return [];
  }
}

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

  // Parallel fetch: all independent queries run concurrently
  const results = await Promise.allSettled([
    getFaqForEntity(area.toUpperCase(), "HOTEL", id),
    getContentSections("HOTEL", id),
    getDynamicLabels("HOTEL"),
  ]);

  const faqs: FaqItem[] = results[0].status === "fulfilled" ? results[0].value : [];
  const contentSections: ContentSection[] = results[1].status === "fulfilled" ? results[1].value : [];
  const dynamicLabels: DynamicLabelsResult = results[2].status === "fulfilled" ? results[2].value : { sections: [], fieldMap: {} };

  return (
    <HotelDetailClient
      hotel={hotel}
      area={area}
      faqs={faqs}
      contentSections={contentSections}
      dynamicLabels={dynamicLabels}
    />
  );
}
