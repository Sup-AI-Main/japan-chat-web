"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/use-admin";
import { EditToolbar, ConfirmModal, RestaurantEditModal } from "@/components/inline-cms";
import type { Restaurant } from "@/lib/types";

interface NearOption {
  id: string;
  name: string;
}

interface RestaurantDetailClientProps {
  restaurant: Restaurant;
  area: string;
}

export default function RestaurantDetailClient({
  restaurant: initialRestaurant,
  area,
}: RestaurantDetailClientProps) {
  const [restaurant, setRestaurant] = useState<Restaurant>(initialRestaurant);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nearOptions, setNearOptions] = useState<NearOption[]>([]);
  const router = useRouter();
  const isAdmin = useAdmin();

  const fetchNearOptions = async () => {
    try {
      const nearType = restaurant.near_type || "HOTEL";
      if (nearType === "HOTEL") {
        const res = await fetch(`/api/admin/hotel?area=${area.toUpperCase()}`);
        if (res.ok) {
          const data = await res.json();
          setNearOptions(
            (data.hotels || []).map((h: { id: string; official_name: string }) => ({
              id: h.id,
              name: h.official_name,
            }))
          );
        }
      } else if (nearType === "GOLF") {
        const res = await fetch(`/api/admin/golf?area=${area.toUpperCase()}`);
        if (res.ok) {
          const data = await res.json();
          setNearOptions(
            (data.courses || []).map((c: { id: string; display_name: string }) => ({
              id: c.id,
              name: c.display_name,
            }))
          );
        }
      } else {
        setNearOptions([]);
      }
    } catch {
      setNearOptions([]);
    }
  };

  const handleEdit = async () => {
    await fetchNearOptions();
    setEditModal(true);
  };

  const handleDelete = () => {
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/restaurant?id=${restaurant.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push(`/${area}/restaurant`);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = (saved: Restaurant) => {
    setRestaurant((prev) => ({ ...prev, ...saved }));
    setEditModal(false);
  };

  const displayName = restaurant.name_kr || restaurant.name;
  const displayDistance = restaurant.distance_km || restaurant.drive_minutes
    ? [
        restaurant.distance_km && `${restaurant.distance_km}km`,
        restaurant.drive_minutes && `차량 약 ${restaurant.drive_minutes}분`,
        restaurant.walk_minutes && `도보 약 ${restaurant.walk_minutes}분`,
      ]
        .filter(Boolean)
        .join(" · ")
    : restaurant.distance
      ? `차량 약 ${restaurant.distance}`
      : "";

  return (
    <>
      <div className="relative bg-surface border border-border rounded-[12px] p-4">
        {isAdmin && (
          <div className="absolute top-3 right-3 z-10">
            <EditToolbar onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        )}

        {/* Title */}
        <h2 className="text-[20px] font-bold text-text mb-0.5">
          {displayName}
        </h2>
        {restaurant.name_jp && (
          <p className="text-[14px] text-muted mb-3">{restaurant.name_jp}</p>
        )}

        {/* Category badge */}
        {restaurant.category && (
          <span className="inline-block text-[13px] text-primary bg-primary/10 px-2 py-0.5 rounded-[6px] mb-4">
            {restaurant.category}
          </span>
        )}

        <div className="space-y-3">
          {/* 대표 메뉴 */}
          {(restaurant.menu_kr || restaurant.menu_jp) && (
            <div>
              <h3 className="text-[15px] font-bold text-text">대표 메뉴</h3>
              <p className="text-[15px] text-text">
                {restaurant.menu_kr}
                {restaurant.menu_jp && (
                  <span className="text-muted"> ({restaurant.menu_jp})</span>
                )}
              </p>
              {restaurant.menu_price && (
                <p className="text-[14px] text-muted">{restaurant.menu_price}</p>
              )}
            </div>
          )}

          {/* 주소 + Google Maps */}
          {restaurant.address && (
            <div>
              <h3 className="text-[15px] font-bold text-text">주소</h3>
              <p className="text-[15px] text-text">{restaurant.address}</p>
              {restaurant.google_maps_url && (
                <a
                  href={restaurant.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-primary mt-1 inline-block px-2 py-1 border border-primary/30 rounded-[6px] hover:bg-primary/5 min-h-[44px] items-center flex"
                >
                  📍 Google Maps에서 보기
                </a>
              )}
            </div>
          )}

          {/* 영업시간 */}
          {restaurant.hours && (
            <div>
              <h3 className="text-[15px] font-bold text-text">영업시간</h3>
              <p className="text-[15px] text-text">{restaurant.hours}</p>
            </div>
          )}

          {/* 휴무일 */}
          {restaurant.closed_days && (
            <div>
              <h3 className="text-[15px] font-bold text-text">휴무일</h3>
              <p className="text-[15px] text-text">{restaurant.closed_days}</p>
            </div>
          )}

          {/* 거리 */}
          {displayDistance && (
            <div>
              <h3 className="text-[15px] font-bold text-text">거리</h3>
              <p className="text-[15px] text-text">{displayDistance}</p>
            </div>
          )}

          {/* 가격대 */}
          {restaurant.price_range && (
            <div>
              <h3 className="text-[15px] font-bold text-text">가격대</h3>
              <p className="text-[15px] text-text">{restaurant.price_range}</p>
            </div>
          )}

          {/* 전화 */}
          {restaurant.phone && (
            <div>
              <h3 className="text-[15px] font-bold text-text">전화</h3>
              <a
                href={`tel:${restaurant.phone}`}
                className="text-[15px] text-primary px-2 py-1 min-h-[44px] inline-flex items-center"
              >
                {restaurant.phone}
              </a>
            </div>
          )}

          {/* 설명 */}
          {restaurant.description && (
            <div>
              <h3 className="text-[15px] font-bold text-text">설명</h3>
              <p className="text-[15px] text-text leading-relaxed">
                {restaurant.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <RestaurantEditModal
          restaurant={{
            id: restaurant.id,
            name_kr: restaurant.name_kr || restaurant.name,
            name_jp: restaurant.name_jp || "",
            category: restaurant.category || "",
            menu_kr: restaurant.menu_kr || "",
            menu_jp: restaurant.menu_jp || "",
            menu_price: restaurant.menu_price || "",
            address: restaurant.address || "",
            hours: restaurant.hours || "",
            closed_days: restaurant.closed_days || "",
            distance_km: restaurant.distance_km || "",
            drive_minutes: restaurant.drive_minutes || "",
            walk_minutes: restaurant.walk_minutes || "",
            phone: restaurant.phone || "",
            price_range: restaurant.price_range || "",
            google_maps_url: restaurant.google_maps_url || "",
            description: restaurant.description || "",
            recommended: restaurant.recommended === "true" || restaurant.recommended === "Y",
            near_type: (restaurant.near_type as "HOTEL" | "GOLF" | "AREA") || "HOTEL",
            near_id: restaurant.near_id || "",
          }}
          area={area}
          open={editModal}
          onClose={() => setEditModal(false)}
          onSaved={(saved) => handleSaved(saved as unknown as Restaurant)}
          nearOptions={nearOptions}
        />
      )}

      <ConfirmModal
        open={deleteModal}
        title="맛집 삭제"
        message={`"${displayName}"을(를) 삭제하시겠습니까?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(false)}
        loading={deleting}
      />
    </>
  );
}
