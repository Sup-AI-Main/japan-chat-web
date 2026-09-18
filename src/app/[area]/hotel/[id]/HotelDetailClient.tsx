"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Hotel, FaqItem, ContentSection, IncludeExclude } from "@/lib/types";
import type { DynamicLabelsResult } from "@/lib/dynamic-labels";
import { getSectionLabel, getFieldLabel, isSectionVisible } from "@/lib/dynamic-labels";
import { getCategoryEmoji } from "@/lib/display";
import { useAdmin } from "@/hooks/use-admin";
import { useToast, Toast } from "@/components/Toast";
import { toBool } from "@/lib/restaurant-utils";
import {
  EditableContainer,
  IncludeExcludeSection,
  IncludeExcludeSummary,
  ContentSectionsRenderer,
  HotelEditModal,
} from "@/components/inline-cms";

interface HotelDetailClientProps {
  hotel: Hotel;
  area: string;
  faqs: FaqItem[];
  contentSections: ContentSection[];
  dynamicLabels?: DynamicLabelsResult;
  initialIncludes?: IncludeExclude[];
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

function editDataToHotel(id: string, slug: string, area: string, data: HotelData): Hotel {
  return {
    id,
    slug,
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

export function HotelDetailClient({
  hotel: initialHotel,
  area,
  faqs,
  contentSections,
  dynamicLabels,
  initialIncludes,
}: HotelDetailClientProps) {
  const [hotel, setHotel] = useState(initialHotel);
  const isAdmin = useAdmin();

  // Dynamic label helpers with fallback
  const L = dynamicLabels || { sections: [], fieldMap: {} };
  const sectionLabel = (key: string, fb: string) => getSectionLabel(L, key, fb);
  const fieldLabel = (key: string, fb: string) => getFieldLabel(L, key, fb);
  const sectionVisible = (key: string) => isSectionVisible(L, key);

  const [editHotelOpen, setEditHotelOpen] = useState(false);
  const { message, visible, showToast } = useToast();

  const closeHotelModal = useCallback(() => {
    setEditHotelOpen(false);
  }, []);

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
    setHotel(editDataToHotel(hotel.id, hotel.slug, hotel.area, data));
    showToast("수정 완료");
    setTimeout(closeHotelModal, 500);
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
        <EditableContainer
          entityType="hotel"
          id={hotel.id}
          canEdit={isAdmin}
          onEdit={() => setEditHotelOpen(true)}
        >
          <h1 className="text-[24px] font-bold text-text">{titleMain}</h1>
          {titleSub && (
            <p className="text-[14px] text-muted mt-0.5">{titleSub}</p>
          )}
        </EditableContainer>

        {/* 기본 정보 */}
        {hasBasicInfo && sectionVisible("basic_info") && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">{sectionLabel("basic_info", "기본 정보")}</h2>
            <div className="space-y-2">
              {hotel.checkin_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("checkin_time", "체크인")}</span>
                  <span className="text-[15px] text-text">{hotel.checkin_time}</span>
                </div>
              )}
              {hotel.checkout_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("checkout_time", "체크아웃")}</span>
                  <span className="text-[15px] text-text">{hotel.checkout_time}</span>
                </div>
              )}
              {addressMain && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("address", "주소")}</span>
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
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("phone", "전화")}</span>
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
        {hasBreakfast && sectionVisible("breakfast") && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">{sectionLabel("breakfast", "조식")}</h2>
            <div className="space-y-2">
              {hotel.breakfast_place && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("breakfast_place", "장소")}</span>
                  <span className="text-[15px] text-text">{hotel.breakfast_place}</span>
                </div>
              )}
              {hotel.breakfast_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("breakfast_time", "시간")}</span>
                  <span className="text-[15px] text-text">{hotel.breakfast_time}</span>
                </div>
              )}
              {hotel.breakfast_last_entry && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[100px] shrink-0">{fieldLabel("breakfast_last_entry", "마지막 입장")}</span>
                  <span className="text-[15px] text-text">{hotel.breakfast_last_entry}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 석식 */}
        {hasDinner && sectionVisible("dinner") && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">{sectionLabel("dinner", "석식")}</h2>
            <div className="space-y-2">
              {hotel.dinner_place && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("dinner_place", "장소")}</span>
                  <span className="text-[15px] text-text">{hotel.dinner_place}</span>
                </div>
              )}
              {hotel.dinner_time && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("dinner_time", "시간")}</span>
                  <span className="text-[15px] text-text">{hotel.dinner_time}</span>
                </div>
              )}
              {hotel.dinner_last_entry && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[100px] shrink-0">{fieldLabel("dinner_last_entry", "마지막 입장")}</span>
                  <span className="text-[15px] text-text">{hotel.dinner_last_entry}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 온천/스파 */}
        {hasOnsen && sectionVisible("onsen_spa") && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">{sectionLabel("onsen_spa", "온천/스파")}</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-muted">{fieldLabel("has_public_bath", "대욕장")}</span>
                <span className="text-[15px] text-text">
                  {toBool(hotel.has_public_bath) ? "✓" : "✗"}
                </span>
                <span className="text-[14px] text-muted ml-4">{fieldLabel("has_outdoor_onsen", "노천온천")}</span>
                <span className="text-[15px] text-text">
                  {toBool(hotel.has_outdoor_onsen) ? "✓" : "✗"}
                </span>
                <span className="text-[14px] text-muted ml-4">{fieldLabel("has_sauna", "사우나")}</span>
                <span className="text-[15px] text-text">
                  {toBool(hotel.has_sauna) ? "✓" : "✗"}
                </span>
              </div>
              {hotel.bath_spa_hours && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("bath_spa_hours", "운영시간")}</span>
                  <span className="text-[15px] text-text">{hotel.bath_spa_hours}</span>
                </div>
              )}
              {hotel.tattoo_policy && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("tattoo_policy", "타투 안내")}</span>
                  <span className="text-[15px] text-text">{hotel.tattoo_policy}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 기타 안내 */}
        {hasOther && sectionVisible("other_info") && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
            <h2 className="text-[16px] font-bold text-text mb-3">{sectionLabel("other_info", "기타 안내")}</h2>
            <div className="space-y-2">
              {hotel.other_info && (
                <div>
                  <span className="text-[15px] text-text leading-relaxed">{hotel.other_info}</span>
                </div>
              )}
              {hotel.atm_payment && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("atm_payment", "ATM/결제")}</span>
                  <span className="text-[15px] text-text">{hotel.atm_payment}</span>
                </div>
              )}
              {hotel.transport && (
                <div className="flex">
                  <span className="text-[14px] text-muted w-[80px] shrink-0">{fieldLabel("transport_note", "교통")}</span>
                  <span className="text-[15px] text-text">{hotel.transport}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 포함/불포함 사항 */}
        <IncludeExcludeSection parentType="HOTEL" parentId={hotel.id} initialItems={initialIncludes} />

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
        <IncludeExcludeSummary parentType="HOTEL" parentId={hotel.id} initialItems={initialIncludes} />

        {/* Content Sections (dynamic) */}
        <ContentSectionsRenderer
          parentType="HOTEL"
          parentId={hotel.id}
          initialSections={contentSections}
        />
      </div>

      {/* Hotel Edit Modal */}
      <HotelEditModal
        hotel={hotelToEditData(hotel)}
        area={area}
        open={editHotelOpen}
        onClose={closeHotelModal}
        onSaved={handleHotelSaved}
      />

      <Toast message={message} visible={visible} />
    </main>
  );
}
