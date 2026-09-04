"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { ConfirmModal } from "./ConfirmModal";

const ENTITY_LABELS: Record<string, string> = {
  hotel: "호텔",
  golf: "골프장",
  restaurant: "맛집",
  included: "포함사항",
  excluded: "불포함사항",
};

interface EditableContainerProps {
  entityType: string;
  id?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  canAdd?: boolean;
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  onAdd?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function EditableContainer({
  entityType,
  canEdit = true,
  canDelete = true,
  canAdd = false,
  onEdit,
  onDelete,
  onAdd,
  children,
  className = "",
}: EditableContainerProps) {
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

  if (!isAdmin) {
    return <div className={className}>{children}</div>;
  }

  const showEdit = canEdit && onEdit;
  const showDelete = canDelete && onDelete;
  const showAdd = canAdd && onAdd;
  const hasAnyAction = showEdit || showDelete || showAdd;

  return (
    <div className={`relative group ${className}`}>
      {children}

      {hasAnyAction && (
        <>
          {/* Desktop: hover overlay */}
          <div className="absolute top-2 right-2 z-10 hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {showAdd && (
              <button
                onClick={onAdd}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-white/90 shadow-sm hover:bg-gray-100 text-[14px]"
                title="추가"
              >
                ＋
              </button>
            )}
            {showEdit && (
              <button
                onClick={onEdit}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-white/90 shadow-sm hover:bg-gray-100 text-[14px]"
                title="수정"
              >
                ✏️
              </button>
            )}
            {showDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-white/90 shadow-sm hover:bg-red-50 text-[14px]"
                title="삭제"
              >
                🗑️
              </button>
            )}
          </div>

          {/* Mobile: ⋮ menu */}
          <div className="absolute top-2 right-2 z-10 sm:hidden" ref={menuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-white/90 shadow-sm text-[18px] text-gray-600"
            >
              ⋮
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-[8px] shadow-lg border border-border py-1 min-w-[120px] z-20">
                {showAdd && (
                  <button
                    onClick={() => { onAdd!(); setMobileMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-[14px] hover:bg-gray-50 flex items-center gap-2"
                  >
                    ＋ 추가
                  </button>
                )}
                {showEdit && (
                  <button
                    onClick={() => { onEdit!(); setMobileMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-[14px] hover:bg-gray-50 flex items-center gap-2"
                  >
                    ✏️ 수정
                  </button>
                )}
                {showDelete && (
                  <button
                    onClick={() => { setShowDeleteConfirm(true); setMobileMenuOpen(false); }}
                    className="w-full px-3 py-2 text-left text-[14px] hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    🗑️ 삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title={`${ENTITY_LABELS[entityType] || entityType} 삭제`}
        message="정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />
    </div>
  );
}
