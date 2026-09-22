/**
 * Runtime validation for EntityDetailsDocumentV1.
 *
 * Validates at API boundary before DB write.
 * Does NOT modify the document — pure validation.
 */

import type {
  EntityDetailsDocumentV1,
  EntityDetailsItem,
  EntityDetailsSection,
} from "./types";
import {
  MAX_SECTIONS,
  MAX_ITEMS_PER_SECTION,
  MAX_LABEL_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_LIST_ITEMS,
  MAX_PAYLOAD_BYTES,
  ALLOWED_ITEM_TYPES,
} from "./constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

// ---------------------------------------------------------------------------
// Item validation
// ---------------------------------------------------------------------------

function validateItem(
  value: unknown,
  sectionIdx: number,
  itemIdx: number
): EntityDetailsItem {
  if (!value || typeof value !== "object") {
    throw new Error(`sections[${sectionIdx}].items[${itemIdx}]: must be an object`);
  }

  const item = value as Record<string, unknown>;

  // id required
  if (!isNonEmptyString(item.id)) {
    throw new Error(`sections[${sectionIdx}].items[${itemIdx}].id: required`);
  }

  // type required + whitelist
  const itemType = String(item.type ?? "");
  if (!ALLOWED_ITEM_TYPES.has(itemType)) {
    throw new Error(
      `sections[${sectionIdx}].items[${itemIdx}].type: unsupported "${itemType}"`
    );
  }

  // label_ko (optional for backward compat, but if present must be valid)
  if (item.label_ko !== undefined && item.label_ko !== null) {
    if (typeof item.label_ko !== "string") {
      throw new Error(`sections[${sectionIdx}].items[${itemIdx}].label_ko: must be string`);
    }
    if (item.label_ko.length > MAX_LABEL_LENGTH) {
      throw new Error(`sections[${sectionIdx}].items[${itemIdx}].label_ko: too long`);
    }
  }

  // sort
  if (item.sort !== undefined && item.sort !== null && !isFiniteNumber(item.sort)) {
    throw new Error(`sections[${sectionIdx}].items[${itemIdx}].sort: must be finite number`);
  }

  // is_visible
  if (item.is_visible !== undefined && item.is_visible !== null && !isBoolean(item.is_visible)) {
    throw new Error(`sections[${sectionIdx}].items[${itemIdx}].is_visible: must be boolean`);
  }

  // Value validation by type
  validateItemValue(item.value, itemType, sectionIdx, itemIdx);

  return item as unknown as EntityDetailsItem;
}

function validateItemValue(
  value: unknown,
  type: string,
  sectionIdx: number,
  itemIdx: number
): void {
  const prefix = `sections[${sectionIdx}].items[${itemIdx}].value`;

  switch (type) {
    case "text":
    case "textarea":
    case "url":
      if (value !== null && value !== undefined && typeof value !== "string") {
        throw new Error(`${prefix}: must be string or null for type "${type}"`);
      }
      if (typeof value === "string" && value.length > MAX_TEXT_LENGTH) {
        throw new Error(`${prefix}: exceeds max length`);
      }
      if (type === "url" && typeof value === "string" && value.trim().length > 0) {
        try {
          const url = new URL(value);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error(`${prefix}: URL must use http or https protocol`);
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes("protocol")) throw err;
          throw new Error(`${prefix}: invalid URL`);
        }
      }
      break;

    case "boolean":
      if (value !== null && value !== undefined && !isBoolean(value)) {
        throw new Error(`${prefix}: must be boolean or null`);
      }
      break;

    case "number":
      if (value !== null && value !== undefined) {
        if (!isFiniteNumber(value)) {
          throw new Error(`${prefix}: must be finite number or null`);
        }
      }
      break;

    case "list":
      if (value !== null && value !== undefined) {
        if (!Array.isArray(value)) {
          throw new Error(`${prefix}: must be array or null`);
        }
        if (value.length > MAX_LIST_ITEMS) {
          throw new Error(`${prefix}: exceeds max list items`);
        }
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== "string") {
            throw new Error(`${prefix}[${i}]: list member must be string`);
          }
        }
      }
      break;

    default:
      // Accept any value for unknown types (backward compat)
      break;
  }
}

// ---------------------------------------------------------------------------
// Section validation
// ---------------------------------------------------------------------------

function validateSection(
  value: unknown,
  idx: number
): EntityDetailsSection {
  if (!value || typeof value !== "object") {
    throw new Error(`sections[${idx}]: must be an object`);
  }

  const section = value as Record<string, unknown>;

  if (!isNonEmptyString(section.id)) {
    throw new Error(`sections[${idx}].id: required`);
  }
  if (!isNonEmptyString(section.key)) {
    throw new Error(`sections[${idx}].key: required`);
  }
  if (!isNonEmptyString(section.title_ko)) {
    throw new Error(`sections[${idx}].title_ko: required`);
  }
  if (section.title_ko.length > MAX_LABEL_LENGTH) {
    throw new Error(`sections[${idx}].title_ko: too long`);
  }
  if (!isFiniteNumber(section.sort)) {
    throw new Error(`sections[${idx}].sort: must be finite number`);
  }
  if (!isBoolean(section.is_visible)) {
    throw new Error(`sections[${idx}].is_visible: must be boolean`);
  }
  if (!Array.isArray(section.items)) {
    throw new Error(`sections[${idx}].items: must be an array`);
  }
  if (section.items.length > MAX_ITEMS_PER_SECTION) {
    throw new Error(`sections[${idx}].items: exceeds max items`);
  }

  // Validate each item
  const items = section.items.map((item: unknown, itemIdx: number) =>
    validateItem(item, idx, itemIdx)
  );

  // Unique item IDs within section
  const itemIds = new Set<string>();
  for (const item of items) {
    if (itemIds.has(item.id)) {
      throw new Error(`sections[${idx}]: duplicate item id "${item.id}"`);
    }
    itemIds.add(item.id);
  }

  return {
    ...(section as unknown as EntityDetailsSection),
    items,
  };
}

// ---------------------------------------------------------------------------
// Document validation
// ---------------------------------------------------------------------------

export function validateEntityDetailsDocument(
  input: unknown
): EntityDetailsDocumentV1 {
  if (!input || typeof input !== "object") {
    throw new Error("details_json must be an object");
  }

  // Payload size rough check
  const jsonSize = JSON.stringify(input).length;
  if (jsonSize > MAX_PAYLOAD_BYTES) {
    throw new Error("Payload too large");
  }

  const obj = input as Record<string, unknown>;

  if (obj.version !== 1) {
    throw new Error("Unsupported details schema version (expected 1)");
  }

  if (!Array.isArray(obj.sections)) {
    throw new Error("sections must be an array");
  }

  if (obj.sections.length > MAX_SECTIONS) {
    throw new Error(`Too many sections (max ${MAX_SECTIONS})`);
  }

  const sections = obj.sections.map((s: unknown, idx: number) =>
    validateSection(s, idx)
  );

  // Unique section IDs
  const sectionIds = new Set<string>();
  const sectionKeys = new Set<string>();
  for (const section of sections) {
    if (sectionIds.has(section.id)) {
      throw new Error(`Duplicate section id "${section.id}"`);
    }
    sectionIds.add(section.id);
    if (sectionKeys.has(section.key)) {
      throw new Error(`Duplicate section key "${section.key}"`);
    }
    sectionKeys.add(section.key);
  }

  return { version: 1, sections };
}

/**
 * Quick check if a value looks like a valid V1 document.
 * Does NOT throw — returns boolean.
 */
export function isValidV1Document(
  value: unknown
): value is EntityDetailsDocumentV1 {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return obj.version === 1 && Array.isArray(obj.sections);
}
