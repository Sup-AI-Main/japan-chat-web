#!/usr/bin/env node
/**
 * Golf details_json enrichment script.
 *
 * Adds missing metadata (key, label_ko, sort, is_visible) to existing Golf
 * JSON items/sections that were backfilled without these fields.
 *
 * Usage:
 *   node scripts/enrich-golf-details-json.mjs --dry-run
 *   node scripts/enrich-golf-details-json.mjs --write
 *
 * Safety:
 * - Only enriches metadata — never changes values, visibility, or IDs
 * - Uses optimistic concurrency (expected_updated_at) — no blind overwrite
 * - Idempotent: second run produces no changes
 * - Reports all failures without stopping
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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

if (!isDryRun && !isWrite) {
  console.error("Usage: node scripts/enrich-golf-details-json.mjs [--dry-run|--write]");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------------------------------------------------------------------------
// Enrichment logic
// ---------------------------------------------------------------------------

function makeStableKey(label, prefix, idx) {
  if (!label) return `${prefix}_${idx}`;
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base ? `${prefix}_${base}` : `${prefix}_${idx}`;
}

function enrichDocument(doc) {
  if (!doc || doc.version !== 1 || !Array.isArray(doc.sections)) {
    return { doc, changed: false };
  }

  let changed = false;
  const enriched = JSON.parse(JSON.stringify(doc));

  for (let si = 0; si < enriched.sections.length; si++) {
    const section = enriched.sections[si];

    // Enrich section metadata
    if (section.title_jp === undefined) {
      section.title_jp = null;
      changed = true;
    }
    if (section.sort === undefined || section.sort === null) {
      section.sort = si;
      changed = true;
    }
    if (section.is_visible === undefined || section.is_visible === null) {
      section.is_visible = true;
      changed = true;
    }

    // Enrich item metadata
    for (let ii = 0; ii < (section.items || []).length; ii++) {
      const item = section.items[ii];

      if (!item.key) {
        item.key = makeStableKey(
          item.label_ko || item.source_column || "",
          section.key || "item",
          ii
        );
        changed = true;
      }
      // Never generate "항목 N" placeholder labels — renderer handles empty labels
      if (item.label_ko === null || item.label_ko === undefined) {
        item.label_ko = item.source_column || "";
        changed = true;
      }
      if (item.label_jp === undefined) {
        item.label_jp = null;
        changed = true;
      }
      if (item.sort === undefined || item.sort === null) {
        item.sort = ii;
        changed = true;
      }
      if (item.is_visible === undefined || item.is_visible === null) {
        item.is_visible = true;
        changed = true;
      }
      if (item.value_jp === undefined) {
        item.value_jp = null;
        changed = true;
      }
    }
  }

  return { doc: enriched, changed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "WRITE"}`);
  console.log("---");

  // Get active Golf entities
  const { data: entities, error } = await db
    .from("entities")
    .select("id, slug, display_name, updated_at, details_json")
    .eq("entity_type", "GOLF")
    .eq("active", true);

  if (error) {
    console.error("DB query failed:", error.message);
    process.exit(1);
  }

  console.log(`Found ${entities.length} active Golf entities`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const failures = [];

  for (const entity of entities) {
    const doc = entity.details_json;

    if (!doc || doc.version !== 1) {
      console.log(`  SKIP ${entity.slug}: no valid V1 document`);
      skipCount++;
      continue;
    }

    const { doc: enriched, changed } = enrichDocument(doc);

    if (!changed) {
      console.log(`  OK   ${entity.slug}: already enriched`);
      successCount++;
      continue;
    }

    console.log(`  ${isDryRun ? "WOULD" : "WILL"} ENRICH ${entity.slug}`);

    if (isDryRun) {
      successCount++;
      continue;
    }

    // Write with optimistic concurrency
    const { error: updateError } = await db
      .from("entities")
      .update({ details_json: enriched })
      .eq("id", entity.id)
      .eq("updated_at", entity.updated_at);

    if (updateError) {
      console.error(`  FAIL ${entity.slug}: ${updateError.message}`);
      failures.push({ slug: entity.slug, error: updateError.message });
      failCount++;
    } else {
      console.log(`  DONE ${entity.slug}`);
      successCount++;
    }
  }

  console.log("---");
  console.log(`Results: ${successCount} success, ${skipCount} skipped, ${failCount} failed`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  ${f.slug}: ${f.error}`);
    }
  }

  // Second run check (idempotency)
  if (isWrite && successCount > 0) {
    console.log("\n--- Idempotency check ---");
    const { data: checkEntities } = await db
      .from("entities")
      .select("id, slug, details_json")
      .eq("entity_type", "GOLF")
      .eq("active", true);

    let idempotent = true;
    for (const entity of checkEntities || []) {
      const { changed } = enrichDocument(entity.details_json);
      if (changed) {
        console.log(`  NOT IDEMPOTENT: ${entity.slug}`);
        idempotent = false;
      }
    }
    console.log(`Idempotent: ${idempotent ? "YES" : "NO"}`);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
