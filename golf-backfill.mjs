/**
 * Golf details_json backfill script
 *
 * Maps existing relational data into EntityDetailsDocumentV1 JSON structure.
 * Core fields (address, phone, google_maps_url, official_name) stay relational.
 * Only variable content sections go into details_json.
 *
 * Modes:
 *   node golf-backfill.mjs              — skip entities that already have details_json
 *   node golf-backfill.mjs --repair     — force re-backfill all active Golf entities
 *
 * Deduplication: content_sections whose title matches a golf_courses field label
 * are skipped to avoid duplicate sections in details_json.
 *
 * Usage: node golf-backfill.mjs [--repair] [connection-string]
 */

import pg from 'pg';
import { readFileSync } from 'fs';

// Load .env.local if DATABASE_URL not set
if (!process.env.DATABASE_URL) {
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch { /* no .env.local */ }
}

const args = process.argv.slice(2);
const repair = args.includes('--repair');
const connectionString = args.find(a => !a.startsWith('--')) || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Usage: node golf-backfill.mjs [--repair] [connection-string]');
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

let totalRows = 0;
let successRows = 0;
let skippedRows = 0;
let failedRows = 0;
const failures = [];

// Canonical golf_courses field labels — content_sections with these titles are
// considered duplicates and will be skipped during backfill.
const GOLF_FIELD_TITLES = new Set([
  '골프장 설명', '플레이/카트', '클럽하우스 식사',
  '목욕/샤워', '렌탈 골프채', '렌탈 안내', '복장',
]);

try {
  // Get all active Golf entities — cast updated_at to text to preserve microsecond precision
  const { rows: golfEntities } = await client.query(`
    SELECT e.id, e.slug, e.display_name, e.updated_at::text as updated_at
    FROM public.entities e
    WHERE e.entity_type = 'GOLF' AND e.active = true
    ORDER BY e.slug
  `);

  totalRows = golfEntities.length;
  console.log(`Found ${totalRows} active Golf entities (repair=${repair})`);

  for (const entity of golfEntities) {
    try {
      // Skip if already backfilled (unless --repair)
      if (!repair) {
        const { rows: [current] } = await client.query(
          'SELECT details_json FROM public.entities WHERE id = $1',
          [entity.id]
        );

        if (current.details_json !== null) {
          console.log(`  SKIP ${entity.slug} (already has details_json)`);
          skippedRows++;
          continue;
        }
      }

      // Read golf_courses data
      const { rows: [golf] } = await client.query(
        'SELECT * FROM public.golf_courses WHERE entity_id = $1',
        [entity.id]
      );

      // Read content_sections
      const { rows: contentSections } = await client.query(
        `SELECT id, legacy_id, title, content, emoji, sort, is_visible
         FROM public.content_sections
         WHERE parent_entity_id = $1
         ORDER BY sort, id`,
        [entity.id]
      );

      // Read includes_excludes
      const { rows: incExc } = await client.query(
        `SELECT id, legacy_id, type, text_kr, text_jp, sort, is_visible
         FROM public.includes_excludes
         WHERE parent_entity_id = $1
         ORDER BY type, sort, id`,
        [entity.id]
      );

      // Build sections array
      const sections = [];

      // Map golf_courses columns to sections
      const fieldToSection = [
        { col: 'course_summary', key: 'description', title_ko: '골프장 설명', emoji: '⛳', sort: 1 },
        { col: 'play_cart', key: 'play_cart', title_ko: '플레이/카트', emoji: '🏌️', sort: 2 },
        { col: 'clubhouse_dining', key: 'clubhouse', title_ko: '클럽하우스 식사', emoji: '🍽️', sort: 3 },
        { col: 'bath_shower', key: 'bath_shower', title_ko: '목욕/샤워', emoji: '♨️', sort: 4 },
        { col: 'rental', key: 'rental', title_ko: '렌탈 골프채', emoji: '🎒', sort: 5 },
        { col: 'dress_code', key: 'dress_code', title_ko: '복장', emoji: '👔', sort: 6 },
      ];

      for (const mapping of fieldToSection) {
        const value = golf ? golf[mapping.col] : null;
        sections.push({
          id: `rel_${mapping.key}_${entity.id}`,
          key: mapping.key,
          title_ko: mapping.title_ko,
          emoji: mapping.emoji,
          sort: mapping.sort,
          is_visible: true,
          source: 'relational',
          source_table: 'golf_courses',
          source_column: mapping.col,
          items: value !== null && value !== ''
            ? [{ id: `item_${mapping.key}_${entity.id}`, type: 'text', value }]
            : [],
        });
      }

      // Map includes
      const includes = incExc.filter(r => r.type === 'INCLUDED');
      if (includes.length > 0) {
        sections.push({
          id: `rel_includes_${entity.id}`,
          key: 'includes',
          title_ko: '포함사항',
          emoji: '✅',
          sort: 7,
          is_visible: true,
          source: 'relational',
          source_table: 'includes_excludes',
          items: includes.map(r => ({
            id: r.id,
            type: 'text',
            value: r.text_kr || '',
            value_jp: r.text_jp || null,
            legacy_id: r.legacy_id,
            is_visible: r.is_visible,
          })),
        });
      }

      // Map excludes
      const excludes = incExc.filter(r => r.type === 'EXCLUDED');
      if (excludes.length > 0) {
        sections.push({
          id: `rel_excludes_${entity.id}`,
          key: 'excludes',
          title_ko: '불포함사항',
          emoji: '❌',
          sort: 8,
          is_visible: true,
          source: 'relational',
          source_table: 'includes_excludes',
          items: excludes.map(r => ({
            id: r.id,
            type: 'text',
            value: r.text_kr || '',
            value_jp: r.text_jp || null,
            legacy_id: r.legacy_id,
            is_visible: r.is_visible,
          })),
        });
      }

      // Map content_sections (추가 안내) — skip those whose title duplicates a golf_courses field
      let csSkipped = 0;
      for (const cs of contentSections) {
        if (GOLF_FIELD_TITLES.has(cs.title)) {
          csSkipped++;
          continue;
        }
        sections.push({
          id: cs.id,
          key: `cs_${cs.legacy_id || cs.id}`,
          title_ko: cs.title,
          emoji: cs.emoji || null,
          sort: cs.sort,
          is_visible: cs.is_visible,
          source: 'relational',
          source_table: 'content_sections',
          legacy_id: cs.legacy_id,
          items: cs.content !== null && cs.content !== ''
            ? [{ id: `item_cs_${cs.id}`, type: 'text', value: cs.content }]
            : [],
        });
      }

      // Build final document
      const details = {
        version: 1,
        sections,
      };

      // Save via RPC — pass updated_at as raw string from DB to preserve microsecond precision
      const updatedAtStr = String(entity.updated_at);
      console.log(`    DEBUG ${entity.slug}: updated_at=${updatedAtStr}`);
      const { rows: [result] } = await client.query(
        'SELECT * FROM public.admin_save_entity_editor_v1($1::uuid, $2::timestamptz, $3::jsonb)',
        [entity.id, updatedAtStr, JSON.stringify(details)]
      );

      const rpcResult = result.admin_save_entity_editor_v1;
      if (rpcResult.conflict) {
        console.log(`  CONFLICT ${entity.slug} — skipped`);
        failedRows++;
        failures.push({ slug: entity.slug, error: 'conflict' });
      } else {
        console.log(`  OK ${entity.slug} (${sections.length} sections, ${csSkipped} dup CS skipped)`);
        successRows++;
      }
    } catch (err) {
      console.error(`  FAIL ${entity.slug}: ${err.message}`);
      failedRows++;
      failures.push({ slug: entity.slug, error: err.message });
    }
  }

  // Summary
  console.log('\n=== BACKFILL SUMMARY ===');
  console.log(`Total: ${totalRows}`);
  console.log(`Success: ${successRows}`);
  console.log(`Skipped (already backfilled): ${skippedRows}`);
  console.log(`Failed: ${failedRows}`);
  if (failures.length > 0) {
    console.log('Failures:', JSON.stringify(failures, null, 2));
  }

  // Sample verification
  if (successRows > 0) {
    const { rows: [sample] } = await client.query(`
      SELECT e.slug, jsonb_pretty(e.details_json) as details
      FROM public.entities e
      WHERE e.entity_type = 'GOLF' AND e.details_json IS NOT NULL
      LIMIT 1
    `);
    console.log(`\nSample (${sample.slug}):`);
    console.log(sample.details);
  }

} finally {
  await client.end();
}
