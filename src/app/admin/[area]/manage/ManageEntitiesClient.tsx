"use client";

import { useState, useCallback } from "react";
import { HotelEditModal } from "@/components/inline-cms/HotelEditModal";
import { GolfEditModal } from "@/components/inline-cms/GolfEditModal";
import { AddButton, ConfirmModal } from "@/components/inline-cms";
import AreaTravelTimesClient from "@/components/AreaTravelTimesClient";
import { useToast, Toast } from "@/components/Toast";
import { adminFetchJson, ConflictError } from "@/lib/admin-fetch";
import type { TravelTime } from "@/lib/types";

interface AreaInfo {
  id: string;
  code: string;
  name_kr: string;
  name_jp?: string;
  icon: string;
  active: boolean;
  sort: number;
}

interface HotelItem {
  id: string;
  slug: string;
  name_kr: string;
  official_name: string;
  address: string;
  phone: string;
  check_in: string;
  check_out: string;
  checkin_time: string;
  checkout_time: string;
  breakfast: string;
  bath_spa: string;
  google_maps_url: string;
  source_url: string;
  status: string;
  active: string;
  sort: number;
  updated_at: string;
  name_jp: string;
  address_kr: string;
  address_jp: string;
  breakfast_place: string;
  breakfast_time: string;
  breakfast_last_entry: string;
  dinner_place: string;
  dinner_time: string;
  dinner_last_entry: string;
  has_public_bath: string;
  has_outdoor_onsen: string;
  has_sauna: string;
  bath_spa_hours: string;
  tattoo_policy: string;
  other_info: string;
  atm_payment: string;
  transport: string;
  hotel_dining: string;
}

interface GolfItem {
  id: string;
  slug: string;
  display_name: string;
  official_name: string;
  address: string;
  phone: string;
  course_summary: string;
  play_cart: string;
  clubhouse_dining: string;
  bath_shower: string;
  rental: string;
  dress_code: string;
  google_maps_url: string;
  source_url: string;
  status: string;
  active: string;
  sort: number;
  updated_at: string;
}

export default function ManageEntitiesClient({
  area,
  areaName,
  initialHotels,
  initialGolfCourses,
  initialTravelTimes,
  allAreas,
}: {
  area: string;
  areaName: string;
  initialHotels: HotelItem[];
  initialGolfCourses: GolfItem[];
  initialTravelTimes: TravelTime[];
  allAreas: AreaInfo[];
}) {
  const [hotels, setHotels] = useState(initialHotels);
  const [golfCourses, setGolfCourses] = useState(initialGolfCourses);
  const [travelTimes, setTravelTimes] = useState(initialTravelTimes);

  // Hotel modal state
  const [hotelModal, setHotelModal] = useState(false);
  const [hotelTarget, setHotelTarget] = useState<HotelItem | null>(null);

  // Golf modal state
  const [golfModal, setGolfModal] = useState(false);
  const [golfTarget, setGolfTarget] = useState<GolfItem | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: "HOTEL" | "GOLF"; id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Area edit
  const [areaEdit, setAreaEdit] = useState(false);
  const [areaForm, setAreaForm] = useState({ name_kr: "", name_jp: "", icon: "" });
  const [areaLoading, setAreaLoading] = useState(false);

  const { message, visible, showToast } = useToast();

  // Hotel CRUD
  const handleAddHotel = () => {
    setHotelTarget(null);
    setHotelModal(true);
  };

  const handleEditHotel = (h: HotelItem) => {
    setHotelTarget(h);
    setHotelModal(true);
  };

  const handleHotelSaved = useCallback(
    (data: Record<string, string>) => {
      showToast("호텔 저장 완료");
      setTimeout(() => {
        setHotelModal(false);
        setHotelTarget(null);
        window.location.reload();
      }, 500);
    },
    [showToast]
  );

  // Golf CRUD
  const handleAddGolf = () => {
    setGolfTarget(null);
    setGolfModal(true);
  };

  const handleEditGolf = (g: GolfItem) => {
    setGolfTarget(g);
    setGolfModal(true);
  };

  const handleGolfSaved = useCallback(
    (data: Record<string, string>) => {
      showToast("골프장 저장 완료");
      setTimeout(() => {
        setGolfModal(false);
        setGolfTarget(null);
        window.location.reload();
      }, 500);
    },
    [showToast]
  );

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const endpoint = deleteTarget.type === "HOTEL" ? "/api/admin/hotel" : "/api/admin/golf";
      await adminFetchJson(`${endpoint}?id=${deleteTarget.id}`, { method: "DELETE" });
      if (deleteTarget.type === "HOTEL") {
        setHotels((prev) => prev.filter((h) => h.id !== deleteTarget.id));
      } else {
        setGolfCourses((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      }
      showToast("삭제 완료");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Area edit
  const currentArea = allAreas.find((a) => a.code === area);
  const handleEditArea = () => {
    if (currentArea) {
      setAreaForm({
        name_kr: currentArea.name_kr || "",
        name_jp: currentArea.name_jp || "",
        icon: currentArea.icon || "",
      });
    }
    setAreaEdit(true);
  };

  const handleSaveArea = async () => {
    if (!currentArea) return;
    setAreaLoading(true);
    try {
      await adminFetchJson("/api/admin/options", {
        method: "PUT",
        body: JSON.stringify({
          id: currentArea.id,
          label: areaForm.name_kr,
          icon: areaForm.icon,
          description: areaForm.name_jp,
        }),
      });
      showToast("지역 정보 저장 완료");
      setTimeout(() => {
        setAreaEdit(false);
        window.location.reload();
      }, 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setAreaLoading(false);
    }
  };

  const hotelsForTravelTime = hotels.map((h) => ({
    id: h.id,
    name_kr: h.name_kr || h.official_name || "",
    official_name: h.official_name || "",
  }));

  const golfForTravelTime = golfCourses.map((g) => ({
    id: g.id,
    display_name: g.display_name || g.official_name || "",
  }));

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[720px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <a href={`/admin/${area}`} className="text-muted text-[14px] hover:text-text">
            ← 돌아가기
          </a>
          <h1 className="text-[22px] font-bold text-text">
            {currentArea?.icon} {areaName} 관리
          </h1>
        </div>

        {/* Area Info Section */}
        <section className="bg-surface border border-border rounded-[12px] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-text">지역 정보</h2>
            <button
              onClick={handleEditArea}
              className="text-[13px] text-primary hover:underline cursor-pointer"
            >
              수정
            </button>
          </div>
          {currentArea && (
            <div className="space-y-1 text-[14px] text-text">
              <p><span className="text-muted">코드:</span> {currentArea.code}</p>
              <p><span className="text-muted">한국어명:</span> {currentArea.name_kr}</p>
              {currentArea.name_jp && <p><span className="text-muted">일본어명:</span> {currentArea.name_jp}</p>}
              <p><span className="text-muted">아이콘:</span> {currentArea.icon}</p>
            </div>
          )}
        </section>

        {/* Hotels Section */}
        <section className="bg-surface border border-border rounded-[12px] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-text">호텔 관리</h2>
            <AddButton onClick={handleAddHotel} label="호텔 추가" />
          </div>
          {hotels.length > 0 ? (
            <div className="space-y-2">
              {hotels.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-text truncate">
                      {h.name_kr || h.official_name}
                    </p>
                    {(h.name_kr && h.official_name && h.name_kr !== h.official_name) && (
                      <p className="text-[12px] text-muted truncate">{h.official_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditHotel(h)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-bg text-muted text-[15px] cursor-pointer"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: "HOTEL", id: h.id, name: h.name_kr || h.official_name })}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-danger/10 text-muted hover:text-danger text-[15px] cursor-pointer"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted">등록된 호텔이 없습니다.</p>
          )}
        </section>

        {/* Golf Courses Section */}
        <section className="bg-surface border border-border rounded-[12px] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-text">골프장 관리</h2>
            <AddButton onClick={handleAddGolf} label="골프장 추가" />
          </div>
          {golfCourses.length > 0 ? (
            <div className="space-y-2">
              {golfCourses.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-text truncate">
                      {g.display_name || g.official_name}
                    </p>
                    {(g.display_name && g.official_name && g.display_name !== g.official_name) && (
                      <p className="text-[12px] text-muted truncate">{g.official_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditGolf(g)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-bg text-muted text-[15px] cursor-pointer"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: "GOLF", id: g.id, name: g.display_name || g.official_name })}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-danger/10 text-muted hover:text-danger text-[15px] cursor-pointer"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted">등록된 골프장이 없습니다.</p>
          )}
        </section>

        {/* Travel Times Section */}
        <section className="bg-surface border border-border rounded-[12px] p-5 mb-6">
          <AreaTravelTimesClient
            initialTravelTimes={travelTimes}
            hotels={hotelsForTravelTime}
            golfCourses={golfForTravelTime}
            area={area}
          />
        </section>

        {/* Back link */}
        <div className="text-center py-4">
          <a href={`/admin/${area}`} className="text-[14px] text-primary hover:underline">
            ← 카테고리 목록으로 돌아가기
          </a>
        </div>
      </div>

      {/* Hotel Edit Modal */}
      <HotelEditModal
        hotel={hotelTarget ? {
          id: hotelTarget.id,
          name_kr: hotelTarget.name_kr || "",
          name_jp: hotelTarget.name_jp || "",
          address_kr: hotelTarget.address_kr || "",
          address_jp: hotelTarget.address_jp || "",
          phone: hotelTarget.phone || "",
          google_maps_url: hotelTarget.google_maps_url || "",
          checkin_time: hotelTarget.checkin_time || hotelTarget.check_in || "",
          checkout_time: hotelTarget.checkout_time || hotelTarget.check_out || "",
          breakfast_place: hotelTarget.breakfast_place || "",
          breakfast_time: hotelTarget.breakfast_time || "",
          breakfast_last_entry: hotelTarget.breakfast_last_entry || "",
          dinner_place: hotelTarget.dinner_place || "",
          dinner_time: hotelTarget.dinner_time || "",
          dinner_last_entry: hotelTarget.dinner_last_entry || "",
          has_public_bath: hotelTarget.has_public_bath === "true" || hotelTarget.has_public_bath === "TRUE",
          has_outdoor_onsen: hotelTarget.has_outdoor_onsen === "true" || hotelTarget.has_outdoor_onsen === "TRUE",
          has_sauna: hotelTarget.has_sauna === "true" || hotelTarget.has_sauna === "TRUE",
          bath_spa_hours: hotelTarget.bath_spa_hours || "",
          tattoo_policy: hotelTarget.tattoo_policy || "",
          other_info: hotelTarget.other_info || "",
          atm_payment: hotelTarget.atm_payment || "",
          transport: hotelTarget.transport || "",
        } : null}
        area={area}
        open={hotelModal}
        onClose={() => { setHotelModal(false); setHotelTarget(null); }}
        onSaved={() => handleHotelSaved({})}
      />

      {/* Golf Edit Modal */}
      <GolfEditModal
        golf={golfTarget ? {
          id: golfTarget.id,
          display_name: golfTarget.display_name || "",
          official_name: golfTarget.official_name || "",
          address: golfTarget.address || "",
          phone: golfTarget.phone || "",
          course_summary: golfTarget.course_summary || "",
          play_cart: golfTarget.play_cart || "",
          clubhouse_dining: golfTarget.clubhouse_dining || "",
          bath_shower: golfTarget.bath_shower || "",
          rental: golfTarget.rental || "",
          dress_code: golfTarget.dress_code || "",
          google_maps_url: golfTarget.google_maps_url || "",
        } : null}
        area={area}
        open={golfModal}
        onClose={() => { setGolfModal(false); setGolfTarget(null); }}
        onSaved={() => handleGolfSaved({})}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title={`${deleteTarget?.type === "HOTEL" ? "호텔" : "골프장"} 삭제`}
        message={`"${deleteTarget?.name}"을(를) 삭제하시겠습니까?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />

      {/* Area Edit Modal */}
      {areaEdit && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setAreaEdit(false)}
        >
          <div className="bg-surface rounded-[16px] shadow-lg w-full max-w-[480px] mx-4 p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[18px] font-bold text-text">지역 정보 수정</h2>
              <button
                onClick={() => setAreaEdit(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg text-muted text-[18px] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-text mb-1">한국어명</label>
                <input
                  type="text"
                  value={areaForm.name_kr}
                  onChange={(e) => setAreaForm((p) => ({ ...p, name_kr: e.target.value }))}
                  className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px]"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-text mb-1">일본어명</label>
                <input
                  type="text"
                  value={areaForm.name_jp}
                  onChange={(e) => setAreaForm((p) => ({ ...p, name_jp: e.target.value }))}
                  className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px]"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-text mb-1">아이콘</label>
                <input
                  type="text"
                  value={areaForm.icon}
                  onChange={(e) => setAreaForm((p) => ({ ...p, icon: e.target.value }))}
                  className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAreaEdit(false)}
                  className="flex-1 border border-border py-3 rounded-[10px] text-[15px] text-muted cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveArea}
                  disabled={areaLoading}
                  className="flex-1 bg-primary text-white py-3 rounded-[10px] text-[15px] disabled:opacity-50 cursor-pointer"
                >
                  {areaLoading ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={message} visible={visible} />
    </div>
  );
}