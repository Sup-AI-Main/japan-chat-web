"use client";

import { useState, useEffect, useCallback } from "react";
import type { IncludeExclude } from "@/lib/types";
import { useAdmin } from "@/hooks/use-admin";
import { AddButton } from "./EditToolbar";

interface IncludeExcludeSectionProps {
  parentType: "HOTEL" | "GOLF";
  parentId: string;
}

interface ItemFormData {
  type: "INCLUDED" | "EXCLUDED";
  text_kr: string;
  text_jp: string;
  sort_order: string;
  is_visible: string;
}

const emptyForm: ItemFormData = {
  type: "INCLUDED",
  text_kr: "",
  text_jp: "",
  sort_order: "99",
  is_visible: "TRUE",
};

export function IncludeExcludeSection({ parentType, parentId }: IncludeExcludeSectionProps) {
  const isAdmin = useAdmin();
  const [items, setItems] = useState<IncludeExclude[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editItem, setEditItem] = useState<IncludeExclude | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ItemFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IncludeExclude | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/includes?parent_type=${parentType}&parent_id=${parentId}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // silent
    } finally {
      setLoaded(true);
    }
  }, [parentType, parentId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const included = items.filter((i) => i.type === "INCLUDED" && i.is_visible === "TRUE");
  const excluded = items.filter((i) => i.type === "EXCLUDED" && i.is_visible === "TRUE");

  const handleAdd = (type: "INCLUDED" | "EXCLUDED") => {
    setEditItem(null);
    setFormData({ ...emptyForm, type });
    setShowForm(true);
  };

  const handleEdit = (item: IncludeExclude) => {
    setEditItem(item);
    setFormData({
      type: item.type as "INCLUDED" | "EXCLUDED",
      text_kr: item.text_kr,
      text_jp: item.text_jp,
      sort_order: String(item.sort_order),
      is_visible: item.is_visible,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        parent_type: parentType,
        parent_id: parentId,
        type: formData.type,
        text_kr: formData.text_kr,
        text_jp: formData.text_jp,
        sort_order: formData.sort_order,
        is_visible: formData.is_visible,
      };

      if (editItem) {
        const res = await fetch("/api/admin/includes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editItem.id, ...body }),
        });
        if (res.ok) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === editItem.id ? { ...i, ...body, sort_order: parseInt(body.sort_order) || 99 } : i
            )
          );
        }
      } else {
        const res = await fetch("/api/admin/includes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setItems((prev) => [
            ...prev,
            { ...body, id: data.id, sort_order: parseInt(body.sort_order) || 99, updated_at: "" },
          ]);
        }
      }
      setShowForm(false);
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/includes?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch {
      // silent
    }
  };

  const handleToggleVisibility = async (item: IncludeExclude) => {
    const newVisible = item.is_visible === "TRUE" ? "FALSE" : "TRUE";
    try {
      const res = await fetch("/api/admin/includes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_visible: newVisible }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_visible: newVisible } : i))
        );
      }
    } catch {
      // silent
    }
  };

  if (!loaded) return null;

  const hasIncluded = included.length > 0;
  const hasExcluded = excluded.length > 0;
  if (!hasIncluded && !hasExcluded && !isAdmin) return null;

  return (
    <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
      {/* Included */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[15px] font-bold text-text">포함사항</h3>
          <AddButton onClick={() => handleAdd("INCLUDED")} label="추가" />
        </div>
        {included.length > 0 ? (
          <ul className="space-y-1.5">
            {included.map((item) => (
              <li key={item.id} className="flex items-start justify-between group">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 text-[14px] mt-0.5">✓</span>
                  <div>
                    <span className="text-[15px] text-text">{item.text_kr}</span>
                    {item.text_jp && (
                      <p className="text-[13px] text-muted">{item.text_jp}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleVisibility(item)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[11px]"
                      title={item.is_visible === "TRUE" ? "숨기기" : "표시"}
                    >
                      {item.is_visible === "TRUE" ? "👁" : "👁‍🗨"}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[11px]"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[11px]"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          isAdmin && <p className="text-[13px] text-muted">포함사항이 없습니다.</p>
        )}
      </div>

      {/* Excluded */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[15px] font-bold text-text">불포함사항</h3>
          <AddButton onClick={() => handleAdd("EXCLUDED")} label="추가" />
        </div>
        {excluded.length > 0 ? (
          <ul className="space-y-1.5">
            {excluded.map((item) => (
              <li key={item.id} className="flex items-start justify-between group">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-[14px] mt-0.5">✗</span>
                  <div>
                    <span className="text-[15px] text-text">{item.text_kr}</span>
                    {item.text_jp && (
                      <p className="text-[13px] text-muted">{item.text_jp}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleVisibility(item)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[11px]"
                      title={item.is_visible === "TRUE" ? "숨기기" : "표시"}
                    >
                      {item.is_visible === "TRUE" ? "👁" : "👁‍🗨"}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[11px]"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[11px]"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          isAdmin && <p className="text-[13px] text-muted">불포함사항이 없습니다.</p>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-[16px] w-full max-w-[480px] p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[18px] font-bold text-text mb-4">
              {editItem ? "항목 수정" : "항목 추가"} ({formData.type === "INCLUDED" ? "포함" : "불포함"})
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[13px] text-muted block mb-1">한국어 *</label>
                <input
                  value={formData.text_kr}
                  onChange={(e) => setFormData({ ...formData, text_kr: e.target.value })}
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-[15px]"
                  placeholder="조식 포함"
                />
              </div>
              <div>
                <label className="text-[13px] text-muted block mb-1">일본어</label>
                <input
                  value={formData.text_jp}
                  onChange={(e) => setFormData({ ...formData, text_jp: e.target.value })}
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-[15px]"
                  placeholder="朝食付き"
                />
              </div>
              <div>
                <label className="text-[13px] text-muted block mb-1">순서</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-[15px]"
                />
              </div>
              <div>
                <label className="text-[13px] text-muted block mb-1">유형</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as "INCLUDED" | "EXCLUDED" })
                  }
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-[15px]"
                >
                  <option value="INCLUDED">포함사항</option>
                  <option value="EXCLUDED">불포함사항</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setShowForm(false); setEditItem(null); }}
                className="flex-1 border border-border rounded-[10px] py-3 text-[15px] font-medium text-text"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.text_kr.trim()}
                className="flex-1 bg-primary text-white rounded-[10px] py-3 text-[15px] font-medium disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-[16px] w-full max-w-[360px] p-5">
            <h3 className="text-[18px] font-bold text-text mb-2">삭제 확인</h3>
            <p className="text-[15px] text-text mb-4">
              &quot;{deleteTarget.text_kr}&quot; 항목을 삭제하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-border rounded-[10px] py-3 text-[15px] font-medium text-text"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white rounded-[10px] py-3 text-[15px] font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** CTA 위에 표시하는 요약 컴포넌트 */
export function IncludeExcludeSummary({ parentType, parentId }: IncludeExcludeSectionProps) {
  const [items, setItems] = useState<IncludeExclude[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/includes?parent_type=${parentType}&parent_id=${parentId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [parentType, parentId]);

  if (!loaded) return null;

  const included = items.filter((i) => i.type === "INCLUDED" && i.is_visible === "TRUE");
  const excluded = items.filter((i) => i.type === "EXCLUDED" && i.is_visible === "TRUE");

  if (included.length === 0 && excluded.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
      <h3 className="text-[15px] font-bold text-text mb-2">예약 전 확인</h3>
      {included.length > 0 && (
        <p className="text-[14px] text-text">
          <span className="text-green-600 font-medium">포함:</span>{" "}
          {included.map((i) => i.text_kr).join(" · ")}
        </p>
      )}
      {excluded.length > 0 && (
        <p className="text-[14px] text-text mt-1">
          <span className="text-red-500 font-medium">불포함:</span>{" "}
          {excluded.map((i) => i.text_kr).join(" · ")}
        </p>
      )}
    </div>
  );
}
