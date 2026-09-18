#!/usr/bin/env node
/**
 * CMS Schema Verification Script (A13)
 *
 * Read-only check that all required DB objects exist.
 * Uses DIRECT_URL (session-mode connection).
 * Exit 0 = all checks pass, Exit 1 = missing objects.
 *
 * Never prints credentials or connection strings.
 */

import pg from "pg";

const REQUIRED_TABLES = [
  "entities",
  "golf_courses",
  "hotels",
  "restaurants",
  "faq",
  "categories",
  "areas",
  "content_sections",
  "includes_excludes",
  "travel_times",
  "restaurant_locations",
  "entity_categories",
  "entity_field_values",
  "field_definitions",
  "section_definitions",
  "change_log",
];

const REQUIRED_COLUMNS = {
  entities: ["id", "slug", "display_name", "entity_type", "area_id", "active", "sort", "updated_at"],
  hotels: ["entity_id", "official_name", "address", "phone"],
  golf_courses: ["entity_id", "official_name", "address", "phone"],
  restaurants: ["entity_id", "category", "address", "phone"],
  faq: ["id", "question", "answer", "entity_type"],
  travel_times: ["id", "from_entity", "to_entity", "product_reference_minutes"],
  areas: ["id", "code", "name_kr", "active"],
  categories: ["id", "code", "label", "active"],
};

const REQUIRED_FUNCTIONS = [
  "delete_area_cascade",
  "delete_category_cascade",
  "delete_entity_cascade",
  "delete_field_definition_cascade",
];

async function main() {
  const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connStr) {
    console.error("FAIL: DIRECT_URL or DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  // Never log the connection string
  const client = new pg.Client({ connectionString: connStr });
  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");

    let failures = 0;

    // 1. Check tables
    const { rows: tableRows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const existingTables = new Set(tableRows.map((r) => r.table_name));
    for (const t of REQUIRED_TABLES) {
      if (!existingTables.has(t)) {
        console.error(`MISSING TABLE: public.${t}`);
        failures++;
      }
    }

    // 2. Check columns
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
      if (!existingTables.has(table)) continue; // already reported
      const { rows: colRows } = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      const existingCols = new Set(colRows.map((r) => r.column_name));
      for (const col of columns) {
        if (!existingCols.has(col)) {
          console.error(`MISSING COLUMN: public.${table}.${col}`);
          failures++;
        }
      }
    }

    // 3. Check SECURITY DEFINER functions
    const { rows: funcRows } = await client.query(
      `SELECT p.proname
       FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE n.nspname = 'public'`
    );
    const existingFuncs = new Set(funcRows.map((r) => r.proname));
    for (const fn of REQUIRED_FUNCTIONS) {
      if (!existingFuncs.has(fn)) {
        console.error(`MISSING FUNCTION: public.${fn}`);
        failures++;
      }
    }

    // 4. Check RLS is enabled on core tables
    const { rows: rlsRows } = await client.query(
      `SELECT tablename, rowsecurity FROM pg_tables
       WHERE schemaname = 'public'`
    );
    const rlsMap = new Map(rlsRows.map((r) => [r.tablename, r.rowsecurity]));
    for (const t of REQUIRED_TABLES) {
      if (existingTables.has(t) && !rlsMap.get(t)) {
        console.error(`RLS NOT ENABLED: public.${t}`);
        failures++;
      }
    }

    await client.query("COMMIT");

    if (failures > 0) {
      console.error(`\nFAILED: ${failures} issue(s) found.`);
      process.exit(1);
    } else {
      console.log("PASS: All schema checks passed.");
      process.exit(0);
    }
  } catch (err) {
    console.error("FAIL: Could not verify schema.", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
