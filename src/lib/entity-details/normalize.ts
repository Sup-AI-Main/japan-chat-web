/**
 * Normalize legacy Golf JSON items to canonical editor draft shape.
 *
 * Memory-only transform — does NOT write to DB.
 * Used on GET/read to ensure editor can display legacy items
 * that may be missing key, label_ko, sort, is_visible.
 */

import type {
  EntityDetailsDocumentV1,
  EntityDetailsItem,
  EntityDetailsSection,
} from "./types";

// ---------------------------------------------------------------------------
// Deterministic fallback key generators
// ---------------------------------------------------------------------------

function fallbackItemKey(item: EntityDetailsItem, sectionKey: string, idx: number): string {
  if (item.key) return item.key;
  if (item.source_column) return item.source_column;
  if (item.legacy_id) return `legacy_${item.legacy_id}`;
  return `${sectionKey}_item_${idx}`;
}

function fallbackItemLabel(item: EntityDetailsItem, _idx: number): string {
  if (item.label_ko) return item.label_ko;
  if (item.source_column) return item.source_column;
  // Never generate "항목 N" placeholder — renderer handles empty labels gracefully
  return "";
}

// ---------------------------------------------------------------------------
// Normalize a single item
// ---------------------------------------------------------------------------

function normalizeItem(
  item: EntityDetailsItem,
  sectionKey: string,
  idx: number
): EntityDetailsItem {
  return {
    ...item,
    key: item.key ?? fallbackItemKey(item, sectionKey, idx),
    label_ko: item.label_ko ?? fallbackItemLabel(item, idx),
    label_jp: item.label_jp ?? null,
    sort: item.sort ?? idx,
    is_visible: item.is_visible ?? true,
    // Preserve existing values exactly
    value: item.value,
    value_jp: item.value_jp ?? null,
    type: item.type,
    id: item.id,
  };
}

// ---------------------------------------------------------------------------
// Normalize a single section
// ---------------------------------------------------------------------------

function normalizeSection(section: EntityDetailsSection, idx: number): EntityDetailsSection {
  const items = (section.items ?? []).map((item, itemIdx) =>
    normalizeItem(item, section.key, itemIdx)
  );

  return {
    ...section,
    title_jp: section.title_jp ?? null,
    sort: section.sort ?? idx,
    is_visible: section.is_visible ?? true,
    items,
  };
}

// ---------------------------------------------------------------------------
// Normalize document
// ---------------------------------------------------------------------------

/**
 * Normalize a legacy V1 document for editor use.
 * Returns a new document with all items having key, label_ko, sort, is_visible.
 * Does NOT mutate the input.
 * Does NOT write to DB.
 */
export function normalizeEntityDetails(
  doc: EntityDetailsDocumentV1
): EntityDetailsDocumentV1 {
  const sections = doc.sections.map((section, idx) =>
    normalizeSection(section, idx)
  );

  return { version: 1, sections };
}

/**
 * Idempotency check: normalizing an already-normalized doc should produce
 * the same result (no additional changes).
 */
export function isNormalized(doc: EntityDetailsDocumentV1): boolean {
  for (const section of doc.sections) {
    if (section.title_jp === undefined) return false;
    if (section.sort === undefined || section.sort === null) return false;
    if (section.is_visible === undefined || section.is_visible === null) return false;
    for (const item of section.items) {
      if (!item.key) return false;
      if (item.label_ko === undefined) return false;
      if (item.sort === undefined || item.sort === null) return false;
      if (item.is_visible === undefined || item.is_visible === null) return false;
    }
  }
  return true;
}
