"use client";

import { useEffect, useState, useCallback } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((msg: string, duration = 500) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), duration);
    setTimeout(() => setMessage(null), duration + 300);
  }, []);

  return { message, visible, showToast };
}

export function Toast({ message, visible }: { message: string | null; visible: boolean }) {
  if (!message) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[3000] pointer-events-none"
      aria-live="polite"
    >
      <div
        className={`bg-text text-white text-[14px] font-medium px-4 py-2.5 rounded-full shadow-lg transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        ✓ {message}
      </div>
    </div>
  );
}