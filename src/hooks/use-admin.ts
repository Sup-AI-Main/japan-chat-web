"use client";

import { useEffect } from "react";
import { useGuideStore } from "@/store/guide-store";

export function useAdmin(): boolean {
  const isAdmin = useGuideStore((s) => s.isAdmin);
  const setAdmin = useGuideStore((s) => s.setAdmin);

  useEffect(() => {
    if (isAdmin !== null) return;
    fetch("/api/admin/check", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAdmin(d.isAdmin === true))
      .catch(() => setAdmin(false));
  }, [isAdmin, setAdmin]);

  return isAdmin ?? false;
}
