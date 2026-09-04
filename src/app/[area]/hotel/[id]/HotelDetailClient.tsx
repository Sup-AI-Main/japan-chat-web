"use client";

import { useState } from "react";
import Link from "next/link";
import type { Hotel, TravelTime, FaqItem, Restaurant } from "@/lib/types";
import { getCategoryEmoji } from "@/lib/display";
import {
  EditToolbar,
  AddButton,
  ConfirmModal,
  HotelEditModal,
  RestaurantEditModal,
  IncludeExcludeSection,
  IncludeExcludeSummary,
} from "@/components/inline-cms";

interface HotelDetailClientProps {
  hotel: Hotel;
  area: string;
  travelTimes: TravelTime[];
  faqs: FaqItem[];
  restaurants: Restaurant[];
}

interface HotelData {
  id?: string;
  name_kr: string;
  name_jp: string;
  address_kr: string;
  address_jp: string;
  phone: string;
  google_maps_url: string;
  checkin_time: string;
  checkout_time: string;
  breakfast_place: string;
  breakfast_time: string;
  breakfast_last_entry: string;
  dinner_place: string;
  dinner_time: string;
  dinner_last_entry: string;
  has_public_bath: boolean;
  has_outdoor_onsen: boolean;
  has_sauna: boolean;
  bath_spa_hours: string;
  tattoo_policy: string;
  other_info: string;
  atm_payment: string;
  transport: string;
}

interface RestaurantData {
  id?: string;
  name_kr: string;
  name_jp: string;
  category: string;
  menu_kr: string;
  menu_jp: string;
  menu_price: string;
  address: string;
  hours: string;
  closed_days: string;
  distance_km: string;
  drive_minutes: string;
  walk_minutes: string;
  phone: string;
  price_range: string;
  google_maps_url: string;
  description: string;
  recommended: boolean;
  near_type: "HOTEL" | "GOLF" | "AREA";
  near_id: string;
}

function toBool(v: string): boolean {
  if (!v) return false;
  const s = v.trim().toUpperCase();
  return s === "TRUE" || s === "Y" || s === "YES" || s === "1";
}

function hotelToEditData(hotel: Hotel) {
  return {
    id: hotel.id,
    name_kr: hotel.name_kr || "",
    name_jp: hotel.name_jp || "",
    address_kr: hotel.address_kr || "",
    address_jp: hotel.address_jp || "",
    phone: hotel.phone || "",
    google_maps_url: hotel.google_maps_url || "",
    checkin_time: hotel.checkin_time || "",
    checkout_time: hotel.checkout_time || "",
    breakfast_place: hotel.breakfast_place || "",
    breakfast_time: hotel.breakfast_time || "",
    breakfast_last_entry: hotel.breakfast_last_entry || "",
    dinner_place: hotel.dinner_place || "",
    dinner_time: hotel.dinner_time || "",
    dinner_last_entry: hotel.dinner_last_entry || "",
    has_public_bath: toBool(hotel.has_public_bath),
    has_outdoor_onsen: toBool(hotel.has_outdoor_onsen),
    has_sauna: toBool(hotel.has_sauna),
    bath_spa_hours: hotel.bath_spa_hours || "",
    tattoo_policy: hotel.tattoo_policy || "",
    other_info: hotel.other_info || "",
    atm_payment: hotel.atm_payment || "",
    transport: hotel.transport || "",
  };
}

function editDataToHotel(id: string, area: string, data: HotelData): Hotel {
  return {
    id,
    area,
    official_name: data.name_kr || "",
    name_kr: data.name_kr || "",
    name_jp: data.name_jp || "",
    address: data.address_kr || "",
    address_kr: data.address_kr || "",
    address_jp: data.address_jp || "",
    phone: data.phone || "",
    google_maps_url: data.google_maps_url || "",
    check_in: data.checkin_time || "",
    check_out: data.checkout_time || "",
    checkin_time: data.checkin_time || "",
    checkout_time: data.checkout_time || "",
    breakfast: "",
    breakfast_place: data.breakfast_place || "",
    breakfast_time: data.breakfast_time || "",
    breakfast_last_entry: data.breakfast_last_entry || "",
    hotel_dining: "",
    dinner_place: data.dinner_place || "",
    dinner_time: data.dinner_time || "",
    dinner_last_entry: data.dinner_last_entry || "",
    bath_spa: "",
    has_public_bath: data.has_public_bath ? "TRUE" : "FALSE",
    has_outdoor_onsen: data.has_outdoor_onsen ? "TRUE" : "FALSE",
    has_sauna: data.has_sauna ? "TRUE" : "FALSE",
    bath_spa_hours: data.bath_spa_hours || "",
    tattoo_policy: data.tattoo_policy || "",
    other_info: data.other_info || "",
    atm_payment: data.atm_payment || "",
    transport: data.transport || "",
    source_url: "",
    status: "",
    active: "",
    sort: 0,
    last_verified: "",
    updated_at: "",
  };
}

function restToEditData(r: Restaurant) {
  return {
    id: r.id,
    name_kr: r.name_kr || "",
    name_jp: r.name_jp || "",
    category: r.category || "",
    menu_kr: r.menu_kr || "",
    menu_jp: r.menu_jp || "",
    menu_price: r.menu_price || "",
    address: r.address || "",
    hours: r.hours || "",
    closed_days: r.closed_days || "",
    distance_km: r.distance_km || "",
    drive_minutes: r.drive_minutes || "",
    walk_minutes: r.walk_minutes || "",
    phone: r.phone || "",
    price_range: r.price_range || "",
    google_maps_url: r.google_maps_url || "",
    description: r.description || "",
    recommended: toBool(r.recommended),
    near_type: (r.near_type as "HOTEL" | "GOLF" | "AREA") || "HOTEL",
    near_id: r.near_id || "",
  };
}

function editDataToRestaurant(data: RestaurantData): Restaurant {
  return {
    id: data.id || "",
    area: data.near_type || "",
    near_type: data.near_type || "HOTEL",
    near_id: data.near_id || "",
    name: data.name_kr || "",
    name_kr: data.name_kr || "",
    name_jp: data.name_jp || "",
    category: data.category || "",
    menu_kr: data.menu_kr || "",
    menu_jp: data.menu_jp || "",
    menu_price: data.menu_price || "",
    distance: data.drive_minutes ? `차량 약 ${data.drive_minutes}분` : "",
    distance_km: data.distance_km || "",
    drive_minutes: data.drive_minutes || "",
    walk_minutes: data.walk_minutes || "",
    address: data.address || "",
    hours: data.hours || "",
    closed_days: data.closed_days || "",
    price_range: data.price_range || "",
    phone: data.phone || "",
    google_maps_url: data.google_maps_url || "",
    source_url: "",
    description: data.description || "",
    recommended: data.recommended ? "TRUE" : "FALSE",
    status: "",
    active: "",
    sort: 0,
    last_verified: "",
    updated_at: "",
  };
}

export function HotelDetailClient({
  hotel: initialHotel,
  area,
  travelTimes,
  faqs,
  restaurants: initialRestaurants,
}: HotelDetailClientProps) {
  const [hotel, setHotel] = useState(initialHotel);
  const [restaurants, setRestaurants] = useState(initialRestaurants);

  const [editHotelOpen, setEditHotelOpen] = useState(false);
  const [editRestOpen, setEditRestOpen] = useState(false);
  const [editRestTarget, setEditRestTarget] = useState<Restaurant | null>(null);
  const [deleteRestTarget, setDeleteRestTarget] = useState<Restaurant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const titleMain = hotel.name_kr || hotel.official_name;
  const titleSub = hotel.name_jp || (hotel.name_kr ? hotel.official_name : "");
  const addressMain = hotel.address_kr || hotel.address;
  const addressSub = hotel.address_jp || (hotel.address_kr ? hotel.address : "");

  const hasBasicInfo =
    hotel.checkin_time || hotel.checkout_time || addressMain || hotel.phone;
  const hasBreakfast = hotel.breakfast_place || hotel.breakfast_time || hotel.breakfast_last_entry;
  const hasDinner = hotel.dinner_place || hotel.dinner_time || hotel.dinner_last_entry;
  const hasOnsen =
    hotel.has_public_bath || hotel.has_outdoor_onsen || hotel.has_sauna ||
    hotel.bath_spa_hours || hotel.tattoo_policy;
  const hasOther = hotel.other_info || hotel.atm_payment || hotel.transport;

  const handleHotelSaved = (data: HotelData) => {
    setHotel(editDataToHotel(hotel.id, hotel.area, data));
  };

  const handleRestSaved = (data: RestaurantData) => {
    const updated = editDataToRestaurant(data);
    if (editRestTarget) {
      setRestaurants((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } else {
      setRestaurants((prev) => [...prev, { ...updated, id: data.id || Date.now().toString() }]);
    }
  };

  const handleRestDelete = async () => {
    if (!deleteRestTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/restaurant?id=${deleteRestTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRestaurants((prev) => prev.filter((r) => r.id !== deleteRestTarget.id));
        setDeleteRestTarget(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}/hotel`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getCategoryEmoji("HOTEL")} 호텔 목록
        </Link>

        {/* Title with Korean main + Japanese sub */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[24px] font-bold text-text">{titleMain}</h1>
            {titleSub && (
              <p className="text-[14px] text-muted mt-0.5">{titleSub}</p>
            )}
          </div>
          <EditToolbar
            onEdit={() => setEditHotelOpen(true)}
            onDelete={() => {}}
          />
        </div>

        {/* 기본 정보 */}
        {hasBasicInfo && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">기본 정보</h2>
            <div className="space-y-2">
              {hotel.checkin_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">체크인</span>
                  <span className="text-[15px] text-text">{hotel.checkin_time}</span>
                </div>
              )}
              {hotel.checkout_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">체크아웃</span>
                  <span className="text-[15px] text-text">{hotel.checkout_time}</span>
                </div>
              )}
              {addressMain && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">주소</span>
                  <div>
                    <span className="text-[15px] text-text">{addressMain}</span>
                    {addressSub && (
                      <p className="text-[13px] text-muted mt-0.5">{addressSub}</p>
                    )}
                  </div>
                </div>
              )}
              {hotel.phone && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">전화</span>
                  <span className="text-[15px] text-text">{hotel.phone}</span>
                </div>
              )}
              {hotel.google_maps_url && (
                <a
                  href={hotel.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-primary text-white px-5 py-3 rounded-[10px] text-[14px] font-medium hover:opacity-90 min-h-[44px] flex items-center justify-center mt-2"
                >
                  Google Maps에서 보기
                </a>
              )}
            </div>
          </div>
        )}

        {/* 조식 */}
        {hasBreakfast && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">조식</h2>
            <div className="space-y-2">
              {hotel.breakfast_place && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">장소</span>
                  <span className="text-[15px] text-text">{hotel.breakfast_place}</span>
                </div>
              )}
              {hotel.breakfast_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">시간</span>
                  <span className="text-[15px] text-text">{hotel.breakfast_time}</span>
                </div>
              )}
              {hotel.breakfast_last_entry && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[100px] shrink-0">마지막 입장</span>
                  <span className="text-[15px] text-text">{hotel.breakfast_last_entry}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 석식 */}
        {hasDinner && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">석식</h2>
            <div className="space-y-2">
              {hotel.dinner_place && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">장소</span>
                  <span className="text-[15px] text-text">{hotel.dinner_place}</span>
                </div>
              )}
              {hotel.dinner_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">시간</span>
                  <span className="text-[15px] text-text">{hotel.dinner_time}</span>
                </div>
              )}
              {hotel.dinner_last_entry && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[100px] shrink-0">마지막 입장</span>
                  <span className="text-[15px] text-text">{hotel.dinner_last_entry}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 온천/스파 */}
        {hasOnsen && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">온천/스파</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-muted">대욕장</span>
                <span className="text-[15px] text-text">
                  {toBool(hotel.has_public_bath) ? "✓" : "✗"}
                </span>
                <span className="text-[14px] text-muted ml-4">노천온천</span>
                <span className="text-[15px] text-text">
                  {toBool(hotel.has_outdoor_onsen) ? "✓" : "✗"}
                </span>
                <span className="text-[14px] text-muted ml-4">사우나</span>
                <span className="text-[15px] text-text">
                  {toBool(hotel.has_sauna) ? "✓" : "✗"}
                </span>
              </div>
              {hotel.bath_spa_hours && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">운영시간</span>
                  <span className="text-[15px] text-text">{hotel.bath_spa_hours}</span>
                </div>
              )}
              {hotel.tattoo_policy && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">타투 안내</span>
                  <span className="text-[15px] text-text">{hotel.tattoo_policy}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 기타 안내 */}
        {hasOther && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">기타 안내</h2>
            <div className="space-y-2">
              {hotel.other_info && (
                <div>
                  <span className="text-[15px] text-text leading-relaxed">{hotel.other_info}</span>
                </div>
              )}
              {hotel.atm_payment && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">ATM/결제</span>
                  <span className="text-[15px] text-text">{hotel.atm_payment}</span>
                </div>
              )}
              {hotel.transport && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">교통</span>
                  <span className="text-[15px] text-text">{hotel.transport}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 포함/불포함 사항 */}
        <IncludeExcludeSection parentType="HOTEL" parentId={hotel.id} />

        {/* 골프장 이동시간 */}
        {travelTimes.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-[18px] font-bold text-text mb-4">골프장 이동시간</h2>
            <div className="space-y-3">
              {travelTimes.map((tt) => (
                <div
                  key={tt.id}
                  className="bg-surface border border-border rounded-[8px] p-3"
                >
                  <h3 className="text-[16px] font-bold text-text">{tt.golf_name}</h3>
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

        {/* 호텔 관련 질문 */}
        {faqs.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-[18px] font-bold text-text mb-4">호텔 관련 질문</h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.id}
                  className="bg-surface border border-border rounded-[8px] group"
                >
                  <summary className="p-3 flex justify-between items-center font-medium text-[15px] text-text">
                    <span>Q. {faq.question}</span>
                    <span className="chevron-icon text-muted transition-transform">▼</span>
                  </summary>
                  <div className="px-3 pb-3 text-[15px] text-text leading-[1.6] border-t border-border pt-3">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* 예약 전 확인 요약 */}
        <IncludeExcludeSummary parentType="HOTEL" parentId={hotel.id} />

        {/* 주변 맛집 */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-text">주변 맛집</h2>
            <AddButton
              onClick={() => {
                setEditRestTarget(null);
                setEditRestOpen(true);
              }}
              label="맛집 추가"
            />
          </div>
          {restaurants.length > 0 ? (
            <div className="space-y-3">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="bg-surface border border-border rounded-[12px] p-4"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-[16px] font-bold text-text">
                        {rest.name_kr || rest.name}
                      </h3>
                      {rest.name_jp && (
                        <p className="text-[13px] text-muted">{rest.name_jp}</p>
                      )}
                    </div>
                    <EditToolbar
                      onEdit={() => {
                        setEditRestTarget(rest);
                        setEditRestOpen(true);
                      }}
                      onDelete={() => setDeleteRestTarget(rest)}
                    />
                  </div>
                  {rest.category && (
                    <p className="text-[14px] text-muted mb-1">{rest.category}</p>
                  )}
                  {rest.menu_kr && (
                    <p className="text-[14px] text-text">
                      메뉴: {rest.menu_kr}
                      {rest.menu_price && ` (${rest.menu_price})`}
                    </p>
                  )}
                  {rest.distance && (
                    <p className="text-[14px] text-muted mt-1">
                      {rest.distance.startsWith("차량") ? rest.distance : `차량 약 ${rest.distance}`}
                    </p>
                  )}
                  {rest.google_maps_url && (
                    <a
                      href={rest.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-primary mt-2 inline-block"
                    >
                      지도 보기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted">등록된 맛집이 없습니다.</p>
          )}
        </div>
      </div>

      {/* Hotel Edit Modal */}
      <HotelEditModal
        hotel={hotelToEditData(hotel)}
        area={area}
        open={editHotelOpen}
        onClose={() => setEditHotelOpen(false)}
        onSaved={handleHotelSaved}
      />

      {/* Restaurant Edit Modal */}
      <RestaurantEditModal
        restaurant={editRestTarget ? restToEditData(editRestTarget) : null}
        area={area}
        open={editRestOpen}
        onClose={() => {
          setEditRestOpen(false);
          setEditRestTarget(null);
        }}
        onSaved={handleRestSaved}
        nearOptions={[{ id: hotel.id, name: hotel.name_kr || hotel.official_name }]}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteRestTarget}
        title="맛집 삭제"
        message={`"${deleteRestTarget?.name_kr || deleteRestTarget?.name}" 맛집을 삭제하시겠습니까?`}
        onConfirm={handleRestDelete}
        onCancel={() => setDeleteRestTarget(null)}
        loading={deleteLoading}
      />
    </main>
  );
}
