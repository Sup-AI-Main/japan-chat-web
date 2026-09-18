"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { GolfCourse, FaqItem, ContentSection } from "@/lib/types";
import type { DynamicLabelsResult } from "@/lib/dynamic-labels";
import { getFieldLabel } from "@/lib/dynamic-labels";
import { getCategoryEmoji } from "@/lib/display";
import { useAdmin } from "@/hooks/use-admin";
import { useToast, Toast } from "@/components/Toast";
import {
  EditableContainer,
  IncludeExcludeSection,
  IncludeExcludeSummary,
  ContentSectionsRenderer,
  GolfEditModal,
} from "@/components/inline-cms";

interface GolfDetailClientProps {
  course: GolfCourse;
  area: string;
  faqs: FaqItem[];
  contentSections: ContentSection[];
  dynamicLabels?: DynamicLabelsResult;
}

export function GolfDetailClient({
  course: initialCourse,
  area,
  faqs,
  contentSections,
  dynamicLabels,
}: GolfDetailClientProps) {
  const [course, setCourse] = useState(initialCourse);
  const [editGolfOpen, setEditGolfOpen] = useState(false);
  const isAdmin = useAdmin();
  const { message, visible, showToast } = useToast();

  // Dynamic label helpers with fallback
  const L = dynamicLabels || { sections: [], fieldMap: {} };
  const fieldLabel = (key: string, fb: string) => getFieldLabel(L, key, fb);

  const closeGolfModal = useCallback(() => {
    setEditGolfOpen(false);
  }, []);

  const handleGolfSaved = (data: { display_name: string; official_name: string; address: string; phone: string; course_summary: string; play_cart: string; clubhouse_dining: string; bath_shower: string; rental: string; dress_code: string; google_maps_url: string }) => {
    setCourse((prev) => ({ ...prev, ...data }));
    showToast("수정 완료");
    setTimeout(closeGolfModal, 500);
  };

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-[720px] mx-auto">
        <Link
          href={`/${area}/golf`}
          className="text-[14px] text-muted hover:text-primary mb-2 inline-flex items-center min-h-[44px]"
        >
          ← {getCategoryEmoji("GOLF")} 골프장 목록
        </Link>

        <EditableContainer
          entityType="golf"
          id={course.id}
          canEdit={isAdmin}
          onEdit={() => setEditGolfOpen(true)}
        >
          <h1 className="text-[24px] font-bold text-text mb-1">
            {course.display_name || course.official_name}
          </h1>
          {course.official_name && course.display_name !== course.official_name && (
            <p className="text-[16px] text-muted mb-4">{course.official_name}</p>
          )}

          {/* Map link */}
          {course.google_maps_url && (
            <a
              href={course.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary text-white px-5 py-3 rounded-[10px] text-[14px] font-medium mb-6 hover:opacity-90 min-h-[44px] flex items-center justify-center"
            >
              Google Maps에서 보기
            </a>
          )}

          {/* Address & Phone */}
          <div className="space-y-2 mb-6">
            {course.address && (
              <p className="text-[15px] text-text">
                <span className="text-muted mr-2">{fieldLabel("address", "주소")}:</span>
                {course.address}
              </p>
            )}
            {course.phone && (
              <div className="flex items-center gap-2">
                <span className="text-[15px] text-muted">{fieldLabel("phone", "전화")}:</span>
                <a
                  href={`tel:${course.phone}`}
                  className="text-[15px] text-primary px-2 py-1 min-h-[44px] flex items-center"
                >
                  {course.phone}
                </a>
              </div>
            )}
          </div>

        </EditableContainer>

        {/* 포함/불포함 사항 */}
        <IncludeExcludeSection parentType="GOLF" parentId={course.id} />

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="border-t border-border pt-6 mb-6">
            <h2 className="text-[18px] font-bold text-text mb-4">
              자주 묻는 질문
            </h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.id}
                  className="bg-surface border border-border rounded-[8px] group"
                >
                  <summary className="p-3 flex justify-between items-center font-medium text-[15px] text-text">
                    <span>Q. {faq.question}</span>
                    <span className="chevron-icon text-muted transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-3 pb-3 text-[15px] text-text leading-[1.6] border-t border-border pt-3">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* 예약 전 확인 요약 */}
        <IncludeExcludeSummary parentType="GOLF" parentId={course.id} />

        {/* Content Sections (dynamic) */}
        <ContentSectionsRenderer
          parentType="GOLF"
          parentId={course.id}
          initialSections={contentSections}
        />
      </div>

      {/* Golf Edit Modal */}
      <GolfEditModal
        golf={isAdmin ? {
          id: course.id,
          display_name: course.display_name || "",
          official_name: course.official_name || "",
          address: course.address || "",
          phone: course.phone || "",
          course_summary: course.course_summary || "",
          play_cart: course.play_cart || "",
          clubhouse_dining: course.clubhouse_dining || "",
          bath_shower: course.bath_shower || "",
          rental: course.rental || "",
          dress_code: course.dress_code || "",
          google_maps_url: course.google_maps_url || "",
        } : null}
        area={area}
        open={editGolfOpen}
        onClose={closeGolfModal}
        onSaved={handleGolfSaved}
      />

      <Toast message={message} visible={visible} />
    </main>
  );
}
