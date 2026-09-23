#!/usr/bin/env node
/**
 * Export backup tables to local JSON files for safekeeping before DROP.
 * These files go to scripts/backups/ which is in .gitignore.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const backupDir = join(__dirname, 'backups');
mkdirSync(backupDir, { recursive: true });

const tables = [
  '_backup_golf_details_json_20260923',
  '_backup_includes_excludes_qa_20260923',
];

let exitCode = 0;

for (const table of tables) {
  console.log(`Exporting public.${table}...`);
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' });

  if (error) {
    console.error(`  ERROR: ${error.message}`);
    exitCode = 1;
    continue;
  }

  const outPath = join(backupDir, `${table}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`  Rows exported: ${data.length} (count: ${count})`);
  console.log(`  Saved to: ${outPath}`);
}

process.exit(exitCode);