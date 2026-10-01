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

  return (
    <input
      aria-label={`${fieldKey ?? sectionKey} 라벨`}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => void save()}
      className="w-full border border-border rounded-[6px] px-2 py-1 text-[12px] font-medium text-text mb-1 focus:outline-none focus:border-primary"
    />
  );
}
