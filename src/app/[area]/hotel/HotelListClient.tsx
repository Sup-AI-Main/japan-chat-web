"use client";

import { useState } from "react";
import Link from "next/link";
import type { Hotel } from "@/lib/types";
import {
  EditableContainer,
  AddButton,
  HotelEditModal,
} from "@/components/inline-cms";

interface HotelListClientProps {
  hotels: Hotel[];
  area: string;
  areaLabel: string;
  areaEmoji: string;
}

export default function HotelListClient({
  hotels: initialHotels,
  area,
  areaLabel,
  areaEmoji,
}: HotelListClientProps) {
  const [hotels, setHotels] = useState<Hotel[]>(initialHotels);
  const [editModal, setEditModal] = useState<{ open: boolean; hotel: Hotel | null }>({
    open: false,
    hotel: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaved = (data: any) => {
    setHotels((prev) => {
      const exists = prev.find((h) => h.id === data.id);
      if (exists) {
        return prev.map((h) => (h.id === data.id ? { ...h, ...data } as Hotel : h));
      }
      return [...prev, { ...data, area: area.toUpperCase(), active: "TRUE", status: "published", sort: 99, source_url: "", last_verified: "", updated_at: new Date().toISOString() } as Hotel];
    });
  };

  const handleDelete = async (hotel: Hotel) => {
    const res = await fetch(`/api/admin/hotel?id=${hotel.id}`, { method: "DELETE" });
    if (res.ok) {
      setHotels((prev) => prev.filter((h) => h.id !== hotel.id));
    }
  };

  const hotelToEditData = (h: Hotel) => ({
    id: h.id,
    name_kr: h.name_kr || "",
    name_jp: h.name_jp || "",
    address_kr: h.address_kr || "",
    address_jp: h.address_jp || "",
    phone: h.phone || "",
    google_maps_url: h.google_maps_url || "",
    checkin_time: h.checkin_time || "",
    checkout_time: h.checkout_time || "",
    breakfast_place: h.breakfast_place || "",
    breakfast_time: h.breakfast_time || "",
    breakfast_last_entry: h.breakfast_last_entry || "",
    dinner_place: h.dinner_place || "",
    dinner_time: h.dinner_time || "",
    dinner_last_entry: h.dinner_last_entry || "",
    has_public_bath: h.has_public_bath === "TRUE",
    has_outdoor_onsen: h.has_outdoor_onsen === "TRUE",
    has_sauna: h.has_sauna === "TRUE",
    bath_spa_hours: h.bath_spa_hours || "",
    tattoo_policy: h.tattoo_policy || "",
    other_info: h.other_info || "",
    atm_payment: h.atm_payment || "",
    transport: h.transport || "",
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-bold text-text">
          {areaEmoji} {areaLabel} 🏨 호텔
        </h1>
        <AddButton onClick={() => setEditModal({ open: true, hotel: null })} label="호텔 추가" />
      </div>

      {hotels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted">등록된 호텔이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hotels.map((hotel) => (
            <EditableContainer
              key={hotel.id}
              entityType="hotel"
              onEdit={() => setEditModal({ open: true, hotel })}
              onDelete={() => handleDelete(hotel)}
            >
              <Link
                href={`/${area}/hotel/${hotel.id}`}
                className="block bg-surface border border-border rounded-[12px] p-4 hover:border-primary transition-colors"
              >
                <h2 className="text-[18px] font-bold text-text mb-0.5">
                  {hotel.name_kr || hotel.official_name}
                </h2>
                {hotel.name_jp && (
                  <p className="text-[13px] text-muted mb-1">{hotel.name_jp}</p>
                )}
                {hotel.address_kr && (
                  <p className="text-[14px] text-muted">{hotel.address_kr}</p>
                )}
                <span className="text-[13px] text-primary mt-2 inline-block">
                  자세히 보기 →
                </span>
              </Link>
            </EditableContainer>
          ))}
        </div>
      )}

      {editModal.open && (
        <HotelEditModal
          hotel={editModal.hotel ? hotelToEditData(editModal.hotel) : null}
          area={area}
          open={editModal.open}
          onClose={() => setEditModal({ open: false, hotel: null })}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
