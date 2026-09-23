#!/usr/bin/env node
/**
 * Cleanup "항목 N" placeholder labels from active Golf details_json.
 *
 * What it does:
 * - Finds all active Golf entities with placeholder labels matching /^항목\s+\d+$/
 * - Saves a BEFORE JSON backup to scripts/backups/ before any write
 * - Clears placeholder label_ko to "" (renderer handles empty gracefully)
 * - Uses optimistic concurrency (expected_updated_at) — no blind overwrite
 * - Reports all changes and failures
 *
 * Usage:
 *   node scripts/cleanup-placeholder-labels.mjs --dry-run
 *   node scripts/cleanup-placeholder-labels.mjs --write
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
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
  console.error("Usage: node scripts/cleanup-placeholder-labels.mjs [--dry-run|--write]");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLACEHOLDER_RE = /^항목\s+\d+$/;

function isPlaceholder(label) {
  if (!label) return false;
  return PLACEHOLDER_RE.test(label.trim());
}

function countPlaceholders(doc) {
  let count = 0;
  for (const section of doc.sections || []) {
    for (const item of section.items || []) {
      if (isPlaceholder(item.label_ko)) count++;
    }
  }
  return count;
}

function cleanPlaceholders(doc) {
  const cleaned = JSON.parse(JSON.stringify(doc));
  let cleanedCount = 0;

  for (const section of cleaned.sections || []) {
    for (const item of section.items || []) {
      if (isPlaceholder(item.label_ko)) {
        item.label_ko = "";
        cleanedCount++;
      }
    }
  }

  return { doc: cleaned, cleanedCount };
}

function saveBackup(slug, doc) {
  const backupDir = join(__dirname, "backups");
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${slug}_BEFORE_${timestamp}.json`;
  const filepath = join(backupDir, filename);
  writeFileSync(filepath, JSON.stringify(doc, null, 2), "utf-8");
  return filepath;
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
    .eq("active", true)
    .order("slug");

  if (error) {
    console.error("DB query failed:", error.message);
    process.exit(1);
  }

  console.log(`Found ${entities.length} active Golf entities\n`);

  let totalPlaceholders = 0;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const failures = [];

  for (const entity of entities) {
    const doc = entity.details_json;

    if (!doc || doc.version !== 1 || !Array.isArray(doc.sections)) {
      console.log(`  SKIP ${entity.slug}: no valid V1 document`);
      skipCount++;
      continue;
    }

    const placeholderCount = countPlaceholders(doc);
    totalPlaceholders += placeholderCount;

    if (placeholderCount === 0) {
      console.log(`  OK   ${entity.slug}: no placeholders`);
      successCount++;
      continue;
    }

    console.log(
      `  ${isDryRun ? "WOULD" : "WILL"} CLEAN ${entity.slug}: ${placeholderCount} placeholder(s)`
    );

    if (isDryRun) {
      // Show what would be cleaned
      for (const section of doc.sections) {
        for (const item of section.items || []) {
          if (isPlaceholder(item.label_ko)) {
            console.log(`         ${section.title_ko} → "${item.label_ko}" → ""`);
          }
        }
      }
      successCount++;
      continue;
    }

    // Write mode: backup then clean
    const backupPath = saveBackup(entity.slug, doc);
    console.log(`         Backup: ${backupPath}`);

    const { doc: cleaned, cleanedCount } = cleanPlaceholders(doc);

    // Optimistic concurrency
    const { error: updateError } = await db
      .from("entities")
      .update({ details_json: cleaned })
      .eq("id", entity.id)
      .eq("updated_at", entity.updated_at);

    if (updateError) {
      console.error(`  FAIL ${entity.slug}: ${updateError.message}`);
      failures.push({ slug: entity.slug, error: updateError.message });
      failCount++;
    } else {
      console.log(`  DONE ${entity.slug}: cleaned ${cleanedCount} placeholder(s)`);
      successCount++;
    }
  }

  console.log("---");
  console.log(`Total placeholders found: ${totalPlaceholders}`);
  console.log(
    `Results: ${successCount} success, ${skipCount} skipped, ${failCount} failed`
  );

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  ${f.slug}: ${f.error}`);
    }
  }

  // Idempotency check after write
  if (isWrite && successCount > 0) {
    console.log("\n--- Idempotency check ---");
    const { data: checkEntities } = await db
      .from("entities")
      .select("id, slug, details_json")
      .eq("entity_type", "GOLF")
      .eq("active", true);

    let remaining = 0;
    for (const entity of checkEntities || []) {
      const count = countPlaceholders(entity.details_json || {});
      if (count > 0) {
        console.log(`  STILL HAS PLACEHOLDERS: ${entity.slug} (${count})`);
        remaining += count;
      }
    }
    console.log(`Remaining placeholders: ${remaining}`);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
