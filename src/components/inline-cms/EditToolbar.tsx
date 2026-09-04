"use client";

import { useAdmin } from "@/hooks/use-admin";

interface EditToolbarProps {
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function EditToolbar({ onEdit, onDelete, className = "" }: EditToolbarProps) {
  const isAdmin = useAdmin();
  if (!isAdmin) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={onEdit}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-sm"
        title="수정"
      >
        ✏️
      </button>
      <button
        onClick={onDelete}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-500 hover:text-red-600 text-sm"
        title="삭제"
      >
        🗑️
      </button>
    </div>
  );
}

interface AddButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function AddButton({ onClick, label = "추가", className = "" }: AddButtonProps) {
  const isAdmin = useAdmin();
  if (!isAdmin) return null;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium ${className}`}
    >
      ＋ {label}
    </button>
  );
}
