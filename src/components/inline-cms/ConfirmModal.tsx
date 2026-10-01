"use client";

import { ModalShell } from "./ModalShell";
import { ActionButton } from "./ActionButton";
import { Toast, useToast } from "@/components/Toast";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const { message: toastMessage, visible, showToast } = useToast();

  const handleConfirm = async () => {
    const result = await onConfirm();
    if (result === false) return;
    showToast("삭제 완료", 300);
    window.setTimeout(onCancel, 300);
  };

  return (
    <>
    <ModalShell
      open={open}
      title={title}
      onClose={onCancel}
      maxWidth="420px"
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            {cancelLabel}
          </button>
          <ActionButton
            onAction={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-[14px] text-white bg-danger rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {loading ? "삭제 중..." : confirmLabel}
          </ActionButton>
        </>
      }
    >
      <p className="text-[14px] text-muted leading-relaxed">{message}</p>
    </ModalShell>
    <Toast message={toastMessage} visible={visible} />
    </>
  );
}
