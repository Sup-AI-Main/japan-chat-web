"use client";

import { useState, useEffect } from "react";
import { EditModalShell } from "./EditModalShell";
import {
  type DynamicLabelsResult,
  getSectionLabel,
  getFieldLabel,
  isSectionVisible,
  isFieldActive,
  isFieldRequired,
} from "@/lib/dynamic-labels";
import type { HotelFormPayload } from "@/lib/types";

// ---------------------------------------------------------------------------
// Internal form state interface (unchanged)
// ---------------------------------------------------------------------------

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

const EMPTY_HOTEL: HotelData = {
  name_kr: "",
  name_jp: "",
  address_kr: "",
  address_jp: "",
  phone: "",
  google_maps_url: "",
  checkin_time: "",
  checkout_time: "",
  breakfast_place: "",
  breakfast_time: "",
  breakfast_last_entry: "",
  dinner_place: "",
  dinner_time: "",
  dinner_last_entry: "",
  has_public_bath: false,
  has_outdoor_onsen: false,
  has_sauna: false,
  bath_spa_hours: "",
  tattoo_policy: "",
  other_info: "",
  atm_payment: "",
  transport: "",
};

// ---------------------------------------------------------------------------
// Section / field configuration (data-driven)
// ---------------------------------------------------------------------------

interface FieldConfig {
  fieldKey: string;
  formKey: keyof HotelData;
  fallback: string;
  placeholder: string;
  type?: "text" | "checkbox";
}

interface SectionConfig {
  sectionKey: string;
  fallbackTitle: string;
  fields: FieldConfig[];
}

const SECTIONS: SectionConfig[] = [
  {
    sectionKey: "basic_info",
    fallbackTitle: "기본 정보",
    fields: [
      { fieldKey: "name_kr", formKey: "name_kr", fallback: "호텔명 (한국어)", placeholder: "호텔 이름" },
      { fieldKey: "name_jp", formKey: "name_jp", fallback: "호텔명 (일본어)", placeholder: "公式名称" },
      { fieldKey: "address_kr", formKey: "address_kr", fallback: "주소 (한국어)", placeholder: "주소" },
      { fieldKey: "address_jp", formKey: "address_jp", fallback: "주소 (일본어)", placeholder: "住所" },
      { fieldKey: "phone", formKey: "phone", fallback: "전화번호", placeholder: "000-000-0000" },
      { fieldKey: "google_maps_url", formKey: "google_maps_url", fallback: "Google Maps URL", placeholder: "https://maps.google.com/..." },
    ],
  },
  {
    sectionKey: "checkin",
    fallbackTitle: "체크인",
    fields: [
      { fieldKey: "checkin_time", formKey: "checkin_time", fallback: "체크인 시간", placeholder: "15:00" },
    ],
  },
  {
    sectionKey: "checkout",
    fallbackTitle: "체크아웃",
    fields: [
      { fieldKey: "checkout_time", formKey: "checkout_time", fallback: "체크아웃 시간", placeholder: "10:00" },
    ],
  },
  {
    sectionKey: "breakfast",
    fallbackTitle: "조식",
    fields: [
      { fieldKey: "breakfast_place", formKey: "breakfast_place", fallback: "조식 장소", placeholder: "1F 레스토랑" },
      { fieldKey: "breakfast_time", formKey: "breakfast_time", fallback: "조식 시간", placeholder: "7:00~9:30" },
      { fieldKey: "breakfast_last_entry", formKey: "breakfast_last_entry", fallback: "조식 입장 마감", placeholder: "9:00" },
    ],
  },
  {
    sectionKey: "dinner",
    fallbackTitle: "석식",
    fields: [
      { fieldKey: "dinner_place", formKey: "dinner_place", fallback: "석식 장소", placeholder: "1F 레스토랑" },
      { fieldKey: "dinner_time", formKey: "dinner_time", fallback: "석식 시간", placeholder: "18:00~21:00" },
      { fieldKey: "dinner_last_entry", formKey: "dinner_last_entry", fallback: "석식 입장 마감", placeholder: "20:30" },
    ],
  },
  {
    sectionKey: "onsen_spa",
    fallbackTitle: "온천/스파",
    fields: [
      { fieldKey: "has_public_bath", formKey: "has_public_bath", fallback: "대욕장 있음", placeholder: "", type: "checkbox" },
      { fieldKey: "has_outdoor_onsen", formKey: "has_outdoor_onsen", fallback: "노천탕 있음", placeholder: "", type: "checkbox" },
      { fieldKey: "has_sauna", formKey: "has_sauna", fallback: "사우나 있음", placeholder: "", type: "checkbox" },
    ],
  },
  {
    sectionKey: "bath_hours",
    fallbackTitle: "운영시간",
    fields: [
      { fieldKey: "bath_spa_hours", formKey: "bath_spa_hours", fallback: "대욕장/스파 운영시간", placeholder: "15:00~25:00, 6:00~9:00" },
    ],
  },
  {
    sectionKey: "tattoo_policy",
    fallbackTitle: "타투 정책",
    fields: [
      { fieldKey: "tattoo_policy", formKey: "tattoo_policy", fallback: "타투 정책", placeholder: "타투 시 커버 필수" },
    ],
  },
  {
    sectionKey: "other_info",
    fallbackTitle: "기타",
    fields: [
      { fieldKey: "other_info", formKey: "other_info", fallback: "기타 정보", placeholder: "추가 안내사항" },
    ],
  },
  {
    sectionKey: "atm_payment",
    fallbackTitle: "ATM/결제",
    fields: [
      { fieldKey: "atm_payment", formKey: "atm_payment", fallback: "ATM/결제", placeholder: "세븐은행 ATM, 신용카드 가능" },
    ],
  },
  {
    sectionKey: "transport",
    fallbackTitle: "교통",
    fields: [
      { fieldKey: "transport", formKey: "transport", fallback: "교통", placeholder: "공항에서 차량 약60분" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HotelEditModalProps {
  hotel: HotelData | null;
  area: string;
  open: boolean;
  onClose: () => void;
  onSaved: (saved: Record<string, unknown>) => void;
  dynamicLabels?: DynamicLabelsResult;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InputField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[13px] font-medium text-text mb-1 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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

function CheckboxField({
  label,
  required,
  checked,
  onChange,
  className = "",
}: {
  label: string;
  required?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-primary"
      />
      <span className="text-[14px] text-text">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HotelEditModal({
  hotel,
  area,
  open,
  onClose,
  onSaved,
  dynamicLabels,
}: HotelEditModalProps) {
  const L: DynamicLabelsResult = dynamicLabels ?? { sections: [], fieldMap: {} };

  const [form, setForm] = useState<HotelData>(EMPTY_HOTEL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(hotel ? { ...hotel } : { ...EMPTY_HOTEL });
      setError("");
      setSaving(false);
    }
  }, [open, hotel]);

  const update = (key: keyof HotelData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    // Validate required fields
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        if (!isFieldActive(L, field.fieldKey)) continue;
        if (!isFieldRequired(L, field.fieldKey)) continue;
        const value = form[field.formKey];
        if (typeof value === "string" && !value.trim()) {
          const label = getFieldLabel(L, field.fieldKey, field.fallback);
          setError(`${label}은(는) 필수입니다.`);
          setSaving(false);
          return;
        }
      }
    }

    try {
      const isEdit = !!hotel?.id;
      const payload: HotelFormPayload = {
        ...form,
        display_name: form.name_kr,
        address: form.address_kr,
        transport_note: form.transport,
        official_name: form.name_jp,
        id: hotel?.id,
        area: area.toUpperCase(),
      };
      const res = await fetch("/api/admin/hotel", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = "저장에 실패했습니다.";
        try {
          msg = JSON.parse(text).error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const resBody = await res.json();
      const saved = resBody.data?.hotel;
      if (!saved?.id) {
        throw new Error("서버 응답이 올바르지 않습니다 (id 누락).");
      }
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "저장 중 문제가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditModalShell
      open={open}
      title={hotel ? "호텔 수정" : "호텔 추가"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      error={error}
    >
      {SECTIONS.filter((s) => isSectionVisible(L, s.sectionKey)).map(
        (section) => {
          const visibleFields = section.fields.filter((f) =>
            isFieldActive(L, f.fieldKey)
          );
          if (visibleFields.length === 0) return null;

          // Separate checkbox fields from text/input fields
          const checkboxFields = visibleFields.filter(
            (f) => f.type === "checkbox"
          );
          const inputFields = visibleFields.filter(
            (f) => f.type !== "checkbox"
          );

          return (
            <div key={section.sectionKey} className="mb-6">
              <h3 className="text-[15px] font-bold text-text mb-3">
                {getSectionLabel(L, section.sectionKey, section.fallbackTitle)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {checkboxFields.length > 0 && (
                  <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-2">
                    {checkboxFields.map((field) => (
                      <CheckboxField
                        key={field.fieldKey}
                        label={getFieldLabel(
                          L,
                          field.fieldKey,
                          field.fallback
                        )}
                        required={isFieldRequired(L, field.fieldKey)}
                        checked={form[field.formKey] as boolean}
                        onChange={(v) => update(field.formKey, v)}
                      />
                    ))}
                  </div>
                )}
                {inputFields.map((field) => (
                  <InputField
                    key={field.fieldKey}
                    label={getFieldLabel(L, field.fieldKey, field.fallback)}
                    required={isFieldRequired(L, field.fieldKey)}
                    value={form[field.formKey] as string}
                    onChange={(v) => update(field.formKey, v)}
                    placeholder={field.placeholder}
                  />
                ))}
              </div>
            </div>
          );
        }
      )}
    </EditModalShell>
  );
}
