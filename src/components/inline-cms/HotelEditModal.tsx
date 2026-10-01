"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */

import { useState, useEffect, useMemo, useRef } from "react";
import { EditModalShell } from "./EditModalShell";
import { EditableDisplayLabel } from "./EditableDisplayLabel";
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
  updated_at?: string;
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
  fieldKey,
  entityId,
  required,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  fieldKey: string;
  entityId?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <EditableDisplayLabel entityType="HOTEL" entityId={entityId} fieldKey={fieldKey} label={label} />
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
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const initialRef = useRef<HotelData>(EMPTY_HOTEL);
  const requestCloseRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (open) {
      const initial = hotel ? { ...hotel } : { ...EMPTY_HOTEL };
      setForm(initial);
      initialRef.current = initial;
      setError("");
      setConflict(false);
      setSaving(false);
    }
  }, [open, hotel]);

  const isDirty = useMemo(() => {
    const initial = initialRef.current;
    return (Object.keys(EMPTY_HOTEL) as (keyof HotelData)[]).some(
      (key) => (form[key] ?? "") !== (initial[key] ?? "")
    );
  }, [form]);

  const update = (key: keyof HotelData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setConflict(false);

    // Validate required fields
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        if (!isFieldActive(L, field.fieldKey)) continue;
        if (!isFieldRequired(L, field.fieldKey)) continue;
        const value = form[field.formKey] ?? "";
        if (!(value as string).trim()) {
          const label = getFieldLabel(L, field.fieldKey, field.fallback);
          setError(`${label}은(는) 필수입니다.`);
          savingRef.current = false;
          setSaving(false);
          return false;
        }
      }
    }

    try {
      const isEdit = !!hotel?.id;
      const payload: HotelFormPayload = {
        ...form,
        display_name: form.name_kr,
        address: form.address_kr,
        official_name: form.name_jp,
        id: hotel?.id,
        updated_at: form?.updated_at || undefined,
        area: area.toUpperCase(),
      };
      const res = await fetch("/api/admin/hotel", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setConflict(true);
        setSaving(false);
        return false;
      }

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
      initialRef.current = { ...form };
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "저장 중 문제가 발생했습니다."
      );
      return false;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleReloadCanonical = async () => {
    if (!hotel?.id) return;
    try {
      const res = await fetch(`/api/admin/manage-entities/${hotel.id}`);
      if (!res.ok) throw new Error("Failed to reload");
      const data = await res.json();
      const ent = data.data?.entity;
      const h = data.data?.hotel;
      if (ent || h) {
        const canonical: HotelData = {
          id: hotel.id,
          updated_at: ent?.updated_at ?? hotel.updated_at,
          name_kr: ent?.display_name ?? hotel.name_kr,
          name_jp: h?.official_name ?? hotel.name_jp,
          address_kr: h?.address ?? hotel.address_kr,
          address_jp: h?.address_jp ?? hotel.address_jp,
          phone: h?.phone ?? hotel.phone,
          google_maps_url: h?.google_maps_url ?? hotel.google_maps_url,
        };
        setForm(canonical);
        initialRef.current = { ...canonical };
        setConflict(false);
        setError("");
      }
    } catch {
      setError("최신 데이터를 불러오지 못했습니다. 페이지를 새로고침하세요.");
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
      isDirty={isDirty}
      requestCloseRef={requestCloseRef}
    >
      {conflict && (
        <div className="bg-amber-50 border border-amber-300 rounded-[8px] p-4 mb-4">
          <p className="text-[14px] font-semibold text-amber-800 mb-2">
            ⚠️ 데이터 충돌 감지
          </p>
          <p className="text-[13px] text-amber-700 mb-3">
            다른 관리자가 이미 이 데이터를 수정했습니다. 최신 데이터를 불러온 후 다시 시도하세요.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReloadCanonical}
              className="px-4 py-2 text-[13px] text-white bg-amber-600 rounded-[8px] hover:bg-amber-700"
            >
              최신 데이터 불러오기
            </button>
            <button
              type="button"
              onClick={() => requestCloseRef.current?.()}
              className="px-4 py-2 text-[13px] text-muted border border-border rounded-[8px] hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      )}
      {SECTIONS.filter((s) => isSectionVisible(L, s.sectionKey)).map(
        (section) => {
          const visibleFields = section.fields.filter((f) =>
            isFieldActive(L, f.fieldKey)
          );
          if (visibleFields.length === 0) return null;

          return (
            <div key={section.sectionKey} className="mb-6">
              <h3 className="text-[15px] font-bold text-text mb-3">
                <EditableDisplayLabel entityType="HOTEL" entityId={hotel?.id} sectionKey={section.sectionKey} label={getSectionLabel(L, section.sectionKey, section.fallbackTitle)} />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {visibleFields.map((field) => (
                  <InputField
                    key={field.fieldKey}
                    fieldKey={field.fieldKey}
                    entityId={hotel?.id}
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
