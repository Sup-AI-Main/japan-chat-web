"use client";

import { useState } from "react";
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
  EntityFaqManager,
} from "@/components/inline-cms";
import { EntityDetailsEditor } from "@/components/entity-details/EntityDetailsEditor";
import { EntityDetailsRenderer } from "@/components/entity-details/EntityDetailsRenderer";
import { isValidV1Document } from "@/lib/entity-details/validate";

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
  const course = initialCourse;
  const [detailsEditorOpen, setDetailsEditorOpen] = useState(false);
  const isAdmin = useAdmin();
  const { message, visible, showToast } = useToast();
  const router = useRouter();

  // Dynamic label helpers with fallback — used ONLY for legacy fallback path
  const L = dynamicLabels || { sections: [], fieldMap: {} };
  const fieldLabel = (key: string, fb: string) => getFieldLabel(L, key, fb);
  const sectionLabel = (key: string, fb: string) => getSectionLabel(L, key, fb);
  const sectionVisible = (key: string) => isSectionVisible(L, key);

  // Legacy golf columns and content_sections can contain the same migrated
  // value. Keep the canonical legacy field and omit an exact duplicate card.
  const legacyDetailValues = new Set(
    [
      course.course_summary,
      course.play_cart,
      course.clubhouse_dining,
      course.bath_shower,
      course.rental,
      course.dress_code,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  const deduplicatedContentSections = contentSections.filter(
    (section) => !legacyDetailValues.has(section.content?.trim() ?? ""),
  );

  const hasJsonDetails = isValidV1Document(course.details_json);

  const handleDetailsSaved = () => {
    showToast("세부사항 저장 완료");
    setDetailsEditorOpen(false);
    // Re-run the current route after the server has revalidated its cache.
    // This prevents the App Router from retaining the previous RSC tree,
    // which could leave deleted detail containers visible until a hard reload.
    router.replace(window.location.pathname);
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
          onEdit={() => setDetailsEditorOpen(true)}
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
            {hasJsonDetails ? (
              // CMS V2: use shared renderer — JSON labels are canonical
              // No global sectionLabel() override for migrated JSON
              <EntityDetailsRenderer details={course.details_json!} />
            ) : (
              // Legacy fallback: render from relational columns with dynamic labels
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

        {/* 포함/불포함 사항 — skip when details_json already renders them */}
        {!hasJsonDetails && (
          <IncludeExcludeSection parentType="GOLF" parentId={course.id} initialItems={initialIncludes} />
        )}

        {(isAdmin || faqs.length > 0) && <EntityFaqManager area={area} entityType="GOLF" entityId={course.id} initialFaqs={faqs} canManage={isAdmin} />}

        {/* Content Sections (dynamic) — skip when details_json already renders them */}
        {!hasJsonDetails && (
          <ContentSectionsRenderer
            parentType="GOLF"
            parentId={course.id}
            initialSections={deduplicatedContentSections}
          />
        )}
      </div>

      <Toast message={message} visible={visible} />

      {/* Shared EntityDetailsEditor — for variable details */}
      <EntityDetailsEditor
        entityId={course.id}
        entityType="GOLF"
        open={detailsEditorOpen}
        onClose={() => setDetailsEditorOpen(false)}
        onSaved={handleDetailsSaved}
      />
    </main>
  );
}
