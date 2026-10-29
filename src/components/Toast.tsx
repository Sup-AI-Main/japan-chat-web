"use client";

import { useCallback } from "react";
import { publishAdminActivity } from "@/lib/admin-activity";

export function useToast() {
  const showToast = useCallback((msg: string) => {
    publishAdminActivity({ kind: "toast", message: msg });
  }, []);

  return { showToast };
}
