"use client";

import { useState } from "react";

export function EditableDisplayLabel({
  entityType,
  entityId,
  fieldKey,
  sectionKey,
  label,
}: {
  entityType: "GOLF" | "HOTEL" | "RESTAURANT";
  entityId?: string;
  fieldKey?: string;
  sectionKey?: string;
  label: string;
}) {
  const [value, setValue] = useState(label.replace(/\s+\*$/, ""));

  async function save() {
    const next = value.trim();
    if (!entityId || next === label.replace(/\s+\*$/, "")) return;
    await fetch("/api/admin/display-labels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, field_key: fieldKey, section_key: sectionKey, label_ko: next }),
    });
  }

  async function clearOverride() {
    if (!entityId) return;
    setValue("");
    await fetch("/api/admin/display-labels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, field_key: fieldKey, section_key: sectionKey, label_ko: "" }),
    });
  }

  return (
    <div className="flex items-center gap-1 mb-1">
    <input
      aria-label={`${fieldKey ?? sectionKey} 라벨`}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => void save()}
      className="min-w-0 flex-1 border border-border rounded-[6px] px-2 py-1 text-[12px] font-medium text-text focus:outline-none focus:border-primary"
    />
    {entityId && value && <button type="button" onClick={() => void clearOverride()} className="shrink-0 text-danger px-1" aria-label="기본 라벨로 되돌리기" title="기본 라벨로 되돌리기">×</button>}
    </div>
  );
}
