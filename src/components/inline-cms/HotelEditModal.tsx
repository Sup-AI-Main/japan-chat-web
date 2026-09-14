"use client";

import { useState, useEffect } from "react";
import { EditModalShell } from "./EditModalShell";

interface HotelData {
  id?: string;
  name_kr: string;
  name_jp: string;
  address_kr: string;
  address_jp: string;
  phone: string;
  google_maps_url: string;
  checkin_time: string;
  checkout_time: string;
  breakfast_place: string;
  breakfast_time: string;
  breakfast_last_entry: string;
  dinner_place: string;
  dinner_time: string;
  dinner_last_entry: string;
  has_public_bath: boolean;
  has_outdoor_onsen: boolean;
  has_sauna: boolean;
  bath_spa_hours: string;
  tattoo_policy: string;
  other_info: string;
  atm_payment: string;
  transport: string;
}

const EMPTY_HOTEL: HotelData = {
  name_kr: "",
  name_jp: "",
  address_kr: "",
  address_jp: "",
  phone: "",
  google_maps_url: "",
  checkin_time: "",
  checkout_time: "",
  breakfast_place: "",
  breakfast_time: "",
  breakfast_last_entry: "",
  dinner_place: "",
  dinner_time: "",
  dinner_last_entry: "",
  has_public_bath: false,
  has_outdoor_onsen: false,
  has_sauna: false,
  bath_spa_hours: "",
  tattoo_policy: "",
  other_info: "",
  atm_payment: "",
  transport: "",
};

interface HotelEditModalProps {
  hotel: HotelData | null;
  area: string;
  open: boolean;
  onClose: () => void;
  onSaved: (hotel: HotelData) => void;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[13px] font-medium text-text mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-[8px] px-3 py-2 text-[14px] min-h-[40px] focus:outline-none focus:border-primary"
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  className = "",
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-primary"
      />
      <span className="text-[14px] text-text">{label}</span>
    </label>
  );
}

export function HotelEditModal({ hotel, area, open, onClose, onSaved }: HotelEditModalProps) {
  const [form, setForm] = useState<HotelData>(EMPTY_HOTEL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(hotel ? { ...hotel } : { ...EMPTY_HOTEL });
      setError("");
      setSaving(false);
    }
  }, [open, hotel]);

  const update = (key: keyof HotelData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name_kr.trim()) {
      setError("호텔 이름(한국어)은 필수입니다.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEdit = !!hotel?.id;
      const res = await fetch("/api/admin/hotel", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: hotel?.id,
          area: area.toUpperCase(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      const data = await res.json();
      onSaved(data.hotel ?? { ...form, id: hotel?.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditModalShell
      open={open}
      title={hotel ? "호텔 수정" : "호텔 추가"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      error={error}
    >
      {/* 기본 정보 */}
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-text mb-3">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <InputField label="호텔명 (한국어)" value={form.name_kr} onChange={(v) => update("name_kr", v)} placeholder="호텔 이름" />
          <InputField label="호텔명 (일본어)" value={form.name_jp} onChange={(v) => update("name_jp", v)} placeholder="公式名称" />
          <InputField label="주소 (한국어)" value={form.address_kr} onChange={(v) => update("address_kr", v)} placeholder="주소" />
          <InputField label="주소 (일본어)" value={form.address_jp} onChange={(v) => update("address_jp", v)} placeholder="住所" />
          <InputField label="전화번호" value={form.phone} onChange={(v) => update("phone", v)} placeholder="000-000-0000" />
          <InputField label="Google Maps URL" value={form.google_maps_url} onChange={(v) => update("google_maps_url", v)} placeholder="https://maps.google.com/..." />
        </div>
      </div>

      {/* 체크인/아웃 */}
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-text mb-3">체크인/아웃</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <InputField label="체크인 시간" value={form.checkin_time} onChange={(v) => update("checkin_time", v)} placeholder="15:00" />
          <InputField label="체크아웃 시간" value={form.checkout_time} onChange={(v) => update("checkout_time", v)} placeholder="10:00" />
        </div>
      </div>

      {/* 조식 */}
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-text mb-3">조식</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <InputField label="조식 장소" value={form.breakfast_place} onChange={(v) => update("breakfast_place", v)} placeholder="1F 레스토랑" />
          <InputField label="조식 시간" value={form.breakfast_time} onChange={(v) => update("breakfast_time", v)} placeholder="7:00~9:30" />
          <InputField label="조식 입장 마감" value={form.breakfast_last_entry} onChange={(v) => update("breakfast_last_entry", v)} placeholder="9:00" />
        </div>
      </div>

      {/* 석식 */}
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-text mb-3">석식</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <InputField label="석식 장소" value={form.dinner_place} onChange={(v) => update("dinner_place", v)} placeholder="1F 레스토랑" />
          <InputField label="석식 시간" value={form.dinner_time} onChange={(v) => update("dinner_time", v)} placeholder="18:00~21:00" />
          <InputField label="석식 입장 마감" value={form.dinner_last_entry} onChange={(v) => update("dinner_last_entry", v)} placeholder="20:30" />
        </div>
      </div>

      {/* 온천/스파 */}
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-text mb-3">온천/스파</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-2">
            <CheckboxField label="대욕장 있음" checked={form.has_public_bath} onChange={(v) => update("has_public_bath", v)} />
            <CheckboxField label="노천탕 있음" checked={form.has_outdoor_onsen} onChange={(v) => update("has_outdoor_onsen", v)} />
            <CheckboxField label="사우나 있음" checked={form.has_sauna} onChange={(v) => update("has_sauna", v)} />
          </div>
          <InputField label="대욕장/스파 운영시간" value={form.bath_spa_hours} onChange={(v) => update("bath_spa_hours", v)} placeholder="15:00~25:00, 6:00~9:00" />
          <InputField label="타투 정책" value={form.tattoo_policy} onChange={(v) => update("tattoo_policy", v)} placeholder="타투 시 커버 필수" />
        </div>
      </div>

      {/* 기타 */}
      <div className="mb-2">
        <h3 className="text-[15px] font-bold text-text mb-3">기타</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <InputField label="기타 정보" value={form.other_info} onChange={(v) => update("other_info", v)} placeholder="추가 안내사항" />
          <InputField label="ATM/결제" value={form.atm_payment} onChange={(v) => update("atm_payment", v)} placeholder="세븐은행 ATM, 신용카드 가능" />
          <InputField label="교통" value={form.transport} onChange={(v) => update("transport", v)} placeholder="공항에서 차량 약60분" />
        </div>
      </div>
    </EditModalShell>
  );
}
