"use client";

import { useState, useEffect } from "react";

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

const EMPTY_RESTAURANT: RestaurantData = {
  name_kr: "",
  name_jp: "",
  category: "",
  menu_kr: "",
  menu_jp: "",
  menu_price: "",
  address: "",
  hours: "",
  closed_days: "",
  distance_km: "",
  drive_minutes: "",
  walk_minutes: "",
  phone: "",
  price_range: "",
  google_maps_url: "",
  description: "",
  recommended: false,
  near_type: "HOTEL",
  near_id: "",
};

interface NearOption {
  id: string;
  name: string;
}

interface RestaurantEditModalProps {
  restaurant: RestaurantData | null;
  area: string;
  open: boolean;
  onClose: () => void;
  onSaved: (restaurant: RestaurantData) => void;
  nearOptions: NearOption[];
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="mb-3">
      <label className="text-[13px] font-medium text-text mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px] min-h-[40px] focus:outline-none focus:border-primary"
      />
    </div>
  );
}

export function RestaurantEditModal({
  restaurant,
  area,
  open,
  onClose,
  onSaved,
  nearOptions,
}: RestaurantEditModalProps) {
  const [form, setForm] = useState<RestaurantData>(EMPTY_RESTAURANT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(restaurant ? { ...restaurant } : { ...EMPTY_RESTAURANT });
      setError("");
      setSaving(false);
    }
  }, [open, restaurant]);

  const update = (key: keyof RestaurantData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name_kr.trim()) {
      setError("식당 이름(한국어)은 필수입니다.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEdit = !!restaurant?.id;
      const res = await fetch("/api/admin/restaurant", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: restaurant?.id,
          area: area.toUpperCase(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      const data = await res.json();
      onSaved(data.restaurant ?? { ...form, id: restaurant?.id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[12px] p-6 max-w-[480px] w-[90%] max-h-[80vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[18px] font-bold text-text mb-4">
          {restaurant ? "식당 수정" : "식당 추가"}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-4 text-[14px] text-danger">
            {error}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">기본 정보</h3>
          <InputField label="식당명 (한국어)" value={form.name_kr} onChange={(v) => update("name_kr", v)} placeholder="식당 이름" />
          <InputField label="식당명 (일본어)" value={form.name_jp} onChange={(v) => update("name_jp", v)} placeholder="店名" />
          <InputField label="카테고리" value={form.category} onChange={(v) => update("category", v)} placeholder="이자카야, 라멘, 스시" />
          <InputField label="주소" value={form.address} onChange={(v) => update("address", v)} placeholder="주소" />
          <InputField label="전화번호" value={form.phone} onChange={(v) => update("phone", v)} placeholder="000-000-0000" />
          <InputField label="Google Maps URL" value={form.google_maps_url} onChange={(v) => update("google_maps_url", v)} placeholder="https://maps.google.com/..." />
        </div>

        {/* 메뉴 */}
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">메뉴</h3>
          <InputField label="메뉴 (한국어)" value={form.menu_kr} onChange={(v) => update("menu_kr", v)} placeholder="추천 메뉴" />
          <InputField label="메뉴 (일본어)" value={form.menu_jp} onChange={(v) => update("menu_jp", v)} placeholder="メニュー" />
          <InputField label="메뉴 가격" value={form.menu_price} onChange={(v) => update("menu_price", v)} placeholder="1000엔~3000엔" />
          <InputField label="가격대" value={form.price_range} onChange={(v) => update("price_range", v)} placeholder="¥1000~¥3000" />
        </div>

        {/* 영업 정보 */}
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">영업 정보</h3>
          <InputField label="영업시간" value={form.hours} onChange={(v) => update("hours", v)} placeholder="11:00~22:00" />
          <InputField label="정기휴일" value={form.closed_days} onChange={(v) => update("closed_days", v)} placeholder="매주 수요일" />
        </div>

        {/* 위치/거리 */}
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">위치/거리</h3>
          <InputField label="거리 (km)" value={form.distance_km} onChange={(v) => update("distance_km", v)} placeholder="1.5" type="text" />
          <InputField label="차량 소요시간 (분)" value={form.drive_minutes} onChange={(v) => update("drive_minutes", v)} placeholder="5" type="text" />
          <InputField label="도보 소요시간 (분)" value={form.walk_minutes} onChange={(v) => update("walk_minutes", v)} placeholder="15" type="text" />
        </div>

        {/* 추가 정보 */}
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">추가 정보</h3>
          <InputField label="설명" value={form.description} onChange={(v) => update("description", v)} placeholder="식당 설명" />
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={form.recommended}
              onChange={(e) => update("recommended", e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-[14px] text-text">추천 식당</span>
          </label>
        </div>

        {/* 연결 정보 */}
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">연결 정보</h3>
          <div className="mb-3">
            <label className="text-[13px] font-medium text-text mb-1 block">연결 유형</label>
            <select
              value={form.near_type}
              onChange={(e) => {
                update("near_type", e.target.value);
                update("near_id", "");
              }}
              className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px] min-h-[40px] focus:outline-none focus:border-primary bg-white"
            >
              <option value="HOTEL">호텔</option>
              <option value="GOLF">골프장</option>
              <option value="AREA">지역</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="text-[13px] font-medium text-text mb-1 block">
              {form.near_type === "HOTEL" ? "호텔" : form.near_type === "GOLF" ? "골프장" : "지역"} 선택
            </label>
            <select
              value={form.near_id}
              onChange={(e) => update("near_id", e.target.value)}
              className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px] min-h-[40px] focus:outline-none focus:border-primary bg-white"
            >
              <option value="">선택하세요</option>
              {nearOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
