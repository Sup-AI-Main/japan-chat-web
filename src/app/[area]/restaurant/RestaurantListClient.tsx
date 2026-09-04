"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/hooks/use-admin";
import { EditToolbar, AddButton, ConfirmModal, RestaurantEditModal } from "@/components/inline-cms";
import type { Restaurant } from "@/lib/types";

interface NearOption {
  id: string;
  name: string;
}

interface RestaurantListClientProps {
  restaurants: Restaurant[];
  area: string;
  areaLabel: string;
  areaEmoji: string;
}

const NEAR_SECTIONS: { key: string; label: string }[] = [
  { key: "HOTEL", label: "호텔 근처" },
  { key: "GOLF", label: "골프장 근처" },
  { key: "AREA", label: "지역 맛집" },
];

function getDistanceText(r: Restaurant): string {
  if (r.distance_km || r.drive_minutes) {
    const parts: string[] = [];
    if (r.distance_km) parts.push(`호텔에서 ${r.distance_km}km`);
    if (r.drive_minutes) parts.push(`차량 약 ${r.drive_minutes}분`);
    return parts.join(" · ");
  }
  if (r.distance) return `차량 약 ${r.distance}`;
  return "";
}

export default function RestaurantListClient({
  restaurants: initialRestaurants,
  area,
  areaLabel,
  areaEmoji,
}: RestaurantListClientProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [editModal, setEditModal] = useState<{ open: boolean; restaurant: Restaurant | null }>({
    open: false,
    restaurant: null,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; restaurant: Restaurant | null }>({
    open: false,
    restaurant: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [nearOptions, setNearOptions] = useState<NearOption[]>([]);

  const isAdmin = useAdmin();

  const grouped = NEAR_SECTIONS.map((section) => ({
    ...section,
    items: restaurants.filter((r) => {
      if (section.key === "AREA") {
        return r.near_type === "AREA" || (!r.near_type && !r.near_id);
      }
      return r.near_type === section.key;
    }),
  }));

  const fetchNearOptions = async (nearType: string) => {
    try {
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

  const handleAdd = async (nearType: string) => {
    await fetchNearOptions(nearType);
    setEditModal({ open: true, restaurant: null });
  };

  const handleEdit = async (restaurant: Restaurant) => {
    await fetchNearOptions(restaurant.near_type || "HOTEL");
    setEditModal({ open: true, restaurant });
  };

  const handleDelete = (restaurant: Restaurant) => {
    setDeleteModal({ open: true, restaurant });
  };

  const confirmDelete = async () => {
    if (!deleteModal.restaurant) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/restaurant?id=${deleteModal.restaurant.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRestaurants((prev) => prev.filter((r) => r.id !== deleteModal.restaurant!.id));
        setDeleteModal({ open: false, restaurant: null });
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = (saved: Restaurant) => {
    setRestaurants((prev) => {
      const exists = prev.find((r) => r.id === saved.id);
      if (exists) {
        return prev.map((r) => (r.id === saved.id ? { ...r, ...saved } : r));
      }
      return [...prev, saved];
    });
  };

  return (
    <>
      {restaurants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted">등록된 맛집이 없습니다.</p>
          {isAdmin && (
            <div className="mt-4">
              <AddButton onClick={() => handleAdd("HOTEL")} label="맛집 추가" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((section) =>
            section.items.length > 0 || isAdmin ? (
              <section key={section.key}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[18px] font-bold text-text">
                    {section.label}
                  </h2>
                  {isAdmin && (
                    <AddButton onClick={() => handleAdd(section.key)} label="추가" />
                  )}
                </div>
                <div className="space-y-3">
                  {section.items.map((rest) => (
                    <div
                      key={rest.id}
                      className="relative bg-surface border border-border rounded-[12px] p-4 hover:border-primary transition-colors"
                    >
                      {isAdmin && (
                        <div className="absolute top-3 right-3 z-10">
                          <EditToolbar
                            onEdit={() => handleEdit(rest)}
                            onDelete={() => handleDelete(rest)}
                          />
                        </div>
                      )}
                      <Link
                        href={`/${area}/restaurant/${rest.id}`}
                        className="block"
                      >
                        <h3 className="text-[16px] font-bold text-text mb-0.5">
                          {rest.name_kr || rest.name}
                        </h3>
                        {rest.name_jp && (
                          <p className="text-[13px] text-muted mb-1">
                            {rest.name_jp}
                          </p>
                        )}
                        {rest.category && (
                          <p className="text-[14px] text-muted mb-1">
                            {rest.category}
                          </p>
                        )}
                        {(rest.menu_kr || rest.menu_jp) && (
                          <p className="text-[14px] text-text">
                            대표 메뉴: {rest.menu_kr}
                            {rest.menu_jp && (
                              <span className="text-muted"> ({rest.menu_jp})</span>
                            )}
                            {rest.menu_price && (
                              <span className="text-muted"> · {rest.menu_price}</span>
                            )}
                          </p>
                        )}
                        {getDistanceText(rest) && (
                          <p className="text-[13px] text-muted mt-1">
                            {getDistanceText(rest)}
                          </p>
                        )}
                        {rest.google_maps_url && (
                          <span className="text-[12px] text-primary mt-2 inline-block px-2 py-0.5 border border-primary/30 rounded-[6px] hover:bg-primary/5">
                            📍 지도 보기
                          </span>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      )}

      {isAdmin && restaurants.length > 0 && grouped.every((s) => s.items.length === 0) && (
        <div className="mt-4 text-center">
          <AddButton onClick={() => handleAdd("HOTEL")} label="맛집 추가" />
        </div>
      )}

      {editModal.open && (
        <RestaurantEditModal
          restaurant={
            editModal.restaurant
              ? {
                  id: editModal.restaurant.id,
                  name_kr: editModal.restaurant.name_kr || editModal.restaurant.name,
                  name_jp: editModal.restaurant.name_jp || "",
                  category: editModal.restaurant.category || "",
                  menu_kr: editModal.restaurant.menu_kr || "",
                  menu_jp: editModal.restaurant.menu_jp || "",
                  menu_price: editModal.restaurant.menu_price || "",
                  address: editModal.restaurant.address || "",
                  hours: editModal.restaurant.hours || "",
                  closed_days: editModal.restaurant.closed_days || "",
                  distance_km: editModal.restaurant.distance_km || "",
                  drive_minutes: editModal.restaurant.drive_minutes || "",
                  walk_minutes: editModal.restaurant.walk_minutes || "",
                  phone: editModal.restaurant.phone || "",
                  price_range: editModal.restaurant.price_range || "",
                  google_maps_url: editModal.restaurant.google_maps_url || "",
                  description: editModal.restaurant.description || "",
                  recommended: editModal.restaurant.recommended === "true" || editModal.restaurant.recommended === "Y",
                  near_type: (editModal.restaurant.near_type as "HOTEL" | "GOLF" | "AREA") || "HOTEL",
                  near_id: editModal.restaurant.near_id || "",
                }
              : null
          }
          area={area}
          open={editModal.open}
          onClose={() => setEditModal({ open: false, restaurant: null })}
          onSaved={(saved) => {
            handleSaved(saved as unknown as Restaurant);
            setEditModal({ open: false, restaurant: null });
          }}
          nearOptions={nearOptions}
        />
      )}

      <ConfirmModal
        open={deleteModal.open}
        title="맛집 삭제"
        message={`"${deleteModal.restaurant?.name_kr || deleteModal.restaurant?.name}"을(를) 삭제하시겠습니까?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, restaurant: null })}
        loading={deleting}
      />
    </>
  );
}
