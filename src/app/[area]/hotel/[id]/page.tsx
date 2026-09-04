import { notFound } from "next/navigation";
import {
  getHotelById,
  getFaq,
  getTravelTimes,
  getRestaurants,
} from "@/lib/google-sheets";
import type { TravelTime, FaqItem, Restaurant } from "@/lib/types";
import { HotelDetailClient } from "./HotelDetailClient";

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

  let travelTimes: TravelTime[] = [];
  try {
    travelTimes = (await getTravelTimes(area.toUpperCase())).filter(
      (t) => t.hotel_id === id
    );
  } catch {
    travelTimes = [];
  }

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

  let restaurants: Restaurant[] = [];
  try {
    restaurants = (await getRestaurants(area.toUpperCase())).filter(
      (r) => r.near_type === "HOTEL" && r.near_id === id
    );
  } catch {
    restaurants = [];
  }

  return (
    <HotelDetailClient
      hotel={hotel}
      area={area}
      travelTimes={travelTimes}
      faqs={faqs}
      restaurants={restaurants}
    />
  );
}
