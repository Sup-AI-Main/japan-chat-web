"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/hooks/use-admin";
import { AddButton, ConfirmModal } from "@/components/inline-cms";
import { getCategoryEmoji, getCategoryColor, getCategoryBg, getCategoryBorder } from "@/lib/display";

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

interface GuideCategoriesClientProps {
  initialCategories: AdminOption[];
}

function CategoryEditModal({
  category,
  open,
  onClose,
  onSaved,
}: {
  category: AdminOption | null;
  open: boolean;
  onClose: () => void;
  onSaved: (data: AdminOption) => void;
}) {
  const [label, setLabel] = useState(category?.label || "");
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
      const isEdit = !!category;
      const res = await fetch("/api/admin/options", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { id: category.id, label: label.trim() }
            : { option_type: "CATEGORY", label: label.trim(), group: "COMMON" }
        ),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "저장 실패");
        return;
      }

      const result = await res.json();
      onSaved({
        id: result.id || category?.id || "",
        option_type: "CATEGORY",
        code: category?.code || label.trim().replace(/\s+/g, "_").toUpperCase(),
        label: label.trim(),
        description: category?.description || "",
        group: "COMMON",
        sort: category?.sort || 999,
        active: "TRUE",
        updated_at: new Date().toISOString(),
      });
      onClose();
    } catch {
      setError("저장 중 오류 발생");
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
            {category ? "카테고리 수정" : "카테고리 추가"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg text-muted text-[18px] cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-text mb-1">카테고리 이름 *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 온천, 차량, 환불"
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
              required
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

export default function GuideCategoriesClient({
  initialCategories,
}: GuideCategoriesClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminOption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOption | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isAdmin = useAdmin();

  const handleAdd = () => {
    setEditTarget(null);
    setEditModal(true);
  };

  const handleEdit = (cat: AdminOption) => {
    setEditTarget(cat);
    setEditModal(true);
  };

  const handleSaved = (saved: AdminOption) => {
    if (editTarget) {
      setCategories((prev) => prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c)));
    } else {
      setCategories((prev) => [...prev, saved].sort((a, b) => a.sort - b.sort));
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-bold text-text">📋 공통 안내</h1>
        {isAdmin && <AddButton onClick={handleAdd} label="카테고리 추가" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div key={cat.code} className="relative group/cat">
            <Link
              href={`/guide/${cat.code.toLowerCase()}`}
              className="rounded-[12px] p-4 text-center transition-colors min-h-[56px] flex items-center justify-center"
              style={{
                backgroundColor: getCategoryBg(cat.code),
                borderWidth: "2px",
                borderStyle: "solid",
                borderColor: getCategoryBorder(cat.code),
              }}
            >
              <span className="text-[16px] font-medium whitespace-nowrap" style={{ color: getCategoryColor(cat.code) }}>
                {getCategoryEmoji(cat.code)} {cat.label}
              </span>
            </Link>
            {isAdmin && (
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(cat)}
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

      <CategoryEditModal
        category={editTarget}
        open={editModal}
        onClose={() => { setEditModal(false); setEditTarget(null); }}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="카테고리 삭제"
        message={`"${deleteTarget?.label}" 카테고리를 삭제하시겠습니까? 연결된 FAQ가 있으면 사용자에게 더 이상 표시되지 않습니다.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </>
  );
}