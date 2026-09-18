import fs from 'fs';
import pg from 'pg';

// Load .env.local
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const pool = new pg.Pool({
  host: env.SUPABASE_DB_HOST,
  port: parseInt(env.SUPABASE_DB_PORT || '5432'),
  user: env.SUPABASE_DB_USER,
  password: env.SUPABASE_DB_PASSWORD,
  database: env.SUPABASE_DB_NAME,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

const AREA_CODE = 'DOS';

function ts() { return performance.now(); }
function ms(v) { return Math.round(v * 100) / 100; }

// Resolve area ID (simulates resolveAreaId)
async function resolveAreaId(areaCode) {
  const res = await pool.query('SELECT id FROM areas WHERE code = $1', [areaCode]);
  return res.rows[0]?.id || null;
}

// Simulate the5 queries from page.tsx
async function getAreaCategories() {
  const res = await pool.query(
    `SELECT id, code, label, icon, description, group_type, active, sort, updated_at
     FROM categories WHERE active = true AND group_type = 'AREA' ORDER BY sort`
  );
  return res.rows;
}

async function getFaq(areaId) {
  const res = await pool.query(
    `SELECT f.id, f.scope, f.question, f.answer, f.source_url, f.status, f.active, f.sort, f.updated_at,
            a.code as area_code, c.code as category_code, e.slug as entity_slug, e.display_name as entity_name
     FROM faq f
     LEFT JOIN areas a ON f.area_id = a.id
     LEFT JOIN categories c ON f.category_id = c.id
     LEFT JOIN entities e ON f.related_entity_id = e.id
     WHERE f.active = true
       AND (f.area_id = $1 OR f.area_id IS NULL)
     ORDER BY f.sort`, [areaId]
  );
  return res.rows;
}

async function getTravelTimes(areaCode) {
  const res = await pool.query(
    `SELECT tt.id, tt.product_reference_minutes, tt.display_time, tt.directions_url, tt.active, tt.sort,
            fe.slug as from_slug, fe.display_name as from_name, fe.area_id as from_area_id,
            te.slug as to_slug, te.display_name as to_name,
            a.code as area_code
     FROM travel_times tt
     JOIN entities fe ON tt.from_entity_id = fe.id
     JOIN entities te ON tt.to_entity_id = te.id
     JOIN areas a ON fe.area_id = a.id
     WHERE tt.active = true AND a.code = $1
     ORDER BY tt.sort`, [areaCode]
  );
  return res.rows;
}

async function getAreaEntitySummaryMap(areaId) {
  const res = await pool.query(
    `SELECT slug, display_name, entity_type
     FROM entities
     WHERE entity_type IN ('HOTEL', 'GOLF')
       AND area_id = $1
       AND active = true
     ORDER BY sort`, [areaId]
  );
  return res.rows;
}

async function getCommonCategories() {
  const res = await pool.query(
    `SELECT id, code, label, icon, description, group_type, active, sort, updated_at
     FROM categories WHERE active = true AND group_type = 'COMMON' ORDER BY sort`
  );
  return res.rows;
}

async function run() {
  // Warm up
  await pool.query('SELECT 1');
  const areaId = await resolveAreaId(AREA_CODE);
  console.log(`Area ID for ${AREA_CODE}: ${areaId}\n`);

  // ---- RUN 1: Sequential baseline ----
  console.log('=== RUN 1: Sequential ===');
  const seqBase = ts();
  const t1 = ts(); await getAreaCategories(); console.log(`getAreaCategories: ${ms(ts() - t1)}ms`);
  const t2 = ts(); await getFaq(areaId); console.log(`getFaq: ${ms(ts() - t2)}ms`);
  const t3 = ts(); await getTravelTimes(AREA_CODE); console.log(`getTravelTimes: ${ms(ts() - t3)}ms`);
  const t4 = ts(); await getAreaEntitySummaryMap(areaId); console.log(`getAreaEntitySummaryMap: ${ms(ts() - t4)}ms`);
  const t5 = ts(); await getCommonCategories(); console.log(`getCommonCategories: ${ms(ts() - t5)}ms`);
  console.log(`Sequential total: ${ms(ts() - seqBase)}ms\n`);

  // ---- RUN 2: Parallel (same as page.tsx Promise.all) ----
  console.log('=== RUN 2: Parallel (Promise.all) ===');
  const timestamps = {};
  function tracked(label, fn) {
    const start = ts();
    timestamps[label] = { start: 0, end: 0, duration: 0 };
    timestamps[label].start = ms(start - parallelBase);
    return fn().then(result => {
      timestamps[label].end = ms(ts() - parallelBase);
      timestamps[label].duration = ms(timestamps[label].end - timestamps[label].start);
      return result;
    });
  }

  const parallelBase = ts();
  await Promise.all([
    tracked('getAreaCategories', () => getAreaCategories()),
    tracked('getFaq', () => getFaq(areaId)),
    tracked('getTravelTimes', () => getTravelTimes(AREA_CODE)),
    tracked('getAreaEntitySummaryMap', () => getAreaEntitySummaryMap(areaId)),
    tracked('getCommonCategories', () => getCommonCategories()),
  ]);
  const parallelTotal = ms(ts() - parallelBase);

  for (const [label, ts_] of Object.entries(timestamps)) {
    console.log(`${label}: start=${ts_.start}ms end=${ts_.end}ms duration=${ts_.duration}ms`);
  }
  console.log(`Parallel total: ${parallelTotal}ms\n`);

  // ---- RUN 3: Parallel (second run, warm) ----
  console.log('=== RUN 3: Parallel (warm, second run) ===');
  const timestamps2 = {};
  function tracked2(label, fn) {
    const start = ts();
    timestamps2[label] = { start: 0, end: 0, duration: 0 };
    timestamps2[label].start = ms(start - parallelBase2);
    return fn().then(result => {
      timestamps2[label].end = ms(ts() - parallelBase2);
      timestamps2[label].duration = ms(timestamps2[label].end - timestamps2[label].start);
      return result;
    });
  }

  const parallelBase2 = ts();
  await Promise.all([
    tracked2('getAreaCategories', () => getAreaCategories()),
    tracked2('getFaq', () => getFaq(areaId)),
    tracked2('getTravelTimes', () => getTravelTimes(AREA_CODE)),
    tracked2('getAreaEntitySummaryMap', () => getAreaEntitySummaryMap(areaId)),
    tracked2('getCommonCategories', () => getCommonCategories()),
  ]);
  const parallelTotal2 = ms(ts() - parallelBase2);

  for (const [label, ts_] of Object.entries(timestamps2)) {
    console.log(`${label}: start=${ts_.start}ms end=${ts_.end}ms duration=${ts_.duration}ms`);
  }
  console.log(`Parallel total: ${parallelTotal2}ms\n`);

  // ---- RUN 4: Parallel (third run) ----
  console.log('=== RUN 4: Parallel (third run) ===');
  const timestamps3 = {};
  const parallelBase3 = ts();
  await Promise.all([
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getAreaCategories'] = { start: s, end: 0, duration: 0 }; return getAreaCategories().then(r => { timestamps3['getAreaCategories'].end = ms(ts() - parallelBase3); timestamps3['getAreaCategories'].duration = ms(timestamps3['getAreaCategories'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getFaq'] = { start: s, end: 0, duration: 0 }; return getFaq(areaId).then(r => { timestamps3['getFaq'].end = ms(ts() - parallelBase3); timestamps3['getFaq'].duration = ms(timestamps3['getFaq'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getTravelTimes'] = { start: s, end: 0, duration: 0 }; return getTravelTimes(AREA_CODE).then(r => { timestamps3['getTravelTimes'].end = ms(ts() - parallelBase3); timestamps3['getTravelTimes'].duration = ms(timestamps3['getTravelTimes'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getAreaEntitySummaryMap'] = { start: s, end: 0, duration: 0 }; return getAreaEntitySummaryMap(areaId).then(r => { timestamps3['getAreaEntitySummaryMap'].end = ms(ts() - parallelBase3); timestamps3['getAreaEntitySummaryMap'].duration = ms(timestamps3['getAreaEntitySummaryMap'].end - s); return r; }); })(),
    (() => { const s = ms(ts() - parallelBase3); timestamps3['getCommonCategories'] = { start: s, end: 0, duration: 0 }; return getCommonCategories().then(r => { timestamps3['getCommonCategories'].end = ms(ts() - parallelBase3); timestamps3['getCommonCategories'].duration = ms(timestamps3['getCommonCategories'].end - s); return r; }); })(),
  ]);
  const parallelTotal3 = ms(ts() - parallelBase3);

  for (const [label, ts_] of Object.entries(timestamps3)) {
    console.log(`${label}: start=${ts_.start}ms end=${ts_.end}ms duration=${ts_.duration}ms`);
  }
  console.log(`Parallel total: ${parallelTotal3}ms\n`);

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
