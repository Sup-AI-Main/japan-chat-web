"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
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
import type { EntityDetailsDocumentV1, EntityDetailsItem } from "@/lib/entity-details/types";

interface GolfData {
  id?: string;
  display_name: string;
  official_name: string;
  address: string;
  phone: string;
  course_summary: string;
  play_cart: string;
  clubhouse_dining: string;
  bath_shower: string;
  rental: string;
  dress_code: string;
  google_maps_url: string;
  details_json?: EntityDetailsDocumentV1 | null;
}

const EMPTY_GOLF: GolfData = {
  display_name: "",
  official_name: "",
  address: "",
  phone: "",
  course_summary: "",
  play_cart: "",
  clubhouse_dining: "",
  bath_shower: "",
  rental: "",
  dress_code: "",
  google_maps_url: "",
  details_json: null,
};

interface CustomGolfField { id: string; label: string; value: string; }

function readCustomFields(document?: EntityDetailsDocumentV1 | null): CustomGolfField[] {
  const section = document?.sections.find((item) => item.key === "custom_golf_fields");
  return (section?.items ?? []).map((item, index) => ({
    // Custom keys are intentionally local to this entity. Re-number them so
    // legacy/missing keys and deleted rows can never create duplicate React
    // keys or duplicate JSON item ids.
    id: `label-${index + 1}`,
    label: item.label_ko || "",
    value: typeof item.value === "string" ? item.value : String(item.value ?? ""),
  }));
}

function toCustomDetails(fields: CustomGolfField[], currentDocument?: EntityDetailsDocumentV1 | null): EntityDetailsDocumentV1 | null {
  const items: EntityDetailsItem[] = fields
    .filter((field) => field.label.trim() || field.value.trim())
    .map((field, index) => {
      const key = `label-${index + 1}`;
      return { id: key, key, label_ko: field.label.trim(), type: "textarea", value: field.value, sort: index + 1, is_visible: true };
    });
  const existingSections = (currentDocument?.sections ?? []).filter(
    (section) => section.key !== "custom_golf_fields",
  );
  const sections = items.length
    ? [...existingSections, { id: "custom-golf-fields", key: "custom_golf_fields", title_ko: "추가 정보", sort: existingSections.length + 1, is_visible: true, items }]
    : existingSections;
  return sections.length ? { version: 1, sections } : null;
}

const SECTIONS = [
  {
    sectionKey: "basic_info",
    fallbackTitle: "기본 정보",
    fields: [
      { fieldKey: "display_name", formKey: "display_name" as const, fallback: "표시명", placeholder: "골프장 표시 이름" },
      { fieldKey: "official_name", formKey: "official_name" as const, fallback: "공식명", placeholder: "골프장 공식 이름" },
      { fieldKey: "address", formKey: "address" as const, fallback: "주소", placeholder: "주소" },
      { fieldKey: "phone", formKey: "phone" as const, fallback: "전화번호", placeholder: "000-000-0000" },
      { fieldKey: "google_maps_url", formKey: "google_maps_url" as const, fallback: "Google Maps URL", placeholder: "https://maps.google.com/..." },
    ],
  },
  {
    sectionKey: "description",
    fallbackTitle: "코스 정보",
    fields: [
      { fieldKey: "course_summary", formKey: "course_summary" as const, fallback: "코스 안내", placeholder: "코스 요약" },
    ],
  },
  {
    sectionKey: "play_cart",
    fallbackTitle: "플레이/카트",
    fields: [
      { fieldKey: "play_cart", formKey: "play_cart" as const, fallback: "플레이/카트", placeholder: "카트 필수, 전동카트" },
    ],
  },
  {
    sectionKey: "clubhouse",
    fallbackTitle: "클럽하우스 식사",
    fields: [
      { fieldKey: "clubhouse_dining", formKey: "clubhouse_dining" as const, fallback: "클럽하우스 식사", placeholder: "식사 가능" },
    ],
  },
  {
    sectionKey: "bath_shower",
    fallbackTitle: "목욕/샤워",
    fields: [
      { fieldKey: "bath_shower", formKey: "bath_shower" as const, fallback: "목욕/샤워", placeholder: "샤워실 있음" },
    ],
  },
  {
    sectionKey: "rental",
    fallbackTitle: "렌탈 골프채",
    fields: [
      { fieldKey: "rental", formKey: "rental" as const, fallback: "렌탈 골프채", placeholder: "클럽 렌탈 가능" },
    ],
  },
  {
    sectionKey: "dress_code",
    fallbackTitle: "복장",
    fields: [
      { fieldKey: "dress_code", formKey: "dress_code" as const, fallback: "복장 규정", placeholder: "collar 있는 셔츠 필수" },
    ],
  },
];

interface GolfEditModalProps {
  golf: GolfData | null;
  area: string;
  open: boolean;
  onClose: () => void;
  onSaved: (saved: Record<string, unknown>) => void;
  dynamicLabels?: DynamicLabelsResult;
}

function InputField({
  label,
  fieldKey,
  entityId,
  value,
  onChange,
  placeholder,
  className = "",
  hideLabel = false,
}: {
  label: string;
  fieldKey: string;
  entityId?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  hideLabel?: boolean;
}) {
  return (
    <div className={className}>
      {!hideLabel && (
        <EditableDisplayLabel entityType="GOLF" entityId={entityId} fieldKey={fieldKey} label={label} />
      )}
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

export function GolfEditModal({ golf, area, open, onClose, onSaved, dynamicLabels }: GolfEditModalProps) {
  const L: DynamicLabelsResult = dynamicLabels ?? { sections: [], fieldMap: {} };

  const [form, setForm] = useState<GolfData>(EMPTY_GOLF);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customFields, setCustomFields] = useState<CustomGolfField[]>([]);

  useEffect(() => {
    if (open) {
      setForm(golf ? { ...golf } : { ...EMPTY_GOLF });
      setCustomFields(readCustomFields(golf?.details_json));
      setError("");
      setSaving(false);
    }
  }, [open, golf]);

  const update = (key: keyof GolfData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomField = () => {
    setCustomFields((prev) => {
      const used = new Set(prev.map((field) => field.id));
      let number = 1;
      while (used.has(`label-${number}`)) number += 1;
      return [...prev, { id: `label-${number}`, label: "", value: "" }];
    });
  };

  const handleSave = async () => {
    setError("");

    // Validate required fields
    for (const section of SECTIONS) {
      if (!isSectionVisible(L, section.sectionKey)) continue;
      for (const field of section.fields) {
        if (!isFieldActive(L, field.fieldKey)) continue;
        if (isFieldRequired(L, field.fieldKey)) {
          const value = form[field.formKey];
          if (!value || value.trim() === "") {
            const label = getFieldLabel(L, field.fieldKey, field.fallback);
            setError(`"${label}" 항목은 필수입니다.`);
            return;
          }
        }
      }
    }

    setSaving(true);

    try {
      const isEdit = !!golf?.id;
      const res = await fetch("/api/admin/golf", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          details_json: toCustomDetails(customFields, golf?.details_json),
          id: golf?.id,
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
      const saved = resBody.data?.course;
      if (!saved?.id) {
        throw new Error("서버 응답이 올바르지 않습니다 (id 누락).");
      }
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
      title={golf ? "골프장 수정" : "골프장 추가"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      error={error}
    >
      {SECTIONS.filter((s) => isSectionVisible(L, s.sectionKey)).map((section) => {
        const visibleFields = section.fields.filter((f) => isFieldActive(L, f.fieldKey));
        if (visibleFields.length === 0) return null;
        return (
          <div key={section.sectionKey} className="mb-6">
            <h3 className="text-[15px] font-bold text-text mb-3">
              <EditableDisplayLabel entityType="GOLF" entityId={golf?.id} sectionKey={section.sectionKey} label={getSectionLabel(L, section.sectionKey, section.fallbackTitle)} />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              {visibleFields.map((field) => (
                <InputField
                  key={field.fieldKey}
                  fieldKey={field.fieldKey}
                  entityId={golf?.id}
                  label={getFieldLabel(L, field.fieldKey, field.fallback) + (isFieldRequired(L, field.fieldKey) ? " *" : "")}
                  hideLabel={
                    getFieldLabel(L, field.fieldKey, field.fallback).trim() ===
                    getSectionLabel(L, section.sectionKey, section.fallbackTitle).trim()
                  }
                  value={form[field.formKey]}
                  onChange={(v) => update(field.formKey, v)}
                  placeholder={field.placeholder}
                />
              ))}
            </div>
          </div>
        );
      })}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold text-text">추가 정보</h3>
          <button type="button" onClick={addCustomField} className="text-[13px] text-primary border border-primary rounded px-3 py-1.5">+ 항목 추가</button>
        </div>
        <div className="space-y-3">
          {customFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <input value={field.label} onChange={(event) => setCustomFields((prev) => prev.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} placeholder={`라벨-${index + 1}`} className="w-1/3 border border-border rounded-[8px] px-3 py-2 text-[14px]" />
              <textarea value={field.value} onChange={(event) => setCustomFields((prev) => prev.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} placeholder="값" className="flex-1 border border-border rounded-[8px] px-3 py-2 text-[14px] min-h-[40px]" />
              <button type="button" onClick={() => setCustomFields((prev) => prev.filter((_, i) => i !== index))} className="text-danger px-2 py-2" aria-label="항목 삭제">×</button>
            </div>
          ))}
        </div>
      </div>
    </EditModalShell>
  );
}
