"use client";

import { useState, useEffect } from "react";
import { EditModalShell } from "./EditModalShell";
import {
  DynamicLabelsResult,
  getSectionLabel,
  getFieldLabel,
  isSectionVisible,
  isFieldActive,
  isFieldRequired,
} from "@/lib/dynamic-labels";

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
  onSaved: (saved: Record<string, unknown>) => void;
  nearOptions: NearOption[];
  dynamicLabels?: DynamicLabelsResult;
}

// ---------------------------------------------------------------------------
// Data-driven section/field config
// ---------------------------------------------------------------------------

const SECTIONS = [
  {
    sectionKey: "basic_info",
    fallbackTitle: "기본 정보",
    fields: [
      { fieldKey: "name", formKey: "name_kr" as const, fallback: "식당명 (한국어)", placeholder: "식당 이름" },
      { fieldKey: "rest_name_jp", formKey: "name_jp" as const, fallback: "식당명 (일본어)", placeholder: "店名" },
      { fieldKey: "category", formKey: "category" as const, fallback: "카테고리", placeholder: "이자카야, 라멘, 스시" },
      { fieldKey: "phone", formKey: "phone" as const, fallback: "전화번호", placeholder: "000-000-0000" },
    ],
  },
  {
    sectionKey: "address",
    fallbackTitle: "주소",
    fields: [
      { fieldKey: "address", formKey: "address" as const, fallback: "주소", placeholder: "주소" },
      { fieldKey: "google_maps_url", formKey: "google_maps_url" as const, fallback: "Google Maps URL", placeholder: "https://maps.google.com/..." },
    ],
  },
  {
    sectionKey: "menu",
    fallbackTitle: "메뉴",
    fields: [
      { fieldKey: "menu_kr", formKey: "menu_kr" as const, fallback: "메뉴 (한국어)", placeholder: "추천 메뉴" },
      { fieldKey: "menu_jp", formKey: "menu_jp" as const, fallback: "메뉴 (일본어)", placeholder: "メニュー" },
      { fieldKey: "menu_price", formKey: "menu_price" as const, fallback: "메뉴 가격", placeholder: "1000엔~3000엔" },
    ],
  },
  {
    sectionKey: "price_range",
    fallbackTitle: "가격대",
    fields: [
      { fieldKey: "price_range", formKey: "price_range" as const, fallback: "가격대", placeholder: "¥1000~¥3000" },
    ],
  },
  {
    sectionKey: "hours",
    fallbackTitle: "영업시간",
    fields: [
      { fieldKey: "hours", formKey: "hours" as const, fallback: "영업시간", placeholder: "11:00~22:00" },
    ],
  },
  {
    sectionKey: "closed_days",
    fallbackTitle: "휴무일",
    fields: [
      { fieldKey: "closed_days", formKey: "closed_days" as const, fallback: "정기휴일", placeholder: "매주 수요일" },
    ],
  },
  {
    sectionKey: "other_info",
    fallbackTitle: "추가 정보",
    fields: [
      { fieldKey: "description", formKey: "description" as const, fallback: "설명", placeholder: "식당 설명", className: "md:col-span-2" },
    ],
    hasRecommended: true,
  },
] as const;

// Sections always visible (no DB filtering)
const DISTANCE_SECTION = {
  sectionKey: "distance",
  fallbackTitle: "위치/거리",
  fields: [
    { fieldKey: "distance_km", formKey: "distance_km" as const, fallback: "거리 (km)", placeholder: "1.5" },
    { fieldKey: "drive_minutes", formKey: "drive_minutes" as const, fallback: "차량 소요시간 (분)", placeholder: "5" },
    { fieldKey: "walk_minutes", formKey: "walk_minutes" as const, fallback: "도보 소요시간 (분)", placeholder: "15" },
  ],
};

const NEARBY_SECTION = {
  sectionKey: "nearby_restaurants",
  fallbackTitle: "연결 정보",
};

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RestaurantEditModal({
  restaurant,
  area,
  open,
  onClose,
  onSaved,
  nearOptions,
  dynamicLabels,
}: RestaurantEditModalProps) {
  const L: DynamicLabelsResult = dynamicLabels ?? { sections: [], fieldMap: {} };
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
    setError("");

    // Validate required fields
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        if (!isFieldActive(L, field.fieldKey)) continue;
        if (!isFieldRequired(L, field.fieldKey)) continue;
        const val = form[field.formKey as keyof RestaurantData];
        if (typeof val === "string" && val.trim() === "") {
          const label = getFieldLabel(L, field.fieldKey, field.fallback);
          setError(`"${label}" 항목은 필수입니다.`);
          return;
        }
      }
    }

    setSaving(true);

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
        const text = await res.text();
        let msg = "저장에 실패했습니다.";
        try { msg = JSON.parse(text).error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const resBody = await res.json();
      const saved = resBody.data?.restaurant;
      if (!saved?.id || !saved?.slug) {
        throw new Error("서버 응답이 올바르지 않습니다 (id/slug 누락).");
      }
      if (typeof saved.recommended === 'boolean') {
        saved.recommended = saved.recommended ? 'TRUE' : 'FALSE';
      }
      if (!saved.name && saved.name_kr) saved.name = saved.name_kr;
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditModalShell
      open={open}
      title={restaurant ? "식당 수정" : "식당 추가"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      error={error}
    >
      {/* Standard sections (dynamic labels, visibility, active filtering) */}
      {SECTIONS.map((section) => {
        if (!isSectionVisible(L, section.sectionKey)) return null;

        const visibleFields = section.fields.filter((f) => isFieldActive(L, f.fieldKey));
        if (visibleFields.length === 0 && !("hasRecommended" in section && section.hasRecommended)) return null;

        const recommendedActive = "hasRecommended" in section && section.hasRecommended
          ? isFieldActive(L, "recommended")
          : false;

        return (
          <div key={section.sectionKey} className="mb-6">
            <h3 className="text-[15px] font-bold text-text mb-3">
              {getSectionLabel(L, section.sectionKey, section.fallbackTitle)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              {visibleFields.map((field) => (
                <InputField
                  key={field.fieldKey}
                  className={"className" in field ? (field as { className?: string }).className : undefined}
                  label={
                    getFieldLabel(L, field.fieldKey, field.fallback) +
                    (isFieldRequired(L, field.fieldKey) ? " *" : "")
                  }
                  value={form[field.formKey as keyof RestaurantData] as string}
                  onChange={(v) => update(field.formKey as keyof RestaurantData, v)}
                  placeholder={field.placeholder}
                />
              ))}
            </div>
            {recommendedActive && (
              <label className="flex items-center gap-2 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={form.recommended}
                  onChange={(e) => update("recommended", e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-[14px] text-text">
                  {getFieldLabel(L, "recommended", "추천 식당")}
                  {isFieldRequired(L, "recommended") ? " *" : ""}
                </span>
              </label>
            )}
          </div>
        );
      })}

      {/* Distance section */}
      {isSectionVisible(L, DISTANCE_SECTION.sectionKey) && (() => {
        const distFields = DISTANCE_SECTION.fields.filter((f) => isFieldActive(L, f.fieldKey));
        if (distFields.length === 0) return null;
        return (
          <div className="mb-6">
            <h3 className="text-[15px] font-bold text-text mb-3">
              {getSectionLabel(L, DISTANCE_SECTION.sectionKey, DISTANCE_SECTION.fallbackTitle)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              {distFields.map((field) => (
                <InputField
                  key={field.fieldKey}
                  label={
                    getFieldLabel(L, field.fieldKey, field.fallback) +
                    (isFieldRequired(L, field.fieldKey) ? " *" : "")
                  }
                  value={form[field.formKey as keyof RestaurantData] as string}
                  onChange={(v) => update(field.formKey as keyof RestaurantData, v)}
                  placeholder={field.placeholder}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Connection info section */}
      {isSectionVisible(L, NEARBY_SECTION.sectionKey) && (isFieldActive(L, "near_type") || isFieldActive(L, "near_id")) && (
        <div className="mb-2">
          <h3 className="text-[15px] font-bold text-text mb-3">
            {getSectionLabel(L, NEARBY_SECTION.sectionKey, NEARBY_SECTION.fallbackTitle)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
            {isFieldActive(L, "near_type") && (
              <div>
                <label className="text-[13px] font-medium text-text mb-1 block">
                  {getFieldLabel(L, "near_type", "연결 유형")}
                  {isFieldRequired(L, "near_type") ? " *" : ""}
                </label>
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
            )}
            {isFieldActive(L, "near_id") && (
              <div>
                <label className="text-[13px] font-medium text-text mb-1 block">
                  {form.near_type === "HOTEL" ? "호텔" : form.near_type === "GOLF" ? "골프장" : "지역"} 선택
                  {isFieldRequired(L, "near_id") ? " *" : ""}
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
            )}
          </div>
        </div>
      )}
    </EditModalShell>
  );
}
