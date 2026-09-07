#!/usr/bin/env node
/**
 * cms_schema + content_sections 탭 생성 마이그레이션
 * 
 * 실행: node scripts/migrate-schema-tabs.mjs
 */

import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  val = val.replace(/\\n/g, "\n");
  env[key] = val;
}

const SHEET_ID = env.GOOGLE_SHEET_ID;
const auth = new google.auth.JWT(
  env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  undefined,
  env.GOOGLE_PRIVATE_KEY,
  ["https://www.googleapis.com/auth/spreadsheets"]
);
const sheets = google.sheets({ version: "v4", auth });

const CS_HEADERS = [
  "id", "parent_type", "parent_id", "title", "content", "emoji",
  "sort", "is_visible", "created_at", "updated_at",
];

const SCHEMA_HEADERS = [
  "id", "entity", "sheet_name", "field_key", "physical_column",
  "display_label", "field_type", "required", "editable", "repeatable",
  "sortable", "visible", "relation_target", "default_value", "description",
];

// 현재 실제 스키마 데이터 — types.ts + google-sheets.ts 기준
const SCHEMA_ROWS = [
  // ── golf_courses ──
  ["sc_golf_1", "golf_courses", "golf_courses", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "자동생성 ID (golf_{ts}_{rand})"],
  ["sc_golf_2", "golf_courses", "golf_courses", "area", "area", "지역", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "AdminOption.code(option_type=AREA)", "", "DOS/BEPPU 등"],
  ["sc_golf_3", "golf_courses", "golf_courses", "display_name", "display_name", "상품표명", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "한글 fallback: 상품표명"],
  ["sc_golf_4", "golf_courses", "golf_courses", "official_name", "official_name", "공식명", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "일본어 공식명. fallback: 공식명(jp), 공식명"],
  ["sc_golf_5", "golf_courses", "golf_courses", "address", "address", "주소", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 주소"],
  ["sc_golf_6", "golf_courses", "golf_courses", "phone", "phone", "전화", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 전화"],
  ["sc_golf_7", "golf_courses", "golf_courses", "course_summary", "course_summary", "코스 안내", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 코스요약"],
  ["sc_golf_8", "golf_courses", "golf_courses", "play_cart", "play_cart", "플레이/카트", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 플레이/카트"],
  ["sc_golf_9", "golf_courses", "golf_courses", "clubhouse_dining", "clubhouse_dining", "클럽하우스 식사", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 클럽하우스 식사"],
  ["sc_golf_10", "golf_courses", "golf_courses", "bath_shower", "bath_shower", "목욕/샤워", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 목욕/샤워"],
  ["sc_golf_11", "golf_courses", "golf_courses", "rental", "rental", "렌탈", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 렌탈"],
  ["sc_golf_12", "golf_courses", "golf_courses", "dress_code", "dress_code", "복장", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 복장"],
  ["sc_golf_13", "golf_courses", "golf_courses", "google_maps_url", "google_maps_url", "구글맵 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_golf_14", "golf_courses", "golf_courses", "source_url", "source_url", "소스 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_golf_15", "golf_courses", "golf_courses", "status", "status", "상태", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "published", ""],
  ["sc_golf_16", "golf_courses", "golf_courses", "active", "active", "활성", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", "Sheet에는 TRUE/FALSE 문자열"],
  ["sc_golf_17", "golf_courses", "golf_courses", "sort", "sort", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", "parseInt(val,10) NaN→0"],
  ["sc_golf_18", "golf_courses", "golf_courses", "last_verified", "last_verified", "최종검증일", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_golf_19", "golf_courses", "golf_courses", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", "ISO timestamp, 낙관적잠금용"],

  // ── hotels ──
  ["sc_hotel_1", "hotels", "hotels", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "hotel_{ts}_{rand}"],
  ["sc_hotel_2", "hotels", "hotels", "area", "area", "지역", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "AdminOption.code(option_type=AREA)", "", ""],
  ["sc_hotel_3", "hotels", "hotels", "official_name", "official_name", "호텔명", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 공식명"],
  ["sc_hotel_4", "hotels", "hotels", "address", "address", "주소", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 주소"],
  ["sc_hotel_5", "hotels", "hotels", "phone", "phone", "전화", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 전화"],
  ["sc_hotel_6", "hotels", "hotels", "check_in", "check_in", "체크인", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 체크인"],
  ["sc_hotel_7", "hotels", "hotels", "check_out", "check_out", "체크아웃", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 체크아웃"],
  ["sc_hotel_8", "hotels", "hotels", "breakfast", "breakfast", "조식", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 조식"],
  ["sc_hotel_9", "hotels", "hotels", "bath_spa", "bath_spa", "목욕/스파", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 목욕/스파"],
  ["sc_hotel_10", "hotels", "hotels", "hotel_dining", "hotel_dining", "호텔 식사", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 호텔 식사"],
  ["sc_hotel_11", "hotels", "hotels", "atm_payment", "atm_payment", "ATM/결제", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: ATM/결제"],
  ["sc_hotel_12", "hotels", "hotels", "transport", "transport", "교통", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 교통"],
  ["sc_hotel_13", "hotels", "hotels", "google_maps_url", "google_maps_url", "구글맵 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_14", "hotels", "hotels", "source_url", "source_url", "소스 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_hotel_15", "hotels", "hotels", "status", "status", "상태", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "published", ""],
  ["sc_hotel_16", "hotels", "hotels", "active", "active", "활성", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", "Sheet: TRUE/FALSE"],
  ["sc_hotel_17", "hotels", "hotels", "sort", "sort", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", ""],
  ["sc_hotel_18", "hotels", "hotels", "last_verified", "last_verified", "최종검증일", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_hotel_19", "hotels", "hotels", "name_kr", "name_kr", "한글명", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_20", "hotels", "hotels", "name_jp", "name_jp", "일본어명", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_21", "hotels", "hotels", "address_kr", "address_kr", "한글 주소", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_22", "hotels", "hotels", "address_jp", "address_jp", "일본어 주소", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_23", "hotels", "hotels", "checkin_time", "checkin_time", "체크인 시간", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_24", "hotels", "hotels", "checkout_time", "checkout_time", "체크아웃 시간", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_25", "hotels", "hotels", "breakfast_place", "breakfast_place", "조식 장소", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_26", "hotels", "hotels", "breakfast_time", "breakfast_time", "조식 시간", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_27", "hotels", "hotels", "breakfast_last_entry", "breakfast_last_entry", "조식 입장마감", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_28", "hotels", "hotels", "dinner_place", "dinner_place", "석식 장소", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_29", "hotels", "hotels", "dinner_time", "dinner_time", "석식 시간", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_30", "hotels", "hotels", "dinner_last_entry", "dinner_last_entry", "석식 입장마감", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_31", "hotels", "hotels", "has_public_bath", "has_public_bath", "대욕장 있음", "boolean", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "FALSE", "Sheet: TRUE/FALSE 문자열"],
  ["sc_hotel_32", "hotels", "hotels", "has_outdoor_onsen", "has_outdoor_onsen", "노천탕 있음", "boolean", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "FALSE", "Sheet: TRUE/FALSE"],
  ["sc_hotel_33", "hotels", "hotels", "has_sauna", "has_sauna", "사우나 있음", "boolean", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "FALSE", "Sheet: TRUE/FALSE"],
  ["sc_hotel_34", "hotels", "hotels", "bath_spa_hours", "bath_spa_hours", "대욕장 운영시간", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_35", "hotels", "hotels", "tattoo_policy", "tattoo_policy", "타투 정책", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_36", "hotels", "hotels", "other_info", "other_info", "기타 정보", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_hotel_37", "hotels", "hotels", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", ""],

  // ── travel_times ──
  ["sc_tt_1", "travel_times", "travel_times", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "tt_{ts}"],
  ["sc_tt_2", "travel_times", "travel_times", "area", "area", "지역", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "AdminOption.code(AREA)", "", ""],
  ["sc_tt_3", "travel_times", "travel_times", "hotel_id", "from_id", "호텔 ID", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "Hotel.id", "", "Sheet: from_id, 코드: hotel_id fallback"],
  ["sc_tt_4", "travel_times", "travel_times", "golf_id", "to_id", "골프장 ID", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "GolfCourse.id", "", "Sheet: to_id, 코드: golf_id fallback"],
  ["sc_tt_5", "travel_times", "travel_times", "estimated_time", "verified_drive_min", "이동시간", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "3중 fallback: verified_drive_min, 상품표_참고분, estimated_time"],
  ["sc_tt_6", "travel_times", "travel_times", "google_maps_direction_url", "directions_url", "길찾기 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "Sheet: directions_url, 코드: google_maps_direction_url fallback"],
  ["sc_tt_7", "travel_times", "travel_times", "active", "active", "활성", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", "소프트삭제용"],
  ["sc_tt_8", "travel_times", "travel_times", "sort", "sort", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", ""],
  ["sc_tt_9", "travel_times", "travel_times", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", ""],

  // ── restaurants ──
  ["sc_rest_1", "restaurants", "restaurants", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "rest_{ts}_{rand}"],
  ["sc_rest_2", "restaurants", "restaurants", "area", "area", "지역", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "AdminOption.code(AREA)", "", ""],
  ["sc_rest_3", "restaurants", "restaurants", "near_type", "near_type", "근접 타입", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "", "HOTEL", "HOTEL/GOLF/AREA"],
  ["sc_rest_4", "restaurants", "restaurants", "near_id", "near_id", "근접 대상 ID", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "Hotel.id|GolfCourse.id", "", ""],
  ["sc_rest_5", "restaurants", "restaurants", "name", "name", "이름", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_6", "restaurants", "restaurants", "category", "category", "카테고리", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_7", "restaurants", "restaurants", "distance", "distance", "거리", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "UI에서 자동생성: 차량 약 X분"],
  ["sc_rest_8", "restaurants", "restaurants", "address", "address", "주소", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_9", "restaurants", "restaurants", "hours", "hours", "영업시간", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_10", "restaurants", "restaurants", "price_range", "price_range", "가격대", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_11", "restaurants", "restaurants", "phone", "phone", "전화", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_12", "restaurants", "restaurants", "google_maps_url", "google_maps_url", "구글맵 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_13", "restaurants", "restaurants", "source_url", "source_url", "소스 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_rest_14", "restaurants", "restaurants", "status", "status", "상태", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "published", ""],
  ["sc_rest_15", "restaurants", "restaurants", "active", "active", "활성", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", ""],
  ["sc_rest_16", "restaurants", "restaurants", "sort", "sort", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", ""],
  ["sc_rest_17", "restaurants", "restaurants", "last_verified", "last_verified", "최종검증일", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_rest_18", "restaurants", "restaurants", "name_kr", "name_kr", "한글명", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_19", "restaurants", "restaurants", "name_jp", "name_jp", "일본어명", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_20", "restaurants", "restaurants", "menu_kr", "menu_kr", "메뉴(한글)", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_21", "restaurants", "restaurants", "menu_jp", "menu_jp", "메뉴(일본어)", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_22", "restaurants", "restaurants", "menu_price", "menu_price", "메뉴 가격", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_23", "restaurants", "restaurants", "closed_days", "closed_days", "휴무일", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_24", "restaurants", "restaurants", "distance_km", "distance_km", "거리(km)", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_25", "restaurants", "restaurants", "drive_minutes", "drive_minutes", "차량 시간(분)", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_26", "restaurants", "restaurants", "walk_minutes", "walk_minutes", "도보 시간(분)", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_27", "restaurants", "restaurants", "description", "description", "설명", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_rest_28", "restaurants", "restaurants", "recommended", "recommended", "추천", "boolean", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "FALSE", "toBool() 변환"],
  ["sc_rest_29", "restaurants", "restaurants", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", ""],

  // ── faq ──
  ["sc_faq_1", "faq", "faq", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "faq_{ts}_{rand}"],
  ["sc_faq_2", "faq", "faq", "area", "area", "지역", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "AdminOption.code(AREA)", "", "ALL 가능"],
  ["sc_faq_3", "faq", "faq", "category", "category", "카테고리", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "AdminOption.code(CATEGORY)", "", ""],
  ["sc_faq_4", "faq", "faq", "related_type", "related_type", "관련 타입", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", "GOLF/HOTEL/RESTAURANT"],
  ["sc_faq_5", "faq", "faq", "related_id", "related_id", "관련 ID", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "Golf|Hotel|Restaurant.id", "", ""],
  ["sc_faq_6", "faq", "faq", "related_name", "related_name", "관련 이름", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_faq_7", "faq", "faq", "question_scope", "question_scope", "질문 범위", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_faq_8", "faq", "faq", "question", "question", "질문", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_faq_9", "faq", "faq", "answer", "answer", "답변", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_faq_10", "faq", "faq", "source_url", "source_url", "소스 URL", "string", "FALSE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", ""],
  ["sc_faq_11", "faq", "faq", "status", "status", "상태", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "published", ""],
  ["sc_faq_12", "faq", "faq", "active", "active", "활성", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", ""],
  ["sc_faq_13", "faq", "faq", "sort", "sort", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", ""],
  ["sc_faq_14", "faq", "faq", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", ""],

  // ── admin_options ──
  ["sc_opt_1", "admin_options", "admin_options", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "opt_{type}_{code}"],
  ["sc_opt_2", "admin_options", "admin_options", "option_type", "option_type", "옵션 타입", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "", "", "AREA/CATEGORY"],
  ["sc_opt_3", "admin_options", "admin_options", "code", "code", "코드", "string", "TRUE", "TRUE", "FALSE", "TRUE", "TRUE", "", "", "대문자, unique"],
  ["sc_opt_4", "admin_options", "admin_options", "label", "label", "표시명", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 관리자 화면 표시명"],
  ["sc_opt_5", "admin_options", "admin_options", "description", "description", "설명", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "fallback: 설명"],
  ["sc_opt_6", "admin_options", "admin_options", "group", "group", "그룹", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "AREA/Common. fallback: 그룹"],
  ["sc_opt_7", "admin_options", "admin_options", "active", "active", "활성", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", "소프트삭제"],
  ["sc_opt_8", "admin_options", "admin_options", "sort", "sort", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", ""],
  ["sc_opt_9", "admin_options", "admin_options", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", ""],

  // ── includes_excludes ──
  ["sc_ie_1", "includes_excludes", "includes_excludes", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "ie_{ts}_{rand}"],
  ["sc_ie_2", "includes_excludes", "includes_excludes", "parent_type", "parent_type", "부모 타입", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", "GOLF/HOTEL"],
  ["sc_ie_3", "includes_excludes", "includes_excludes", "parent_id", "parent_id", "부모 ID", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "Golf|Hotel.id", "", ""],
  ["sc_ie_4", "includes_excludes", "includes_excludes", "type", "type", "구분", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "INCLUDED/EXCLUDED"],
  ["sc_ie_5", "includes_excludes", "includes_excludes", "text_kr", "text_kr", "내용(한글)", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_ie_6", "includes_excludes", "includes_excludes", "text_jp", "text_jp", "내용(일본어)", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", ""],
  ["sc_ie_7", "includes_excludes", "includes_excludes", "sort_order", "sort_order", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", ""],
  ["sc_ie_8", "includes_excludes", "includes_excludes", "is_visible", "is_visible", "표시여부", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", "Sheet: TRUE/FALSE"],
  ["sc_ie_9", "includes_excludes", "includes_excludes", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", ""],

  // ── content_sections ──
  ["sc_cs_1", "content_sections", "content_sections", "id", "id", "ID", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "cs_{ts}_{rand}"],
  ["sc_cs_2", "content_sections", "content_sections", "parent_type", "parent_type", "부모 타입", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "", "", "GOLF/HOTEL/RESTAURANT"],
  ["sc_cs_3", "content_sections", "content_sections", "parent_id", "parent_id", "부모 ID", "string", "TRUE", "TRUE", "FALSE", "FALSE", "FALSE", "Golf|Hotel|Restaurant.id", "", ""],
  ["sc_cs_4", "content_sections", "content_sections", "title", "title", "제목", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "한글 fallback: 제목. 관리자 수정 가능"],
  ["sc_cs_5", "content_sections", "content_sections", "content", "content", "내용", "string", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "한글 fallback: 내용. 관리자 수정 가능"],
  ["sc_cs_6", "content_sections", "content_sections", "emoji", "emoji", "이모지", "string", "FALSE", "TRUE", "FALSE", "FALSE", "TRUE", "", "", "한글 fallback: 이모지"],
  ["sc_cs_7", "content_sections", "content_sections", "sort", "sort", "정렬", "number", "FALSE", "TRUE", "FALSE", "TRUE", "TRUE", "", "0", ""],
  ["sc_cs_8", "content_sections", "content_sections", "is_visible", "is_visible", "표시여부", "boolean", "TRUE", "TRUE", "FALSE", "FALSE", "TRUE", "", "TRUE", "Sheet: TRUE/FALSE"],
  ["sc_cs_9", "content_sections", "content_sections", "created_at", "created_at", "생성일시", "string", "TRUE", "FALSE", "FALSE", "FALSE", "FALSE", "", "auto", "ISO timestamp"],
  ["sc_cs_10", "content_sections", "content_sections", "updated_at", "updated_at", "수정일시", "string", "TRUE", "FALSE", "FALSE", "TRUE", "FALSE", "", "auto", "낙관적잠금용"],
];

async function createTabIfMissing(tabName, headers) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existing = (meta.data.sheets || []).map(s => s.properties?.title || "");
    
    if (existing.includes(tabName)) {
      console.log(`  ✅ "${tabName}" 탭 이미 존재`);
      return false;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });

    console.log(`  ✅ "${tabName}" 탭 생성 완료`);
    return true;
  } catch (e) {
    console.error(`  ❌ "${tabName}" 탭 생성 실패:`, e.message);
    return false;
  }
}

async function appendRows(tabName, rows) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
    console.log(`  ✅ "${tabName}"에 ${rows.length}개 행 추가 완료`);
    return true;
  } catch (e) {
    console.error(`  ❌ "${tabName}" 행 추가 실패:`, e.message);
    return false;
  }
}

async function main() {
  console.log("=== cms_schema + content_sections 탭 마이그레이션 ===\n");

  // 1. content_sections 탭 생성
  console.log("1. content_sections 탭 생성:");
  await createTabIfMissing("content_sections", CS_HEADERS);

  // 2. cms_schema 탭 생성
  console.log("\n2. cms_schema 탭 생성:");
  await createTabIfMissing("cms_schema", SCHEMA_HEADERS);

  // 3. cms_schema에 현재 전체 구조 등록
  console.log("\n3. cms_schema 데이터 등록:");
  await appendRows("cms_schema", SCHEMA_ROWS);

  console.log("\n=== 마이그레이션 완료 ===");
}

main().catch(console.error);