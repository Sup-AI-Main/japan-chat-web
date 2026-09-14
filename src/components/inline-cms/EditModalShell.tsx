"use client";

import { ModalShell } from "./ModalShell";

interface EditModalShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  error?: string;
  children: React.ReactNode;
}

export function EditModalShell({
  open,
  title,
  onClose,
  onSave,
  saving = false,
  saveLabel = "저장",
  savingLabel = "저장 중...",
  error,
  children,
}: EditModalShellProps) {
  return (
    <ModalShell
      open={open}
      title={title}
      onClose={onClose}
      error={error}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {saving ? savingLabel : saveLabel}
          </button>
        </>
      }
    >
      {children}
    </ModalShell>
  );
}
