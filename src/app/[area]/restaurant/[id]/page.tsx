import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantById, getRestaurants, getContentSections } from "@/lib/supabase-cms";
import { getDynamicLabels } from "@/lib/dynamic-labels";
import { getCategoryEmoji } from "@/lib/display";
import type { ContentSection } from "@/lib/types";
import type { DynamicLabelsResult } from "@/lib/dynamic-labels";
import RestaurantDetailClient from "./RestaurantDetailClient";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const restaurants = await getRestaurants();
    return restaurants.map((r) => ({ area: r.area.toLowerCase(), id: r.slug }));
  } catch {
    return [];
  }
}

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

  // Get content sections and dynamic labels
  const results = await Promise.allSettled([
    getContentSections("RESTAURANT", id),
    getDynamicLabels("RESTAURANT"),
  ]);

  const contentSections: ContentSection[] = results[0].status === "fulfilled" ? results[0].value : [];
  const dynamicLabels: DynamicLabelsResult = results[1].status === "fulfilled" ? results[1].value : { sections: [], fieldMap: {} };

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}/restaurant`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getCategoryEmoji("RESTAURANT")} 음식점 목록
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-4">
          {restaurant.name_kr || restaurant.name}
        </h1>
        {restaurant.name_jp && (
          <p className="text-[15px] text-muted mb-4">{restaurant.name_jp}</p>
        )}

        <RestaurantDetailClient
          restaurant={restaurant}
          area={area}
          contentSections={contentSections}
          dynamicLabels={dynamicLabels}
        />
      </div>
    </main>
  );
}
