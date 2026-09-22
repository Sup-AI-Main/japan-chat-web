"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GolfCourse, FaqItem, ContentSection, IncludeExclude } from "@/lib/types";
import type { DynamicLabelsResult } from "@/lib/dynamic-labels";
import { getFieldLabel, getSectionLabel, isSectionVisible } from "@/lib/dynamic-labels";
import { getCategoryEmoji } from "@/lib/display";
import { useAdmin } from "@/hooks/use-admin";
import { useToast, Toast } from "@/components/Toast";
import {
  EditableContainer,
  IncludeExcludeSection,
  ContentSectionsRenderer,
  GolfEditModal,
} from "@/components/inline-cms";
import { GolfDetailsEditor } from "@/components/admin/GolfDetailsEditor";

interface GolfDetailClientProps {
  course: GolfCourse;
  area: string;
  faqs: FaqItem[];
  contentSections: ContentSection[];
  dynamicLabels?: DynamicLabelsResult;
  initialIncludes?: IncludeExclude[];
}

export function GolfDetailClient({
  course: initialCourse,
  area,
  faqs,
  contentSections,
  dynamicLabels,
  initialIncludes,
}: GolfDetailClientProps) {
  const [course, setCourse] = useState(initialCourse);
  const [editGolfOpen, setEditGolfOpen] = useState(false);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const isAdmin = useAdmin();
  const { message, visible, showToast } = useToast();
  const router = useRouter();

  // Dynamic label helpers with fallback
  const L = dynamicLabels || { sections: [], fieldMap: {} };
  const fieldLabel = (key: string, fb: string) => getFieldLabel(L, key, fb);
  const sectionLabel = (key: string, fb: string) => getSectionLabel(L, key, fb);
  const sectionVisible = (key: string) => isSectionVisible(L, key);

  const closeGolfModal = useCallback(() => {
    setEditGolfOpen(false);
  }, []);

  const handleGolfSaved = (saved: Record<string, unknown>) => {
    setCourse(saved as unknown as GolfCourse);
    showToast("수정 완료");
    setTimeout(closeGolfModal, 500);
    router.refresh();
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

          {/* Address, Phone & Map link */}
          {sectionVisible("basic_info") && (
          <>
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
          </>
          )}

          {/* Golf Detail Fields */}
          <div className="space-y-3 mb-6">
            {course.details_json?.sections?.length ? (
              // CMS V2: render from details_json when available
              course.details_json.sections
                .filter(s => s.is_visible)
                .sort((a, b) => a.sort - b.sort)
                .map(s => {
                  const content = s.items.map(i => i.value).filter(Boolean).join('\n');
                  if (!content) return null;
                  if (!sectionVisible(s.key)) return null;
                  return (
                    <div key={s.id}>
                      <h3 className="text-[15px] font-bold text-text">
                        {s.emoji ? `${s.emoji} ` : ''}{sectionLabel(s.key, s.title_ko)}
                      </h3>
                      <p className="text-[15px] text-text leading-relaxed whitespace-pre-line">{content}</p>
                    </div>
                  );
                })
            ) : (
              // Legacy fallback: render from relational columns
              <>
                {course.course_summary && sectionVisible("description") && (
                  <div>
                    <h3 className="text-[15px] font-bold text-text">{sectionLabel("description", "골프장 설명")}</h3>
                    <p className="text-[15px] text-text leading-relaxed">{course.course_summary}</p>
                  </div>
                )}
                {course.play_cart && sectionVisible("play_cart") && (
                  <div>
                    <h3 className="text-[15px] font-bold text-text">{sectionLabel("play_cart", "플레이/카트")}</h3>
                    <p className="text-[15px] text-text leading-relaxed">{course.play_cart}</p>
                  </div>
                )}
                {course.clubhouse_dining && sectionVisible("clubhouse") && (
                  <div>
                    <h3 className="text-[15px] font-bold text-text">{sectionLabel("clubhouse", "클럽하우스 식사")}</h3>
                    <p className="text-[15px] text-text leading-relaxed">{course.clubhouse_dining}</p>
                  </div>
                )}
                {course.bath_shower && sectionVisible("bath_shower") && (
                  <div>
                    <h3 className="text-[15px] font-bold text-text">{sectionLabel("bath_shower", "목욕/샤워")}</h3>
                    <p className="text-[15px] text-text leading-relaxed">{course.bath_shower}</p>
                  </div>
                )}
                {course.rental && sectionVisible("rental") && (
                  <div>
                    <h3 className="text-[15px] font-bold text-text">{sectionLabel("rental", "렌탈 골프채")}</h3>
                    <p className="text-[15px] text-text leading-relaxed">{course.rental}</p>
                  </div>
                )}
                {course.dress_code && sectionVisible("dress_code") && (
                  <div>
                    <h3 className="text-[15px] font-bold text-text">{sectionLabel("dress_code", "복장")}</h3>
                    <p className="text-[15px] text-text leading-relaxed">{course.dress_code}</p>
                  </div>
                )}
              </>
            )}
          </div>

        </EditableContainer>

        {/* JSON Editor button (admin only) */}
        {isAdmin && (
          <button
            onClick={() => setJsonEditorOpen(true)}
            className="mb-4 border border-border px-4 py-2 rounded text-[13px] text-text hover:bg-surface min-h-[44px]"
          >
            📝 JSON 편집
          </button>
        )}

        {/* 포함/불포함 사항 */}
        <IncludeExcludeSection parentType="GOLF" parentId={course.id} initialItems={initialIncludes} />

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
        dynamicLabels={dynamicLabels}
      />

      <Toast message={message} visible={visible} />

      {/* JSON Editor Modal */}
      {jsonEditorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setJsonEditorOpen(false);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] max-h-[90vh] flex flex-col mx-4">
            <GolfDetailsEditor
              entityId={course.id}
              onClose={() => setJsonEditorOpen(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
