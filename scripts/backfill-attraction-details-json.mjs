#!/usr/bin/env node
/**
 * Attraction details_json backfill script.
 *
 * Seeds EntityDetailsDocumentV1 into entities.details_json for active Attractions
 * that have details_json = null, using legacy EAV field values.
 *
 * Usage:
 *   node scripts/backfill-attraction-details-json.mjs --dry-run   (default)
 *   node scripts/backfill-attraction-details-json.mjs --write
 *   node scripts/backfill-attraction-details-json.mjs --verify
 *
 * Safety:
 * - Only targets active Attractions with details_json = null
 * - Skips inactive Attractions and Attractions that already have details_json
 * - Uses optimistic concurrency (expected_updated_at) — no blind overwrite
 * - Creates local backup before any write
 * - Idempotent: second run produces 0 writes
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if env vars are missing
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = join(__dirname, "..", ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const mode = process.argv[2];
const isDryRun = mode === "--dry-run" || !mode;
const isWrite = mode === "--write";
const isVerify = mode === "--verify";

if (!isDryRun && !isWrite && !isVerify) {
  console.error("Usage: node scripts/backfill-attraction-details-json.mjs [--dry-run|--write|--verify]");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------------------------------------------------------------------------
// Section mapping: EAV field → section/item
//
// Source of truth for mapping:
//   basic_info: name_jp, phone, google_maps_url
//   address: address_kr, address_jp
//   hours: hours, closed_days
//   admission: admission_fee, recommended_duration
//   parking: parking_info
//   description: description
//   other_info: other_info
// ---------------------------------------------------------------------------

const SECTION_DEFS = [
  {
    key: "basic_info",
    title_ko: "기본 정보",
    title_ja: "基本情報",
    emoji: "📍",
    sort: 1,
    fields: [
      { key: "name_jp", label_ko: "이름 (일본어)", label_ja: "名前（日本語）", type: "text", eavKey: "name_jp" },
      { key: "phone", label_ko: "전화번호", label_ja: "電話番号", type: "text", eavKey: "phone" },
      { key: "google_maps_url", label_ko: "Google Maps", label_ja: "Google Maps", type: "url", eavKey: "google_maps_url" },
    ],
  },
  {
    key: "address",
    title_ko: "주소",
    title_ja: "住所",
    emoji: "🗺️",
    sort: 2,
    fields: [
      { key: "address_kr", label_ko: "주소 (한국어)", label_ja: "住所（韓国語）", type: "text", eavKey: "address_kr" },
      { key: "address_jp", label_ko: "주소 (일본어)", label_ja: "住所（日本語）", type: "text", eavKey: "address_jp" },
    ],
  },
  {
    key: "hours",
    title_ko: "운영시간",
    title_ja: "営業時間",
    emoji: "🕐",
    sort: 3,
    fields: [
      { key: "hours", label_ko: "운영시간", label_ja: "営業時間", type: "text", eavKey: "hours" },
      { key: "closed_days", label_ko: "휴무일", label_ja: "定休日", type: "text", eavKey: "closed_days" },
    ],
  },
  {
    key: "admission",
    title_ko: "입장 정보",
    title_ja: "入場情報",
    emoji: "🎫",
    sort: 4,
    fields: [
      { key: "admission_fee", label_ko: "입장료", label_ja: "入場料", type: "text", eavKey: "admission_fee" },
      { key: "recommended_duration", label_ko: "추천 체류시간", label_ja: "推奨滞在時間", type: "text", eavKey: "recommended_duration" },
    ],
  },
  {
    key: "parking",
    title_ko: "주차",
    title_ja: "駐車場",
    emoji: "🅿️",
    sort: 5,
    fields: [
      { key: "parking_info", label_ko: "주차 정보", label_ja: "駐車場情報", type: "textarea", eavKey: "parking_info" },
    ],
  },
  {
    key: "description",
    title_ko: "설명",
    title_ja: "説明",
    emoji: "📝",
    sort: 6,
    fields: [
      { key: "description", label_ko: "설명", label_ja: "説明", type: "textarea", eavKey: "description" },
    ],
  },
  {
    key: "other_info",
    title_ko: "기타 안내",
    title_ja: "その他案内",
    emoji: "ℹ️",
    sort: 7,
    fields: [
      { key: "other_info", label_ko: "기타 안내", label_ja: "その他案内", type: "textarea", eavKey: "other_info" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Build EntityDetailsDocumentV1 from EAV field values
// ---------------------------------------------------------------------------

function buildDocument(fieldValues, entityId) {
  const sections = [];

  for (const secDef of SECTION_DEFS) {
    const items = [];

    for (const fieldDef of secDef.fields) {
      const rawValue = fieldValues[fieldDef.eavKey];
      const value = rawValue ?? "";

      // Skip items with empty text values
      if (!value) continue;

      items.push({
        id: `attr_${fieldDef.key}_${entityId}`,
        key: fieldDef.key,
        label_ko: fieldDef.label_ko,
        label_jp: fieldDef.label_ja ?? null,
        type: fieldDef.type,
        value,
        sort: items.length,
        is_visible: true,
        source: "backfill",
        source_table: "entity_field_values",
        source_column: fieldDef.eavKey,
      });
    }

    if (items.length === 0) continue;

    sections.push({
      id: `attr_${secDef.key}_${entityId}`,
      key: secDef.key,
      title_ko: secDef.title_ko,
      title_jp: secDef.title_ja ?? null,
      emoji: secDef.emoji ?? null,
      sort: secDef.sort,
      is_visible: true,
      source: "backfill",
      source_table: "entity_field_values",
      items,
    });
  }

  return { version: 1, sections };
}

// ---------------------------------------------------------------------------
// Fetch EAV field values for a set of entity IDs
// ---------------------------------------------------------------------------

async function fetchEavFieldValues(entityIds) {
  const map = new Map();
  if (entityIds.length === 0) return map;

  const allKeys = [
    "name_jp", "address_kr", "address_jp", "phone", "google_maps_url",
    "hours", "closed_days", "admission_fee", "recommended_duration",
    "parking_info", "description", "other_info",
  ];

  const { data, error } = await db
    .from("entity_field_values")
    .select("entity_id, value_text, field_definition:field_definitions!inner(field_key)")
    .in("entity_id", entityIds)
    .in("field_definitions.field_key", allKeys);

  if (error) {
    console.error("Failed to fetch EAV field values:", error.message);
    process.exit(1);
  }

  for (const row of data || []) {
    const eid = row.entity_id;
    const fdef = row.field_definition;
    if (!fdef) continue;
    if (!map.has(eid)) map.set(eid, {});
    map.get(eid)[fdef.field_key] = row.value_text || "";
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Attraction details_json backfill (${mode || "--dry-run"}) ===\n`);

  // 1. Fetch active Attractions with details_json
  const { data: rows, error } = await db
    .from("entities")
    .select("id, slug, display_name, updated_at, details_json")
    .eq("entity_type", "ATTRACTION")
    .eq("active", true);

  if (error) {
    console.error("Failed to fetch Attractions:", error.message);
    process.exit(1);
  }

  const targets = (rows || []).filter((r) => !r.details_json);
  const alreadyMigrated = (rows || []).filter((r) => r.details_json);

  console.log(`Active Attractions total: ${rows?.length ?? 0}`);
  console.log(`Already migrated (details_json != null): ${alreadyMigrated.length}`);
  console.log(`Pending backfill: ${targets.length}\n`);

  if (isVerify) {
    if (targets.length > 0) {
      console.log("VERIFY: Some active Attractions still have details_json = null:");
      for (const t of targets) {
        console.log(`  - ${t.slug} (${t.display_name})`);
      }
      process.exit(1);
    }
    console.log("VERIFY: All active Attractions have details_json. PASS.");
    process.exit(0);
  }

  if (targets.length === 0) {
    console.log("Nothing to backfill.");
    process.exit(0);
  }

  // 2. Fetch EAV values and build documents
  const entityIds = targets.map((r) => r.id);
  const eavMap = await fetchEavFieldValues(entityIds);

  const plans = targets.map((row) => {
    const fieldValues = eavMap.get(row.id) || {};
    const doc = buildDocument(fieldValues, row.id);
    return { row, doc, fieldValues };
  });

  // Print dry-run preview
  for (const { row, doc, fieldValues } of plans) {
    console.log(`--- ${row.slug} (${row.display_name}) ---`);
    console.log(`  EAV fields: ${Object.keys(fieldValues).length}`);
    console.log(`  sections: ${doc.sections.length}`);
    let totalItems = 0;
    for (const sec of doc.sections) {
      totalItems += sec.items.length;
      console.log(`  [${sec.key}] "${sec.title_ko}" — ${sec.items.length} items`);
      for (const item of sec.items) {
        const vis = item.is_visible ? "visible" : "hidden";
        const valStr = `"${String(item.value).slice(0, 60)}${String(item.value).length > 60 ? "..." : ""}"`;
        console.log(`    ${item.key} (${item.type}) = ${valStr} [${vis}]`);
      }
    }
    console.log(`  total items: ${totalItems}\n`);
  }

  if (isDryRun) {
    console.log(`DRY-RUN: Would write ${plans.length} documents. No changes made.`);
    process.exit(0);
  }

  // 3. Write mode — backup first
  const backupDir = join(__dirname, "backups");
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const backupPath = join(backupDir, `attraction-backfill-before-${Date.now()}.json`);
  const backupData = targets.map((r) => ({
    id: r.id,
    slug: r.slug,
    display_name: r.display_name,
    updated_at: r.updated_at,
    details_json: r.details_json,
  }));
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`Backup written: ${backupPath}`);

  // 4. Write using admin_save_entity_editor_v1 RPC
  let success = 0;
  let conflicts = 0;
  let failures = 0;

  for (const { row, doc } of plans) {
    const { data: rpcResult, error: rpcError } = await db.rpc("admin_save_entity_editor_v1", {
      p_entity_id: row.id,
      p_expected_updated_at: row.updated_at,
      p_details: doc,
    });

    if (rpcError) {
      console.error(`FAIL ${row.slug}: RPC error — ${rpcError.message}`);
      failures++;
      continue;
    }

    const result = rpcResult;
    if (result?.conflict) {
      console.warn(`CONFLICT ${row.slug}: stale updated_at. Skipped.`);
      conflicts++;
      continue;
    }

    if (result?.id) {
      console.log(`OK ${row.slug}: saved (new updated_at: ${result.updated_at})`);
      success++;
    } else {
      console.error(`FAIL ${row.slug}: unexpected RPC result`, JSON.stringify(result));
      failures++;
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Success: ${success}`);
  console.log(`Conflicts: ${conflicts}`);
  console.log(`Failures: ${failures}`);

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
