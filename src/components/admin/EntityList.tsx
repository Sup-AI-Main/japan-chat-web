"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast, Toast } from "@/components/Toast";
import FormModal from "@/components/admin/FormModal";
import ImpactDeleteModal from "@/components/admin/ImpactDeleteModal";
import EntityDetailDrawer from "@/components/admin/EntityDetailDrawer";
import type { FieldDef } from "@/components/admin/FormModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AreaInfo {
  id: string;
  code: string;
  name_kr: string;
  icon: string;
}

interface CategoryInfo {
  id: string;
  code: string;
  label: string;
  icon: string;
  group_type: string;
}

interface EntityRow {
  id: string;
  slug: string;
  display_name: string;
  entity_type: string;
  area_id: string;
  category_id: string | null;
  active: boolean;
  sort: number;
  updated_at: string;
}

interface EntityListData {
  entities: EntityRow[];
  areas: AreaInfo[];
  categories: CategoryInfo[];
  fieldCounts: Record<string, number>;
}

interface ApiRes<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Entity type options
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  { value: "HOTEL", label: "호텔" },
  { value: "GOLF", label: "골프장" },
  { value: "RESTAURANT", label: "맛집" },
  { value: "PLACE", label: "장소" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EntityList({ areaCode }: { areaCode: string }) {
  const [data, setData] = useState<EntityListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [createModal, setCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EntityRow | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<Record<string, number> | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const { message, visible, showToast } = useToast();

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const [entRes, areasRes, catsRes] = await Promise.all([
        adminFetchJson<ApiRes<EntityRow[]>>(`/api/admin/manage-entities?area=${areaCode}`),
        adminFetchJson<ApiRes<AreaInfo[]>>("/api/admin/areas"),
        adminFetchJson<ApiRes<CategoryInfo[]>>("/api/admin/manage-categories"),
      ]);
      setData({
        entities: entRes.data,
        areas: areasRes.data,
        categories: catsRes.data,
        fieldCounts: {},
      });
    } catch {
      showToast("데이터를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, [areaCode, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Filtered entities
  // -----------------------------------------------------------------------

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.entities;

    if (categoryFilter !== "all") {
      list = list.filter((e) => e.category_id === categoryFilter);
    }
    if (entityTypeFilter !== "all") {
      list = list.filter((e) => e.entity_type === entityTypeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.display_name.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q));
    }

    return list.sort((a, b) => a.sort - b.sort);
  }, [data, categoryFilter, entityTypeFilter, search]);

  // -----------------------------------------------------------------------
  // Category options for this area
  // -----------------------------------------------------------------------

  const categoryOptions = useMemo(() => {
    if (!data) return [];
    const usedCategoryIds = new Set(data.entities.map((e) => e.category_id).filter(Boolean));
    return data.categories.filter((c) => c.group_type !== "SYSTEM" && usedCategoryIds.has(c.id));
  }, [data]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  async function handleCreateEntity(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const currentArea = data?.areas.find((a) => a.code === areaCode);
      if (!currentArea) throw new Error("지역을 찾을 수 없습니다");

      const payload = {
        display_name: values.display_name,
        entity_type: values.entity_type,
        area_id: currentArea.id,
        category_id: values.category_id || null,
        sort: values.sort ? Number(values.sort) : 999,
      };

      const res = await adminFetchJson<ApiRes<EntityRow>>("/api/admin/manage-entities", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, entities: [...prev.entities, res.data].sort((a, b) => a.sort - b.sort) };
      });
      setCreateModal(false);
      showToast("항목이 추가되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestDelete(entity: EntityRow) {
    setDeleteTarget(entity);
    try {
      const res = await adminFetchJson<ApiRes<Record<string, number>>>(
        `/api/admin/manage-entities?id=${entity.id}&confirmed=false`,
        { method: "DELETE" }
      );
      setDeleteImpact(res.data);
    } catch {
      // If impact fetch fails, still show delete confirmation with empty impact
      setDeleteImpact({});
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminFetchJson(`/api/admin/manage-entities?id=${deleteTarget.id}`, { method: "DELETE" });
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, entities: prev.entities.filter((e) => e.id !== deleteTarget.id) };
      });
      if (editEntityId === deleteTarget.id) setEditEntityId(null);
      setDeleteTarget(null);
      setDeleteImpact(null);
      showToast("삭제되었습니다");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleEntityUpdated(updated: EntityRow) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entities: prev.entities.map((e) => (e.id === updated.id ? updated : e)).sort((a, b) => a.sort - b.sort),
      };
    });
  }

  // -----------------------------------------------------------------------
  // Render: Loading
  // -----------------------------------------------------------------------

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-[14px] text-muted">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const currentArea = data.areas.find((a) => a.code === areaCode);

  // -----------------------------------------------------------------------
  // Create form fields
  // -----------------------------------------------------------------------

  const createFields: FieldDef[] = [
    { name: "display_name", label: "이름", type: "text", required: true, placeholder: "예: 카오 골프장" },
    {
      name: "entity_type",
      label: "타입",
      type: "select",
      required: true,
      options: ENTITY_TYPES,
    },
    {
      name: "category_id",
      label: "카테고리",
      type: "select",
      options: data.categories
        .filter((c) => c.group_type !== "SYSTEM")
        .map((c) => ({ value: c.id, label: `${c.icon} ${c.label}` })),
    },
    { name: "sort", label: "순서", type: "number", placeholder: "1" },
  ];

  // -----------------------------------------------------------------------
  // Impact items for delete modal
  // -----------------------------------------------------------------------

  const impactItems = deleteImpact
    ? [
        { label: "호텔 상세", count: deleteImpact.hotels ?? 0 },
        { label: "골프장 상세", count: deleteImpact.golf_courses ?? 0 },
        { label: "맛집 상세", count: deleteImpact.restaurants ?? 0 },
        { label: "FAQ", count: deleteImpact.faq ?? 0 },
        { label: "이동시간", count: deleteImpact.travel_times ?? 0 },
        { label: "콘텐츠 섹션", count: deleteImpact.content_sections ?? 0 },
        { label: "포함/불포함", count: deleteImpact.includes_excludes ?? 0 },
        { label: "동적 필드 값", count: deleteImpact.entity_field_values ?? 0 },
        { label: "카테고리 연결", count: deleteImpact.entity_categories ?? 0 },
      ]
    : [];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      <Toast message={message} visible={visible} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-text">
            {currentArea?.icon} {currentArea?.name_kr} 콘텐츠 관리
          </h1>
          <p className="text-[13px] text-muted mt-1">
            전체 {data.entities.length}개 항목
          </p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px] shrink-0"
        >
          + 새 항목 추가
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 slug로 검색..."
            className="w-full px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary min-h-[40px]"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary min-h-[40px] bg-white"
        >
          <option value="all">모든 카테고리</option>
          {data.categories
            .filter((c) => c.group_type !== "SYSTEM")
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
        </select>

        {/* Entity type filter */}
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="px-3 py-2 text-[14px] border border-border rounded-[8px] focus:outline-none focus:border-primary min-h-[40px] bg-white"
        >
          <option value="all">모든 타입</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left text-[12px] font-medium text-muted px-4 py-3">이름</th>
                <th className="text-left text-[12px] font-medium text-muted px-4 py-3">카테고리</th>
                <th className="text-center text-[12px] font-medium text-muted px-4 py-3">타입</th>
                <th className="text-center text-[12px] font-medium text-muted px-4 py-3">순서</th>
                <th className="text-right text-[12px] font-medium text-muted px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entity) => {
                const cat = data.categories.find((c) => c.id === entity.category_id);
                return (
                  <tr key={entity.id} className="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditEntityId(entity.id)}
                        className="text-left hover:text-primary transition-colors"
                      >
                        <span className="text-[14px] font-medium text-text">{entity.display_name}</span>
                        <span className="text-[11px] text-muted ml-2 font-mono">{entity.slug}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">
                      {cat ? `${cat.icon} ${cat.label}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {entity.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] text-muted">{entity.sort}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditEntityId(entity.id)}
                          className="px-3 py-1.5 text-[12px] text-primary border border-primary rounded-[6px] hover:bg-primary-soft min-h-[36px]"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleRequestDelete(entity)}
                          className="px-3 py-1.5 text-[12px] text-danger border border-danger rounded-[6px] hover:bg-red-50 min-h-[36px]"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.map((entity) => {
          const cat = data.categories.find((c) => c.id === entity.category_id);
          return (
            <div key={entity.id} className="bg-surface border border-border rounded-[12px] p-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setEditEntityId(entity.id)}
                  className="text-left hover:text-primary transition-colors"
                >
                  <span className="text-[15px] font-bold text-text">{entity.display_name}</span>
                </button>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  {entity.entity_type}
                </span>
              </div>
              <div className="flex gap-4 text-[12px] text-muted mb-3">
                {cat && <span>{cat.icon} {cat.label}</span>}
                <span>순서: {entity.sort}</span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setEditEntityId(entity.id)}
                  className="flex-1 px-3 py-2 text-[13px] text-primary border border-primary rounded-[8px] hover:bg-primary-soft min-h-[40px]"
                >
                  수정
                </button>
                <button
                  onClick={() => handleRequestDelete(entity)}
                  className="flex-1 px-3 py-2 text-[13px] text-danger border border-danger rounded-[8px] hover:bg-red-50 min-h-[40px]"
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-surface border border-border rounded-[12px] p-8 text-center mt-4">
          <p className="text-[14px] text-muted mb-3">
            {search || categoryFilter !== "all" || entityTypeFilter !== "all"
              ? "검색 조건에 맞는 항목이 없습니다."
              : "등록된 항목이 없습니다."}
          </p>
          <button
            onClick={() => setCreateModal(true)}
            className="px-4 py-2 text-[14px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[40px]"
          >
            첫 항목 추가하기
          </button>
        </div>
      )}

      {/* Create modal */}
      {createModal && (
        <FormModal
          open={true}
          title="새 항목 추가"
          fields={createFields}
          initialValues={{ entity_type: "GOLF", sort: String(data.entities.length + 1) }}
          onSubmit={handleCreateEntity}
          onCancel={() => setCreateModal(false)}
          loading={saving}
          submitLabel="추가"
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ImpactDeleteModal
          open={true}
          title={`"${deleteTarget.display_name}"을(를) 삭제하시겠습니까?`}
          items={impactItems}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteImpact(null); }}
          loading={deleteLoading}
        />
      )}

      {/* Entity detail drawer */}
      {editEntityId && (
        <EntityDetailDrawer
          entityId={editEntityId}
          areaCode={areaCode}
          onClose={() => setEditEntityId(null)}
          onEntityUpdated={handleEntityUpdated}
          onEntityDeleted={(id) => {
            setData((prev) => {
              if (!prev) return prev;
              return { ...prev, entities: prev.entities.filter((e) => e.id !== id) };
            });
            setEditEntityId(null);
          }}
        />
      )}
    </div>
  );
}
