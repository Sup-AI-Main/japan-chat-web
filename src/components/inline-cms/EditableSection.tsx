"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { ConfirmModal } from "./ConfirmModal";

const ENTITY_LABELS: Record<string, string> = {
  meal: "식사 안내",
  breakfast: "조식",
  dinner: "석식",
  spa: "온천/스파",
  info: "기타 안내",
  section: "섹션",
};

interface EditableSectionProps {
  entityType: string;
  title: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canAdd?: boolean;
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function EditableSection({
  entityType,
  title,
  canEdit = true,
  canDelete = false,
  canAdd = false,
  onEdit,
  onDelete,
  onAdd,
  addLabel = "추가",
  children,
  className = "",
}: EditableSectionProps) {
  const isAdmin = useAdmin();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuOpen]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }, [onDelete]);

  const showEdit = isAdmin && canEdit && onEdit;
  const showDelete = isAdmin && canDelete && onDelete;
  const showAdd = isAdmin && canAdd && onAdd;
  const hasAdminActions = showEdit || showDelete;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-text">{title}</h2>
        <div className="flex items-center gap-1">
          {showAdd && (
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-primary/80 font-medium px-2 py-1 min-h-[32px]"
            >
              ＋ {addLabel}
            </button>
          )}
          {hasAdminActions && (
            <>
              {/* Desktop */}
              <div className="hidden sm:flex items-center gap-1">
                {showEdit && (
                  <button
                    onClick={onEdit}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[13px]"
                    title="수정"
                  >
                    ✏️
                  </button>
                )}
                {showDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-[13px]"
                    title="삭제"
                  >
                    🗑️
                  </button>
                )}
              </div>
              {/* Mobile ⋮ */}
              <div className="relative sm:hidden" ref={menuRef}>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="w-7 h-7 flex items-center justify-center rounded text-[16px] text-gray-600"
                >
                  ⋮
                </button>
                {mobileMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-[8px] shadow-lg border border-border py-1 min-w-[100px] z-20">
                    {showEdit && (
                      <button
                        onClick={() => { onEdit!(); setMobileMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-[13px] hover:bg-gray-50 flex items-center gap-2"
                      >
                        ✏️ 수정
                      </button>
                    )}
                    {showDelete && (
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setMobileMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-[13px] hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        🗑️ 삭제
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {children}

      <ConfirmModal
        open={showDeleteConfirm}
        title={`${ENTITY_LABELS[entityType] || entityType} 삭제`}
        message="정말 삭제하시겠습니까?"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />
    </div>
  );
}
