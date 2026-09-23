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
// Core-only form state — relational core fields only
// Variable details (checkin, breakfast, dinner, booleans, etc.) are now
// managed via EntityDetailsEditor (세부사항 수정).
// ---------------------------------------------------------------------------

interface HotelData {
  id?: string;
  name_kr: string;
  name_jp: string;
  address_kr: string;
  address_jp: string;
  phone: string;
  google_maps_url: string;
}

const EMPTY_HOTEL: HotelData = {
  name_kr: "",
  name_jp: "",
  address_kr: "",
  address_jp: "",
  phone: "",
  google_maps_url: "",
};

// ---------------------------------------------------------------------------
// Section / field configuration (core only)
// ---------------------------------------------------------------------------

interface FieldConfig {
  fieldKey: string;
  formKey: keyof HotelData;
  fallback: string;
  placeholder: string;
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
  className = "",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[13px] font-medium text-text mb-1 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type="text"
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

  const update = (key: keyof HotelData, value: string) => {
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
        const value = form[field.formKey] ?? "";
        if (!(value as string).trim()) {
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
        transport_note: "",
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
      title={hotel ? "기본정보 수정" : "호텔 추가"}
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

          return (
            <div key={section.sectionKey} className="mb-6">
              <h3 className="text-[15px] font-bold text-text mb-3">
                {getSectionLabel(L, section.sectionKey, section.fallbackTitle)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {visibleFields.map((field) => (
                  <InputField
                    key={field.fieldKey}
                    label={getFieldLabel(L, field.fieldKey, field.fallback)}
                    required={isFieldRequired(L, field.fieldKey)}
                    value={(form[field.formKey] as string) ?? ""}
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
