"use client";

import { useState } from "react";
import type { ContentSection } from "@/lib/types";

interface ContentSectionsRendererProps {
  parentType: string;
  parentId: string;
  initialSections: ContentSection[];
}

export function ContentSectionsRenderer({
  parentType: _parentType,
  parentId: _parentId,
  initialSections,
}: ContentSectionsRendererProps) {
  const [sections] = useState<ContentSection[]>(initialSections);

  const visibleSections = sections.filter((s) => s.is_visible !== "FALSE");

  if (visibleSections.length === 0) return null;

  const sortedVisible = [...visibleSections].sort((a, b) => a.sort - b.sort);

  return (
    <div className="mt-6">
      <h2 className="text-[16px] font-bold text-text mb-3">추가 안내</h2>

      <div className="space-y-4">
        {sortedVisible.map((section) => (
          <div
            key={section.id}
            className="bg-surface border border-border rounded-[12px] p-4"
          >
            <h3 className="text-[15px] font-bold text-text mb-2">
              {section.emoji ? `${section.emoji} ` : ""}
              {section.title}
            </h3>
            {section.content && (
              <p className="text-[15px] text-text leading-relaxed whitespace-pre-wrap">
                {section.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}