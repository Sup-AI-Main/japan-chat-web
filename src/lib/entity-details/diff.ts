/**
 * Fine-grained dirty diff for EntityDetailsDocumentV1.
 *
 * Counts individual field-level changes between original (server) and draft.
 * Used by the editor to show accurate dirty count.
 */

import type {
  EntityDetailsDocumentV1,
  EntityDetailsItem,
  EntityDetailsSection,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sectionsById(sections: EntityDetailsSection[]) {
  return new Map(sections.map((s) => [s.id, s]));
}

function itemsById(items: EntityDetailsItem[]) {
  return new Map(items.map((i) => [i.id, i]));
}

// ---------------------------------------------------------------------------
// Item diff
// ---------------------------------------------------------------------------

function diffItem(orig: EntityDetailsItem, curr: EntityDetailsItem): number {
  let count = 0;
  if (orig.label_ko !== curr.label_ko) count++;
  if ((orig.label_jp ?? null) !== (curr.label_jp ?? null)) count++;
  if (orig.type !== curr.type) count++;
  if (!valuesEqual(orig.value, curr.value)) count++;
  if ((orig.value_jp ?? null) !== (curr.value_jp ?? null)) count++;
  if ((orig.sort ?? 0) !== (curr.sort ?? 0)) count++;
  if ((orig.is_visible ?? true) !== (curr.is_visible ?? true)) count++;
  return count;
}

function valuesEqual(
  a: string | number | boolean | string[] | null | undefined,
  b: string | number | boolean | string[] | null | undefined
): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Section diff
// ---------------------------------------------------------------------------

function diffSection(
  orig: EntityDetailsSection,
  curr: EntityDetailsSection
): number {
  let count = 0;

  if (orig.title_ko !== curr.title_ko) count++;
  if ((orig.title_jp ?? null) !== (curr.title_jp ?? null)) count++;
  if ((orig.emoji ?? null) !== (curr.emoji ?? null)) count++;
  if (orig.sort !== curr.sort) count++;
  if (orig.is_visible !== curr.is_visible) count++;

  const origItems = itemsById(orig.items);
  const currItems = itemsById(curr.items);

  // Added items
  for (const id of currItems.keys()) {
    if (!origItems.has(id)) count++;
  }

  // Deleted items
  for (const id of origItems.keys()) {
    if (!currItems.has(id)) count++;
  }

  // Modified items
  for (const [id, currItem] of currItems) {
    const origItem = origItems.get(id);
    if (origItem) {
      count += diffItem(origItem, currItem);
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Document diff
// ---------------------------------------------------------------------------

/**
 * Count the number of field-level differences between original and draft.
 * Returns 0 when documents are equivalent.
 */
export function countDifferences(
  original: EntityDetailsDocumentV1,
  draft: EntityDetailsDocumentV1
): number {
  let count = 0;
  const origSections = sectionsById(original.sections);
  const currSections = sectionsById(draft.sections);

  // Added sections
  for (const id of currSections.keys()) {
    if (!origSections.has(id)) {
      const sec = currSections.get(id)!;
      count++; // section itself
      count += sec.items.length; // all items in new section
    }
  }

  // Deleted sections
  for (const id of origSections.keys()) {
    if (!currSections.has(id)) {
      const sec = origSections.get(id)!;
      count++;
      count += sec.items.length;
    }
  }

  // Modified sections
  for (const [id, currSec] of currSections) {
    const origSec = origSections.get(id);
    if (origSec) {
      count += diffSection(origSec, currSec);
    }
  }

  return count;
}
