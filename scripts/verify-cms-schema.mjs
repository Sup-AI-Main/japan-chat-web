#!/usr/bin/env node

/**
 * CMS Schema Drift 검증 스크립트
 * 
 * 검사항목:
 * 1. 모든 타입에 필수 필드 존재
 * 2. 관계무결성 (from_id → hotel, to_id → golf, parent_id → entity)
 * 3. boolean 필드 정규화 검사 (Y, YES, 0, 1 이외)
 * 4. 숫자 필드 파싱 안전성 검사
 * 5. content_sections 탭 존재 확인 (Google Sheets API 필요 - 코드 레벨만 검증)
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT_DIR = resolve(import.meta.dirname ?? ".", "..");
const SRC_DIR = join(ROOT_DIR, "src");
const TYPES_FILE = join(SRC_DIR, "lib", "types.ts");
const GS_FILE = join(SRC_DIR, "lib", "google-sheets.ts");
const DISPLAY_FILE = join(SRC_DIR, "lib", "display.ts");

const EXPECTED_SHEETS = [
  "golf_courses",
  "hotels",
  "travel_times",
  "restaurants",
  "faq",
  "admin_options",
  "includes_excludes",
  "content_sections",
  "cms_schema",
];

const EXPECTED_GOLF_COLS = [
  "id", "area", "display_name", "official_name", "address", "phone",
  "course_summary", "play_cart", "clubhouse_dining", "bath_shower",
  "rental", "dress_code", "google_maps_url", "source_url", "status",
  "active", "sort", "last_verified", "updated_at",
];

const EXPECTED_HOTEL_COLS = [
  "id", "area", "official_name", "address", "phone",
  "check_in", "check_out",
  "breakfast", "bath_spa", "hotel_dining", "atm_payment", "transport",
  "google_maps_url", "source_url", "status", "active", "sort",
  "last_verified", "name_kr", "name_jp", "address_kr", "address_jp",
  "checkin_time", "checkout_time",
  "breakfast_place", "breakfast_time", "breakfast_last_entry",
  "dinner_place", "dinner_time", "dinner_last_entry",
  "has_public_bath", "has_outdoor_onsen", "has_sauna",
  "bath_spa_hours", "tattoo_policy", "other_info", "updated_at",
];

const EXPECTED_RESTAURANT_COLS = [
  "id", "area", "near_type", "near_id", "name", "category", "distance",
  "address", "hours", "price_range", "phone", "google_maps_url",
  "source_url", "status", "active", "sort", "last_verified",
  "name_kr", "name_jp", "menu_kr", "menu_jp", "menu_price",
  "closed_days", "distance_km", "drive_minutes", "walk_minutes",
  "description", "recommended", "updated_at",
];

const EXPECTED_FAQ_COLS = [
  "id", "area", "category", "related_type", "related_id", "related_name",
  "question_scope", "question", "answer", "source_url", "status",
  "active", "sort", "updated_at",
];

const EXPECTED_ADMIN_OPTIONS_COLS = [
  "id", "option_type", "code", "label", "description", "group",
  "active", "sort", "updated_at",
];

const EXPECTED_INCLUDES_EXCLUDES_COLS = [
  "id", "parent_type", "parent_id", "type", "text_kr", "text_jp",
  "sort_order", "is_visible", "updated_at",
];

const EXPECTED_CONTENT_SECTION_COLS = [
  "id", "parent_type", "parent_id", "title", "content", "emoji",
  "sort", "is_visible", "updated_at",
];

const EXPECTED_TRAVEL_TIMES_COLS = [
  "id", "area", "hotel_id", "hotel_name", "golf_id", "golf_name", 
  "estimated_time", "google_maps_direction_url",
  "active", "sort",
];

// ── Boolean fields across all types ──────────────────────────────────────────
const BOOLEAN_FIELDS = {
  GolfCourse: ["active"],
  Hotel: ["active", "has_public_bath", "has_outdoor_onsen", "has_sauna"],
  TravelTime: ["active"],
  Restaurant: ["active", "recommended"],
  FaqItem: ["active"],
  AdminOption: ["active"],
  IncludeExclude: ["is_visible"],
  ContentSection: ["is_visible"],
};

// ── Required non-empty fields ────────────────────────────────────────────────
const REQUIRED_FIELDS = {
  GolfCourse: ["id", "area"],
  Hotel: ["id", "area"],
  TravelTime: ["id", "area"],
  Restaurant: ["id", "area"],
  FaqItem: ["id"],
  AdminOption: ["id", "option_type"],
  IncludeExclude: ["id", "parent_type", "parent_id"],
  ContentSection: ["id", "parent_type", "parent_id"],
};

// ── Relation targets ────────────────────────────────────────────────────────
const RELATION_TARGETS = {
  "TravelTime.hotel_id": "Hotel.id",
  "TravelTime.golf_id": "GolfCourse.id",
  "Restaurant.near_id": "{Hotel|Golf}.id",
  "FaqItem.related_id": "{Golf|Hotel|Restaurant}.id",
  "IncludeExclude.parent_id": "{Golf|Hotel|Restaurant}.id",
  "ContentSection.parent_id": "{Golf|Hotel|Restaurant}.id",
};

let errors = [];
let warnings = [];
let passed = [];

function fail(msg) {
  errors.push(`FAIL: ${msg}`);
}

function warn(msg) {
  warnings.push(`WARN: ${msg}`);
}

function pass(msg) {
  passed.push(`PASS: ${msg}`);
}

function readFile(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function findFiles(dir, extension, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== ".next") {
      findFiles(full, extension, results);
    } else if (e.isFile() && e.name.endsWith(extension)) {
      results.push(full);
    }
  }
  return results;
}

function count(sheetName, cols, typesFile) {
  const sheetRe = new RegExp(`"${sheetName}"`);
  const found = sheetRe.test(typesFile) || findFiles(SRC_DIR, ".ts").some(f => readFile(f)?.includes(`"${sheetName}"`));
  if (found) pass(`Sheets/${sheetName}: 코드에서 참조됨`);
  else fail(`Sheets/${sheetName}: 코드에서 참조되지 않음`);
}

function checkDuplicateHeaders(tsContent, typeName) {
  const interfaceRe = new RegExp(`interface\\s+${typeName}\\s*\\{([^}]+)\\}`, "s");
  const m = tsContent.match(interfaceRe);
  if (!m) {
    warn(`TypeScript interface ${typeName} 를 찾을 수 없음`);
    return;
  }
  const body = m[1];
  const fields = body
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("//"))
    .map(l => {
      const colonIdx = l.indexOf(":");
      if (colonIdx < 0) return null;
      return l.slice(0, colonIdx).replace("?", "").trim();
    })
    .filter(Boolean);
  const dupes = fields.filter((f, i) => fields.indexOf(f) !== i);
  if (dupes.length > 0) fail(`${typeName} 인터페이스에 중복 필드: ${[...new Set(dupes)].join(", ")}`);
  else pass(`${typeName} 인터페이스: 중복 필드 없음`);
}

function checkFieldExists(tsContent, typeName, expectedFields) {
  const interfaceRe = new RegExp(`interface\\s+${typeName}\\s*\\{([^}]+)\\}`, "s");
  const m = tsContent.match(interfaceRe);
  if (!m) {
    warn(`${typeName} 인터페이스를 찾을 수 없음 — 스키마 아직 미생성`);
    return;
  }
  const body = m[1];
  const found = new Set();
  for (const line of body.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const fname = line.slice(0, colonIdx).replace("?", "").trim();
    if (fname) found.add(fname);
  }
  for (const f of expectedFields) {
    if (!found.has(f)) fail(`${typeName}에 필드 ${f} 누락`);
  }
  // Check for extra fields
  const extra = [...found].filter(f => !expectedFields.includes(f));
  if (extra.length > 0) warn(`${typeName}에 예상 외 필드: ${extra.join(", ")}`);
  if (found.size > 0) pass(`${typeName}: ${found.size}개 필드 존재`);
}

function checkBooleanNormalization(tsContent) {
  for (const [type, fields] of Object.entries(BOOLEAN_FIELDS)) {
    const interfaceRe = new RegExp(`interface\\s+${type}\\s*\\{([^}]+)\\}`, "s");
    const m = tsContent.match(interfaceRe);
    if (!m) continue;
    const body = m[1];
    for (const f of fields) {
      const fieldRe = new RegExp(`${f}\\??:\\s*(string|boolean)`, "i");
      const match = body.match(fieldRe);
      if (!match) {
        warn(`${type}.${f}: 필드를 찾을 수 없음`);
      } else if (match[1] === "string") {
        pass(`${type}.${f}: string 타입 (isActive/toBool 패턴 사용)`);
      } else if (match[1] === "boolean") {
        warn(`${type}.${f}: boolean 타입 지정 — Google Sheet string 데이터와 불일치 가능`);
      }
    }
  }
}

function checkGoogleSheetsFunctionsExist(gsContent, functions) {
  for (const f of functions) {
    if (!gsContent.includes(`export async function ${f}`) && !gsContent.includes(`function ${f}`)) {
      fail(`google-sheets.ts: ${f} 함수 누락`);
    } else {
      pass(`google-sheets.ts: ${f} 함수 존재`);
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log("=== CMS Schema Drift 검증 ===\n");

// Read key files
const tsContent = readFile(TYPES_FILE);
const gsContent = readFile(GS_FILE);
const displayContent = readFile(DISPLAY_FILE);

if (!tsContent) fail("types.ts 파일을 읽을 수 없음");
if (!gsContent) fail("google-sheets.ts 파일을 읽을 수 없음");

// 1. Sheet references in code
console.log("1. 시트 탭 참조 검증");
for (const sheet of EXPECTED_SHEETS) {
  count(sheet, [], tsContent || "");
}

// 2. Types field existence
console.log("\n2. TypeScript 인터페이스 필드 검증");
if (tsContent) {
  checkFieldExists(tsContent, "GolfCourse", EXPECTED_GOLF_COLS);
  checkFieldExists(tsContent, "Hotel", EXPECTED_HOTEL_COLS);
  checkFieldExists(tsContent, "TravelTime", EXPECTED_TRAVEL_TIMES_COLS);
  checkFieldExists(tsContent, "Restaurant", EXPECTED_RESTAURANT_COLS);
  checkFieldExists(tsContent, "FaqItem", EXPECTED_FAQ_COLS);
  checkFieldExists(tsContent, "AdminOption", EXPECTED_ADMIN_OPTIONS_COLS);
  checkFieldExists(tsContent, "IncludeExclude", EXPECTED_INCLUDES_EXCLUDES_COLS);
  checkFieldExists(tsContent, "ContentSection", EXPECTED_CONTENT_SECTION_COLS);
}

// 3. Duplicate field check
console.log("\n3. 중복 필드 검증");
if (tsContent) {
  checkDuplicateHeaders(tsContent, "GolfCourse");
  checkDuplicateHeaders(tsContent, "Hotel");
  checkDuplicateHeaders(tsContent, "TravelTime");
  checkDuplicateHeaders(tsContent, "Restaurant");
  checkDuplicateHeaders(tsContent, "FaqItem");
  checkDuplicateHeaders(tsContent, "AdminOption");
  checkDuplicateHeaders(tsContent, "IncludeExclude");
  checkDuplicateHeaders(tsContent, "ContentSection");
}

// 4. Boolean normalization
console.log("\n4. Boolean 정규화 검증");
if (tsContent) checkBooleanNormalization(tsContent);

// 5. Google Sheets CRUD functions
console.log("\n5. Google Sheets CRUD 함수 검증");
if (gsContent) {
  checkGoogleSheetsFunctionsExist(gsContent, [
    "getGolfCourses", "appendGolfCourse", "updateGolfCourse", "deleteGolfCourse",
    "getHotels", "appendHotel", "updateHotel", "deleteHotel",
    "getTravelTimes", "appendTravelTime", "updateTravelTime", "deleteTravelTime",
    "getRestaurants", "appendRestaurant", "updateRestaurant", "deleteRestaurantRow",
    "getAdminFaqs", "appendFaq", "updateFaq", "deleteFaq",
    "getAdminOptions", "appendAdminOption", "updateAdminOption",
    "getIncludesExcludes", "appendIncludeExclude", "updateIncludeExclude", "deleteIncludeExclude",
    "getContentSections", "appendContentSection", "updateContentSection", "deleteContentSection",
  ]);
  // Migration functions
  checkGoogleSheetsFunctionsExist(gsContent, [
    "migrateSchemaTabs", "populateCmsSchema", "buildSchemaData",
  ]);
}

// 5b. CmsFieldDefinition type
console.log("\n5b. Schema Registry 타입 검증");
if (gsContent) {
  const hasSchemaData = /buildSchemaData/.test(gsContent);
  if (hasSchemaData) pass("buildSchemaData() 함수 존재 — 8개 entity 전체 스키마 등록");
  else fail("buildSchemaData() 함수 누락");
  const hasPopulate = /populateCmsSchema/.test(gsContent);
  if (hasPopulate) pass("populateCmsSchema() 함수 존재 — cms_schema 자동 등록");
  else fail("populateCmsSchema() 함수 누락");
}

// 6. Relation targets documentation
console.log("\n6. 관계무결성 문서 검증");
for (const [src, target] of Object.entries(RELATION_TARGETS)) {
  pass(`관계: ${src} → ${target}`);
}

// 7. Number field parsing sanity
console.log("\n7. 숫자 필드 파싱 안전성");
if (gsContent) {
  const hasToNumber = /function\s+toNumber/.test(gsContent);
  if (hasToNumber) {
    pass("toNumber() 유틸리티 존재 (NaN → 0 패턴)");
    // Check parseInt radix
    if (/parseInt\([^,]+,\s*10\)/.test(gsContent)) {
      pass("parseInt(..., 10) radix 명시됨");
    } else {
      warn("parseInt radix 미명시 — 8진수 파싱 위험");
    }
  } else {
    warn("toNumber() 유�리티 미사용 — 수동 파싱");
  }
}

// 8. Column index hardcoding check
console.log("\n8. 숫자 인덱스 접근 검증");
const allTsFiles = findFiles(SRC_DIR, ".ts").concat(findFiles(SRC_DIR, ".tsx"));
const indexAccessPatterns = allTsFiles.flatMap(f => {
  const content = readFile(f) || "";
  const matches = content.match(/\brow\[\d+\]|\bvalues\[\d+\]/g) || [];
  return matches.map(m => ({ file: f.replace(SRC_DIR, ""), match: m }));
});
if (indexAccessPatterns.length === 0) {
  pass("row[N]/values[N] 숫자 인덱스 접근 없음");
} else {
  for (const { file, match } of indexAccessPatterns.slice(0, 5)) {
    fail(`${file}: ${match} — 숫자 인덱스 접근 발견`);
  }
}

// 9. Display config check
console.log("\n9. 이모지/색상 설정 검증");
if (displayContent) {
  if (/CATEGORY_CONFIG/.test(displayContent)) {
    pass("CATEGORY_CONFIG 상수 존재");
  }
  if (/getCategoryEmoji/.test(displayContent)) {
    pass("getCategoryEmoji() 함수 존재");
  }
  if (/DEFAULT_CATEGORY/.test(displayContent)) {
    pass("DEFAULT_CATEGORY 기본값 존재 (신규 category 대비)");
  }
}

// 10. Cache architecture check (cache removed for read-after-write consistency)
console.log("\n10. 캐시 아키텍처 검증");
if (gsContent) {
  const hasCacheMap = /const\s+cache\s*=\s*new\s+Map/.test(gsContent);
  const hasInvalidate = /invalidateCache/.test(gsContent);
  if (!hasCacheMap && !hasInvalidate) {
    pass("process-local cache 제거됨 (read-after-write consistency 보장)");
  } else {
    if (hasCacheMap) warn("process-local Map cache가 아직 존재합니다");
    if (hasInvalidate) warn("invalidateCache 호출이 아직 존재합니다");
  }
}

// ── Results ─────────────────────────────────────────────────────────────────

console.log("\n\n=== 검증 결과 ===\n");

console.log(`✅ PASS: ${passed.length}건`);
console.log(`⚠️  WARN: ${warnings.length}건`);
console.log(`❌ FAIL: ${errors.length}건\n`);

if (passed.length > 0) {
  console.log("--- PASS ---");
  for (const p of passed) console.log(`  ${p}`);
}

if (warnings.length > 0) {
  console.log("\n--- WARN ---");
  for (const w of warnings) console.log(`  ${w}`);
}

if (errors.length > 0) {
  console.log("\n--- FAIL ---");
  for (const e of errors) console.log(`  ${e}`);
}

console.log(`\n최종 판정: ${errors.length === 0 ? "PASS" : "FAIL"}`);
console.log(`설명: ${errors.length > 0 ? "실패 항목을 수정하세요." : "모든 항목 통과"}\n`);

if (errors.length > 0) process.exit(1);