#!/usr/bin/env node
/**
 * Restaurant details_json backfill script.
 *
 * Seeds EntityDetailsDocumentV1 into entities.details_json for active Restaurants
 * that have details_json = null, using legacy restaurant column values.
 *
 * Only variable detail columns are migrated. Core/relational columns
 * (category, address, hours, price_range, phone, google_maps_url) stay in
 * the restaurants table.
 *
 * Usage:
 *   node scripts/backfill-restaurant-details-json.mjs --dry-run   (default)
 *   node scripts/backfill-restaurant-details-json.mjs --write
 *   node scripts/backfill-restaurant-details-json.mjs --verify
 *
 * Safety:
 * - Only targets active Restaurants with details_json = null
 * - Skips inactive Restaurants and Restaurants that already have details_json
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
  console.error("Usage: node scripts/backfill-restaurant-details-json.mjs [--dry-run|--write|--verify]");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------------------------------------------------------------------------
// Section mapping: legacy column → section/item
//
// Core fields NOT migrated (stay relational in restaurants table):
//   category, address, hours, price_range, phone, google_maps_url
//
// restaurant_locations stays relational (distance/near FK relations).
// name_jp stays in entity_field_values (EAV).
// ---------------------------------------------------------------------------

const SECTION_DEFS = [
  {
    key: "menu",
    title_ko: "대표 메뉴",
    title_ja: "代表メニュー",
    emoji: "🍽️",
    sort: 1,
    fields: [
      { key: "menu_kr", label_ko: "메뉴 (한국어)", label_ja: "メニュー（韓国語）", type: "text", col: "menu_kr" },
      { key: "menu_jp", label_ko: "메뉴 (일본어)", label_ja: "メニュー（日本語）", type: "text", col: "menu_jp" },
      { key: "menu_price", label_ko: "메뉴 가격", label_ja: "メニュー価格", type: "text", col: "menu_price" },
    ],
  },
  {
    key: "closed_days",
    title_ko: "휴무일",
    title_ja: "定休日",
    emoji: "📅",
    sort: 2,
    fields: [
      { key: "closed_days", label_ko: "정기휴일", label_ja: "定休日", type: "text", col: "closed_days" },
    ],
  },
  {
    key: "other_info",
    title_ko: "추가 정보",
    title_ja: "追加情報",
    emoji: "ℹ️",
    sort: 3,
    fields: [
      { key: "description", label_ko: "설명", label_ja: "説明", type: "textarea", col: "description" },
      { key: "recommended", label_ko: "추천 식당", label_ja: "おすすめレストラン", type: "boolean", col: "recommended" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Build EntityDetailsDocumentV1 from legacy restaurant row
// ---------------------------------------------------------------------------

function buildDocument(restaurant, entityId) {
  const sections = [];

  for (const secDef of SECTION_DEFS) {
    const items = [];

    for (const fieldDef of secDef.fields) {
      const rawValue = restaurant[fieldDef.col];

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
        id: `rest_${fieldDef.key}_${entityId}`,
        key: fieldDef.key,
        label_ko: fieldDef.label_ko,
        label_jp: fieldDef.label_ja ?? null,
        type: fieldDef.type,
        value,
        sort: items.length,
        is_visible: true,
        source: "backfill",
        source_table: "restaurants",
        source_column: fieldDef.col,
      });
    }

    if (items.length === 0) continue;

    sections.push({
      id: `rest_${secDef.key}_${entityId}`,
      key: secDef.key,
      title_ko: secDef.title_ko,
      title_jp: secDef.title_ja ?? null,
      emoji: secDef.emoji ?? null,
      sort: secDef.sort,
      is_visible: true,
      source: "backfill",
      source_table: "restaurants",
      items,
    });
  }

  return { version: 1, sections };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Restaurant details_json backfill (${mode || "--dry-run"}) ===\n`);

  // 1. Fetch active Restaurants with details_json
  const { data: rows, error } = await db
    .from("entities")
    .select(`
      id, slug, display_name, updated_at, details_json,
      restaurants!inner(
        menu_kr, menu_jp, menu_price,
        closed_days, description, recommended
      )
    `)
    .eq("entity_type", "RESTAURANT")
    .eq("active", true);

  if (error) {
    console.error("Failed to fetch Restaurants:", error.message);
    process.exit(1);
  }

  const targets = (rows || []).filter((r) => !r.details_json);
  const alreadyMigrated = (rows || []).filter((r) => r.details_json);

  console.log(`Active Restaurants total: ${rows?.length ?? 0}`);
  console.log(`Already migrated (details_json != null): ${alreadyMigrated.length}`);
  console.log(`Pending backfill: ${targets.length}\n`);

  if (isVerify) {
    if (targets.length > 0) {
      console.log("VERIFY: Some active Restaurants still have details_json = null:");
      for (const t of targets) {
        console.log(`  - ${t.slug} (${t.display_name})`);
      }
      process.exit(1);
    }
    console.log("VERIFY: All active Restaurants have details_json. PASS.");
    process.exit(0);
  }

  if (targets.length === 0) {
    console.log("Nothing to backfill.");
    process.exit(0);
  }

  // 2. Build documents and preview
  const plans = targets.map((row) => {
    const restaurant = row.restaurants;
    const doc = buildDocument(restaurant, row.id);
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
  const backupPath = join(backupDir, `restaurant-backfill-before-${Date.now()}.json`);
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
