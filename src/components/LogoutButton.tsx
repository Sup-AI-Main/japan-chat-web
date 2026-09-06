"use client";

import { useRouter } from "next/navigation";
import { useGuideStore } from "@/store/guide-store";

export default function LogoutButton() {
  const router = useRouter();
  const setAdmin = useGuideStore((s) => s.setAdmin);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await fetch("/api/admin/logout");
    setAdmin(false);
    router.push("/");
    router.refresh();
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