/**
 * Shared CMS V2 entity details type contracts.
 *
 * Phase 2.5 — shared foundation for Golf/Hotel/Restaurant/Attraction.
 * DB `version` stays 1. All extensions are additive/backward-compatible.
 */

// ---------------------------------------------------------------------------
// Entity type discriminator
// ---------------------------------------------------------------------------

export type CmsEntityType =
  | "GOLF"
  | "HOTEL"
  | "RESTAURANT"
  | "ATTRACTION";

// ---------------------------------------------------------------------------
// Item type / value
// ---------------------------------------------------------------------------

export type EntityDetailItemType =
  | "text"
  | "textarea"
  | "boolean"
  | "number"
  | "url"
  | "list";

export type EntityDetailItemValue =
  | string
  | number
  | boolean
  | string[]
  | null;

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

export interface EntityDetailsItem {
  id: string;

  /** Internal stable key — immutable from normal UI. */
  key?: string;
  /** Per-entity display label (Korean). Canonical for migrated JSON. */
  label_ko?: string;
  /** Per-entity display label (Japanese), optional. */
  label_jp?: string | null;

  type: EntityDetailItemType | string;
  value: EntityDetailItemValue;

  sort?: number;
  is_visible?: boolean;

  value_jp?: string | null;
  legacy_id?: string;

  source?: string;
  source_table?: string;
  source_column?: string;
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export interface EntityDetailsSection {
  id: string;
  key: string;
  title_ko: string;
  title_jp?: string | null;
  emoji?: string | null;
  sort: number;
  is_visible: boolean;

  source?: string;
  source_table?: string;
  source_column?: string;
  legacy_id?: string;

  items: EntityDetailsItem[];
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export interface EntityDetailsDocumentV1 {
  version: 1;
  sections: EntityDetailsSection[];
}

// ---------------------------------------------------------------------------
// Editor-specific types
// ---------------------------------------------------------------------------

export interface EntityEditorData {
  id: string;
  slug: string;
  display_name: string;
  entity_type: string;
  area?: string;
  updated_at: string;
  details_json: EntityDetailsDocumentV1 | null;
}

export interface EntityEditorGetResponse {
  success: true;
  data: EntityEditorData;
}

export interface EntityEditorRpcResult {
  conflict: boolean;
  id?: string;
  slug?: string;
  updated_at?: string;
  details_json?: EntityDetailsDocumentV1;
  current_updated_at?: string;
  revalidated?: boolean;
}

export interface EntityEditorPutResponse {
  success: true;
  data: EntityEditorRpcResult;
}

export interface EntityDetailsEditorProps {
  entityId: string;
  entityType: CmsEntityType;
  onClose?: () => void;
  onSaved?: () => void;
}
