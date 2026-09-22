/**
 * Item editor component for EntityDetailsDocumentV1.
 *
 * Renders a single item with:
 * - label_ko input
 * - label_jp input (optional)
 * - type select
 * - typed value editor (text, textarea, boolean, number, url, list)
 * - visibility toggle
 * - sort control
 * - delete button
 *
 * Internal id/key/source are NOT editable.
 * false, 0, [], null, "" semantics are properly distinguished.
 */

"use client";

import type {
  EntityDetailsItem,
  EntityDetailItemType,
} from "@/lib/entity-details/types";

interface EntityDetailsItemEditorProps {
  item: EntityDetailsItem;
  onUpdate: (patch: Partial<EntityDetailsItem>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const ITEM_TYPES: EntityDetailItemType[] = [
  "text",
  "textarea",
  "boolean",
  "number",
  "url",
  "list",
];

// ---------------------------------------------------------------------------
// Typed value editors
// ---------------------------------------------------------------------------

function TextValueEditor({
  value,
  onChange,
  disabled,
  multiline = false,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled: boolean;
  multiline?: boolean;
}) {
  const Component = multiline ? "textarea" : "input";
  return (
    <Component
      value={value ?? ""}
      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(e.target.value || null)
      }
      placeholder={multiline ? "내용을 입력하세요" : "값을 입력하세요"}
      disabled={disabled}
      className="w-full border border-border rounded px-2 py-1 text-[13px] resize-y"
      {...(multiline ? { rows: 3 } : { type: "text" })}
    />
  );
}

function BooleanValueEditor({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1 text-[13px] text-text cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        {value === true ? "예 (true)" : value === false ? "아니오 (false)" : "null"}
      </label>
      {value !== null && value !== undefined && (
        <button
          onClick={() => onChange(null)}
          disabled={disabled}
          className="text-[12px] text-muted hover:text-text"
        >
          null로 설정
        </button>
      )}
    </div>
  );
}

function NumberValueEditor({
  value,
  onChange,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        disabled={disabled}
        className="border border-border rounded px-2 py-1 text-[13px] w-[120px]"
      />
      <span className="text-[12px] text-muted">
        {value === 0 ? "(0은 유효한 값입니다)" : ""}
      </span>
    </div>
  );
}

function UrlValueEditor({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled: boolean;
}) {
  return (
    <input
      type="url"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder="https://..."
      disabled={disabled}
      className="w-full border border-border rounded px-2 py-1 text-[13px]"
    />
  );
}

function ListValueEditor({
  value,
  onChange,
  disabled,
}: {
  value: string[] | null | undefined;
  onChange: (v: string[] | null) => void;
  disabled: boolean;
}) {
  const items = Array.isArray(value) ? value : [];

  const addItem = () => onChange([...items, ""]);
  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onChange(next.length === 0 ? null : next);
  };
  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {items.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <input
            type="text"
            value={entry}
            onChange={(e) => updateItem(idx, e.target.value)}
            disabled={disabled}
            className="flex-1 border border-border rounded px-2 py-1 text-[13px]"
          />
          <button
            onClick={() => removeItem(idx)}
            disabled={disabled}
            className="text-red-400 hover:text-red-600 text-[12px] min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        disabled={disabled}
        className="text-primary text-[12px] hover:underline min-h-[32px]"
      >
        + 항목 추가
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main item editor
// ---------------------------------------------------------------------------

export function EntityDetailsItemEditor({
  item,
  onUpdate,
  onRemove,
  disabled = false,
}: EntityDetailsItemEditorProps) {
  const type = (item.type ?? "text") as EntityDetailItemType;

  return (
    <div className="border border-border/50 rounded p-3 bg-white">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          {/* Type + visibility row */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={type}
              onChange={(e) => onUpdate({ type: e.target.value })}
              disabled={disabled}
              className="border border-border rounded px-2 py-1 text-[12px] bg-white"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1 text-[12px] text-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={item.is_visible !== false}
                onChange={(e) => onUpdate({ is_visible: e.target.checked })}
                disabled={disabled}
              />
              표시
            </label>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted">정렬:</span>
              <input
                type="number"
                value={item.sort ?? 0}
                onChange={(e) => onUpdate({ sort: Number(e.target.value) })}
                disabled={disabled}
                className="border border-border rounded px-1 py-0.5 text-[12px] w-[50px]"
              />
            </div>
          </div>

          {/* Labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={item.label_ko ?? ""}
              onChange={(e) => onUpdate({ label_ko: e.target.value || undefined })}
              placeholder="항목명 (한국어)"
              disabled={disabled}
              className="border border-border rounded px-2 py-1 text-[13px]"
            />
            <input
              type="text"
              value={item.label_jp ?? ""}
              onChange={(e) => onUpdate({ label_jp: e.target.value || null })}
              placeholder="項目名 (日本語) — 선택사항"
              disabled={disabled}
              className="border border-border rounded px-2 py-1 text-[13px]"
            />
          </div>

          {/* Typed value editor */}
          <div>
            {type === "text" && (
              <TextValueEditor
                value={item.value as string | null}
                onChange={(v) => onUpdate({ value: v })}
                disabled={disabled}
              />
            )}
            {type === "textarea" && (
              <TextValueEditor
                value={item.value as string | null}
                onChange={(v) => onUpdate({ value: v })}
                disabled={disabled}
                multiline
              />
            )}
            {type === "boolean" && (
              <BooleanValueEditor
                value={item.value as boolean | null}
                onChange={(v) => onUpdate({ value: v })}
                disabled={disabled}
              />
            )}
            {type === "number" && (
              <NumberValueEditor
                value={item.value as number | null}
                onChange={(v) => onUpdate({ value: v })}
                disabled={disabled}
              />
            )}
            {type === "url" && (
              <UrlValueEditor
                value={item.value as string | null}
                onChange={(v) => onUpdate({ value: v })}
                disabled={disabled}
              />
            )}
            {type === "list" && (
              <ListValueEditor
                value={item.value as string[] | null}
                onChange={(v) => onUpdate({ value: v })}
                disabled={disabled}
              />
            )}
          </div>

          {/* Japanese value (optional, for text/textarea) */}
          {(type === "text" || type === "textarea") && (
            <div>
              <textarea
                value={item.value_jp ?? ""}
                onChange={(e) =>
                  onUpdate({ value_jp: e.target.value || null })
                }
                placeholder="値 (日本語) — 선택사항"
                rows={2}
                disabled={disabled}
                className="w-full border border-border rounded px-2 py-1 text-[13px] resize-y"
              />
            </div>
          )}
        </div>

        {/* Delete */}
        <button
          onClick={onRemove}
          disabled={disabled}
          className="text-red-400 hover:text-red-600 text-[12px] min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          title="항목 삭제"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
