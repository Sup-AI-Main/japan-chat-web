"use client";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-[12px] p-6 max-w-[360px] w-[90%] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-bold text-text mb-2">{title}</h3>
        <p className="text-[14px] text-muted mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-[14px] text-white bg-danger rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {loading ? "삭제 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
