/**
 * Shared constants for entity details validation and editor.
 */

export const MAX_SECTIONS = 50;
export const MAX_ITEMS_PER_SECTION = 50;
export const MAX_LABEL_LENGTH = 200;
export const MAX_TEXT_LENGTH = 20_000;
export const MAX_LIST_ITEMS = 100;
export const MAX_PAYLOAD_BYTES = 2_000_000; // ~2 MB

export const ALLOWED_ITEM_TYPES = new Set([
  "text",
  "textarea",
  "boolean",
  "number",
  "url",
  "list",
]);

export const ENTITY_TYPE_WHITELIST = new Set([
  "GOLF",
  "HOTEL",
  "RESTAURANT",
  "ATTRACTION",
]);

/** Map entity type to URL segment for revalidation. */
export const ENTITY_PATH_MAP: Record<string, string> = {
  GOLF: "golf",
  HOTEL: "hotel",
  RESTAURANT: "restaurant",
  ATTRACTION: "attraction",
};
