"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EditModalShell } from "./EditModalShell";
import type { Attraction } from "@/lib/types";

interface CoreForm {
  name_kr: string;
}

const EMPTY_FORM: CoreForm = {
  name_kr: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  attraction?: Attraction | null;
  area: string;
  onSaved: (attraction: Attraction) => void;
}

export default function AttractionEditModal({ open, onClose, attraction, area, onSaved }: Props) {
  const [form, setForm] = useState<CoreForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const initialRef = useRef<CoreForm>(EMPTY_FORM);
  const requestCloseRef = useRef<(() => void) | undefined>(undefined);

  const isEdit = !!attraction?.id;

  useEffect(() => {
    const initial: CoreForm = {
      name_kr: attraction?.name_kr || "",
    };
    setForm(initial);
    initialRef.current = initial;
    setError("");
    setConflict(false);
  }, [attraction, open]);

  const isDirty =
    form.name_kr !== initialRef.current.name_kr;

  const handleReload = useCallback(async () => {
    if (!attraction?.id) return;
    try {
      const res = await fetch(`/api/admin/attraction?id=${attraction.id}`);
      if (!res.ok) return;
      const body = await res.json();
      const fresh = body.data?.attraction as Attraction | undefined;
      if (!fresh) return;
      const reloaded: CoreForm = {
        name_kr: fresh.name_kr || "",
      };
      setForm(reloaded);
      initialRef.current = reloaded;
      setConflict(false);
      setError("");
    } catch {
      // silent — user can retry
    }
  }, [attraction?.id]);

  async function handleSave() {
    if (!form.name_kr.trim()) {
      setError("이름(한국어)은 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");
    setConflict(false);
    try {
      const url = "/api/admin/attraction";
      const method = isEdit ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        name_kr: form.name_kr,
        id: attraction?.id,
        area: area.toUpperCase(),
      };
      if (isEdit && attraction?.updated_at) {
        payload.updated_at = attraction.updated_at;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setConflict(true);
        setError("다른 사용자가 이미 수정했습니다. 새로고침 후 다시 시도하세요.");
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        let msg = "저장에 실패했습니다.";
        try { msg = JSON.parse(text).error || msg; } catch { /* ignore */ }
        throw new Error(msg);
      }

      const resBody = await res.json();
      const saved = resBody.data?.attraction as Attraction | undefined;
      if (!saved?.id) {
        throw new Error("서버 응답이 올바르지 않습니다 (id 누락).");
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditModalShell
      open={open}
      title={isEdit ? "주변 볼거리 수정" : "주변 볼거리 추가"}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      error={error}
      isDirty={isDirty}
      requestCloseRef={requestCloseRef}
    >
      <div className="space-y-4">
        {conflict && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[8px] p-3 text-[13px] text-yellow-800">
            <p className="font-medium mb-2">다른 사용자가 이미 수정했습니다.</p>
            <button
              type="button"
              onClick={handleReload}
              className="text-primary underline text-[13px] min-h-[44px]"
            >
              최신 데이터 불러오기
            </button>
          </div>
        )}
        <div>
          <label className="block text-[13px] font-medium text-text mb-1">
            이름 (한국어) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name_kr}
            onChange={(e) => setForm((prev) => ({ ...prev, name_kr: e.target.value }))}
            className="w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-[14px] text-text"
          />
        </div>
        {isEdit && (
          <p className="text-[12px] text-muted">
            세부사항(주소, 전화번호, 운영시간 등)은 상세 페이지에서 &quot;세부사항 수정&quot; 버튼으로 관리하세요.
          </p>
        )}
      </div>
    </EditModalShell>
  );
}
