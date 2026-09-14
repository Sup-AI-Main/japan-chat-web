"use client";

import { ModalShell } from "@/components/inline-cms/ModalShell";

interface ImpactItem {
  label: string;
  count: number;
}

interface ImpactDeleteModalProps {
  open: boolean;
  title: string;
  items: ImpactItem[];
  warning?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ImpactDeleteModal({
  open,
  title,
  items,
  warning = "이 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
  onConfirm,
  onCancel,
  loading = false,
}: ImpactDeleteModalProps) {
  const hasImpact = items.some((item) => item.count > 0);

  return (
    <ModalShell
      open={open}
      title={title}
      onClose={onCancel}
      maxWidth="480px"
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-[14px] text-white bg-danger rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
          >
            {loading ? "삭제 중..." : "삭제"}
          </button>
        </>
      }
    >
      {hasImpact ? (
        <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-3">
          <p className="text-[13px] font-medium text-danger mb-2">
            연결된 데이터:
          </p>
          <ul className="space-y-1">
            {items
              .filter((item) => item.count > 0)
              .map((item) => (
                <li
                  key={item.label}
                  className="text-[13px] text-text flex justify-between"
                >
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count}개</span>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <p className="text-[14px] text-muted mb-3">
          연결된 데이터가 없습니다.
        </p>
      )}

      <p className="text-[13px] text-danger">{warning}</p>
    </ModalShell>
  );
}
