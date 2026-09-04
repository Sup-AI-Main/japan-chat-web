"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Place {
  type: string;
  id: string;
  name: string;
}

interface Props {
  area: string;
  category: string;
  categoryCode: string;
  categoryLabel: string;
  areaLabel: string;
  relatedTypes: string[];
  places: Place[];
  initialData?: {
    id: string;
    question: string;
    answer: string;
    question_scope: string;
    related_type: string;
    related_id: string;
    active: string;
  };
}

export default function FaqForm({
  area,
  category,
  categoryCode,
  relatedTypes,
  places,
  initialData,
}: Props) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [questionScope, setQuestionScope] = useState(
    initialData?.question_scope || "AREA"
  );
  const [relatedType, setRelatedType] = useState(
    initialData?.related_type || ""
  );
  const [relatedId, setRelatedId] = useState(initialData?.related_id || "");
  const [question, setQuestion] = useState(initialData?.question || "");
  const [answer, setAnswer] = useState(initialData?.answer || "");
  const [active, setActive] = useState(
    initialData?.active !== "FALSE"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredPlaces = places.filter(
    (p) => !relatedType || p.type === relatedType
  );

  const scopeLabel =
    categoryCode === "GOLF"
      ? "특정 골프장"
      : categoryCode === "HOTEL"
      ? "특정 호텔"
      : categoryCode === "RESTAURANT"
      ? "특정 맛집"
      : "특정 장소";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, string> = {
        area: area.toUpperCase(),
        category: categoryCode,
        question_scope: questionScope,
        question,
        answer,
        active: active ? "TRUE" : "FALSE",
      };

      if (questionScope === "SPECIFIC") {
        const selectedPlace = places.find((p) => p.id === relatedId);
        if (!selectedPlace) {
          setError("특정 장소를 선택하세요.");
          setLoading(false);
          return;
        }
        payload.related_type = selectedPlace.type;
        payload.related_id = selectedPlace.id;
        payload.related_name = selectedPlace.name;
      }

      const url = isEdit
        ? `/api/admin/faq`
        : `/api/admin/faq`;
      const method = isEdit ? "PUT" : "POST";

      if (isEdit && initialData) {
        payload.id = initialData.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push(`/admin/${area}/${category}`);
      } else {
        const data = await res.json();
        setError(data.error || "저장에 실패했습니다.");
      }
    } catch {
      setError("저장 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Scope */}
      <div>
        <label className="block text-[15px] font-medium text-text mb-2">
          이 질문은 어디에 보여줄까요?
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              value="AREA"
              checked={questionScope === "AREA"}
              onChange={() => {
                setQuestionScope("AREA");
                setRelatedType("");
                setRelatedId("");
              }}
              className="w-4 h-4"
            />
            <span className="text-[15px]">지역 공통</span>
          </label>
          {relatedTypes.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="SPECIFIC"
                checked={questionScope === "SPECIFIC"}
                onChange={() => setQuestionScope("SPECIFIC")}
                className="w-4 h-4"
              />
              <span className="text-[15px]">{scopeLabel}</span>
            </label>
          )}
        </div>
      </div>

      {/* Place selector for SPECIFIC */}
      {questionScope === "SPECIFIC" && relatedTypes.length > 0 && (
        <div>
          <label className="block text-[15px] font-medium text-text mb-2">
            {scopeLabel} 선택
          </label>
          <select
            value={relatedId}
            onChange={(e) => {
              const place = places.find((p) => p.id === e.target.value);
              if (place) {
                setRelatedId(place.id);
                setRelatedType(place.type);
              }
            }}
            className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary bg-surface"
          >
            <option value="">장소를 선택하세요</option>
            {filteredPlaces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Question */}
      <div>
        <label className="block text-[15px] font-medium text-text mb-2">
          질문
          <span className="text-muted text-[13px] ml-2">
            고객에게 보일 질문을 입력하세요.
          </span>
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary"
          placeholder="예: 반바지 착용 가능한가요?"
          required
        />
      </div>

      {/* Answer */}
      <div>
        <label className="block text-[15px] font-medium text-text mb-2">
          답변
          <span className="text-muted text-[13px] ml-2">
            고객에게 안내할 내용을 쉽게 적어주세요.
          </span>
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full border border-border rounded-[10px] px-4 py-3 text-[16px] focus:outline-none focus:border-primary min-h-[120px]"
          placeholder="답변을 입력하세요"
          required
        />
      </div>

      {/* Active toggle */}
      <div>
        <label className="block text-[15px] font-medium text-text mb-2">
          고객 화면에 표시
        </label>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`px-4 py-2 rounded-[10px] text-[14px] font-medium min-h-[44px] border ${
            active
              ? "bg-primary text-white border-primary"
              : "bg-surface text-muted border-border"
          }`}
        >
          {active ? "ON" : "OFF"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[14px] text-danger">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <Link
          href={`/admin/${area}/${category}`}
          className="px-6 py-3 border border-border rounded-[10px] text-[16px] text-text hover:bg-bg min-h-[44px] flex items-center justify-center"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-primary text-white rounded-[10px] text-[16px] font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px]"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}