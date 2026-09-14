"use client";

import { useEffect, useRef } from "react";

interface ModalShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  error?: string;
}

export function ModalShell({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidth = "1050px",
  error,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-3 md:p-5">
      <div
        ref={panelRef}
        className="bg-white rounded-[12px] shadow-lg flex flex-col w-full max-h-[calc(100dvh-24px)] md:max-h-[calc(100vh-40px)]"
        style={{ maxWidth }}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-[18px] font-bold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 flex items-center justify-center rounded-[8px] text-muted hover:bg-gray-100 hover:text-text transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-4 text-[14px] text-danger">
              {error}
            </div>
          )}
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
