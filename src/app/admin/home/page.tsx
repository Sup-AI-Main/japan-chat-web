import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import Dashboard from "@/components/admin/Dashboard";

export default async function AdminHomePage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin");

  return <Dashboard />;
}