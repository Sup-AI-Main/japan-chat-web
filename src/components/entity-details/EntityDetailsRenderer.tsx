/**
 * Shared public renderer for EntityDetailsDocumentV1.
 *
 * Renders sections/items from migrated JSON with:
 * - section sort + visibility
 * - item sort + visibility
 * - JSON section title_ko as canonical (no global label override)
 * - typed values (text, textarea, boolean, number, url, list)
 * - empty-value semantics (false/0 preserved, null/""/"   "/[] hidden)
 * - no raw HTML / no dangerouslySetInnerHTML
 */

import type {
  EntityDetailsDocumentV1,
  EntityDetailsItem,
} from "@/lib/entity-details/types";
import { isEmptyValue } from "@/lib/entity-details/is-empty-value";

// ---------------------------------------------------------------------------
// Field value renderer
// ---------------------------------------------------------------------------

function FieldValue({ item }: { item: EntityDetailsItem }) {
  const { type, value } = item;

  if (type === "boolean") {
    return (
      <span className="text-[15px] text-text">
        {value === true ? "예" : value === false ? "아니오" : "—"}
      </span>
    );
  }

  if (type === "number") {
    if (value === null || value === undefined) return null;
    return <span className="text-[15px] text-text">{String(value)}</span>;
  }

  if (type === "list") {
    const items = Array.isArray(value) ? value : [];
    if (items.length === 0) return null;
    return (
      <ul className="space-y-1.5 list-disc list-inside">
        {items.map((entry, index) => (
          <li key={`${item.id}-${index}`} className="text-[15px] text-text">
            {entry}
          </li>
        ))}
      </ul>
    );
  }

  if (type === "url") {
    const href = typeof value === "string" ? value : "";
    if (!href) return null;
    // Only allow http/https
    if (!href.startsWith("http://") && !href.startsWith("https://")) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline text-[15px]"
      >
        {item.label_ko ?? href}
      </a>
    );
  }

  // text, textarea, fallback
  if (isEmptyValue(value)) return null;

  const text = String(value);
  return (
    <p className="text-[15px] text-text leading-relaxed whitespace-pre-line">
      {text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Empty check for item (considering type semantics)
// ---------------------------------------------------------------------------

function isItemEmpty(item: EntityDetailsItem): boolean {
  if (item.type === "boolean") {
    // false is NOT empty
    return item.value === null || item.value === undefined;
  }
  if (item.type === "number") {
    // 0 is NOT empty
    return item.value === null || item.value === undefined;
  }
  return isEmptyValue(item.value);
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

interface EntityDetailsRendererProps {
  details: EntityDetailsDocumentV1;
}

export function EntityDetailsRenderer({ details }: EntityDetailsRendererProps) {
  if (!details || !details.sections) return null;

  const sections = details.sections
    .filter((s) => s.is_visible !== false)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const items = (section.items ?? [])
          .filter((i) => i.is_visible !== false)
          .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

        // Hide section if all items are empty
        const hasContent = items.some((item) => !isItemEmpty(item));
        if (items.length === 0 || !hasContent) return null;

        return (
          <section
            key={section.id}
            className="bg-surface border border-border rounded-[12px] p-4"
          >
            <h2 className="text-[16px] font-bold text-text mb-3">
              {section.emoji ? `${section.emoji} ` : ""}
              {/* Use JSON title_ko directly — no global label override */}
              {section.title_ko}
            </h2>

            <div className="space-y-3">
              {items.map((item) => {
                if (isItemEmpty(item)) return null;
                return (
                  <div key={item.id}>
                    {item.label_ko && item.type !== "url" && (
                      <div className="text-[13px] text-muted mb-1">
                        {item.label_ko}
                      </div>
                    )}
                    <FieldValue item={item} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
