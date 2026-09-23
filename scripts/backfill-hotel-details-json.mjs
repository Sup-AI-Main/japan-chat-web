#!/usr/bin/env node
/**
 * Hotel details_json backfill script.
 *
 * Seeds EntityDetailsDocumentV1 into entities.details_json for active Hotels
 * that have details_json = null, using legacy hotel column values.
 *
 * Usage:
 *   node scripts/backfill-hotel-details-json.mjs --dry-run   (default)
 *   node scripts/backfill-hotel-details-json.mjs --write
 *   node scripts/backfill-hotel-details-json.mjs --verify
 *
 * Safety:
 * - Only targets active Hotels with details_json = null
 * - Skips inactive Hotels and Hotels that already have details_json
 * - Uses optimistic concurrency (expected_updated_at) — no blind overwrite
 * - Creates local backup before any write
 * - Idempotent: second run produces 0 writes
 * - No --repair / --force-rebuild
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
  console.error("Usage: node scripts/backfill-hotel-details-json.mjs [--dry-run|--write|--verify]");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------------------------------------------------------------------------
// Section mapping: legacy column → section/item
// ---------------------------------------------------------------------------

const SECTION_DEFS = [
  {
    key: "stay_info",
    title_ko: "체크인/체크아웃",
    title_ja: "チェックイン/チェックアウト",
    sort: 1,
    fields: [
      { key: "checkin_time", label_ko: "체크인 시간", label_ja: "チェックイン時間", type: "text", col: "checkin_time" },
      { key: "checkout_time", label_ko: "체크아웃 시간", label_ja: "チェックアウト時間", type: "text", col: "checkout_time" },
    ],
  },
  {
    key: "breakfast",
    title_ko: "조식",
    title_ja: "朝食",
    sort: 2,
    fields: [
      { key: "breakfast_summary", label_ko: "조식 안내", label_ja: "朝食案内", type: "textarea", col: "breakfast_summary", initial_visible: false },
      { key: "breakfast_place", label_ko: "조식 장소", label_ja: "朝食場所", type: "text", col: "breakfast_place" },
      { key: "breakfast_time", label_ko: "조식 시간", label_ja: "朝食時間", type: "text", col: "breakfast_time" },
      { key: "breakfast_last_entry", label_ko: "조식 입장 마감", label_ja: "朝食最終入場", type: "text", col: "breakfast_last_entry" },
    ],
  },
  {
    key: "dinner",
    title_ko: "석식",
    title_ja: "夕食",
    sort: 3,
    fields: [
      { key: "dinner_summary", label_ko: "석식 안내", label_ja: "夕食案内", type: "textarea", col: "dinner_summary", initial_visible: false },
      { key: "dinner_place", label_ko: "석식 장소", label_ja: "夕食場所", type: "text", col: "dinner_place" },
      { key: "dinner_time", label_ko: "석식 시간", label_ja: "夕食時間", type: "text", col: "dinner_time" },
      { key: "dinner_last_entry", label_ko: "석식 입장 마감", label_ja: "夕食最終入場", type: "text", col: "dinner_last_entry" },
    ],
  },
  {
    key: "onsen_spa",
    title_ko: "온천/스파",
    title_ja: "温泉/スパ",
    sort: 4,
    fields: [
      { key: "bath_spa_summary", label_ko: "온천/스파 안내", label_ja: "温泉/スパ案内", type: "textarea", col: "bath_spa_summary", initial_visible: false },
      { key: "has_public_bath", label_ko: "대욕장", label_ja: "大浴場", type: "boolean", col: "has_public_bath" },
      { key: "has_outdoor_onsen", label_ko: "노천온천", label_ja: "露天風呂", type: "boolean", col: "has_outdoor_onsen" },
      { key: "has_sauna", label_ko: "사우나", label_ja: "サウナ", type: "boolean", col: "has_sauna" },
      { key: "bath_spa_hours", label_ko: "운영시간", label_ja: "営業時間", type: "text", col: "bath_spa_hours" },
      { key: "tattoo_policy", label_ko: "타투 정책", label_ja: "タトゥーポリシー", type: "textarea", col: "tattoo_policy" },
    ],
  },
  {
    key: "other_info",
    title_ko: "기타 안내",
    title_ja: "その他案内",
    sort: 5,
    fields: [
      { key: "other_info", label_ko: "기타 안내", label_ja: "その他案内", type: "textarea", col: "other_info" },
      { key: "atm_payment", label_ko: "ATM/결제", label_ja: "ATM/決済", type: "textarea", col: "atm_payment" },
      { key: "transport_note", label_ko: "교통 안내", label_ja: "交通案内", type: "textarea", col: "transport_note" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Build EntityDetailsDocumentV1 from legacy hotel row
// ---------------------------------------------------------------------------

function buildDocument(hotel, entityId) {
  const sections = [];

  for (const secDef of SECTION_DEFS) {
    const items = [];

    for (const fieldDef of secDef.fields) {
      const rawValue = hotel[fieldDef.col];

      let value;
      if (fieldDef.type === "boolean") {
        // Preserve null/false/true semantics
        if (rawValue === true || rawValue === false) {
          value = rawValue;
        } else {
          value = null; // null = 미확인
        }
      } else {
        value = rawValue ?? "";
      }

      // Skip items with empty text values (but keep booleans including false/null)
      if (fieldDef.type !== "boolean" && !value) continue;

      items.push({
        id: `hotel_${fieldDef.key}_${entityId}`,
        key: fieldDef.key,
        label_ko: fieldDef.label_ko,
        label_jp: fieldDef.label_ja ?? null,
        type: fieldDef.type,
        value,
        sort: items.length,
        is_visible: fieldDef.initial_visible !== undefined ? fieldDef.initial_visible : true,
        source: "backfill",
        source_table: "hotels",
        source_column: fieldDef.col,
      });
    }

    if (items.length === 0) continue;

    sections.push({
      id: `hotel_${secDef.key}_${entityId}`,
      key: secDef.key,
      title_ko: secDef.title_ko,
      title_jp: secDef.title_ja ?? null,
      emoji: null,
      sort: secDef.sort,
      is_visible: true,
      source: "backfill",
      source_table: "hotels",
      items,
    });
  }

  return { version: 1, sections };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Hotel details_json backfill (${mode || "--dry-run"}) ===\n`);

  // 1. Fetch active Hotels with details_json = null
  const { data: rows, error } = await db
    .from("entities")
    .select(`
      id, slug, display_name, updated_at, details_json,
      hotels!inner(
        checkin_time, checkout_time,
        breakfast_summary, breakfast_place, breakfast_time, breakfast_last_entry,
        dinner_summary, dinner_place, dinner_time, dinner_last_entry,
        bath_spa_summary, has_public_bath, has_outdoor_onsen, has_sauna,
        bath_spa_hours, tattoo_policy, atm_payment, transport_note, other_info
      )
    `)
    .eq("entity_type", "HOTEL")
    .eq("active", true);

  if (error) {
    console.error("Failed to fetch Hotels:", error.message);
    process.exit(1);
  }

  const targets = (rows || []).filter((r) => !r.details_json);
  const alreadyMigrated = (rows || []).filter((r) => r.details_json);

  console.log(`Active Hotels total: ${rows?.length ?? 0}`);
  console.log(`Already migrated (details_json != null): ${alreadyMigrated.length}`);
  console.log(`Pending backfill: ${targets.length}\n`);

  if (isVerify) {
    if (targets.length > 0) {
      console.log("VERIFY: Some active Hotels still have details_json = null:");
      for (const t of targets) {
        console.log(`  - ${t.slug} (${t.display_name})`);
      }
      process.exit(1);
    }
    console.log("VERIFY: All active Hotels have details_json. PASS.");
    process.exit(0);
  }

  if (targets.length === 0) {
    console.log("Nothing to backfill.");
    process.exit(0);
  }

  // 2. Build documents and preview
  const plans = targets.map((row) => {
    const hotel = row.hotels;
    const doc = buildDocument(hotel, row.id);
    return { row, doc };
  });

  // Print dry-run preview
  for (const { row, doc } of plans) {
    console.log(`--- ${row.slug} (${row.display_name}) ---`);
    console.log(`  sections: ${doc.sections.length}`);
    let totalItems = 0;
    for (const sec of doc.sections) {
      totalItems += sec.items.length;
      console.log(`  [${sec.key}] "${sec.title_ko}" — ${sec.items.length} items`);
      for (const item of sec.items) {
        const vis = item.is_visible ? "visible" : "hidden";
        const valStr = item.type === "boolean"
          ? String(item.value)
          : `"${String(item.value).slice(0, 60)}${String(item.value).length > 60 ? "..." : ""}"`;
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
  const backupPath = join(backupDir, `hotel-backfill-before-${Date.now()}.json`);
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

    // Supabase .rpc() returns jsonb directly (not array)
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
