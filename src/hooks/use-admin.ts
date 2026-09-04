"use client";

import { useState, useEffect } from "react";

export function useAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/admin/faq?area=ALL&category=GENERAL", {
          cache: "no-store",
        });
        if (!cancelled) {
          setIsAdmin(res.ok);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
