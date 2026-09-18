/**
 * Dynamic Labels: fetch section + field definitions for an entity type.
 * Falls back to hardcoded defaults when DB has no custom definitions.
 */

import { getSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DynamicSection {
  section_key: string;
  label_ko: string;
  label_ja: string | null;
  sort: number;
  is_visible: boolean;
  fields: DynamicField[];
}

export interface DynamicField {
  field_key: string;
  label_ko: string;
  label_ja: string | null;
  field_type: string;
  icon: string | null;
  sort: number;
  active: boolean;
}

export interface DynamicLabelsResult {
  sections: DynamicSection[];
  fieldMap: Record<string, DynamicField>;  // field_key → field
}

// ---------------------------------------------------------------------------
// Hardcoded defaults (fallback when DB has no definitions)
// ---------------------------------------------------------------------------

const GOLF_SECTIONS: DynamicSection[] = [
  { section_key: "basic_info", label_ko: "기본 정보", label_ja: "基本情報", sort: 1, is_visible: true, fields: [] },
  { section_key: "description", label_ko: "골프장 설명", label_ja: "ゴルフ場説明", sort: 2, is_visible: true, fields: [] },
  { section_key: "play_cart", label_ko: "플레이/카트", label_ja: "プレー/カート", sort: 3, is_visible: true, fields: [] },
  { section_key: "clubhouse", label_ko: "클럽하우스 식사", label_ja: "クラブハウス食事", sort: 4, is_visible: true, fields: [] },
  { section_key: "bath_shower", label_ko: "목욕/샤워", label_ja: "入浴/シャワー", sort: 5, is_visible: true, fields: [] },
  { section_key: "rental", label_ko: "렌탈 골프채", label_ja: "レンタルゴルフ", sort: 6, is_visible: true, fields: [] },
  { section_key: "dress_code", label_ko: "복장", label_ja: "服装", sort: 7, is_visible: true, fields: [] },
  { section_key: "includes", label_ko: "포함사항", label_ja: "含むもの", sort: 8, is_visible: true, fields: [] },
  { section_key: "excludes", label_ko: "불포함사항", label_ja: "含まないもの", sort: 9, is_visible: true, fields: [] },
  { section_key: "additional_guide", label_ko: "추가 안내", label_ja: "追加案内", sort: 10, is_visible: true, fields: [] },
  { section_key: "nearby_restaurants", label_ko: "주변 음식점", label_ja: "周辺グルメ", sort: 11, is_visible: true, fields: [] },
];

const HOTEL_SECTIONS: DynamicSection[] = [
  { section_key: "basic_info", label_ko: "기본 정보", label_ja: "基本情報", sort: 1, is_visible: true, fields: [] },
  { section_key: "checkin", label_ko: "체크인", label_ja: "チェックイン", sort: 2, is_visible: true, fields: [] },
  { section_key: "checkout", label_ko: "체크아웃", label_ja: "チェックアウト", sort: 3, is_visible: true, fields: [] },
  { section_key: "breakfast", label_ko: "조식", label_ja: "朝食", sort: 6, is_visible: true, fields: [] },
  { section_key: "dinner", label_ko: "석식", label_ja: "夕食", sort: 7, is_visible: true, fields: [] },
  { section_key: "onsen_spa", label_ko: "온천/스파", label_ja: "温泉/スパ", sort: 8, is_visible: true, fields: [] },
  { section_key: "bath_hours", label_ko: "운영시간", label_ja: "営業時間", sort: 9, is_visible: true, fields: [] },
  { section_key: "tattoo_policy", label_ko: "타투 정책", label_ja: "タトゥーポリシー", sort: 10, is_visible: true, fields: [] },
  { section_key: "other_info", label_ko: "기타 안내", label_ja: "その他案内", sort: 11, is_visible: true, fields: [] },
  { section_key: "atm_payment", label_ko: "ATM/결제", label_ja: "ATM/決済", sort: 12, is_visible: true, fields: [] },
  { section_key: "transport", label_ko: "교통", label_ja: "交通", sort: 13, is_visible: true, fields: [] },
  { section_key: "additional_guide", label_ko: "추가 안내", label_ja: "追加案内", sort: 14, is_visible: true, fields: [] },
  { section_key: "nearby_restaurants", label_ko: "주변 음식점", label_ja: "周辺グルメ", sort: 15, is_visible: true, fields: [] },
];

const RESTAURANT_SECTIONS: DynamicSection[] = [
  { section_key: "basic_info", label_ko: "기본 정보", label_ja: "基本情報", sort: 1, is_visible: true, fields: [] },
  { section_key: "address", label_ko: "주소", label_ja: "住所", sort: 2, is_visible: true, fields: [] },
  { section_key: "phone", label_ko: "전화", label_ja: "電話", sort: 3, is_visible: true, fields: [] },
  { section_key: "hours", label_ko: "영업시간", label_ja: "営業時間", sort: 4, is_visible: true, fields: [] },
  { section_key: "closed_days", label_ko: "휴무일", label_ja: "定休日", sort: 5, is_visible: true, fields: [] },
  { section_key: "menu", label_ko: "대표 메뉴", label_ja: "代表メニュー", sort: 6, is_visible: true, fields: [] },
  { section_key: "price_range", label_ko: "가격대", label_ja: "価格帯", sort: 7, is_visible: true, fields: [] },
  { section_key: "payment", label_ko: "결제", label_ja: "決済", sort: 8, is_visible: true, fields: [] },
  { section_key: "parking", label_ko: "주차", label_ja: "駐車", sort: 9, is_visible: true, fields: [] },
  { section_key: "seating", label_ko: "좌석", label_ja: "座席", sort: 10, is_visible: true, fields: [] },
  { section_key: "reservation", label_ko: "예약", label_ja: "予約", sort: 11, is_visible: true, fields: [] },
  { section_key: "smoking", label_ko: "흡연/금연", label_ja: "喫煙/禁煙", sort: 12, is_visible: true, fields: [] },
  { section_key: "other_info", label_ko: "기타 안내", label_ja: "その他案内", sort: 13, is_visible: true, fields: [] },
  { section_key: "additional_guide", label_ko: "추가 안내", label_ja: "追加案内", sort: 14, is_visible: true, fields: [] },
];

const DEFAULT_SECTIONS: Record<string, DynamicSection[]> = {
  GOLF: GOLF_SECTIONS,
  HOTEL: HOTEL_SECTIONS,
  RESTAURANT: RESTAURANT_SECTIONS,
};

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function getDynamicLabels(entityType: string): Promise<DynamicLabelsResult> {
  const type = entityType.toUpperCase();
  const db = getSupabaseServer();

  // Fetch sections and fields in parallel
  const [sectionsRes, fieldsRes] = await Promise.allSettled([
    db
      .from("section_definitions")
      .select("id, entity_type, section_key, label_ko, label_ja, sort, is_visible")
      .eq("entity_type", type)
      .order("sort"),
    db
      .from("field_definitions")
      .select("field_key, label_ko, label_ja, field_type, icon, section_key, sort, active")
      .eq("scope_entity_type", type)
      .eq("active", true)
      .order("sort"),
  ]);

  const dbSections = sectionsRes.status === "fulfilled" ? sectionsRes.value.data || [] : [];
  const dbFields = fieldsRes.status === "fulfilled" ? fieldsRes.value.data || [] : [];

  // Build field map
  const fieldMap: Record<string, DynamicField> = {};
  for (const f of dbFields) {
    fieldMap[f.field_key] = {
      field_key: f.field_key,
      label_ko: f.label_ko,
      label_ja: f.label_ja,
      field_type: f.field_type,
      icon: f.icon,
      sort: f.sort,
      active: f.active,
    };
  }

  // If DB has sections, use them; otherwise fall back to defaults
  let sections: DynamicSection[];

  if (dbSections.length > 0) {
    // Group fields by section_key
    const fieldsBySection = new Map<string, DynamicField[]>();
    for (const f of dbFields) {
      if (f.section_key) {
        const list = fieldsBySection.get(f.section_key) || [];
        list.push(fieldMap[f.field_key]);
        fieldsBySection.set(f.section_key, list);
      }
    }

    sections = dbSections.map((s) => ({
      section_key: s.section_key,
      label_ko: s.label_ko,
      label_ja: s.label_ja,
      sort: s.sort,
      is_visible: s.is_visible,
      fields: fieldsBySection.get(s.section_key) || [],
    }));
  } else {
    // Use defaults
    sections = (DEFAULT_SECTIONS[type] || []).map((s) => ({ ...s }));
  }

  return { sections, fieldMap };
}

// ---------------------------------------------------------------------------
// Label lookup helpers
// ---------------------------------------------------------------------------

/** Get section label by key, with fallback */
export function getSectionLabel(
  labels: DynamicLabelsResult,
  sectionKey: string,
  fallback: string
): string {
  const section = labels.sections.find((s) => s.section_key === sectionKey);
  return section?.label_ko || fallback;
}

/** Check if a section is visible */
export function isSectionVisible(
  labels: DynamicLabelsResult,
  sectionKey: string
): boolean {
  const section = labels.sections.find((s) => s.section_key === sectionKey);
  return section?.is_visible ?? true;
}

/** Get field label by key, with fallback */
export function getFieldLabel(
  labels: DynamicLabelsResult,
  fieldKey: string,
  fallback: string
): string {
  return labels.fieldMap[fieldKey]?.label_ko || fallback;
}
