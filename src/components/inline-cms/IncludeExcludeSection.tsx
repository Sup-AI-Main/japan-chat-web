"use client";

import { useState } from "react";
import type { IncludeExclude } from "@/lib/types";

interface IncludeExcludeSectionProps {
  parentType: "HOTEL" | "GOLF" | "RESTAURANT";
  parentId: string;
  initialItems?: IncludeExclude[];
}

export function IncludeExcludeSection({ parentType: _parentType, parentId: _parentId, initialItems }: IncludeExcludeSectionProps) {
  const [items] = useState<IncludeExclude[]>(initialItems || []);

  const included = items.filter((i) => i.type === "INCLUDED" && i.is_visible === "TRUE");
  const excluded = items.filter((i) => i.type === "EXCLUDED" && i.is_visible === "TRUE");

  const hasIncluded = included.length > 0;
  const hasExcluded = excluded.length > 0;
  if (!hasIncluded && !hasExcluded) return null;

  return (
    <div className="bg-surface border border-border rounded-[12px] p-4 mb-4">
      {/* Included */}
      {hasIncluded && (
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-text mb-2">포함사항</h3>
          <ul className="space-y-1.5">
            {included.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span className="text-green-600 text-[14px] mt-0.5">✓</span>
                <div>
                  <span className="text-[15px] text-text">{item.text_kr}</span>
                  {item.text_jp && (
                    <p className="text-[13px] text-muted">{item.text_jp}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Excluded */}
      {hasExcluded && (
        <div>
          <h3 className="text-[15px] font-bold text-text mb-2">불포함사항</h3>
          <ul className="space-y-1.5">
            {excluded.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span className="text-red-500 text-[14px] mt-0.5">✗</span>
                <div>
                  <span className="text-[15px] text-text">{item.text_kr}</span>
                  {item.text_jp && (
                    <p className="text-[13px] text-muted">{item.text_jp}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}