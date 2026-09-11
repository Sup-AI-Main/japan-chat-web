"use client";

import { useState } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast } from "@/components/Toast";

interface Section {
  id: string;
  title: string;
  content: string;
  emoji: string | null;
  sort: number;
  is_visible: boolean;
}

interface Props {
  entityId: string;
  initialSections: Section[];
  onUpdate: () => void;
}

export default function ContentSectionsEditor({ entityId, initialSections, onUpdate }: Props) {
  const [sections, setSections] = useState(initialSections);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", emoji: "", sort: "0" });
  const { showToast } = useToast();

  async function handleAdd() {
    if (!form.title.trim() || !form.content.trim()) {
      showToast("제목과 내용을 입력하세요");
      return;
    }
    setAdding(true);
    try {
      const res = await adminFetchJson<{ success: boolean; data: Section }>("/api/admin/content-sections", {
        method: "POST",
        body: JSON.stringify({
          parent_entity_id: entityId,
          title: form.title,
          content: form.content,
          emoji: form.emoji || null,
          sort: Number(form.sort) || sections.length,
        }),
      });
      setSections((prev) => [...prev, res.data].sort((a, b) => a.sort - b.sort));
      setForm({ title: "", content: "", emoji: "", sort: String(sections.length + 1) });
      showToast("추가 안내가 추가되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      await adminFetchJson("/api/admin/content-sections", {
        method: "PUT",
        body: JSON.stringify({ id, title: form.title, content: form.content, emoji: form.emoji || null, sort: Number(form.sort) }),
      });
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: form.title, content: form.content, emoji: form.emoji || null, sort: Number(form.sort) } : s)).sort((a, b) => a.sort - b.sort));
      setEditingId(null);
      showToast("수정되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "수정 실패");
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminFetchJson(`/api/admin/content-sections?id=${id}`, { method: "DELETE" });
      setSections((prev) => prev.filter((s) => s.id !== id));
      showToast("삭제되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  function startEdit(section: Section) {
    setEditingId(section.id);
    setForm({ title: section.title, content: section.content, emoji: section.emoji ?? "", sort: String(section.sort) });
  }

  return (
    <div>
      {sections.length === 0 ? (
        <p className="text-[13px] text-muted mb-3">추가 안내 섹션이 없습니다.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {sections.map((s) => (
            <div key={s.id} className="border border-border rounded-[8px] p-3">
              {editingId === s.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.emoji}
                      onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                      placeholder="아이콘"
                      className="w-16 px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="제목"
                      className="flex-1 px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      value={form.sort}
                      onChange={(e) => setForm((p) => ({ ...p, sort: e.target.value }))}
                      className="w-16 px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    rows={4}
                    className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-[12px] text-muted px-3 py-1">취소</button>
                    <button onClick={() => handleUpdate(s.id)} className="text-[12px] text-white bg-primary px-3 py-1 rounded-[6px]">저장</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-medium text-text">
                      {s.emoji && <span className="mr-1">{s.emoji}</span>}
                      {s.title}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(s)} className="text-[12px] text-primary hover:underline">수정</button>
                      <button onClick={() => handleDelete(s.id)} className="text-[12px] text-danger hover:underline">삭제</button>
                    </div>
                  </div>
                  <p className="text-[12px] text-muted whitespace-pre-wrap line-clamp-3">{s.content}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="border-t border-border pt-3">
        <h4 className="text-[12px] font-bold text-muted mb-2">새 섹션 추가</h4>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={form.emoji}
              onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
              placeholder="💡"
              className="w-16 px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
            />
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="제목"
              className="flex-1 px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
            />
            <input
              type="number"
              value={form.sort}
              onChange={(e) => setForm((p) => ({ ...p, sort: e.target.value }))}
              placeholder="순서"
              className="w-16 px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
            />
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="내용을 입력하세요..."
            rows={3}
            className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={adding || !form.title.trim() || !form.content.trim()}
              className="px-3 py-2 text-[13px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[36px] disabled:opacity-50"
            >
              {adding ? "추가 중..." : "섹션 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
