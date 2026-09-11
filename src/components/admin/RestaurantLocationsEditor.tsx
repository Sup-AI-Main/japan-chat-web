"use client";

import { useState } from "react";
import { adminFetchJson } from "@/lib/admin-fetch";
import { useToast } from "@/components/Toast";

interface Location {
  id: string;
  restaurant_entity_id: string;
  near_entity_id: string;
  distance_text: string | null;
  distance_km: number | null;
  drive_minutes: number | null;
  walk_minutes: number | null;
  sort: number;
  near_entity?: { id: string; display_name: string; entity_type: string } | null;
}

interface Props {
  entityId: string;
  initialLocations: Location[];
  onUpdate: () => void;
}

export default function RestaurantLocationsEditor({ entityId, initialLocations, onUpdate }: Props) {
  const [locations, setLocations] = useState(initialLocations);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ distance_text: "", drive_minutes: "", walk_minutes: "" });
  const [newNearEntityId, setNewNearEntityId] = useState("");
  const [newForm, setNewForm] = useState({ distance_text: "", drive_minutes: "", walk_minutes: "" });
  const { showToast } = useToast();

  async function handleAdd() {
    if (!newNearEntityId.trim()) {
      showToast("연결할 엔티티 ID를 입력하세요");
      return;
    }
    setAdding(true);
    try {
      const res = await adminFetchJson<{ success: boolean; data: Location }>("/api/admin/restaurant-locations", {
        method: "POST",
        body: JSON.stringify({
          restaurant_entity_id: entityId,
          near_entity_id: newNearEntityId,
          distance_text: newForm.distance_text || null,
          drive_minutes: newForm.drive_minutes ? Number(newForm.drive_minutes) : null,
          walk_minutes: newForm.walk_minutes ? Number(newForm.walk_minutes) : null,
          sort: locations.length,
        }),
      });
      setLocations((prev) => [...prev, res.data]);
      setNewNearEntityId("");
      setNewForm({ distance_text: "", drive_minutes: "", walk_minutes: "" });
      showToast("연결이 추가되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await adminFetchJson<{ success: boolean; data: Location }>("/api/admin/restaurant-locations", {
        method: "PUT",
        body: JSON.stringify({
          id,
          distance_text: editForm.distance_text || null,
          drive_minutes: editForm.drive_minutes ? Number(editForm.drive_minutes) : null,
          walk_minutes: editForm.walk_minutes ? Number(editForm.walk_minutes) : null,
        }),
      });
      setLocations((prev) => prev.map((l) => (l.id === id ? res.data : l)));
      setEditingId(null);
      showToast("수정되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "수정 실패");
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminFetchJson(`/api/admin/restaurant-locations?id=${id}`, { method: "DELETE" });
      setLocations((prev) => prev.filter((l) => l.id !== id));
      showToast("삭제되었습니다");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  function startEdit(loc: Location) {
    setEditingId(loc.id);
    setEditForm({
      distance_text: loc.distance_text ?? "",
      drive_minutes: loc.drive_minutes != null ? String(loc.drive_minutes) : "",
      walk_minutes: loc.walk_minutes != null ? String(loc.walk_minutes) : "",
    });
  }

  return (
    <div>
      {locations.length === 0 ? (
        <p className="text-[13px] text-muted mb-3">연결된 주변 시설이 없습니다.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {locations.map((loc) => (
            <div key={loc.id} className="border border-border rounded-[8px] p-3">
              {editingId === loc.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-muted mb-1">거리</label>
                      <input
                        type="text"
                        value={editForm.distance_text}
                        onChange={(e) => setEditForm((p) => ({ ...p, distance_text: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
                        placeholder="도보 5분"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted mb-1">차(분)</label>
                      <input
                        type="number"
                        value={editForm.drive_minutes}
                        onChange={(e) => setEditForm((p) => ({ ...p, drive_minutes: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted mb-1">도보(분)</label>
                      <input
                        type="number"
                        value={editForm.walk_minutes}
                        onChange={(e) => setEditForm((p) => ({ ...p, walk_minutes: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="text-[12px] text-muted px-3 py-1">취소</button>
                    <button onClick={() => handleUpdate(loc.id)} className="text-[12px] text-white bg-primary px-3 py-1 rounded-[6px]">저장</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[13px] font-medium text-text">
                      {loc.near_entity?.display_name ?? loc.near_entity_id}
                    </span>
                    <span className="text-[11px] text-muted ml-2">
                      {loc.distance_text && loc.distance_text}
                      {loc.drive_minutes != null && ` 차 ${loc.drive_minutes}분`}
                      {loc.walk_minutes != null && ` 도보 ${loc.walk_minutes}분`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(loc)} className="text-[12px] text-primary hover:underline">수정</button>
                    <button onClick={() => handleDelete(loc.id)} className="text-[12px] text-danger hover:underline">삭제</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="border-t border-border pt-3">
        <h4 className="text-[12px] font-bold text-muted mb-2">새 연결 추가</h4>
        <div className="space-y-2">
          <input
            type="text"
            value={newNearEntityId}
            onChange={(e) => setNewNearEntityId(e.target.value)}
            placeholder="주변 시설 Entity ID (UUID)"
            className="w-full px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={newForm.distance_text}
              onChange={(e) => setNewForm((p) => ({ ...p, distance_text: e.target.value }))}
              placeholder="거리 텍스트"
              className="px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
            />
            <input
              type="number"
              value={newForm.drive_minutes}
              onChange={(e) => setNewForm((p) => ({ ...p, drive_minutes: e.target.value }))}
              placeholder="차(분)"
              className="px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
            />
            <input
              type="number"
              value={newForm.walk_minutes}
              onChange={(e) => setNewForm((p) => ({ ...p, walk_minutes: e.target.value }))}
              placeholder="도보(분)"
              className="px-2 py-1.5 text-[13px] border border-border rounded-[6px] focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={adding || !newNearEntityId.trim()}
              className="px-3 py-2 text-[13px] text-white bg-primary rounded-[8px] hover:opacity-90 min-h-[36px] disabled:opacity-50"
            >
              {adding ? "추가 중..." : "연결 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
