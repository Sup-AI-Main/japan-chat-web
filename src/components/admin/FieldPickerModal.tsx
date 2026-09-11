"use client";

import { useState, useEffect, useMemo } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";

interface FieldDef {
  id: string;
  field_key: string;
  label_ko: string;
  field_type: string;
  icon: string | null;
  scope_type: string;
  active: boolean;
  sort: number;
}

interface Props {
  entityId: string;
  entity: { id: string; area_id: string; category_id: string | null; entity_type: string } | null;
  existingFieldIds: string[];
  onAdd: () => void;
  onClose: () => void;
}

export default function FieldPickerModal({ entityId, entity, existingFieldIds, onAdd, onClose }: Props) {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminFetchJson<{ success: boolean; data: FieldDef[] }>("/api/admin/field-definitions");
        setFields(res.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const applicable = useMemo(() => {
    if (!entity) return fields.filter((f) => f.scope_type === "GLOBAL");
    return fields.filter((f) => {
      if (!f.active) return false;
      if (existingFieldIds.includes(f.id)) return false;
      // GLOBAL: always applicable
      if (f.scope_type === "GLOBAL") return true;
      // ITEM: only if scope_entity_id matches
      if (f.scope_type === "ITEM") return false; // ITEM fields are entity-specific, skip in picker
      // AREA: if scope_area_id matches entity's area
      if (f.scope_type === "AREA") return f.scope_area_id === entity.area_id;
      // CATEGORY: if scope_category_id matches entity's category
      if (f.scope_type === "CATEGORY") return f.scope_category_id === entity.category_id;
      // ENTITY_TYPE: if scope_entity_type matches
      if (f.scope_type === "ENTITY_TYPE") return f.scope_entity_type?.toUpperCase() === entity.entity_type;
      return false;
    });
  }, [fields, entity, existingFieldIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return applicable;
    const q = search.toLowerCase();
    return applicable.filter((f) => f.label_ko.toLowerCase().includes(q) || f.field_key.toLowerCase().includes(q));
  }, [applicable, search]);

  async function handleAdd(fieldId: string) {
    setAdding(fieldId);
    try {
      await adminFetchJson("/api/admin/entity-field-values", {
        method: "POST",
        body: JSON.stringify({ entity_id: entityId, field_definition_id: fieldId, value_text: null }),
      });
      onAdd();
    } catch {
      // ignore
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[12px] p-6 max-w-[500px] w-[92%] shadow-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-bold text-text mb-4">기존 필드 추가</h3>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="필드 검색..."
          className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary mb-3"
          autoFocus
        />

        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] text-muted text-center py-8">
              {search ? "검색 결과가 없습니다." : "추가 가능한 필드가 없습니다."}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-[8px] hover:bg-gray-50"
                >
                  <div>
                    <span className="text-[14px] text-text">
                      {f.icon && <span className="mr-1">{f.icon}</span>}
                      {f.label_ko}
                    </span>
                    <span className="text-[11px] text-muted ml-2">
                      {f.field_type} · {f.scope_type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdd(f.id)}
                    disabled={adding === f.id}
                    className="px-3 py-1 text-[12px] text-primary border border-primary rounded-[6px] hover:bg-primary-soft min-h-[32px] disabled:opacity-50"
                  >
                    {adding === f.id ? "추가 중..." : "추가"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
