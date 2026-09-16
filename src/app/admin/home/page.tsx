import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Dashboard from "@/components/admin/Dashboard";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const authed = await isAuthenticated();
  if (!authed) redirect(routes.admin());

  return <Dashboard />;
}