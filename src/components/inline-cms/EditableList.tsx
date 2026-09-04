"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { ConfirmModal } from "./ConfirmModal";

interface EditableListItem {
  id: string;
  [key: string]: unknown;
}

interface EditableListProps<T extends EditableListItem> {
  entityType: string;
  title: string;
  items: T[];
  renderItem: (item: T, isAdmin: boolean) => React.ReactNode;
  canAdd?: boolean;
  onAdd?: () => void;
  onItemEdit?: (item: T) => void;
  onItemDelete?: (item: T) => Promise<void> | void;
  addLabel?: string;
  emptyText?: string;
  className?: string;
}

export function EditableList<T extends EditableListItem>({
  entityType,
  title,
  items,
  renderItem,
  canAdd = true,
  onAdd,
  onItemEdit,
  onItemDelete,
  addLabel = "추가",
  emptyText,
  className = "",
}: EditableListProps<T>) {
  const isAdmin = useAdmin();
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileMenuFor, setMobileMenuFor] = useState<string | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!mobileMenuFor) return;
    const handleClick = (e: MouseEvent) => {
      const ref = menuRefs.current.get(mobileMenuFor);
      if (ref && !ref.contains(e.target as Node)) {
        setMobileMenuFor(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuFor]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !onItemDelete) return;
    setDeleting(true);
    try {
      await onItemDelete(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, onItemDelete]);

  const showAdd = isAdmin && canAdd && onAdd;
  const showItemActions = isAdmin && (onItemEdit || onItemDelete);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[15px] font-bold text-text">{title}</h3>
        {showAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-primary/80 font-medium px-2 py-1 min-h-[32px]"
          >
            ＋ {addLabel}
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between group">
              <div className="flex-1 min-w-0">
                {renderItem(item, isAdmin)}
              </div>
              {showItemActions && (
                <>
                  {/* Desktop */}
                  <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    {onItemEdit && (
                      <button
                        onClick={() => onItemEdit(item)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-[11px]"
                        title="수정"
                      >
                        ✏️
                      </button>
                    )}
                    {onItemDelete && (
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[11px]"
                        title="삭제"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  {/* Mobile ⋮ */}
                  <div
                    className="relative sm:hidden shrink-0 ml-1"
                    ref={(el) => { if (el) menuRefs.current.set(item.id, el); }}
                  >
                    <button
                      onClick={() => setMobileMenuFor(mobileMenuFor === item.id ? null : item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded text-[14px] text-gray-600"
                    >
                      ⋮
                    </button>
                    {mobileMenuFor === item.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-[8px] shadow-lg border border-border py-1 min-w-[90px] z-20">
                        {onItemEdit && (
                          <button
                            onClick={() => { onItemEdit(item); setMobileMenuFor(null); }}
                            className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-gray-50 flex items-center gap-2"
                          >
                            ✏️ 수정
                          </button>
                        )}
                        {onItemDelete && (
                          <button
                            onClick={() => { setDeleteTarget(item); setMobileMenuFor(null); }}
                            className="w-full px-3 py-1.5 text-left text-[13px] hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            🗑️ 삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        emptyText && <p className="text-[13px] text-muted">{emptyText}</p>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`${entityType} 삭제`}
        message={`"${(deleteTarget as unknown as Record<string, string>)?.text_kr || (deleteTarget as unknown as Record<string, string>)?.name || ""}" 항목을 삭제하시겠습니까?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
