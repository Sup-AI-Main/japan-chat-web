"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalShell } from "./ModalShell";
import { ConfirmModal } from "./ConfirmModal";

interface EditModalShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  error?: string;
  isDirty?: boolean;
  /** Ref whose .current is always the guarded close handler. */
  requestCloseRef?: React.MutableRefObject<(() => void) | undefined>;
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
  isDirty = false,
  requestCloseRef,
  children,
}: EditModalShellProps) {
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [saving, isDirty, onClose]);

  useEffect(() => {
    if (requestCloseRef) {
      requestCloseRef.current = handleClose;
    }
  }, [requestCloseRef, handleClose]);

  return (
    <>
      <ModalShell
        open={open}
        title={title}
        onClose={handleClose}
        error={error}
        footer={
          <>
          <button
            type="button"
            onClick={handleClose}
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
      <ConfirmModal
        open={discardConfirmOpen}
        title="변경사항 취소"
        message="저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 닫으시겠습니까?"
        confirmLabel="버리고 닫기"
        onCancel={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          onClose();
        }}
      />
    </>
  );
}
