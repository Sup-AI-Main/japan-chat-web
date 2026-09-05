"use client";

import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { EditableList, AddButton, ConfirmModal } from "@/components/inline-cms";
import type { TravelTime, Hotel, GolfCourse } from "@/lib/types";

interface TravelTimeEditData {
  id?: string;
  area: string;
  from_id: string;
  to_id: string;
  verified_drive_min: string;
  directions_url: string;
  sort: number;
  updated_at?: string;
}

interface AreaTravelTimesClientProps {
  initialTravelTimes: TravelTime[];
  hotels: Pick<Hotel, "id" | "official_name">[];
  golfCourses: Pick<GolfCourse, "id" | "display_name">[];
  area: string;
}

function TravelTimeEditModal({
  data,
  hotels,
  golfCourses,
  area,
  open,
  onClose,
  onSaved,
}: {
  data: TravelTimeEditData | null;
  hotels: Pick<Hotel, "id" | "official_name">[];
  golfCourses: Pick<GolfCourse, "id" | "display_name">[];
  area: string;
  open: boolean;
  onClose: () => void;
  onSaved: (data: TravelTimeEditData) => void;
}) {
  const [formData, setFormData] = useState<TravelTimeEditData>(
    data || {
      area: area.toUpperCase(),
      from_id: "",
      to_id: "",
      verified_drive_min: "",
      directions_url: "",
      sort: 999,
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.from_id || !formData.to_id) {
      setError("호텔과 골프장을 선택하세요.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const isEdit = !!formData.id;
      const res = await fetch("/api/admin/travel-times", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.status === 409) {
        setError("다른 관리자가 먼저 수정했습니다. 최신 데이터를 다시 불러와 주세요.");
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "저장 실패");
        return;
      }

      const result = await res.json();
      onSaved({ ...formData, id: result.id || formData.id });
      onClose();
    } catch {
      setError("저장 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[480px] mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[18px] font-bold text-text">
            {data ? "이동시간 수정" : "이동시간 추가"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg transition-colors text-muted text-[18px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-text mb-1">호텔 *</label>
            <select
              value={formData.from_id}
              onChange={(e) => setFormData((p) => ({ ...p, from_id: e.target.value }))}
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
              required
            >
              <option value="">호텔 선택</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.official_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-text mb-1">골프장 *</label>
            <select
              value={formData.to_id}
              onChange={(e) => setFormData((p) => ({ ...p, to_id: e.target.value }))}
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
              required
            >
              <option value="">골프장 선택</option>
              {golfCourses.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[14px] font-medium text-text mb-1">차량 소요시간</label>
            <input
              type="text"
              value={formData.verified_drive_min}
              onChange={(e) => setFormData((p) => ({ ...p, verified_drive_min: e.target.value }))}
              placeholder="예: 차량 약 30분"
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-text mb-1">길찾기 URL</label>
            <input
              type="url"
              value={formData.directions_url}
              onChange={(e) => setFormData((p) => ({ ...p, directions_url: e.target.value }))}
              placeholder="https://maps.google.com/..."
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-text mb-1">정렬 순서</label>
            <input
              type="number"
              value={formData.sort}
              onChange={(e) => setFormData((p) => ({ ...p, sort: Number(e.target.value) }))}
              className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-[14px] text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border py-3 rounded-[10px] text-[15px] font-medium text-muted hover:bg-bg transition-colors min-h-[44px] cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-3 rounded-[10px] text-[15px] font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {loading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AreaTravelTimesClient({
  initialTravelTimes,
  hotels,
  golfCourses,
  area,
}: AreaTravelTimesClientProps) {
  const [travelTimes, setTravelTimes] = useState(initialTravelTimes);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<TravelTime | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TravelTime | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const isAdmin = useAdmin();

  const hotelMap = new Map(hotels.map((h) => [h.id, h.official_name]));
  const golfMap = new Map(golfCourses.map((g) => [g.id, g.display_name]));

  // Group by hotel
  const grouped = new Map<string, { hotelName: string; courses: TravelTime[] }>();
  for (const tt of travelTimes) {
    const existing = grouped.get(tt.hotel_id);
    if (existing) {
      existing.courses.push(tt);
    } else {
      grouped.set(tt.hotel_id, {
        hotelName: tt.hotel_name || hotelMap.get(tt.hotel_id) || tt.hotel_id,
        courses: [tt],
      });
    }
  }

  const handleAdd = () => {
    setEditTarget(null);
    setEditModal(true);
  };

  const handleEdit = (tt: TravelTime) => {
    setEditTarget(tt);
    setEditModal(true);
  };

  const handleSaved = (saved: TravelTimeEditData) => {
    const hotelName = hotelMap.get(saved.from_id) || "";
    const golfName = golfMap.get(saved.to_id) || "";
    const newEntry: TravelTime = {
      id: saved.id || "",
      area: saved.area,
      hotel_id: saved.from_id,
      hotel_name: hotelName,
      golf_id: saved.to_id,
      golf_name: golfName,
      estimated_time: saved.verified_drive_min,
      google_maps_direction_url: saved.directions_url,
      active: "TRUE",
      sort: saved.sort,
    };

    if (editTarget) {
      setTravelTimes((prev) =>
        prev.map((t) => (t.id === newEntry.id ? newEntry : t)).sort((a, b) => a.sort - b.sort)
      );
    } else {
      setTravelTimes((prev) => [...prev, newEntry].sort((a, b) => a.sort - b.sort));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/travel-times?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTravelTimes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (travelTimes.length === 0 && !isAdmin) return null;

  return (
    <>
      <div className="border-t border-border pt-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-text">🚗 호텔 ↔ 골프장 이동시간</h2>
          {isAdmin && <AddButton onClick={handleAdd} label="이동시간 추가" />}
        </div>

        {grouped.size > 0 ? (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([hotelId, { hotelName, courses }]) => (
              <div key={hotelId} className="bg-surface border border-border rounded-[12px] p-4">
                <h3 className="text-[15px] font-bold text-text mb-3">{hotelName}</h3>
                <div className="space-y-2">
                  {courses.map((tt) => (
                    <div key={tt.id} className="flex items-center justify-between gap-2 group">
                      <span className="text-[14px] text-text">{tt.golf_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted bg-bg rounded-full px-2 py-0.5">
                          {tt.estimated_time}
                        </span>
                        {tt.google_maps_direction_url && (
                          <a
                            href={tt.google_maps_direction_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-primary hover:underline"
                          >
                            길찾기 →
                          </a>
                        )}
                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(tt)}
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg text-muted text-[14px] cursor-pointer"
                              title="수정"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setDeleteTarget(tt)}
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-danger/10 text-muted hover:text-danger text-[14px] cursor-pointer"
                              title="삭제"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          isAdmin && (
            <p className="text-[14px] text-muted">등록된 이동시간이 없습니다.</p>
          )
        )}
      </div>

      <TravelTimeEditModal
        data={
          editTarget
            ? {
                id: editTarget.id,
                area: editTarget.area,
                from_id: editTarget.hotel_id,
                to_id: editTarget.golf_id,
                verified_drive_min: editTarget.estimated_time,
                directions_url: editTarget.google_maps_direction_url,
                sort: editTarget.sort,
              }
            : null
        }
        hotels={hotels}
        golfCourses={golfCourses}
        area={area}
        open={editModal}
        onClose={() => {
          setEditModal(false);
          setEditTarget(null);
        }}
        onSaved={handleSaved}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="이동시간 삭제"
        message={`"${deleteTarget?.hotel_name} → ${deleteTarget?.golf_name}" 이동시간을 삭제하시겠습니까?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </>
  );
}