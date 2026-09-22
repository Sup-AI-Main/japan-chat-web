/**
 * Empty-value semantics for entity detail items.
 *
 * Unlike `.filter(Boolean)`, this preserves `false` and `0` as non-empty.
 * null, "", "   ", [], undefined → empty
 * false, 0, "text", ["a"] → NOT empty
 */

export function isEmptyValue(
  value: string | number | boolean | string[] | null | undefined
): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  // false and 0 are NOT empty
  return false;
}
