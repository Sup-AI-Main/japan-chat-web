"use client";

import { useState } from "react";
import Link from "next/link";
import type { GolfCourse, FaqItem, Restaurant } from "@/lib/types";
import { getCategoryEmoji } from "@/lib/display";
import {
  EditToolbar,
  AddButton,
  ConfirmModal,
  RestaurantEditModal,
  IncludeExcludeSection,
  IncludeExcludeSummary,
} from "@/components/inline-cms";

interface GolfDetailClientProps {
  course: GolfCourse;
  area: string;
  faqs: FaqItem[];
  restaurants: Restaurant[];
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
    near_type: (r.near_type as "HOTEL" | "GOLF" | "AREA") || "GOLF",
    near_id: r.near_id || "",
  };
}

function editDataToRestaurant(data: RestaurantData): Restaurant {
  return {
    id: data.id || "",
    area: "",
    near_type: data.near_type || "GOLF",
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

export function GolfDetailClient({
  course,
  area,
  faqs,
  restaurants: initialRestaurants,
}: GolfDetailClientProps) {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [editRestOpen, setEditRestOpen] = useState(false);
  const [editRestTarget, setEditRestTarget] = useState<Restaurant | null>(null);
  const [deleteRestTarget, setDeleteRestTarget] = useState<Restaurant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const infoItems = [
    { label: "코스 안내", value: course.course_summary },
    { label: "플레이/카트", value: course.play_cart },
    { label: "클럽하우스 식사", value: course.clubhouse_dining },
    { label: "목욕/샤워", value: course.bath_shower },
    { label: "렌탈", value: course.rental },
    { label: "복장", value: course.dress_code },
  ].filter((item) => item.value);

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
          href={`/${area}/golf`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getCategoryEmoji("GOLF")} 골프장 목록
        </Link>

        <h1 className="text-[24px] font-bold text-text mb-1">
          {course.display_name || course.official_name}
        </h1>
        {course.official_name && course.display_name !== course.official_name && (
          <p className="text-[16px] text-muted mb-4">{course.official_name}</p>
        )}

        {/* Map link */}
        {course.google_maps_url && (
          <a
            href={course.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary text-white px-5 py-3 rounded-[10px] text-[14px] font-medium mb-6 hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Google Maps에서 보기
          </a>
        )}

        {/* Address & Phone */}
        <div className="space-y-2 mb-6">
          {course.address && (
            <p className="text-[15px] text-text">
              <span className="text-muted mr-2">주소:</span>
              {course.address}
            </p>
          )}
          {course.phone && (
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-muted">전화:</span>
              <a
                href={`tel:${course.phone}`}
                className="text-[15px] text-primary px-2 py-1 min-h-[44px] flex items-center"
              >
                {course.phone}
              </a>
            </div>
          )}
        </div>

        {/* Info sections */}
        {infoItems.length > 0 && (
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-6">
            <div className="space-y-4">
              {infoItems.map((item) => (
                <div key={item.label}>
                  <h3 className="text-[15px] font-bold text-text mb-1">
                    {item.label}
                  </h3>
                  <p className="text-[15px] text-text leading-relaxed">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 포함/불포함 사항 */}
        <IncludeExcludeSection parentType="GOLF" parentId={course.id} />

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              자주 묻는 질문
            </h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.id}
                  className="bg-surface border border-border rounded-[8px] group"
                >
                  <summary className="p-3 flex justify-between items-center font-medium text-[15px] text-text">
                    <span>Q. {faq.question}</span>
                    <span className="chevron-icon text-muted transition-transform">
                      ▼
                    </span>
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
        <IncludeExcludeSummary parentType="GOLF" parentId={course.id} />

        {/* Nearby restaurants */}
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
        nearOptions={[{ id: course.id, name: course.display_name || course.official_name }]}
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
