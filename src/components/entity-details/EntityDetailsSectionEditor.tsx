/**
 * Section editor component for EntityDetailsDocumentV1.
 *
 * Renders a single section with:
 * - emoji input
 * - Korean label (title_ko) input
 * - Japanese label (title_jp) input (optional)
 * - visibility toggle
 * - sort control
 * - delete button
 * - nested items list
 *
 * Internal id/key/source are NOT exposed as editable inputs.
 */

"use client";

import type { EntityDetailsSection } from "@/lib/entity-details/types";
import { EntityDetailsItemEditor } from "./EntityDetailsItemEditor";

interface EntityDetailsSectionEditorProps {
  section: EntityDetailsSection;
  index: number;
  onUpdate: (patch: Partial<EntityDetailsSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, patch: Record<string, unknown>) => void;
  onRemoveItem: (itemId: string) => void;
  disabled?: boolean;
}

export function EntityDetailsSectionEditor({
  section,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  disabled = false,
}: EntityDetailsSectionEditorProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      {/* Section header */}
      <div className="flex items-start gap-2 mb-3">
        <span className="text-[12px] text-muted mt-2 w-[24px] text-center shrink-0">
          #{index}
        </span>

        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-[48px_1fr_1fr] gap-2">
            <input
              type="text"
              value={section.emoji ?? ""}
              onChange={(e) => onUpdate({ emoji: e.target.value || null })}
              placeholder="😀"
              disabled={disabled}
              className="border border-border rounded px-2 py-1 text-[14px] w-[48px] text-center"
              title="이모지"
            />
            <input
              type="text"
              value={section.title_ko}
              onChange={(e) => onUpdate({ title_ko: e.target.value })}
              placeholder="섹션 제목 (한국어)"
              disabled={disabled}
              className="border border-border rounded px-2 py-1 text-[14px]"
            />
            <input
              type="text"
              value={section.title_jp ?? ""}
              onChange={(e) => onUpdate({ title_jp: e.target.value || null })}
              placeholder="セクション名 (日本語) — 선택사항"
              disabled={disabled}
              className="border border-border rounded px-2 py-1 text-[14px]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-[13px] text-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={section.is_visible}
                onChange={(e) => onUpdate({ is_visible: e.target.checked })}
                disabled={disabled}
              />
              표시
            </label>

            <div className="flex items-center gap-1">
              <span className="text-[12px] text-muted">정렬:</span>
              <input
                type="number"
                value={section.sort}
                onChange={(e) => onUpdate({ sort: Number(e.target.value) })}
                disabled={disabled}
                className="border border-border rounded px-2 py-1 text-[13px] w-[60px]"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={disabled}
            className="text-muted hover:text-text text-[14px] min-w-[32px] min-h-[32px] flex items-center justify-center"
            title="위로 이동"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={disabled}
            className="text-muted hover:text-text text-[14px] min-w-[32px] min-h-[32px] flex items-center justify-center"
            title="아래로 이동"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            disabled={disabled}
            className="text-red-500 hover:text-red-700 text-[13px] min-w-[44px] min-h-[32px] flex items-center justify-center"
            title="섹션 삭제"
          >
            삭제
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="ml-[32px] space-y-2">
        {section.items.map((item) => (
          <EntityDetailsItemEditor
            key={item.id}
            item={item}
            onUpdate={(patch) => onUpdateItem(item.id, patch)}
            onRemove={() => onRemoveItem(item.id)}
            disabled={disabled}
          />
        ))}
        <button
          onClick={onAddItem}
          disabled={disabled}
          className="text-primary text-[13px] hover:underline min-h-[44px] flex items-center"
        >
          + 항목 추가
        </button>
      </div>
    </div>
  );
}
