"use client";

import { useState } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";

interface Props {
  entityId: string;
  entity: { id: string; area_id: string; category_id: string | null; entity_type: string } | null;
  onCreated: (fieldDefinitionId: string) => void;
  onClose: () => void;
}

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "텍스트" },
  { value: "textarea", label: "긴 텍스트" },
  { value: "number", label: "숫자" },
  { value: "url", label: "URL" },
  { value: "phone", label: "전화번호" },
  { value: "boolean", label: "예/아니오" },
  { value: "select", label: "선택" },
  { value: "multi_select", label: "다중 선택" },
  { value: "date", label: "날짜" },
];

const SCOPE_OPTIONS = [
  { value: "ITEM", label: "현재 항목만" },
  { value: "CATEGORY", label: "현재 카테고리" },
  { value: "AREA", label: "현재 지역" },
  { value: "ENTITY_TYPE", label: "현재 타입" },
  { value: "GLOBAL", label: "전체" },
];

export default function FieldCreateModal({ entityId, entity, onCreated, onClose }: Props) {
  const [form, setForm] = useState({
    label_ko: "",
    field_type: "text",
    icon: "",
    scope_type: "ITEM",
    sort: "0",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label_ko.trim()) {
      setError("필드명을 입력하세요");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        label_ko: form.label_ko,
        field_type: form.field_type,
        icon: form.icon || null,
        scope_type: form.scope_type,
        sort: Number(form.sort),
      };

      // Set scope-specific IDs
      if (entity) {
        if (form.scope_type === "ITEM") {
          payload.scope_entity_id = entity.id;
        } else if (form.scope_type === "CATEGORY" && entity.category_id) {
          payload.scope_category_id = entity.category_id;
        } else if (form.scope_type === "AREA") {
          payload.scope_area_id = entity.area_id;
        } else if (form.scope_type === "ENTITY_TYPE") {
          payload.scope_entity_type = entity.entity_type;
        }
      }

      const res = await adminFetchJson<{ success: boolean; data: { id: string } }>("/api/admin/field-definitions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onCreated(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[12px] p-6 max-w-[480px] w-[92%] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-bold text-text mb-4">새 필드 만들기</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1">필드명 *</label>
            <input
              type="text"
              value={form.label_ko}
              onChange={(e) => setForm((p) => ({ ...p, label_ko: e.target.value }))}
              placeholder="예: 전화번호"
              className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1">필드 타입</label>
              <select
                value={form.field_type}
                onChange={(e) => setForm((p) => ({ ...p, field_type: e.target.value }))}
                className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary bg-white"
              >
                {FIELD_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1">적용 범위</label>
              <select
                value={form.scope_type}
                onChange={(e) => setForm((p) => ({ ...p, scope_type: e.target.value }))}
                className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary bg-white"
              >
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1">아이콘</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                placeholder="예: 📍"
                className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-muted mb-1">순서</label>
              <input
                type="number"
                value={form.sort}
                onChange={(e) => setForm((p) => ({ ...p, sort: e.target.value }))}
                className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
            >
              {saving ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
