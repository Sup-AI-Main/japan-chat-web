/**
 * Shared modal wrapper for EntityDetailsEditor.
 *
 * Uses existing ModalShell for consistent UX.
 * Features:
 * - dirty guard on close/cancel
 * - close X
 * - cancel button
 * - 수정완료 button
 * - saving lock (no close while saving)
 * - pipeline panel area
 * - success state visible before auto-close
 */

"use client";

import { ModalShell } from "@/components/inline-cms/ModalShell";
import type { SaveStep } from "./EntitySaveProgress";
import { EntitySaveProgress } from "./EntitySaveProgress";

interface EntityDetailsEditorModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  isDirty: boolean;
  error: string | null;
  saveSteps: SaveStep[];
  showPipeline: boolean;
  children: React.ReactNode;
}

export function EntityDetailsEditorModal({
  open,
  title,
  onClose,
  onSave,
  saving,
  isDirty,
  error,
  saveSteps,
  showPipeline,
  children,
}: EntityDetailsEditorModalProps) {
  const handleClose = () => {
    if (saving) return; // block close while saving
    if (isDirty) {
      const ok = window.confirm(
        "저장하지 않은 변경사항이 있습니다. 변경사항을 버리고 닫으시겠습니까?"
      );
      if (!ok) return;
    }
    onClose();
  };

  return (
    <ModalShell
      open={open}
      title={title}
      onClose={handleClose}
      error={error ?? undefined}
      footer={
        <div className="flex items-center gap-3 w-full">
          {isDirty && !saving && (
            <span className="text-[13px] text-orange-600 flex-1">
              저장되지 않은 변경사항
            </span>
          )}
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
            disabled={saving || !isDirty}
            className="px-5 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {saving ? "저장 중..." : "수정완료"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {children}
        <EntitySaveProgress steps={saveSteps} visible={showPipeline} />
      </div>
    </ModalShell>
  );
}
