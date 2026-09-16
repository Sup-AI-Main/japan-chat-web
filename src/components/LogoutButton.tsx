"use client";

import { useGuideStore } from "@/store/guide-store";

export default function LogoutButton() {
  const setAdmin = useGuideStore((s) => s.setAdmin);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(false);
    window.location.replace("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="text-[14px] text-muted hover:text-danger px-3 py-2 min-h-[44px] flex items-center cursor-pointer"
    >
      로그아웃
    </button>
  );
}