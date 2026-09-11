"use client";

import { useState } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast } from "@/components/Toast";

interface Item {
  id: string;
  type: string;
  text_kr: string;
  text_jp: string | null;
  sort: number;
  is_visible: boolean;
}

interface Props {
  entityId: string;
  initialItems: Item[];
  onUpdate: () => void;
}

export default function IncludesExcludesEditor({ entityId, initialItems, onUpdate }: Props) {
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<"INCLUDED" | "EXCLUDED">("INCLUDED");
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { showToast } = useToast();

  async function handleAdd() {
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const res = await adminFetchJson<{ success: boolean; data: Item }>("/api/admin/includes", {
        method: "POST",
        body: JSON.stringify({
          parent_entity_id: entityId,
          type: newType,
          text_kr: newText,
          sort: items.length,
        }),
      });
      setItems((prev) => [...prev, res.data]);
      setNewText("");
      showToast(`${newType === "INCLUDED" ? "포함" : "불포함"} 사항이 추가되었습니다`);
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      await adminFetchJson("/api/admin/includes", {
        method: "PUT",
        body: JSON.stringify({ id, text_kr: editText }),
      });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text_kr: editText } : i)));
      setEditingId(null);
      showToast("수정되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "수정 실패");
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminFetchJson(`/api/admin/includes?id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast("삭제되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  const includes = items.filter((i) => i.type === "INCLUDED");
  const excludes = items.filter((i) => i.type === "EXCLUDED");

  return (
    <div>
      {/* List */}
      {["INCLUDED", "EXCLUDED"].map((type) => {
        const list = type === "INCLUDED" ? includes : excludes;
        return (
          <div key={type} className="mb-4 last:mb-0">
            <h4 className="text-[12px] font-bold text-muted mb-2">
              {type === "INCLUDED" ? "✅ 포함사항" : "❌ 불포함사항"} ({list.length})
            </h4>
            {list.length === 0 ? (
              <p className="text-[12px] text-muted mb-2">없음</p>
            ) : (
              <div className="space-y-1 mb-2">
                {list.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-1.5">
                    {editingId === item.id ? (
                      <>
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 px-2 py-1 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(item.id); if (e.key === "Escape") setEditingId(null); }}
                        />
                        <button onClick={() => handleUpdate(item.id)} className="text-[12px] text-primary">저장</button>
                        <button onClick={() => setEditingId(null)} className="text-[12px] text-muted">취소</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-[13px] text-text">{item.text_kr}</span>
                        <button
                          onClick={() => { setEditingId(item.id); setEditText(item.text_kr); }}
                          className="text-[12px] text-primary hover:underline"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-[12px] text-danger hover:underline"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Add form */}
      <div className="border-t border-border pt-3 mt-3">
        <div className="flex gap-2 items-end">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as "INCLUDED" | "EXCLUDED")}
            className="px-2 py-2 text-[13px] border border-border rounded-[8px] bg-white"
          >
            <option value="INCLUDED">포함</option>
            <option value="EXCLUDED">불포함</option>
          </select>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="새 항목 입력..."
            className="flex-1 px-3 py-2 text-[13px] border border-border rounded-[8px] focus:outline-none focus:border-primary"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newText.trim()}
            className="px-3 py-2 text-[13px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[36px] disabled:opacity-50"
          >
            {adding ? "추가 중..." : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
