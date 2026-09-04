import { google } from "googleapis";
import type {
  GolfCourse,
  Hotel,
  TravelTime,
  Restaurant,
  FaqItem,
  AdminOption,
} from "./types";

// Cache with TTL
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Invalidate cache by prefix
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

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

// Read a sheet tab and return rows as objects
async function readSheet(
  tabName: string,
  range?: string
): Promise<Record<string, string>[]> {
  const cached = getCached<Record<string, string>[]>(tabName);
  if (cached) return cached;

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
    const data = rows.slice(1).map((row: string[]) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || "";
      });
      return obj;
    });

    setCache(tabName, data);
    return data;
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

// Data access functions
export async function getGolfCourses(area?: string): Promise<GolfCourse[]> {
  const rows = await readSheet("golf_courses");
  return rows
    .filter((r) => isActive(r.active))
    .filter((r) => !area || r.area?.toUpperCase() === area.toUpperCase())
    .map((r) => ({
      id: r.id || "",
      area: r.area || "",
      display_name: r.display_name || r["상품표명"] || "",
      official_name: r.official_name || r["공식명"] || "",
      address: r.address || r["주소"] || "",
      phone: r.phone || r["전화"] || "",
      course_summary: r.course_summary || r["코스요약"] || "",
      play_cart: r.play_cart || r["플레이/카트"] || "",
      clubhouse_dining: r.clubhouse_dining || r["클럽하우스 식사"] || "",
      bath_shower: r.bath_shower || r["목욕/샤워"] || "",
      rental: r.rental || r["렌탈"] || "",
      dress_code: r.dress_code || r["복장"] || "",
      google_maps_url: r.google_maps_url || "",
      source_url: r.source_url || "",
      status: r.status || "",
      active: r.active || "",
      sort: toNumber(r.sort),
      last_verified: r.last_verified || "",
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
      official_name: r.official_name || r["공식명"] || "",
      address: r.address || r["주소"] || "",
      phone: r.phone || r["전화"] || "",
      check_in: r.check_in || r["체크인"] || "",
      check_out: r.check_out || r["체크아웃"] || "",
      breakfast: r.breakfast || r["조식"] || "",
      bath_spa: r.bath_spa || r["목욕/스파"] || "",
      hotel_dining: r.hotel_dining || r["호텔 식사"] || "",
      atm_payment: r.atm_payment || r["ATM/결제"] || "",
      transport: r.transport || r["교통"] || "",
      google_maps_url: r.google_maps_url || "",
      source_url: r.source_url || "",
      status: r.status || "",
      active: r.active || "",
      sort: toNumber(r.sort),
      last_verified: r.last_verified || "",
    }))
    .sort((a, b) => a.sort - b.sort);
}

export async function getHotelById(id: string): Promise<Hotel | null> {
  const hotels = await getHotels();
  return hotels.find((h) => h.id === id) || null;
}

export async function getTravelTimes(area?: string): Promise<TravelTime[]> {
  const rows = await readSheet("travel_times");
  return rows
    .filter((r) => isActive(r.active))
    .filter((r) => !area || r.area?.toUpperCase() === area.toUpperCase())
    .map((r) => ({
      id: r.id || "",
      area: r.area || "",
      hotel_id: r.hotel_id || "",
      hotel_name: r.hotel_name || "",
      golf_id: r.golf_id || "",
      golf_name: r.golf_name || "",
      estimated_time: r.estimated_time || "",
      google_maps_direction_url: r.google_maps_direction_url || "",
      active: r.active || "",
      sort: toNumber(r.sort),
    }))
    .sort((a, b) => a.sort - b.sort);
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
  };
}

export async function getAdminOptions(): Promise<AdminOption[]> {
  const rows = await readSheet("admin_options");
  return rows.map((r) => ({
    id: r.id || "",
    option_type: r.option_type || "",
    code: r.code || "",
    label: r.label || r["관리자 화면 표시명"] || "",
    description: r.description || r["설명"] || "",
    group: r.group || r["그룹"] || "",
    active: r.active || "TRUE",
    sort: toNumber(r.sort),
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
      console.log("Added group column header at", colLetter);
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

    invalidateCache("admin_options");
    return {
      success: true,
      message: `group 컬럼 마이그레이션 완료. ${updates.length}개 행 업데이트.`,
    };
  } catch (error) {
    console.error("Failed to migrate group column", error);
    return { success: false, message: String(error) };
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
    const row = headers.map(
      (h: string) => String(data[h.toLowerCase().trim()] ?? "")
    );

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "admin_options!A:A",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    invalidateCache("admin_options");
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

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `admin_options!A${targetRowIndex}:Z${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    invalidateCache("admin_options");
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

    const updates: { range: string; values: string[][] }[] = [];
    ids.forEach((id, index) => {
      for (let i = 1; i < rows.length; i++) {
        if (
          rows[i][idColIndex] === id &&
          (!optionType || rows[i][typeColIndex]?.toUpperCase() === optionType.toUpperCase())
        ) {
          const rowNum = i + 1;
          const colLetter = String.fromCharCode(65 + sortColIndex);
          updates.push({
            range: `admin_options!${colLetter}${rowNum}`,
            values: [[String(index + 1)]],
          });
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

    invalidateCache("admin_options");
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
    const row = headers.map(
      (h: string) => String(data[h.toLowerCase().trim()] ?? "")
    );

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "faq!A:A",
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    invalidateCache("faq");
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
      (h: string) => String(data[h.toLowerCase().trim()] ?? "")
    );

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `faq!A${targetRowIndex}:Z${targetRowIndex}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });

    invalidateCache("faq");
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

    // Update sort values
    const updates: { range: string; values: string[][] }[] = [];
    ids.forEach((id, index) => {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColIndex] === id) {
          const rowNum = i + 1;
          const colLetter = String.fromCharCode(65 + sortColIndex);
          updates.push({
            range: `faq!${colLetter}${rowNum}`,
            values: [[String(index + 1)]],
          });
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

    invalidateCache("faq");
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

    invalidateCache("faq");
    return true;
  } catch (error) {
    console.error("Failed to delete FAQ", error);
    return false;
  }
}
