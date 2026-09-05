"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/hooks/use-admin";
import { AddButton, ConfirmModal } from "@/components/inline-cms";
import { adminFetchJson, ConflictError } from "@/lib/admin-fetch";
import { getAreaEmoji, getCategoryEmoji } from "@/lib/display";

interface AdminOption {
  id: string;
  option_type: string;
  code: string;
  label: string;
  description: string;
  group: string;
  sort: number;
  active: string;
  updated_at: string;
}

interface HomeContentClientProps {
  initialAreas: AdminOption[];
  initialCategories: AdminOption[];
}

function OptionEditModal({
  option,
  optionType,
  group,
  open,
  onClose,
  onSaved,
}: {
  option: AdminOption | null;
  optionType: string;
  group?: string;
  open: boolean;
  onClose: () => void;
  onSaved: (data: AdminOption) => void;
}) {
  const [label, setLabel] = useState(option?.label || "");
  const [description, setDescription] = useState(option?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("이름을 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const isEdit = !!option;
      const result = await adminFetchJson<{ id?: string }>("/api/admin/options", {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(
          isEdit
            ? { id: option.id, label: label.trim(), description: description.trim() }
            : { option_type: optionType, label: label.trim(), description: description.trim(), group: group || "" }
        ),
      });
      onSaved({
        id: result.id || option?.id || "",
        option_type: optionType,
        code: option?.code || label.trim().replace(/\s+/g, "_").toUpperCase(),
        label: label.trim(),
        description: description.trim(),
        group: group || "",
        sort: option?.sort || 999,
        active: "TRUE",
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      if (err instanceof ConflictError) {
        setError("다른 관리자가 먼저 수정했습니다. 최신 데이터를 다시 불러와 주세요.");
      } else {
        setError(err instanceof Error ? err.message : "저장 중 오류 발생");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[400px] mx-4 p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[18px] font-bold text-text">
            {option ? "수정" : "추가"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg text-muted text-[18px] cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-text mb-1">이름 *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-text mb-1">설명</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-[14px] text-danger">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-border py-3 rounded-[10px] text-[15px] font-medium text-muted hover:bg-bg min-h-[44px] cursor-pointer">취소</button>
            <button type="submit" disabled={loading} className="flex-1 bg-primary text-white py-3 rounded-[10px] text-[15px] font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px] cursor-pointer">{loading ? "저장 중..." : "저장"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HomeContentClient({
  initialAreas,
  initialCategories,
}: HomeContentClientProps) {
  const [areas, setAreas] = useState(initialAreas);
  const [categories, setCategories] = useState(initialCategories);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminOption | null>(null);
  const [editType, setEditType] = useState<"AREA" | "CATEGORY">("AREA");
  const [deleteTarget, setDeleteTarget] = useState<AdminOption | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isAdmin = useAdmin();

  const handleEditArea = (area: AdminOption) => {
    setEditTarget(area);
    setEditType("AREA");
    setEditModal(true);
  };

  const handleAddCategory = () => {
    setEditTarget(null);
    setEditType("CATEGORY");
    setEditModal(true);
  };

  const handleEditCategory = (cat: AdminOption) => {
    setEditTarget(cat);
    setEditType("CATEGORY");
    setEditModal(true);
  };

  const handleSaved = (saved: AdminOption) => {
    if (editType === "AREA") {
      if (editTarget) {
        setAreas((prev) => prev.map((a) => (a.id === saved.id ? { ...a, ...saved } : a)));
      }
    } else {
      if (editTarget) {
        setCategories((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)));
      } else {
        setCategories((prev) => [...prev, saved].sort((a, b) => a.sort - b.sort));
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/options?id=${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* 지역 카드 */}
      <div className="flex flex-col gap-4 mb-10">
        {areas.map((area) => (
          <div key={area.code} className="relative group/card">
            <Link
              href={`/${area.code.toLowerCase()}`}
              className="block bg-surface border border-border rounded-[12px] p-6 text-center hover:border-primary hover:bg-primary-soft transition-colors"
            >
              <span className="text-[24px] block mb-1">{getAreaEmoji(area.code)}</span>
              <span className="text-[20px] font-bold text-text block mb-1">{area.label}</span>
              {area.description && (
                <span className="text-[14px] text-muted">{area.description}</span>
              )}
            </Link>
            {isAdmin && (
              <button
                onClick={() => handleEditArea(area)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border border-border shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity text-[14px] cursor-pointer hover:bg-bg"
                title="수정"
              >
                ✏️
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 공통 안내 카테고리 */}
      {categories.length > 0 && (
        <div className="border-t border-border pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold text-text">📋 공통 안내</h2>
            {isAdmin && <AddButton onClick={handleAddCategory} label="카테고리 추가" />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div key={cat.code} className="relative group/cat">
                <Link
                  href={`/guide/${cat.code.toLowerCase()}`}
                  className="block bg-surface border border-border rounded-[12px] p-4 text-center hover:border-primary transition-colors"
                >
                  <span className="text-[16px] font-medium text-text">
                    {getCategoryEmoji(cat.code)} {cat.label}
                  </span>
                </Link>
                {isAdmin && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 border border-border text-[12px] cursor-pointer hover:bg-bg"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-white/90 border border-border text-[12px] cursor-pointer hover:bg-danger/10"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <OptionEditModal
        option={editTarget}
        optionType={editType}
        group={editType === "CATEGORY" ? "COMMON" : undefined}
        open={editModal}
        onClose={() => { setEditModal(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="카테고리 삭제"
        message={`"${deleteTarget?.label}" 카테고리를 삭제하시겠습니까?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </>
  );
}