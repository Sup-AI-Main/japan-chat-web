"use client";

import { useState, useCallback } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useToast, Toast } from "@/components/Toast";
import type { ContentSection } from "@/lib/types";

interface ContentSectionsRendererProps {
  parentType: string;
  parentId: string;
  initialSections: ContentSection[];
}

export function ContentSectionsRenderer({
  parentType,
  parentId,
  initialSections,
}: ContentSectionsRendererProps) {
  const [sections, setSections] = useState<ContentSection[]>(initialSections);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContentSection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentSection | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isAdmin = useAdmin();
  const { message, visible, showToast } = useToast();

  const visibleSections = sections.filter((s) => s.is_visible !== "FALSE");

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
  }, []);

  const handleAdd = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleEdit = (section: ContentSection) => {
    setEditTarget(section);
    setModalOpen(true);
  };

  const handleSaved = (saved: ContentSection) => {
    if (editTarget) {
      setSections((prev) =>
        prev.map((s) => (s.id === saved.id ? saved : s))
      );
    } else {
      setSections((prev) => [...prev, saved]);
    }
    showToast(editTarget ? "수정 완료" : "안내 항목 추가 완료");
    setTimeout(closeModal, 500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/admin/content-sections?id=${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSections((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSortChange = async (section: ContentSection, direction: "up" | "down") => {
    const sorted = [...sections].sort((a, b) => a.sort - b.sort);
    const idx = sorted.findIndex((s) => s.id === section.id);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentSort = sorted[idx].sort;
    const swapSort = sorted[swapIdx].sort;

    try {
      await Promise.all([
        fetch("/api/admin/content-sections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sorted[idx].id, sort: swapSort.toString() }),
        }),
        fetch("/api/admin/content-sections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sorted[swapIdx].id, sort: currentSort.toString() }),
        }),
      ]);

      setSections((prev) =>
        prev.map((s) => {
          if (s.id === sorted[idx].id) return { ...s, sort: swapSort };
          if (s.id === sorted[swapIdx].id) return { ...s, sort: currentSort };
          return s;
        })
      );
    } catch {
      // silently fail sort
    }
  };

  const handleToggleVisible = async (section: ContentSection) => {
    const newVal = section.is_visible === "FALSE" ? "TRUE" : "FALSE";
    try {
      const res = await fetch("/api/admin/content-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: section.id, is_visible: newVal }),
      });
      if (res.ok) {
        setSections((prev) =>
          prev.map((s) =>
            s.id === section.id ? { ...s, is_visible: newVal } : s
          )
        );
        showToast(newVal === "TRUE" ? "표시로 변경" : "숨김 처리");
      }
    } catch {
      // silently fail
    }
  };

  // Nothing to show for non-admin when no visible sections
  if (!isAdmin && visibleSections.length === 0) return null;

  const sortedVisible = [...visibleSections].sort((a, b) => a.sort - b.sort);

  return (
    <div className="mt-6">
      {/* Admin: Add button */}
      {isAdmin && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold text-text">추가 안내</h2>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-primary/80 font-medium px-2 py-1 min-h-[32px]"
          >
            ＋ 안내 항목 추가
          </button>
        </div>
      )}

      {/* User view: only visible sections */}
      {sortedVisible.length > 0 ? (
        <div className="space-y-4">
          {sortedVisible.map((section) => {
            const sortedAll = [...sections].sort((a, b) => a.sort - b.sort);
            const idx = sortedAll.findIndex((s) => s.id === section.id);
            return (
              <div
                key={section.id}
                className="bg-surface border border-border rounded-[12px] p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[15px] font-bold text-text">
                    {section.emoji ? `${section.emoji} ` : ""}
                    {section.title}
                  </h3>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleSortChange(section, "up")}
                        disabled={idx === 0}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[13px] disabled:opacity-30"
                        title="위로"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleSortChange(section, "down")}
                        disabled={idx === sortedAll.length - 1}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[13px] disabled:opacity-30"
                        title="아래로"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleToggleVisible(section)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[13px]"
                        title={section.is_visible === "FALSE" ? "표시" : "숨김"}
                      >
                        {section.is_visible === "FALSE" ? "👁️‍🗨️" : "👁️"}
                      </button>
                      <button
                        onClick={() => handleEdit(section)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[13px]"
                        title="수정"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setDeleteTarget(section)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-[13px]"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
                {section.content && (
                  <p className="text-[15px] text-text leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        isAdmin && (
          <p className="text-[14px] text-muted">등록된 안내 항목이 없습니다.</p>
        )
      )}

      {/* Admin: hidden sections */}
      {isAdmin && sections.some((s) => s.is_visible === "FALSE") && (
        <div className="mt-4 pt-3 border-t border-dashed border-border">
          <p className="text-[13px] text-muted mb-2">숨겨진 항목</p>
          {sections
            .filter((s) => s.is_visible === "FALSE")
            .sort((a, b) => a.sort - b.sort)
            .map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between py-1 opacity-60"
              >
                <span className="text-[13px] text-muted">
                  {section.emoji ? `${section.emoji} ` : ""}
                  {section.title}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleVisible(section)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[12px]"
                    title="표시"
                  >
                    👁️‍🗨️
                  </button>
                  <button
                    onClick={() => handleEdit(section)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[12px]"
                    title="수정"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteTarget(section)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[12px]"
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <ContentSectionModal
        key={editTarget?.id || "new"}
        open={modalOpen}
        parentType={parentType}
        parentId={parentId}
        editTarget={editTarget}
        onClose={closeModal}
        onSaved={handleSaved}
      />

      {/* Delete Confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-[12px] p-6 max-w-[360px] w-[90%] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[17px] font-bold text-text mb-2">안내 항목 삭제</h3>
            <p className="text-[14px] text-muted mb-6 leading-relaxed">
              &ldquo;{deleteTarget.emoji ? `${deleteTarget.emoji} ` : ""}
              {deleteTarget.title}&rdquo; 을(를) 삭제하시겠습니까?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-[14px] text-white bg-danger rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
              >
                {deleteLoading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={message} visible={visible} />
    </div>
  );
}

/* ── Section Create / Edit Modal ── */

const EMOJI_OPTIONS = [
  "📋", "📌", "⛳", "🏨", "🍽️", "♨️", "🚗", "👔", "📞", "🚌",
  "👤", "🎒", "💰", "⏰", "🗺️", "⛳", "🏌️", "🛍️", "🎤", "🎿",
  "🌸", "⛩️", "🏖️", "🎭", "🏟️", "🎪", "🗼", "🏠", "📢", "ℹ️",
];

interface ContentSectionModalProps {
  open: boolean;
  parentType: string;
  parentId: string;
  editTarget: ContentSection | null;
  onClose: () => void;
  onSaved: (saved: ContentSection) => void;
}

function ContentSectionModal({
  open,
  parentType,
  parentId,
  editTarget,
  onClose,
  onSaved,
}: ContentSectionModalProps) {
  const [title, setTitle] = useState(editTarget?.title || "");
  const [content, setContent] = useState(editTarget?.content || "");
  const [emoji, setEmoji] = useState(editTarget?.emoji || "");
  const [sort, setSort] = useState(editTarget?.sort?.toString() || "");
  const [isVisible, setIsVisible] = useState(
    editTarget ? editTarget.is_visible !== "FALSE" : true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (editTarget) {
        // UPDATE
        const res = await fetch("/api/admin/content-sections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editTarget.id,
            title: title.trim(),
            content: content.trim(),
            emoji: emoji.trim(),
            sort: sort ? sort : editTarget.sort.toString(),
            is_visible: isVisible ? "TRUE" : "FALSE",
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "수정에 실패했습니다.");
        }
        onSaved({
          ...editTarget,
          title: title.trim(),
          content: content.trim(),
          emoji: emoji.trim(),
          sort: sort ? parseInt(sort, 10) : editTarget.sort,
          is_visible: isVisible ? "TRUE" : "FALSE",
          updated_at: new Date().toISOString(),
        });
      } else {
        // CREATE
        const res = await fetch("/api/admin/content-sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_type: parentType,
            parent_id: parentId,
            title: title.trim(),
            content: content.trim(),
            emoji: emoji.trim(),
            sort: sort || "99",
            is_visible: isVisible ? "TRUE" : "FALSE",
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "추가에 실패했습니다.");
        }
        const data = await res.json();
        onSaved({
          id: data.id,
          parent_type: parentType,
          parent_id: parentId,
          title: title.trim(),
          content: content.trim(),
          emoji: emoji.trim(),
          sort: sort ? parseInt(sort, 10) : 99,
          is_visible: isVisible ? "TRUE" : "FALSE",
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-[12px] p-6 max-w-[480px] w-[90%] max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-bold text-text mb-4">
          {editTarget ? "안내 항목 수정" : "안내 항목 추가"}
        </h3>

        {error && (
          <div className="mb-3 text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-[8px]">
            {error}
          </div>
        )}

        {/* Title */}
        <label className="block mb-3">
          <span className="text-[13px] text-muted mb-1 block">제목 *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px]"
            placeholder="예: 캐디 안내"
          />
        </label>

        {/* Emoji */}
        <label className="block mb-3">
          <span className="text-[13px] text-muted mb-1 block">이모지</span>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e === emoji ? "" : e)}
                className={`w-8 h-8 flex items-center justify-center rounded text-[16px] border ${
                  emoji === e ? "border-primary bg-primary/10" : "border-border hover:bg-gray-50"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px]"
            placeholder="직접 입력 (예: 🌟)"
          />
        </label>

        {/* Content */}
        <label className="block mb-3">
          <span className="text-[13px] text-muted mb-1 block">내용</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px] resize-y"
            placeholder="안내 내용을 입력하세요"
          />
        </label>

        {/* Sort */}
        <label className="block mb-3">
          <span className="text-[13px] text-muted mb-1 block">순서</span>
          <input
            type="number"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-24 border border-border rounded-[8px] px-3 py-2 text-[14px]"
            placeholder="99"
          />
        </label>

        {/* Visible toggle */}
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-[14px] text-text">표시</span>
        </label>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {saving ? "저장 중..." : editTarget ? "수정" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}