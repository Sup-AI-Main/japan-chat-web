"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetchJson, ConflictError } from "@/lib/admin-fetch";
import { useToast, Toast } from "@/components/Toast";
import FieldPickerModal from "@/components/admin/FieldPickerModal";
import FieldCreateModal from "@/components/admin/FieldCreateModal";
import IncludesExcludesEditor from "@/components/admin/IncludesExcludesEditor";
import ContentSectionsEditor from "@/components/admin/ContentSectionsEditor";
import RestaurantLocationsEditor from "@/components/admin/RestaurantLocationsEditor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntityDetail {
  entity: {
    id: string;
    slug: string;
    display_name: string;
    entity_type: string;
    area_id: string;
    category_id: string | null;
    active: boolean;
    sort: number;
    updated_at: string;
    category: { id: string; code: string; label: string } | null;
    area: { id: string; code: string; name_kr: string } | null;
  };
  hotel: Record<string, unknown> | null;
  golf: Record<string, unknown> | null;
  restaurant: Record<string, unknown> | null;
  restaurant_locations: Array<{id:string;restaurant_entity_id:string;near_entity_id:string;distance_text:string|null;distance_km:number|null;drive_minutes:number|null;walk_minutes:number|null;sort:number}>;
  field_values: Array<{
    id: string;
    entity_id: string;
    field_definition_id: string;
    value_text: string | null;
    value_json: unknown;
    sort: number;
    visible: boolean;
    field_definition: {
      id: string;
      field_key: string;
      label_ko: string;
      label_ja: string | null;
      label_en: string | null;
      field_type: string;
      icon: string | null;
      options_json: unknown;
    } | null;
  }>;
  includes_excludes: Array<{id:string;type:string;text_kr:string;text_jp:string;sort:number;is_visible:boolean}>;
  content_sections: Array<{id:string;title:string;content:string;emoji:string|null;sort:number;is_visible:boolean}>;
  travel_times_from: Array<Record<string, unknown>>;
  travel_times_to: Array<Record<string, unknown>>;
}

interface AreaInfo { id: string; code: string; name_kr: string; icon: string; }
interface CategoryInfo { id: string; code: string; label: string; icon: string; group_type: string; }

interface Props {
  entityId: string;
  areaCode: string;
  onClose: () => void;
  onEntityUpdated: (entity: { id: string; display_name: string; entity_type: string; area_id: string; category_id: string | null; active: boolean; sort: number; slug: string; updated_at: string }) => void;
  onEntityDeleted: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Section collapse helper
// ---------------------------------------------------------------------------

function Section({ title, icon, defaultOpen = true, children }: {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-[10px] overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-[14px] font-bold text-text">
          {icon && <span className="mr-1">{icon}</span>}
          {title}
        </span>
        <span className="text-[14px] text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field value input renderer
// ---------------------------------------------------------------------------

function FieldValueInput({ fieldType, value, onChange, options, disabled }: {
  fieldType: string;
  value: string;
  onChange: (v: string) => void;
  options?: unknown;
  disabled?: boolean;
}) {
  const base = "w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary disabled:opacity-50";

  if (fieldType === "textarea") {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} disabled={disabled} className={`${base} resize-none`} />;
  }
  if (fieldType === "boolean") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${base} bg-white`}>
        <option value="">선택</option>
        <option value="true">예</option>
        <option value="false">아니오</option>
      </select>
    );
  }
  if (fieldType === "select" && Array.isArray(options)) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${base} bg-white`}>
        <option value="">선택</option>
        {(options as Array<{ value: string; label: string }>).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (fieldType === "url") {
    return <input type="url" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={base} placeholder="https://..." />;
  }
  if (fieldType === "number") {
    return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={base} />;
  }
  if (fieldType === "date") {
    return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={base} />;
  }
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={base} />;
}

// ---------------------------------------------------------------------------
// Subtype field definitions
// ---------------------------------------------------------------------------

const HOTEL_FIELDS: Array<{ key: string; label: string; type: string; group: string }> = [
  { key: "official_name", label: "공식 이름", type: "text", group: "기본" },
  { key: "address", label: "주소", type: "text", group: "기본" },
  { key: "phone", label: "전화번호", type: "text", group: "기본" },
  { key: "google_maps_url", label: "Google Maps", type: "url", group: "기본" },
  { key: "source_url", label: "출처 URL", type: "url", group: "기본" },
  { key: "checkin_time", label: "체크인 시간", type: "text", group: "체크인/아웃" },
  { key: "checkout_time", label: "체크아웃 시간", type: "text", group: "체크인/아웃" },
  { key: "breakfast_place", label: "조식 장소", type: "text", group: "조식" },
  { key: "breakfast_time", label: "조식 시간", type: "text", group: "조식" },
  { key: "breakfast_last_entry", label: "조식 마감", type: "text", group: "조식" },
  { key: "breakfast_summary", label: "조식 요약", type: "textarea", group: "조식" },
  { key: "dinner_place", label: "석식 장소", type: "text", group: "석식" },
  { key: "dinner_time", label: "석식 시간", type: "text", group: "석식" },
  { key: "dinner_last_entry", label: "석식 마감", type: "text", group: "석식" },
  { key: "dinner_summary", label: "석식 요약", type: "textarea", group: "석식" },
  { key: "has_public_bath", label: "대욕장", type: "boolean", group: "온천/스파" },
  { key: "has_outdoor_onsen", label: "노천 온천", type: "boolean", group: "온천/스파" },
  { key: "has_sauna", label: "사우나", type: "boolean", group: "온천/스파" },
  { key: "bath_spa_hours", label: "온천 시간", type: "text", group: "온천/스파" },
  { key: "bath_spa_summary", label: "온천 요약", type: "textarea", group: "온천/스파" },
  { key: "tattoo_policy", label: "타투 정책", type: "text", group: "기타" },
  { key: "atm_payment", label: "결제/ATM", type: "text", group: "기타" },
  { key: "transport_note", label: "교통 안내", type: "textarea", group: "기타" },
  { key: "other_info", label: "기타 정보", type: "textarea", group: "기타" },
  { key: "status", label: "상태", type: "text", group: "관리" },
];

const GOLF_FIELDS: Array<{ key: string; label: string; type: string; group: string }> = [
  { key: "official_name", label: "공식 이름", type: "text", group: "기본" },
  { key: "address", label: "주소", type: "text", group: "기본" },
  { key: "phone", label: "전화번호", type: "text", group: "기본" },
  { key: "google_maps_url", label: "Google Maps", type: "url", group: "기본" },
  { key: "source_url", label: "출처 URL", type: "url", group: "기본" },
  { key: "course_summary", label: "코스 요약", type: "textarea", group: "코스" },
  { key: "play_cart", label: "플레이/카트", type: "textarea", group: "플레이" },
  { key: "clubhouse_dining", label: "클럽하우스 식사", type: "textarea", group: "시설" },
  { key: "bath_shower", label: "샤워/욕실", type: "text", group: "시설" },
  { key: "rental", label: "렌탈", type: "textarea", group: "시설" },
  { key: "dress_code", label: "복장 규정", type: "textarea", group: "규정" },
  { key: "product_reference_minutes", label: "소요 시간(분)", type: "number", group: "기타" },
  { key: "travel_time_note", label: "이동시간 메모", type: "text", group: "기타" },
  { key: "status", label: "상태", type: "text", group: "관리" },
];

const RESTAURANT_FIELDS: Array<{ key: string; label: string; type: string; group: string }> = [
  { key: "category", label: "식당 분류", type: "text", group: "기본" },
  { key: "address", label: "주소", type: "text", group: "기본" },
  { key: "phone", label: "전화번호", type: "text", group: "기본" },
  { key: "google_maps_url", label: "Google Maps", type: "url", group: "기본" },
  { key: "source_url", label: "출처 URL", type: "url", group: "기본" },
  { key: "hours", label: "영업시간", type: "text", group: "영업" },
  { key: "closed_days", label: "휴무일", type: "text", group: "영업" },
  { key: "price_range", label: "가격대", type: "text", group: "메뉴" },
  { key: "menu_kr", label: "메뉴(한글)", type: "textarea", group: "메뉴" },
  { key: "menu_jp", label: "메뉴(일본어)", type: "textarea", group: "메뉴" },
  { key: "menu_price", label: "메뉴 가격", type: "text", group: "메뉴" },
  { key: "description", label: "설명", type: "textarea", group: "기타" },
  { key: "recommended", label: "추천", type: "boolean", group: "기타" },
  { key: "status", label: "상태", type: "text", group: "관리" },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function EntityDetailDrawer({ entityId, areaCode, onClose, onEntityUpdated, onEntityDeleted }: Props) {
  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<AreaInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [fieldCreateOpen, setFieldCreateOpen] = useState(false);
  const { message, visible, showToast } = useToast();

  // Local edit state for entity basic info
  const [entityForm, setEntityForm] = useState({
    display_name: "",
    category_id: "",
    entity_type: "",
    sort: "",
    active: true,
  });

  // Local edit state for subtype
  const [subtypeForm, setSubtypeForm] = useState<Record<string, string>>({});

  // Local edit state for field values
  const [fieldValueEdits, setFieldValueEdits] = useState<Record<string, string>>({});

  // -----------------------------------------------------------------------
  // Load data
  // -----------------------------------------------------------------------

  const loadDetail = useCallback(async () => {
    try {
      const [detailRes, areasRes, catsRes] = await Promise.all([
        adminFetchJson<{ success: boolean; data: EntityDetail }>(`/api/admin/manage-entities/${entityId}`),
        adminFetchJson<{ success: boolean; data: AreaInfo[] }>("/api/admin/areas"),
        adminFetchJson<{ success: boolean; data: CategoryInfo[] }>("/api/admin/manage-categories"),
      ]);
      setDetail(detailRes.data);
      setAreas(areasRes.data);
      setCategories(catsRes.data);

      // Init entity form
      const e = detailRes.data.entity;
      setEntityForm({
        display_name: e.display_name,
        category_id: e.category_id ?? "",
        entity_type: e.entity_type,
        sort: String(e.sort),
        active: e.active,
      });

      // Init subtype form
      const subtypeData = detailRes.data.hotel ?? detailRes.data.golf ?? detailRes.data.restaurant ?? {};
      const sf: Record<string, string> = {};
      for (const [k, v] of Object.entries(subtypeData)) {
        if (k === "entity_id" || k === "updated_at") continue;
        sf[k] = v === null || v === undefined ? "" : String(v);
      }
      setSubtypeForm(sf);

      // Init field value edits
      const fvEdits: Record<string, string> = {};
      for (const fv of detailRes.data.field_values) {
        fvEdits[fv.field_definition_id] = fv.value_text ?? "";
      }
      setFieldValueEdits(fvEdits);
    } catch {
      showToast("데이터를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, [entityId, showToast]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // -----------------------------------------------------------------------
  // Save handlers
  // -----------------------------------------------------------------------

  async function saveEntityBasic() {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await adminFetchJson<{ success: boolean; data: EntityDetail["entity"] }>("/api/admin/manage-entities", {
        method: "PUT",
        body: JSON.stringify({
          id: detail.entity.id,
          updated_at: detail.entity.updated_at,
          display_name: entityForm.display_name,
          category_id: entityForm.category_id || null,
          entity_type: entityForm.entity_type,
          sort: Number(entityForm.sort),
          active: entityForm.active,
        }),
      });
      onEntityUpdated(res.data);
      setHasChanges(false);
      showToast("기본 정보가 저장되었습니다");
      // Reload detail to get fresh updated_at
      await loadDetail();
    } catch (err) {
      if (err instanceof ConflictError) {
        showToast("다른 곳에서 변경되었습니다. 새로고침합니다.");
        await loadDetail();
      } else {
        showToast(err instanceof Error ? err.message : "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveSubtype() {
    if (!detail) return;
    setSaving(true);
    try {
      const entityType = detail.entity.entity_type;
      let endpoint = "";
      if (entityType === "HOTEL") endpoint = "/api/admin/hotel";
      else if (entityType === "GOLF") endpoint = "/api/admin/golf";
      else if (entityType === "RESTAURANT") endpoint = "/api/admin/restaurant";
      else {
        showToast("이 타입은 전용 정보가 없습니다");
        setSaving(false);
        return;
      }

      await adminFetchJson(endpoint, {
        method: "PUT",
        body: JSON.stringify({ id: detail.entity.id, ...subtypeForm }),
      });
      showToast("전용 정보가 저장되었습니다");
      await loadDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function saveFieldValues() {
    if (!detail) return;
    setSaving(true);
    try {
      const values = Object.entries(fieldValueEdits)
        .filter(([fdId]) => detail.field_values.some((fv) => fv.field_definition_id === fdId))
        .map(([field_definition_id, value]) => ({
          field_definition_id,
          value_text: value || null,
        }));

      if (values.length > 0) {
        await adminFetchJson("/api/admin/entity-field-values/bulk", {
          method: "POST",
          body: JSON.stringify({ entity_id: entityId, values }),
        });
      }
      showToast("동적 필드가 저장되었습니다");
      await loadDetail();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFieldValue(fieldDefinitionId: string) {
    try {
      await adminFetchJson(
        `/api/admin/entity-field-values?entity_id=${entityId}&field_definition_id=${fieldDefinitionId}`,
        { method: "DELETE" }
      );
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          field_values: prev.field_values.filter((fv) => fv.field_definition_id !== fieldDefinitionId),
        };
      });
      setFieldValueEdits((prev) => {
        const next = { ...prev };
        delete next[fieldDefinitionId];
        return next;
      });
      showToast("필드 값이 제거되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "제거 실패");
    }
  }

  async function handleFieldAdded() {
    setFieldPickerOpen(false);
    await loadDetail();
  }

  async function handleFieldCreated(fdId: string) {
    setFieldCreateOpen(false);
    // Add the new field value
    try {
      await adminFetchJson("/api/admin/entity-field-values", {
        method: "POST",
        body: JSON.stringify({ entity_id: entityId, field_definition_id: fdId, value_text: null }),
      });
      await loadDetail();
    } catch {
      showToast("필드 연결 실패");
    }
  }

  function handleEntityDelete() {
    if (!detail) return;
    if (confirm(`"${detail.entity.display_name}"을(를) 삭제하시겠습니까?`)) {
      adminFetchJson(`/api/admin/manage-entities?id=${entityId}`, { method: "DELETE" })
        .then(() => {
          onEntityDeleted(entityId);
          showToast("삭제되었습니다");
        })
        .catch((err) => showToast(err instanceof Error ? err.message : "삭제 실패"));
    }
  }

  // -----------------------------------------------------------------------
  // Subtype fields for current entity type
  // -----------------------------------------------------------------------

  const subtypeFieldDefs = detail?.entity.entity_type === "HOTEL" ? HOTEL_FIELDS
    : detail?.entity.entity_type === "GOLF" ? GOLF_FIELDS
    : detail?.entity.entity_type === "RESTAURANT" ? RESTAURANT_FIELDS
    : [];

  const subtypeGroups = [...new Set(subtypeFieldDefs.map((f) => f.group))];

  const hasSubtype = detail?.entity.entity_type === "HOTEL"
    || detail?.entity.entity_type === "GOLF"
    || detail?.entity.entity_type === "RESTAURANT";

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1500] bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[1600] w-full md:w-[560px] lg:w-[640px] bg-white shadow-xl overflow-y-auto">
        <Toast message={message} visible={visible} />

        {/* Drawer header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-text truncate flex-1 mr-3">
            {detail ? `${detail.entity.display_name}` : "로딩..."}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEntityDelete}
              className="px-3 py-1.5 text-[12px] text-danger border border-danger rounded-[6px] hover:bg-red-50 min-h-[36px]"
            >
              삭제
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-[18px] text-muted"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {loading || !detail ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="p-5 pb-24">
            {/* ======== Basic Info ======== */}
            <Section title="기본 정보" icon="📋">
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-muted mb-1">이름 *</label>
                  <input
                    type="text"
                    value={entityForm.display_name}
                    onChange={(e) => { setEntityForm((p) => ({ ...p, display_name: e.target.value })); setHasChanges(true); }}
                    className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-muted mb-1">카테고리</label>
                    <select
                      value={entityForm.category_id}
                      onChange={(e) => { setEntityForm((p) => ({ ...p, category_id: e.target.value })); setHasChanges(true); }}
                      className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="">없음</option>
                      {categories.filter((c) => c.group_type !== "SYSTEM").map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-muted mb-1">타입</label>
                    <select
                      value={entityForm.entity_type}
                      onChange={(e) => { setEntityForm((p) => ({ ...p, entity_type: e.target.value })); setHasChanges(true); }}
                      className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary bg-white"
                    >
                      <option value="HOTEL">호텔</option>
                      <option value="GOLF">골프장</option>
                      <option value="RESTAURANT">맛집</option>
                      <option value="PLACE">장소</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-muted mb-1">순서</label>
                    <input
                      type="number"
                      value={entityForm.sort}
                      onChange={(e) => { setEntityForm((p) => ({ ...p, sort: e.target.value })); setHasChanges(true); }}
                      className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={entityForm.active}
                        onChange={(e) => { setEntityForm((p) => ({ ...p, active: e.target.checked })); setHasChanges(true); }}
                        className="w-4 h-4"
                      />
                      <span className="text-[13px] text-text">활성</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-muted mb-1">Slug</label>
                  <p className="text-[13px] text-muted font-mono">{detail.entity.slug}</p>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={saveEntityBasic}
                    disabled={saving || !hasChanges}
                    className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "기본 정보 저장"}
                  </button>
                </div>
              </div>
            </Section>

            {/* ======== Subtype Info ======== */}
            {hasSubtype && (
              <Section title={`${detail.entity.entity_type === "HOTEL" ? "호텔" : detail.entity.entity_type === "GOLF" ? "골프장" : "맛집"} 전용 정보`} icon="🏨" defaultOpen={true}>
                {subtypeGroups.map((group) => (
                  <div key={group} className="mb-4 last:mb-0">
                    <h4 className="text-[12px] font-bold text-muted uppercase tracking-wide mb-2">{group}</h4>
                    <div className="space-y-2">
                      {subtypeFieldDefs.filter((f) => f.group === group).map((f) => (
                        <div key={f.key}>
                          <label className="block text-[12px] font-medium text-muted mb-1">{f.label}</label>
                          <FieldValueInput
                            fieldType={f.type}
                            value={subtypeForm[f.key] ?? ""}
                            onChange={(v) => { setSubtypeForm((p) => ({ ...p, [f.key]: v })); }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-3 border-t border-border mt-4">
                  <button
                    onClick={saveSubtype}
                    disabled={saving}
                    className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "전용 정보 저장"}
                  </button>
                </div>
              </Section>
            )}

            {/* ======== Dynamic Fields ======== */}
            <Section title="동적 상세 필드" icon="🔧" defaultOpen={true}>
              {detail.field_values.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {detail.field_values.map((fv) => {
                    const def = fv.field_definition;
                    if (!def) return null;
                    return (
                      <div key={fv.id} className="flex items-start gap-2">
                        <div className="flex-1">
                          <label className="block text-[12px] font-medium text-muted mb-1">
                            {def.icon && <span className="mr-1">{def.icon}</span>}
                            {def.label_ko}
                            <span className="text-[10px] text-muted ml-1">({def.field_type})</span>
                          </label>
                          <FieldValueInput
                            fieldType={def.field_type}
                            value={fieldValueEdits[fv.field_definition_id] ?? ""}
                            onChange={(v) => setFieldValueEdits((p) => ({ ...p, [fv.field_definition_id]: v }))}
                            options={def.options_json}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveFieldValue(fv.field_definition_id)}
                          className="mt-5 w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-muted hover:text-danger text-[14px]"
                          title="이 엔티티에서 제거"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-muted mb-4">연결된 동적 필드가 없습니다.</p>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFieldPickerOpen(true)}
                  className="px-3 py-2 text-[13px] text-primary border border-primary rounded-[8px] hover:bg-primary-soft min-h-[36px]"
                >
                  + 기존 필드 추가
                </button>
                <button
                  onClick={() => setFieldCreateOpen(true)}
                  className="px-3 py-2 text-[13px] text-text border border-border rounded-[8px] hover:bg-gray-50 min-h-[36px]"
                >
                  + 새 필드 만들기
                </button>
                {detail.field_values.length > 0 && (
                  <button
                    onClick={saveFieldValues}
                    disabled={saving}
                    className="px-3 py-2 text-[13px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[36px] disabled:opacity-50 ml-auto"
                  >
                    {saving ? "저장 중..." : "필드 값 저장"}
                  </button>
                )}
              </div>
            </Section>

            {/* ======== Includes/Excludes ======== */}
            <Section title="포함/불포함 사항" icon="✅" defaultOpen={false}>
              <IncludesExcludesEditor entityId={entityId} initialItems={detail.includes_excludes} onUpdate={loadDetail} />
            </Section>

            {/* ======== Content Sections ======== */}
            <Section title="추가 안내" icon="📝" defaultOpen={false}>
              <ContentSectionsEditor entityId={entityId} initialSections={detail.content_sections} onUpdate={loadDetail} />
            </Section>

            {/* ======== Restaurant Locations ======== */}
            {detail.entity.entity_type === "RESTAURANT" && (
              <Section title="주변 시설 연결" icon="📍" defaultOpen={false}>
                <RestaurantLocationsEditor entityId={entityId} initialLocations={detail.restaurant_locations} onUpdate={loadDetail} />
              </Section>
            )}

            {/* ======== Travel Times ======== */}
            <Section title="이동시간" icon="🚗" defaultOpen={false}>
              {detail.travel_times_from.length === 0 && detail.travel_times_to.length === 0 ? (
                <p className="text-[13px] text-muted">연결된 이동시간이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {detail.travel_times_from.map((tt: Record<string, unknown>) => (
                    <div key={tt.id as string} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-[13px] text-text">
                        → {(tt.to_entity as Record<string, unknown>)?.display_name as string ?? "—"}
                      </span>
                      <span className="text-[13px] text-muted">
                        {tt.display_time as string || (tt.product_reference_minutes ? `${tt.product_reference_minutes}분` : "") || "—"}
                      </span>
                    </div>
                  ))}
                  {detail.travel_times_to.map((tt: Record<string, unknown>) => (
                    <div key={tt.id as string} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-[13px] text-text">
                        ← {(tt.from_entity as Record<string, unknown>)?.display_name as string ?? "—"}
                      </span>
                      <span className="text-[13px] text-muted">
                        {tt.display_time as string || (tt.product_reference_minutes ? `${tt.product_reference_minutes}분` : "") || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted mt-3">
                이동시간 관리는 대시보드의 이동시간 섹션에서 할 수 있습니다.
              </p>
            </Section>
          </div>
        )}

        {/* Sticky footer */}
        <div className="fixed bottom-0 right-0 w-full md:w-[560px] lg:w-[640px] bg-white border-t border-border px-5 py-3 flex justify-end gap-3 z-[1700]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] text-muted border border-border rounded-[8px] hover:bg-gray-50 min-h-[40px]"
          >
            닫기
          </button>
        </div>
      </div>

      {/* Field Picker Modal */}
      {fieldPickerOpen && (
        <FieldPickerModal
          entityId={entityId}
          entity={detail?.entity ?? null}
          existingFieldIds={detail?.field_values.map((fv) => fv.field_definition_id) ?? []}
          onAdd={handleFieldAdded}
          onClose={() => setFieldPickerOpen(false)}
        />
      )}

      {/* Field Create Modal */}
      {fieldCreateOpen && (
        <FieldCreateModal
          entityId={entityId}
          entity={detail?.entity ?? null}
          onCreated={handleFieldCreated}
          onClose={() => setFieldCreateOpen(false)}
        />
      )}
    </>
  );
}
