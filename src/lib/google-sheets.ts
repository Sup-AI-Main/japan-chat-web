import { google } from "googleapis";
import type {
  GolfCourse,
  Hotel,
  TravelTime,
  Restaurant,
  FaqItem,
  AdminOption,
  IncludeExclude,
  ContentSection,
} from "./types";
import { ConflictError } from "./types";

// In-memory cache removed: data volume is small (golf 9, hotel 3, restaurant 12)
// and process-local Map cache causes read-after-write inconsistency in serverless.
// Google Sheets API response time (~200-500ms) is acceptable without caching.

// No-op stubs removed: cache fully eliminated.

// Google Sheets client
function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // Private key 정규화
  // Vercel 대시보드에서 env 설정 시 따옴표가 포함될 수 있으므로 제거
  // \n (literal backslash+n) → 실제 줄바꿈 변환
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  privateKey = privateKey.trim();
  // 선행/후행 따옴표 제거 (작은따옴표, 큰따옴표)
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!email || !privateKey || !sheetId) {
    throw new Error("Google Sheets credentials not configured");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, sheetId };
}

// Read a sheet tab and return rows as objects (no cache — data volume is small)
async function readSheet(
  tabName: string,
  range?: string
): Promise<Record<string, string>[]> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const fullRange = range || `${tabName}!A1:Z1000`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: fullRange,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return [];

    const headers = rows[0].map((h: string) => h.trim().toLowerCase());
    return rows.slice(1).map((row: string[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || "";
      });
      return obj;
    });
  } catch (error) {
    console.error(`Failed to read sheet: ${tabName}`, error);
    return [];
  }
}

// Parse helpers
function toNumber(val: string | undefined): number {
  if (!val) return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function isActive(val: string | undefined): boolean {
  return val?.toUpperCase() === "TRUE";
}

// Reverse mapping: English canonical key → possible Korean/legacy Sheet headers.
// Single source of truth for header aliasing. Used by both read (normalizeRow) and write paths.
const HEADER_ALIASES: Record<string, string[]> = {
  // Golf
  display_name: ["상품표명"],
  official_name: ["공식명(jp)", "공식명"],
  address: ["주소"],
  phone: ["전화"],
  course_summary: ["코스요약"],
  play_cart: ["플레이/카트"],
  clubhouse_dining: ["클럽하우스 식사"],
  bath_shower: ["목욕/샤워"],
  rental: ["렌탈"],
  dress_code: ["복장"],
  // Hotel
  check_in: ["체크인"],
  check_out: ["체크아웃"],
  breakfast: ["조식"],
  bath_spa: ["목욕/스파"],
  hotel_dining: ["호텔 식사"],
  atm_payment: ["ATM/결제"],
  transport: ["교통"],
  // Restaurant
  hours: ["영업시간"],
  cuisine: ["요리"],
  price_range: ["가격대"],
  distance: ["거리"],
  specialties: ["추천 메뉴"],
  parking: ["주차"],
  payment: ["결제"],
  // admin_options
  label: ["관리자 화면 표시명"],
  description: ["설명"],
  group: ["그룹"],
  // content_sections
  title: ["제목"],
  content: ["내용"],
  emoji: ["이모지"],
  // travel_times
  verified_drive_min: ["상품표_참고분"],
};

// Resolve a field value from a raw Sheet row using canonical key + aliases.
// Uses hasOwnProperty (not falsy check) so empty string "" is preserved as a valid value.
function resolveField(row: Record<string, string>, key: string): string {
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    return row[key] ?? "";
  }
  const aliases = HEADER_ALIASES[key] ?? [];
  for (const alias of aliases) {
    const normalized = alias.toLowerCase().trim();
    if (Object.prototype.hasOwnProperty.call(row, normalized)) {
      return row[normalized] ?? "";
    }
  }
  return "";
}

// Resolve a data key to the actual Sheet header for write operations.
// If the Sheet has the English key as a header, use it directly.
// Otherwise, check HEADER_ALIASES for a matching Korean header.
function resolveToSheetHeader(
  dataKey: string,
  sheetHeaders: string[]
): string | null {
  const lower = dataKey.toLowerCase().trim();
  if (sheetHeaders.includes(lower)) return lower;
  const aliases = HEADER_ALIASES[lower];
  if (aliases) {
    for (const alias of aliases) {
      if (sheetHeaders.includes(alias.toLowerCase().trim())) {
        return alias.toLowerCase().trim();
      }
    }
  }
  return null;
}

// Data access functions
export async function getGolfCourses(area?: string): Promise<GolfCourse[]> {
  const rows = await readSheet("golf_courses");
  return rows
    .filter((r) => isActive(r.active))
    .filter((r) => !area || r.area?.toUpperCase() === area.toUpperCase())
    .map((r) => ({
      id: r.id || "",
      area: r.area || "",
      display_name: resolveField(r, "display_name"),
      official_name: resolveField(r, "official_name"),
      address: resolveField(r, "address"),
      phone: resolveField(r, "phone"),
      course_summary: resolveField(r, "course_summary"),
      play_cart: resolveField(r, "play_cart"),
      clubhouse_dining: resolveField(r, "clubhouse_dining"),
      bath_shower: resolveField(r, "bath_shower"),
      rental: resolveField(r, "rental"),
      dress_code: resolveField(r, "dress_code"),
      google_maps_url: r.google_maps_url || "",
      source_url: r.source_url || "",
      status: r.status || "",
      active: r.active || "",
      sort: toNumber(r.sort),
      last_verified: r.last_verified || "",
      updated_at: r.updated_at || "",
    }))
    .sort((a, b) => a.sort - b.sort);
}

export async function getGolfCourseById(id: string): Promise<GolfCourse | null> {
  const courses = await getGolfCourses();
  return courses.find((c) => c.id === id) || null;
}

export async function getHotels(area?: string): Promise<Hotel[]> {
  const rows = await readSheet("hotels");
  return rows
    .filter((r) => isActive(r.active))
    .filter((r) => !area || r.area?.toUpperCase() === area.toUpperCase())
    .map((r) => ({
      id: r.id || "",
      area: r.area || "",
      official_name: resolveField(r, "official_name"),
      address: resolveField(r, "address"),
      phone: resolveField(r, "phone"),
      check_in: resolveField(r, "check_in"),
      check_out: resolveField(r, "check_out"),
      breakfast: resolveField(r, "breakfast"),
      bath_spa: resolveField(r, "bath_spa"),
      hotel_dining: resolveField(r, "hotel_dining"),
      atm_payment: resolveField(r, "atm_payment"),
      transport: resolveField(r, "transport"),
      google_maps_url: r.google_maps_url || "",
      source_url: r.source_url || "",
      status: r.status || "",
      active: r.active || "",
      sort: toNumber(r.sort),
      last_verified: r.last_verified || "",
      name_kr: r.name_kr || "",
      name_jp: r.name_jp || "",
      address_kr: r.address_kr || "",
      address_jp: r.address_jp || "",
      checkin_time: r.checkin_time || "",
      checkout_time: r.checkout_time || "",
      breakfast_place: r.breakfast_place || "",
      breakfast_time: r.breakfast_time || "",
      breakfast_last_entry: r.breakfast_last_entry || "",
      dinner_place: r.dinner_place || "",
      dinner_time: r.dinner_time || "",
      dinner_last_entry: r.dinner_last_entry || "",
      has_public_bath: r.has_public_bath || "",
      has_outdoor_onsen: r.has_outdoor_onsen || "",
      has_sauna: r.has_sauna || "",
      bath_spa_hours: r.bath_spa_hours || "",
      tattoo_policy: r.tattoo_policy || "",
      other_info: r.other_info || "",
      updated_at: r.updated_at || "",
    }))
    .sort((a, b) => a.sort - b.sort);
}

export async function getHotelById(id: string): Promise<Hotel | null> {
  const hotels = await getHotels();
  return hotels.find((h) => h.id === id) || null;
}

export async function getTravelTimes(area?: string): Promise<TravelTime[]> {
  const rows = await readSheet("travel_times");
  // Resolve hotel/golf names from their respective sheets
  const hotels = await getHotels();
  const golfCourses = await getGolfCourses();
  const hotelMap = new Map(hotels.map((h) => [h.id, h]));
  const golfMap = new Map(golfCourses.map((g) => [g.id, g]));

  return rows
    .filter((r) => isActive(r.active))
    .filter((r) => !area || r.area?.toUpperCase() === area.toUpperCase())
    .map((r) => {
      // Support both actual sheet columns and code-defined names
      const fromId = r.from_id || r.hotel_id || "";
      const toId = r.to_id || r.golf_id || "";
      return {
        id: r.id || "",
        area: r.area || "",
        hotel_id: fromId,
        hotel_name: hotelMap.get(fromId)?.official_name || r.hotel_name || "",
        golf_id: toId,
        golf_name: golfMap.get(toId)?.display_name || r.golf_name || "",
        estimated_time: resolveField(r, "verified_drive_min") || r.estimated_time || "",
        google_maps_direction_url: r.directions_url || r.google_maps_direction_url || "",
        active: r.active || "",
        sort: toNumber(r.sort),
      };
    })
    .sort((a, b) => a.sort - b.sort);
}

export async function appendTravelTime(
  data: Record<string, string | number>
): Promise<string | null> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "travel_times!A1:Z1",
    });
    const headers = headerResponse.data.values?.[0] || [];
    const newId = `tt_${Date.now()}`;
    const dataWithMeta: Record<string, string | number> = {
      id: newId,
      active: "TRUE",
      updated_at: new Date().toISOString(),
      ...data,
    };
    const row = headers.map(
      (h: string) => String(dataWithMeta[h.toLowerCase().trim()] ?? "")
    );

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "travel_times!A:A",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return newId;
  } catch (error) {
    console.error("Failed to append travel time", error);
    return null;
  }
}

export async function updateTravelTime(
  data: Record<string, string | number>
): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "travel_times!A1:Z1",
    });
    const headers = headerResponse.data.values?.[0] || [];

    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "travel_times!A1:Z500",
    });
    const rows = allData.data.values || [];

    const idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIndex] === data.id) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) return false;

    // 409 check
    const updatedAtColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "updated_at"
    );
    if (data.updated_at && updatedAtColIndex !== -1) {
      const currentUpdatedAt = rows[targetRowIndex - 1][updatedAtColIndex] || "";
      if (currentUpdatedAt && currentUpdatedAt !== data.updated_at) {
        throw new Error("409_CONFLICT");
      }
    }

    const row = headers.map(
      (h: string) => {
        const key = h.toLowerCase().trim();
        if (key === "updated_at") return new Date().toISOString();
        return String(data[key] ?? rows[targetRowIndex - 1][headers.indexOf(h)] ?? "");
      }
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `travel_times!A${targetRowIndex}:Z${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === "409_CONFLICT") throw error;
    console.error("Failed to update travel time", error);
    return false;
  }
}

export async function deleteTravelTime(id: string): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "travel_times!A1:Z500",
    });
    const rows = allData.data.values || [];
    const headers = rows[0] || [];

    const idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIndex] === id) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) return false;

    // Soft delete: set active to FALSE
    const activeColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "active"
    );
    if (activeColIndex !== -1) {
      const letter = colIndexToLetter(activeColIndex);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `travel_times!${letter}${targetRowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [["FALSE"]] },
      });
    }
    return true;
  } catch (error) {
    console.error("Failed to delete travel time", error);
    return false;
  }
}

export async function getRestaurants(area?: string): Promise<Restaurant[]> {
  const rows = await readSheet("restaurants");
  return rows
    .filter((r) => isActive(r.active))
    .filter((r) => !area || r.area?.toUpperCase() === area.toUpperCase())
    .map((r) => ({
      id: r.id || "",
      area: r.area || "",
      near_type: r.near_type || "",
      near_id: r.near_id || "",
      name: r.name || "",
      category: r.category || "",
      distance: r.distance || "",
      address: r.address || "",
      hours: r.hours || "",
      price_range: r.price_range || "",
      phone: r.phone || "",
      google_maps_url: r.google_maps_url || "",
      source_url: r.source_url || "",
      status: r.status || "",
      active: r.active || "",
      sort: toNumber(r.sort),
      last_verified: r.last_verified || "",
      name_kr: r.name_kr || "",
      name_jp: r.name_jp || "",
      menu_kr: r.menu_kr || "",
      menu_jp: r.menu_jp || "",
      menu_price: r.menu_price || "",
      closed_days: r.closed_days || "",
      distance_km: r.distance_km || "",
      drive_minutes: r.drive_minutes || "",
      walk_minutes: r.walk_minutes || "",
      description: r.description || "",
      recommended: r.recommended || "",
      updated_at: r.updated_at || "",
    }))
    .sort((a, b) => a.sort - b.sort);
}

export async function getRestaurantById(
  id: string
): Promise<Restaurant | null> {
  const restaurants = await getRestaurants();
  return restaurants.find((r) => r.id === id) || null;
}

export async function getFaq(
  area?: string,
  category?: string
): Promise<FaqItem[]> {
  const rows = await readSheet("faq");
  return parseFaqRows(rows, area, category, true);
}

/** 관리자용: 숨김(active=FALSE) 포함 전체 조회 */
export async function getAdminFaqs(
  area?: string,
  category?: string
): Promise<FaqItem[]> {
  const rows = await readSheet("faq");
  return parseFaqRows(rows, area, category, false);
}

function parseFaqRows(
  rows: Record<string, string>[],
  area?: string,
  category?: string,
  activeOnly = false
): FaqItem[] {
  return rows
    .filter((r) => !activeOnly || isActive(r.active))
    .filter(
      (r) =>
        !area ||
        r.area?.toUpperCase() === area.toUpperCase() ||
        r.area?.toUpperCase() === "ALL"
    )
    .filter((r) => !category || r.category?.toUpperCase() === category.toUpperCase())
    .map((r) => ({
      id: r.id || "",
      area: r.area || "",
      category: r.category || "",
      related_type: r.related_type || "",
      related_id: r.related_id || "",
      related_name: r.related_name || "",
      question_scope: r.question_scope || "",
      question: r.question || "",
      answer: r.answer || "",
      source_url: r.source_url || "",
      status: r.status || "",
      active: r.active || "",
      sort: toNumber(r.sort),
      updated_at: r.updated_at || "",
    }))
    .sort((a, b) => a.sort - b.sort);
}

export async function getFaqById(id: string): Promise<FaqItem | null> {
  const rows = await readSheet("faq");
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  return {
    id: row.id || "",
    area: row.area || "",
    category: row.category || "",
    related_type: row.related_type || "",
    related_id: row.related_id || "",
    related_name: row.related_name || "",
    question_scope: row.question_scope || "",
    question: row.question || "",
    answer: row.answer || "",
    source_url: row.source_url || "",
    status: row.status || "",
    active: row.active || "",
    sort: toNumber(row.sort),
    updated_at: row.updated_at || "",
  };
}

export async function getAdminOptions(): Promise<AdminOption[]> {
  const rows = await readSheet("admin_options");
  return rows.map((r) => ({
    id: r.id || "",
    option_type: r.option_type || "",
    code: r.code || "",
    label: resolveField(r, "label"),
    description: resolveField(r, "description"),
    group: resolveField(r, "group"),
    active: r.active || "TRUE",
    sort: toNumber(r.sort),
    updated_at: r.updated_at || "",
  }));
}

export async function getActiveAreas(): Promise<AdminOption[]> {
  const options = await getAdminOptions();
  return options
    .filter((o) => o.option_type === "AREA" && isActive(o.active))
    .sort((a, b) => a.sort - b.sort);
}

export async function getActiveCategories(): Promise<AdminOption[]> {
  const options = await getAdminOptions();
  return options
    .filter((o) => o.option_type === "CATEGORY" && isActive(o.active))
    .sort((a, b) => a.sort - b.sort);
}

export async function getAreaCategories(): Promise<AdminOption[]> {
  const options = await getAdminOptions();
  return options
    .filter((o) => o.option_type === "CATEGORY" && isActive(o.active) && o.group === "AREA")
    .sort((a, b) => a.sort - b.sort);
}

export async function getCommonCategories(): Promise<AdminOption[]> {
  const options = await getAdminOptions();
  return options
    .filter((o) => o.option_type === "CATEGORY" && isActive(o.active) && o.group === "COMMON")
    .sort((a, b) => a.sort - b.sort);
}

// 마이그레이션: admin_options에 group 컬럼 추가 및 기존 데이터 업데이트
export async function migrateGroupColumn(): Promise<{ success: boolean; message: string }> {
  try {
    const { sheets, sheetId } = getSheetsClient();

    // 헤더 읽기
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "admin_options!A1:Z1",
    });
    const headers: string[] = headerResponse.data.values?.[0] || [];

    // group 컬럼이 이미 있는지 확인
    const groupColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "group"
    );

    if (groupColIndex === -1) {
      // group 컬럼 추가 (다음 빈 컬럼에)
      const newColIndex = headers.length;
      const colLetter = String.fromCharCode(65 + newColIndex);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `admin_options!${colLetter}1`,
        valueInputOption: "RAW",
        requestBody: { values: [["group"]] },
      });
    }

    // 전체 데이터 읽기
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "admin_options!A1:Z500",
    });
    const rows = allData.data.values || [];
    const updatedHeaders: string[] = rows[0] || [];

    const groupCol = updatedHeaders.findIndex(
      (h: string) => h.toLowerCase().trim() === "group"
    );
    const typeCol = updatedHeaders.findIndex(
      (h: string) => h.toLowerCase().trim() === "option_type"
    );
    const codeCol = updatedHeaders.findIndex(
      (h: string) => h.toLowerCase().trim() === "code"
    );

    if (groupCol === -1 || typeCol === -1 || codeCol === -1) {
      return { success: false, message: "필요한 컬럼을 찾을 수 없습니다." };
    }

    // group이 비어있는 CATEGORY 행에 값 설정
    const AREA_CATEGORY_CODES = ["GOLF", "HOTEL", "RESTAURANT"];
    const updates: { range: string; values: string[][] }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const optionType = (row[typeCol] || "").toUpperCase();
      const code = (row[codeCol] || "").toUpperCase();
      const currentGroup = (row[groupCol] || "").trim();

      if (optionType === "CATEGORY" && !currentGroup) {
        const groupValue = AREA_CATEGORY_CODES.includes(code) ? "AREA" : "COMMON";
        const colLetter = String.fromCharCode(65 + groupCol);
        updates.push({
          range: `admin_options!${colLetter}${i + 1}`,
          values: [[groupValue]],
        });
      }
    }

    for (const update of updates) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: update.range,
        valueInputOption: "RAW",
        requestBody: { values: update.values },
      });
    }
    return {
      success: true,
      message: `group 컬럼 마이그레이션 완료. ${updates.length}개 행 업데이트.`,
    };
  } catch (error) {
    console.error("Failed to migrate group column", error);
    return { success: false, message: String(error) };
  }
}

// updated_at 컬럼 마이그레이션: 각 탭에 updated_at 컬럼 추가 및 기존 행 채우기
export async function migrateUpdatedAt(): Promise<{ success: boolean; message: string; details: Record<string, number> }> {
  const tabs = ["hotels", "restaurants", "golf_courses", "includes_excludes", "travel_times", "faq", "admin_options"];
  const details: Record<string, number> = {};

  try {
    const { sheets, sheetId } = getSheetsClient();
    const now = new Date().toISOString();

    // 시트 메타데이터에서 기존 탭 목록 확인
    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingTabs = (spreadsheetMeta.data.sheets || []).map(
      (s) => s.properties?.title || ""
    );

    for (const tab of tabs) {
      // 탭이 없으면 생성
      if (!existingTabs.includes(tab)) {
        const ieHeaders = ["id", "parent_type", "parent_id", "type", "text_kr", "text_jp", "sort_order", "is_visible", "updated_at"];
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: tab } } }],
          },
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tab}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [ieHeaders] },
        });
        details[tab] = 0;
        continue;
      }

      // 1) 헤더 읽기
      let headers: string[] = [];
      try {
        const headerResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${tab}!A1:AZ1`,
        });
        headers = headerResponse.data.values?.[0] || [];
      } catch {
        continue;
      }
      if (headers.length === 0) continue;

      const lastCol = colIndexToLetter(headers.length);
      const updatedAtColIndex = headers.findIndex(
        (h: string) => h.toLowerCase().trim() === "updated_at"
      );

      // 2) updated_at 컬럼이 없으면 추가
      if (updatedAtColIndex === -1) {
        const newColIndex = headers.length;
        // 먼저 새 열을 삽입하여 그리드 확장
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{
              insertDimension: {
                range: {
                  sheetId: await getSheetIdByName(sheets, sheetId, tab),
                  dimension: "COLUMNS",
                  startIndex: newColIndex,
                  endIndex: newColIndex + 1,
                },
                inheritFromBefore: true,
              },
            }],
          },
        });
        const colLetter = colIndexToLetter(newColIndex);
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${tab}!${colLetter}1`,
          valueInputOption: "RAW",
          requestBody: { values: [["updated_at"]] },
        });

        // 헤더 다시 읽기
        const updatedHeaderResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${tab}!A1:AZ1`,
        });
        const updatedHeaders: string[] = updatedHeaderResponse.data.values?.[0] || [];
        const newUpdatedAtCol = updatedHeaders.findIndex(
          (h: string) => h.toLowerCase().trim() === "updated_at"
        );

        if (newUpdatedAtCol === -1) continue;

        // 전체 데이터 읽기
        const allData = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${tab}!A1:${lastCol}1000`,
        });
        const rows = allData.data.values || [];
        const colLetterNew = colIndexToLetter(newUpdatedAtCol);

        // updated_at이 비어있는 행에 타임스탬프 설정
        let count = 0;
        const batchDataNew: { range: string; values: string[][] }[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[newUpdatedAtCol]) {
            batchDataNew.push({
              range: `${tab}!${colLetterNew}${i + 1}`,
              values: [[now]],
            });
            count++;
          }
        }

        if (batchDataNew.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
              valueInputOption: "RAW",
              data: batchDataNew,
            },
          });
        }

        details[tab] = count;
      } else {
        // updated_at 컬럼이 이미 있는 경우: 비어있는 행만 채우기
        const allData = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `${tab}!A1:${lastCol}1000`,
        });
        const rows = allData.data.values || [];
        const colLetter = colIndexToLetter(updatedAtColIndex);

        let count = 0;
        const batchData: { range: string; values: string[][] }[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[updatedAtColIndex]) {
            batchData.push({
              range: `${tab}!${colLetter}${i + 1}`,
              values: [[now]],
            });
            count++;
          }
        }

        if (batchData.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
              valueInputOption: "RAW",
              data: batchData,
            },
          });
        }

        details[tab] = count;
      }
    }

    return {
      success: true,
      message: `updated_at 마이그레이션 완료.`,
      details,
    };
  } catch (error) {
    console.error("Failed to migrate updated_at", error);
    return { success: false, message: String(error), details };
  }
}

// admin_options ID 마이그레이션: id 컬럼 추가 및 기존 행에 deterministic ID 부여
export async function migrateAdminOptionsId(): Promise<{ success: boolean; message: string; details: Record<string, number> }> {
  try {
    const { sheets, sheetId } = getSheetsClient();

    // 1) 헤더 읽기
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "admin_options!A1:Z1",
    });
    const headers: string[] = headerResponse.data.values?.[0] || [];

    // 2) id 컬럼이 없으면 추가
    let idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );

    if (idColIndex === -1) {
      // 먼저 새 열을 삽입하여 그리드 확장
      const newColIndex = headers.length;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            insertDimension: {
              range: {
                sheetId: await getSheetIdByName(sheets, sheetId, "admin_options"),
                dimension: "COLUMNS",
                startIndex: newColIndex,
                endIndex: newColIndex + 1,
              },
              inheritFromBefore: true,
            },
          }],
        },
      });
      const colLetter = colIndexToLetter(newColIndex);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `admin_options!${colLetter}1`,
        valueInputOption: "RAW",
        requestBody: { values: [["id"]] },
      });
      idColIndex = newColIndex;
      headers.push("id");
    }

    // 3) 전체 데이터 읽기
    const lastCol = colIndexToLetter(headers.length - 1);
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `admin_options!A1:${lastCol}1000`,
    });
    const rows = allData.data.values || [];

    const optionTypeCol = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "option_type"
    );
    const codeCol = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "code"
    );
    const activeCol = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "active"
    );

    // 4) 손상 행 식별 + ID 생성
    const updates: { range: string; values: string[][] }[] = [];
    let backfillCount = 0;
    let deactivatedCount = 0;
    const usedIds = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const optionType = (row[optionTypeCol] || "").trim();
      const code = (row[codeCol] || "").trim();
      const currentId = (row[idColIndex] || "").trim();

      // 손상 행 판별
      const isDamaged =
        optionType.startsWith("opt_travel_time_") || // field-shift (row 18, 19)
        code === "???????" || // corrupted code (row 20)
        !code; // empty code

      if (isDamaged && activeCol !== -1) {
        const activeLetter = colIndexToLetter(activeCol);
        updates.push({
          range: `admin_options!${activeLetter}${rowNum}`,
          values: [["FALSE"]],
        });
        deactivatedCount++;
      }

      // ID 생성 (없는 경우만)
      if (!currentId) {
        let newId: string;
        if (isDamaged) {
          newId = `opt_damaged_${rowNum}`;
        } else {
          const normType = optionType.toLowerCase().replace(/[^a-z0-9]/g, "_");
          const normCode = code.toLowerCase().replace(/[^a-z0-9]/g, "_");
          newId = `opt_${normType}_${normCode}`;
          if (usedIds.has(newId)) {
            newId = `opt_${normType}_${normCode}_${rowNum}`;
          }
        }
        usedIds.add(newId);
        const idLetter = colIndexToLetter(idColIndex);
        updates.push({
          range: `admin_options!${idLetter}${rowNum}`,
          values: [[newId]],
        });
        backfillCount++;
      } else {
        usedIds.add(currentId);
      }
    }

    // 5) 일괄 업데이트
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: updates,
        },
      });
    }
    return {
      success: true,
      message: `admin_options ID 마이그레이션 완료. ID ${backfillCount}개 생성, 손상행 ${deactivatedCount}개 비활성화.`,
      details: { backfilled: backfillCount, deactivated: deactivatedCount, total: rows.length - 1 },
    };
  } catch (error) {
    console.error("Failed to migrate admin options IDs", error);
    return { success: false, message: String(error), details: {} };
  }
}

export async function appendAdminOption(
  data: Record<string, string | number>
): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "admin_options!A1:Z1",
    });
    const headers = headerResponse.data.values?.[0] || [];
    const dataWithTimestamp: Record<string, string | number> = { updated_at: new Date().toISOString(), ...data };
    const row = headers.map(
      (h: string) => String(dataWithTimestamp[h.toLowerCase().trim()] ?? "")
    );

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "admin_options!A:A",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return true;
  } catch (error) {
    console.error("Failed to append admin option", error);
    return false;
  }
}

export async function updateAdminOption(
  data: Record<string, string | number>
): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "admin_options!A1:Z1",
    });
    const headers = headerResponse.data.values?.[0] || [];

    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "admin_options!A1:Z500",
    });
    const rows = allData.data.values || [];

    const idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIndex] === data.id) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) return false;

    const row = headers.map(
      (h: string) => String(data[h.toLowerCase().trim()] ?? rows[targetRowIndex - 1][headers.indexOf(h)] ?? "")
    );

    // updated_at 갱신
    const updatedAtColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "updated_at"
    );
    if (updatedAtColIndex !== -1) {
      row[updatedAtColIndex] = new Date().toISOString();
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `admin_options!A${targetRowIndex}:Z${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return true;
  } catch (error) {
    console.error("Failed to update admin option", error);
    return false;
  }
}

export async function updateAdminOptionSort(
  optionType: string,
  ids: string[]
): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "admin_options!A1:Z500",
    });
    const rows = allData.data.values || [];
    const headers = rows[0] || [];

    const idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );
    const sortColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "sort"
    );
    const typeColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "option_type"
    );

    if (idColIndex === -1 || sortColIndex === -1) return false;

    const updatedAtColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "updated_at"
    );
    const now = new Date().toISOString();

    const updates: { range: string; values: string[][] }[] = [];
    ids.forEach((id, index) => {
      for (let i = 1; i < rows.length; i++) {
        if (
          rows[i][idColIndex] === id &&
          (!optionType || rows[i][typeColIndex]?.toUpperCase() === optionType.toUpperCase())
        ) {
          const rowNum = i + 1;
          const sortLetter = colIndexToLetter(sortColIndex);
          updates.push({
            range: `admin_options!${sortLetter}${rowNum}`,
            values: [[String(index + 1)]],
          });
          if (updatedAtColIndex !== -1) {
            const uaLetter = colIndexToLetter(updatedAtColIndex);
            updates.push({
              range: `admin_options!${uaLetter}${rowNum}`,
              values: [[now]],
            });
          }
          break;
        }
      }
    });

    for (const update of updates) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: update.range,
        valueInputOption: "RAW",
        requestBody: { values: update.values },
      });
    }
    return true;
  } catch (error) {
    console.error("Failed to update admin option sort", error);
    return false;
  }
}

// Write operations for admin
export async function appendFaq(
  data: Record<string, string | number>
): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    // First read headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "faq!A1:Z1",
    });
    const headers = headerResponse.data.values?.[0] || [];
    const dataWithTimestamp: Record<string, string | number> = { updated_at: new Date().toISOString(), ...data };
    const row = headers.map(
      (h: string) => String(dataWithTimestamp[h.toLowerCase().trim()] ?? "")
    );

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "faq!A:A",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return true;
  } catch (error) {
    console.error("Failed to append FAQ", error);
    return false;
  }
}

export async function updateFaq(
  rowIndex: number,
  data: Record<string, string | number>
): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    // Read headers first
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "faq!A1:Z1",
    });
    const headers = headerResponse.data.values?.[0] || [];

    // Read all data to find the row
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "faq!A1:Z1000",
    });
    const rows = allData.data.values || [];

    // Find row by id
    const idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIndex] === data.id) {
        targetRowIndex = i + 1; // 1-based for sheets
        break;
      }
    }

    if (targetRowIndex === -1) return false;

    const row = headers.map(
      (h: string) => {
        const key = h.toLowerCase().trim();
        if (key === "updated_at") return new Date().toISOString();
        return String(data[key] ?? rows[targetRowIndex - 1][headers.indexOf(h)] ?? "");
      }
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `faq!A${targetRowIndex}:Z${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return true;
  } catch (error) {
    console.error("Failed to update FAQ", error);
    return false;
  }
}

export async function updateFaqSort(
  ids: string[]
): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "faq!A1:Z1000",
    });
    const rows = allData.data.values || [];
    const headers = rows[0] || [];

    const idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );
    const sortColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "sort"
    );

    if (idColIndex === -1 || sortColIndex === -1) return false;

    const updatedAtColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "updated_at"
    );
    const now = new Date().toISOString();

    // Update sort values
    const updates: { range: string; values: string[][] }[] = [];
    ids.forEach((id, index) => {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColIndex] === id) {
          const rowNum = i + 1;
          const sortLetter = colIndexToLetter(sortColIndex);
          updates.push({
            range: `faq!${sortLetter}${rowNum}`,
            values: [[String(index + 1)]],
          });
          if (updatedAtColIndex !== -1) {
            const uaLetter = colIndexToLetter(updatedAtColIndex);
            updates.push({
              range: `faq!${uaLetter}${rowNum}`,
              values: [[now]],
            });
          }
          break;
        }
      }
    });

    for (const update of updates) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: update.range,
        valueInputOption: "RAW",
        requestBody: { values: update.values },
      });
    }
    return true;
  } catch (error) {
    console.error("Failed to update FAQ sort", error);
    return false;
  }
}

/** 원본 시트에서 실제 행 삭제 */
export async function deleteFaq(id: string): Promise<boolean> {
  try {
    const { sheets, sheetId } = getSheetsClient();

    // 1. 전체 데이터를 읽어서 대상 행 찾기
    const allData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "faq!A1:Z1000",
    });
    const rows = allData.data.values || [];
    const headers = rows[0] || [];

    const idColIndex = headers.findIndex(
      (h: string) => h.toLowerCase().trim() === "id"
    );
    if (idColIndex === -1) return false;

    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idColIndex] === id) {
        targetRowIndex = i; // 0-based (시트에서는 1-based = i+1)
        break;
      }
    }

    if (targetRowIndex === -1) return false;

    // 2. sheetId (탭 고유 ID) 조회
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    const faqSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === "faq"
    );
    if (!faqSheet?.properties?.sheetId) return false;

    // 3. deleteDimension로 행 삭제 (0-based startIndex, endIndex exclusive)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: faqSheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: targetRowIndex,
                endIndex: targetRowIndex + 1,
              },
            },
          },
        ],
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to delete FAQ", error);
    return false;
  }
}

// --- Generic helpers ---

/** 컬럼 인덱스 → 스프레드시트 열 문자 (0→A, 25→Z, 26→AA ...) */
async function getSheetIdByName(
  sheets: ReturnType<typeof getSheetsClient>["sheets"],
  spreadsheetId: string,
  tabName: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = (meta.data.sheets || []).find(
    (s) => s.properties?.title === tabName
  );
  return sheet?.properties?.sheetId ?? 0;
}

function colIndexToLetter(index: number): string {
  let letter = "";
  let i = index;
  while (i >= 0) {
    letter = String.fromCharCode(65 + (i % 26)) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}

async function appendRow(
  tabName: string,
  headers: string[],
  data: Record<string, string>
): Promise<void> {
  const { sheets, sheetId } = getSheetsClient();
  const lastCol = colIndexToLetter(headers.length - 1);
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:${lastCol}1`,
  });
  const sheetHeaders: string[] = headerResponse.data.values?.[0] || [];
  // Map data keys to actual Sheet columns (handles Korean/English header mismatch)
  const row = sheetHeaders.map((h: string) => {
    const sheetKey = h.toLowerCase().trim();
    if (sheetKey in data) return String(data[sheetKey] ?? "");
    // Try alias: find an English data key that maps to this Korean header
    for (const [dataKey, aliases] of Object.entries(HEADER_ALIASES)) {
      if (dataKey in data && aliases.some(a => a.toLowerCase().trim() === sheetKey)) {
        return String(data[dataKey] ?? "");
      }
    }
    return "";
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!A:A`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

async function updateRowById(
  tabName: string,
  id: string,
  data: Record<string, string>,
  expectedUpdatedAt?: string
): Promise<boolean> {
  const { sheets, sheetId } = getSheetsClient();

  // 1) 먼저 헤더 행을 읽어 실제 컬럼 수 파악
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:AZ1`,
  });
  const sheetHeaders: string[] = headerResponse.data.values?.[0] || [];
  if (sheetHeaders.length === 0) return false;
  const lastCol = colIndexToLetter(sheetHeaders.length - 1);

  // 2) 전체 데이터 읽기
  const allData = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:${lastCol}1000`,
  });
  const rows = allData.data.values || [];
  const headers: string[] = rows[0] || [];

  const idColIndex = headers.findIndex(
    (h: string) => h.toLowerCase().trim() === "id"
  );
  if (idColIndex === -1) return false;

  const updatedAtColIndex = headers.findIndex(
    (h: string) => h.toLowerCase().trim() === "updated_at"
  );

  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idColIndex] === id) {
      targetRowIndex = i + 1;
      break;
    }
  }
  if (targetRowIndex === -1) return false;

  // 낙관적 동시성 제어: expectedUpdatedAt이 제공된 경우 현재 값과 비교
  if (expectedUpdatedAt && updatedAtColIndex !== -1) {
    const currentUpdatedAt = rows[targetRowIndex - 1][updatedAtColIndex] || "";
    if (currentUpdatedAt !== expectedUpdatedAt) {
      throw new ConflictError();
    }
  }

  // Map data keys to actual Sheet columns (handles Korean/English header mismatch)
  const row = headers.map((h: string) => {
    const key = h.toLowerCase().trim();
    if (key in data) return String(data[key] ?? "");
    // Try alias: find an English data key that maps to this Korean header
    for (const [dataKey, aliases] of Object.entries(HEADER_ALIASES)) {
      if (dataKey in data && aliases.some(a => a.toLowerCase().trim() === key)) {
        return String(data[dataKey] ?? "");
      }
    }
    return String(rows[targetRowIndex - 1][headers.indexOf(h)] ?? "");
  });

  // updated_at 컬럼이 있으면 현재 타임스탬프로 갱신
  if (updatedAtColIndex !== -1) {
    row[updatedAtColIndex] = new Date().toISOString();
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tabName}!A${targetRowIndex}:${lastCol}${targetRowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
  return true;
}

async function deleteRowById(
  tabName: string,
  id: string
): Promise<boolean> {
  const { sheets, sheetId } = getSheetsClient();

  const allData = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:Z1000`,
  });
  const rows = allData.data.values || [];
  const headers: string[] = rows[0] || [];

  const idColIndex = headers.findIndex(
    (h: string) => h.toLowerCase().trim() === "id"
  );
  if (idColIndex === -1) return false;

  let targetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idColIndex] === id) {
      targetRowIndex = i; // 0-based
      break;
    }
  }
  if (targetRowIndex === -1) return false;

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === tabName
  );
  if (!sheet?.properties?.sheetId) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: targetRowIndex,
              endIndex: targetRowIndex + 1,
            },
          },
        },
      ],
    },
  });
  return true;
}

// --- Hotel CRUD ---
export async function appendHotel(data: Record<string, string>): Promise<string> {
  const id = `hotel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const headers = ["id", "area", "official_name", "address", "phone", "check_in", "check_out", "breakfast", "bath_spa", "hotel_dining", "atm_payment", "transport", "google_maps_url", "source_url", "status", "active", "sort", "last_verified", "name_kr", "name_jp", "address_kr", "address_jp", "checkin_time", "checkout_time", "breakfast_place", "breakfast_time", "breakfast_last_entry", "dinner_place", "dinner_time", "dinner_last_entry", "has_public_bath", "has_outdoor_onsen", "has_sauna", "bath_spa_hours", "tattoo_policy", "other_info"];
  const row: Record<string, string> = { id, active: "TRUE", status: "published", sort: "99", updated_at: new Date().toISOString(), ...data };
  await appendRow("hotels", headers, row);
  return id;
}

export async function updateHotel(id: string, data: Record<string, string>, expectedUpdatedAt?: string): Promise<boolean> {
  const result = await updateRowById("hotels", id, data, expectedUpdatedAt);
  return result;
}

export async function deleteHotel(id: string): Promise<boolean> {
  const result = await deleteRowById("hotels", id);
  return result;
}

// --- Restaurant CRUD ---
export async function appendRestaurant(data: Record<string, string>): Promise<string> {
  const id = `rest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const headers = ["id", "area", "near_type", "near_id", "name", "category", "distance", "address", "hours", "price_range", "phone", "google_maps_url", "source_url", "status", "active", "sort", "last_verified", "name_kr", "name_jp", "menu_kr", "menu_jp", "menu_price", "closed_days", "distance_km", "drive_minutes", "walk_minutes", "description", "recommended"];
  const row: Record<string, string> = { id, active: "TRUE", status: "published", sort: "99", updated_at: new Date().toISOString(), ...data };
  await appendRow("restaurants", headers, row);
  return id;
}

export async function updateRestaurant(id: string, data: Record<string, string>, expectedUpdatedAt?: string): Promise<boolean> {
  const result = await updateRowById("restaurants", id, data, expectedUpdatedAt);
  return result;
}

export async function deleteRestaurantRow(id: string): Promise<boolean> {
  const result = await deleteRowById("restaurants", id);
  return result;
}

// --- Golf CRUD ---
const GOLF_HEADERS = ["id", "area", "display_name", "official_name", "address", "phone", "course_summary", "play_cart", "clubhouse_dining", "bath_shower", "rental", "dress_code", "google_maps_url", "source_url", "status", "active", "sort", "last_verified"];

export async function appendGolfCourse(data: Record<string, string>): Promise<string> {
  const id = `golf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row: Record<string, string> = { id, active: "TRUE", status: "published", sort: "99", updated_at: new Date().toISOString(), ...data };
  await appendRow("golf_courses", GOLF_HEADERS, row);
  return id;
}

export async function updateGolfCourse(id: string, data: Record<string, string>, expectedUpdatedAt?: string): Promise<boolean> {
  const result = await updateRowById("golf_courses", id, data, expectedUpdatedAt);
  return result;
}

export async function deleteGolfCourse(id: string): Promise<boolean> {
  const result = await deleteRowById("golf_courses", id);
  return result;
}

// --- IncludeExclude CRUD ---

export async function getIncludesExcludes(
  parentType?: string,
  parentId?: string
): Promise<IncludeExclude[]> {
  const rows = await readSheet("includes_excludes");
  return rows
    .filter((r) => !parentType || r.parent_type?.toUpperCase() === parentType.toUpperCase())
    .filter((r) => !parentId || r.parent_id === parentId)
    .map((r) => ({
      id: r.id || "",
      parent_type: r.parent_type || "",
      parent_id: r.parent_id || "",
      type: r.type || "",
      text_kr: r.text_kr || "",
      text_jp: r.text_jp || "",
      sort_order: toNumber(r.sort_order),
      is_visible: r.is_visible || "TRUE",
      updated_at: r.updated_at || "",
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function appendIncludeExclude(data: Record<string, string>): Promise<string> {
  const id = `ie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const headers = ["id", "parent_type", "parent_id", "type", "text_kr", "text_jp", "sort_order", "is_visible", "updated_at"];
  const row: Record<string, string> = { id, is_visible: "TRUE", sort_order: "99", updated_at: new Date().toISOString(), ...data };
  await appendRow("includes_excludes", headers, row);
  return id;
}

export async function updateIncludeExclude(id: string, data: Record<string, string>, expectedUpdatedAt?: string): Promise<boolean> {
  const result = await updateRowById("includes_excludes", id, data, expectedUpdatedAt);
  return result;
}

export async function deleteIncludeExclude(id: string): Promise<boolean> {
  const result = await deleteRowById("includes_excludes", id);
  return result;
}

// --- ContentSection CRUD ---

export async function getContentSections(
  parentType?: string,
  parentId?: string
): Promise<ContentSection[]> {
  const rows = await readSheet("content_sections");
  return rows
    .filter((r) => !parentType || r.parent_type?.toUpperCase() === parentType.toUpperCase())
    .filter((r) => !parentId || r.parent_id === parentId)
    .map((r) => ({
      id: r.id || "",
      parent_type: r.parent_type || "",
      parent_id: r.parent_id || "",
      title: resolveField(r, "title"),
      content: resolveField(r, "content"),
      emoji: resolveField(r, "emoji"),
      sort: toNumber(r.sort),
      is_visible: r.is_visible || "TRUE",
      updated_at: r.updated_at || "",
    }))
    .sort((a, b) => a.sort - b.sort);
}

export async function appendContentSection(data: Record<string, string>): Promise<string> {
  const id = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const headers = ["id", "parent_type", "parent_id", "title", "content", "emoji", "sort", "is_visible", "updated_at"];
  const row: Record<string, string> = { id, is_visible: "TRUE", sort: "99", updated_at: new Date().toISOString(), ...data };
  await appendRow("content_sections", headers, row);
  return id;
}

export async function updateContentSection(id: string, data: Record<string, string>, expectedUpdatedAt?: string): Promise<boolean> {
  const result = await updateRowById("content_sections", id, data, expectedUpdatedAt);
  return result;
}

export async function deleteContentSection(id: string): Promise<boolean> {
  const result = await deleteRowById("content_sections", id);
  return result;
}

// --- Migration: cms_schema + content_sections 탭 생성 ---

export async function migrateSchemaTabs(): Promise<{ success: boolean; message: string }> {
  try {
    const { sheets, sheetId } = getSheetsClient();

    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const existingTabs = (spreadsheetMeta.data.sheets || []).map(s => s.properties?.title || "");

    const csHeaders = ["id", "parent_type", "parent_id", "title", "content", "emoji", "sort", "is_visible", "created_at", "updated_at"];
    const schemaHeaders = ["id", "entity", "sheet_name", "field_key", "physical_column", "display_label", "field_type", "required", "editable", "repeatable", "sortable", "visible", "relation_target", "default_value", "description", "primary_key", "route_path", "data_access_function"];

    // content_sections 탭 생성
    if (!existingTabs.includes("content_sections")) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: "content_sections" } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "content_sections!A1",
        valueInputOption: "RAW",
        requestBody: { values: [csHeaders] },
      });
    }

    // cms_schema 탭 생성
    if (!existingTabs.includes("cms_schema")) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: "cms_schema" } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "cms_schema!A1",
        valueInputOption: "RAW",
        requestBody: { values: [schemaHeaders] },
      });
    }

    return { success: true, message: "content_sections + cms_schema 탭 생성 완료" };
  } catch (error) {
    console.error("Failed to migrate schema tabs", error);
    return { success: false, message: String(error) };
  }
}

export async function populateCmsSchema(): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const { sheets, sheetId } = getSheetsClient();

    // 기존 데이터 확인 — 이미 있으면 skip
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "cms_schema!A2:A",
    });
    const existingCount = (existing.data.values || []).length;
    if (existingCount > 0) {
      return { success: true, message: `이미 ${existingCount}개 행 존재`, count: existingCount };
    }

    const schemaData = buildSchemaData();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "cms_schema!A:A",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: schemaData },
    });
    return { success: true, message: `${schemaData.length}개 스키마 등록 완료`, count: schemaData.length };
  } catch (error) {
    console.error("Failed to populate cms_schema", error);
    return { success: false, message: String(error), count: 0 };
  }
}

function buildSchemaData(): string[][] {
  const rows: string[][] = [];
  let n = 0;
  const next = () => `sc_${++n}`;

  // golf_courses
  const golf = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["area", "지역", "string", "TRUE", "TRUE"],
    ["display_name", "상품표명", "string", "TRUE", "TRUE"],
    ["official_name", "공식명", "string", "FALSE", "TRUE"],
    ["address", "주소", "string", "FALSE", "TRUE"],
    ["phone", "전화", "string", "FALSE", "TRUE"],
    ["course_summary", "코스 안내", "string", "FALSE", "TRUE"],
    ["play_cart", "플레이/카트", "string", "FALSE", "TRUE"],
    ["clubhouse_dining", "클럽하우스 식사", "string", "FALSE", "TRUE"],
    ["bath_shower", "목욕/샤워", "string", "FALSE", "TRUE"],
    ["rental", "렌탈", "string", "FALSE", "TRUE"],
    ["dress_code", "복장", "string", "FALSE", "TRUE"],
    ["google_maps_url", "구글맵 URL", "string", "FALSE", "TRUE"],
    ["source_url", "소스 URL", "string", "FALSE", "TRUE"],
    ["status", "상태", "string", "FALSE", "TRUE"],
    ["active", "활성", "boolean", "TRUE", "TRUE"],
    ["sort", "정렬", "number", "FALSE", "TRUE"],
    ["last_verified", "최종검증일", "string", "FALSE", "TRUE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of golf) {
    rows.push([next(), "golf_courses", "golf_courses", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/[area]/golf/[id]", "getGolfCourses, getGolfCourseById"]);
  }

  // hotels (주요 필드만)
  const hotel = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["area", "지역", "string", "TRUE", "TRUE"],
    ["official_name", "호텔명", "string", "TRUE", "TRUE"],
    ["address", "주소", "string", "FALSE", "TRUE"],
    ["phone", "전화", "string", "FALSE", "TRUE"],
    ["check_in", "체크인", "string", "FALSE", "TRUE"],
    ["check_out", "체크아웃", "string", "FALSE", "TRUE"],
    ["breakfast", "조식", "string", "FALSE", "TRUE"],
    ["bath_spa", "목욕/스파", "string", "FALSE", "TRUE"],
    ["hotel_dining", "호텔 식사", "string", "FALSE", "TRUE"],
    ["atm_payment", "ATM/결제", "string", "FALSE", "TRUE"],
    ["transport", "교통", "string", "FALSE", "TRUE"],
    ["google_maps_url", "구글맵 URL", "string", "FALSE", "TRUE"],
    ["source_url", "소스 URL", "string", "FALSE", "TRUE"],
    ["status", "상태", "string", "FALSE", "TRUE"],
    ["active", "활성", "boolean", "TRUE", "TRUE"],
    ["sort", "정렬", "number", "FALSE", "TRUE"],
    ["name_kr", "한글명", "string", "FALSE", "TRUE"],
    ["name_jp", "일본어명", "string", "FALSE", "TRUE"],
    ["address_kr", "한글 주소", "string", "FALSE", "TRUE"],
    ["address_jp", "일본어 주소", "string", "FALSE", "TRUE"],
    ["checkin_time", "체크인 시간", "string", "FALSE", "TRUE"],
    ["checkout_time", "체크아웃 시간", "string", "FALSE", "TRUE"],
    ["breakfast_place", "조식 장소", "string", "FALSE", "TRUE"],
    ["breakfast_time", "조식 시간", "string", "FALSE", "TRUE"],
    ["breakfast_last_entry", "조식 입장마감", "string", "FALSE", "TRUE"],
    ["dinner_place", "석식 장소", "string", "FALSE", "TRUE"],
    ["dinner_time", "석식 시간", "string", "FALSE", "TRUE"],
    ["dinner_last_entry", "석식 입장마감", "string", "FALSE", "TRUE"],
    ["has_public_bath", "대욕장 있음", "boolean", "FALSE", "TRUE"],
    ["has_outdoor_onsen", "노천탕 있음", "boolean", "FALSE", "TRUE"],
    ["has_sauna", "사우나 있음", "boolean", "FALSE", "TRUE"],
    ["bath_spa_hours", "대욕장 운영시간", "string", "FALSE", "TRUE"],
    ["tattoo_policy", "타투 정책", "string", "FALSE", "TRUE"],
    ["other_info", "기타 정보", "string", "FALSE", "TRUE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of hotel) {
    rows.push([next(), "hotels", "hotels", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/[area]/hotel/[id]", "getHotels, getHotelById"]);
  }

  // travel_times
  const tt = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["area", "지역", "string", "TRUE", "TRUE"],
    ["hotel_id", "호텔 ID", "string", "TRUE", "TRUE"],
    ["golf_id", "골프장 ID", "string", "TRUE", "TRUE"],
    ["estimated_time", "이동시간", "string", "FALSE", "TRUE"],
    ["google_maps_direction_url", "길찾기 URL", "string", "FALSE", "TRUE"],
    ["active", "활성", "boolean", "TRUE", "TRUE"],
    ["sort", "정렬", "number", "FALSE", "TRUE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of tt) {
    rows.push([next(), "travel_times", "travel_times", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/[area]/golf/[id]", "getTravelTimes"]);
  }

  // restaurants
  const rest = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["area", "지역", "string", "TRUE", "TRUE"],
    ["near_type", "근접 타입", "string", "TRUE", "TRUE"],
    ["near_id", "근접 대상 ID", "string", "TRUE", "TRUE"],
    ["name", "이름", "string", "TRUE", "TRUE"],
    ["category", "카테고리", "string", "FALSE", "TRUE"],
    ["distance", "거리", "string", "FALSE", "TRUE"],
    ["address", "주소", "string", "FALSE", "TRUE"],
    ["hours", "영업시간", "string", "FALSE", "TRUE"],
    ["price_range", "가격대", "string", "FALSE", "TRUE"],
    ["phone", "전화", "string", "FALSE", "TRUE"],
    ["google_maps_url", "구글맵 URL", "string", "FALSE", "TRUE"],
    ["source_url", "소스 URL", "string", "FALSE", "TRUE"],
    ["status", "상태", "string", "FALSE", "TRUE"],
    ["active", "활성", "boolean", "TRUE", "TRUE"],
    ["sort", "정렬", "number", "FALSE", "TRUE"],
    ["last_verified", "최종검증일", "string", "FALSE", "TRUE"],
    ["name_kr", "한글명", "string", "FALSE", "TRUE"],
    ["name_jp", "일본어명", "string", "FALSE", "TRUE"],
    ["menu_kr", "메뉴(한글)", "string", "FALSE", "TRUE"],
    ["menu_jp", "메뉴(일본어)", "string", "FALSE", "TRUE"],
    ["menu_price", "메뉴 가격", "string", "FALSE", "TRUE"],
    ["closed_days", "휴무일", "string", "FALSE", "TRUE"],
    ["distance_km", "거리(km)", "string", "FALSE", "TRUE"],
    ["drive_minutes", "차량 시간(분)", "string", "FALSE", "TRUE"],
    ["walk_minutes", "도보 시간(분)", "string", "FALSE", "TRUE"],
    ["description", "설명", "string", "FALSE", "TRUE"],
    ["recommended", "추천", "boolean", "FALSE", "TRUE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of rest) {
    rows.push([next(), "restaurants", "restaurants", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/[area]/restaurant/[id]", "getRestaurants, getRestaurantById"]);
  }

  // faq
  const faq = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["area", "지역", "string", "TRUE", "TRUE"],
    ["category", "카테고리", "string", "TRUE", "TRUE"],
    ["related_type", "관련 타입", "string", "FALSE", "TRUE"],
    ["related_id", "관련 ID", "string", "FALSE", "TRUE"],
    ["related_name", "관련 이름", "string", "FALSE", "TRUE"],
    ["question_scope", "질문 범위", "string", "FALSE", "TRUE"],
    ["question", "질문", "string", "TRUE", "TRUE"],
    ["answer", "답변", "string", "TRUE", "TRUE"],
    ["source_url", "소스 URL", "string", "FALSE", "TRUE"],
    ["status", "상태", "string", "FALSE", "TRUE"],
    ["active", "활성", "boolean", "TRUE", "TRUE"],
    ["sort", "정렬", "number", "FALSE", "TRUE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of faq) {
    rows.push([next(), "faq", "faq", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/guide/[category]", "getFaqByCategory"]);
  }

  // admin_options
  const opt = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["option_type", "옵션 타입", "string", "TRUE", "TRUE"],
    ["code", "코드", "string", "TRUE", "TRUE"],
    ["label", "표시명", "string", "TRUE", "TRUE"],
    ["description", "설명", "string", "FALSE", "TRUE"],
    ["group", "그룹", "string", "FALSE", "TRUE"],
    ["active", "활성", "boolean", "TRUE", "TRUE"],
    ["sort", "정렬", "number", "FALSE", "TRUE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of opt) {
    rows.push([next(), "admin_options", "admin_options", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/guide", "getAreaCategories, getCommonCategories"]);
  }

  // includes_excludes
  const ie = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["parent_type", "부모 타입", "string", "TRUE", "TRUE"],
    ["parent_id", "부모 ID", "string", "TRUE", "TRUE"],
    ["type", "구분", "string", "TRUE", "TRUE"],
    ["text_kr", "내용(한글)", "string", "TRUE", "TRUE"],
    ["text_jp", "내용(일본어)", "string", "FALSE", "TRUE"],
    ["sort_order", "정렬", "number", "FALSE", "TRUE"],
    ["is_visible", "표시여부", "boolean", "TRUE", "TRUE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of ie) {
    rows.push([next(), "includes_excludes", "includes_excludes", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort_order" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/[area]/golf/[id]", "getIncludesExcludes"]);
  }

  // content_sections
  const cs = [
    ["id", "ID", "string", "TRUE", "FALSE"],
    ["parent_type", "부모 타입", "string", "TRUE", "TRUE"],
    ["parent_id", "부모 ID", "string", "TRUE", "TRUE"],
    ["title", "제목", "string", "TRUE", "TRUE"],
    ["content", "내용", "string", "TRUE", "TRUE"],
    ["emoji", "이모지", "string", "FALSE", "TRUE"],
    ["sort", "정렬", "number", "FALSE", "TRUE"],
    ["is_visible", "표시여부", "boolean", "TRUE", "TRUE"],
    ["created_at", "생성일시", "string", "TRUE", "FALSE"],
    ["updated_at", "수정일시", "string", "TRUE", "FALSE"],
  ];
  for (const [fk, dl, ft, req, ed] of cs) {
    rows.push([next(), "content_sections", "content_sections", fk, fk, dl, ft, req, ed, "FALSE", fk === "sort" || fk === "updated_at" ? "TRUE" : "FALSE", "TRUE", "", "", "", fk === "id" ? "TRUE" : "FALSE", "/[area]/golf/[id]", "getContentSections"]);
  }

  return rows;
}

// Migration: add primary_key, route_path, data_access_function columns to existing cms_schema rows
export async function updateCmsSchemaColumns(): Promise<{ success: boolean; message: string; updated: number }> {
  try {
    const { sheets, sheetId } = getSheetsClient();

    // Read current headers
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "cms_schema!A1:R1",
    });
    const headers: string[] = headerRes.data.values?.[0] || [];

    // Check if new columns already exist
    if (headers.includes("primary_key") && headers.includes("route_path") && headers.includes("data_access_function")) {
      return { success: true, message: "새 column 이미 존재", updated: 0 };
    }

    // Add new headers
    const newHeaders = [...headers, "primary_key", "route_path", "data_access_function"];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "cms_schema!A1",
      valueInputOption: "RAW",
      requestBody: { values: [newHeaders] },
    });

    // Read all data rows
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "cms_schema!A2:R500",
    });
    const rows = dataRes.data.values || [];
    if (rows.length === 0) return { success: true, message: "데이터 없음", updated: 0 };

    // Route/function mapping per entity
    const entityMeta: Record<string, { route: string; funcs: string }> = {
      golf_courses: { route: "/[area]/golf/[id]", funcs: "getGolfCourses, getGolfCourseById" },
      hotels: { route: "/[area]/hotel/[id]", funcs: "getHotels, getHotelById" },
      travel_times: { route: "/[area]/golf/[id]", funcs: "getTravelTimes" },
      restaurants: { route: "/[area]/restaurant/[id]", funcs: "getRestaurants, getRestaurantById" },
      faq: { route: "/guide/[category]", funcs: "getFaqByCategory" },
      admin_options: { route: "/guide", funcs: "getAreaCategories, getCommonCategories" },
      includes_excludes: { route: "/[area]/golf/[id]", funcs: "getIncludesExcludes" },
      content_sections: { route: "/[area]/golf/[id]", funcs: "getContentSections" },
    };

    // Build updated rows using header names, not numeric indices
    const entityIdx = headers.indexOf("entity");
    const fieldKeyIdx = headers.indexOf("field_key");
    const updatedRows = rows.map((row) => {
      const entity = (entityIdx >= 0 ? row[entityIdx] : "") || "";
      const fieldKey = (fieldKeyIdx >= 0 ? row[fieldKeyIdx] : "") || "";
      const meta = entityMeta[entity] || { route: "", funcs: "" };
      const isPrimary = fieldKey === "id" ? "TRUE" : "FALSE";
      return [...row, isPrimary, meta.route, meta.funcs];
    });

    // Write back
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "cms_schema!A2",
      valueInputOption: "RAW",
      requestBody: { values: updatedRows },
    });

    return { success: true, message: `${updatedRows.length}개 row 업데이트 완료`, updated: updatedRows.length };
  } catch (error) {
    console.error("Failed to update cms_schema columns", error);
    return { success: false, message: String(error), updated: 0 };
  }
}

// --- Golf 고정 column → content_sections Migration ---

const GOLF_FIXED_SECTIONS: { field: keyof GolfCourse; title: string; emoji: string; sort: number }[] = [
  { field: "course_summary", title: "코스 안내", emoji: "⛳", sort: 1 },
  { field: "play_cart", title: "플레이/카트", emoji: "🏌️", sort: 2 },
  { field: "clubhouse_dining", title: "클럽하우스 식사", emoji: "🍽️", sort: 3 },
  { field: "bath_shower", title: "목욕/샤워", emoji: "♨️", sort: 4 },
  { field: "rental", title: "렌탈", emoji: "🎒", sort: 5 },
  { field: "dress_code", title: "복장", emoji: "👔", sort: 6 },
];

export async function migrateGolfFixedColumns(): Promise<{ success: boolean; message: string; migrated: number; skipped: number }> {
  try {
    const courses = await getGolfCourses();
    const existingSections = await getContentSections("GOLF");

    // Group existing sections by parent_id
    const existingByParent = new Map<string, ContentSection[]>();
    for (const s of existingSections) {
      const list = existingByParent.get(s.parent_id) || [];
      list.push(s);
      existingByParent.set(s.parent_id, list);
    }

    let migrated = 0;
    let skipped = 0;

    for (const course of courses) {
      // Skip if already has content_sections for this golf course
      if (existingByParent.has(course.id) && existingByParent.get(course.id)!.length > 0) {
        skipped++;
        continue;
      }

      // Create content_sections for non-empty fixed columns
      for (const { field, title, emoji, sort } of GOLF_FIXED_SECTIONS) {
        const value = course[field] as string;
        if (!value || !value.trim()) continue;

        await appendContentSection({
          parent_type: "GOLF",
          parent_id: course.id,
          title,
          content: value.trim(),
          emoji,
          sort: sort.toString(),
          is_visible: "TRUE",
        });
        migrated++;
      }
    }

    return {
      success: true,
      message: `마이그레이션 완료: ${migrated}개 section 생성, ${skipped}개 골프장 skip`,
      migrated,
      skipped,
    };
  } catch (error) {
    console.error("Failed to migrate golf fixed columns", error);
    return { success: false, message: String(error), migrated: 0, skipped: 0 };
  }
}
