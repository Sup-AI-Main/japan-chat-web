import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { routes } from "@/lib/routes";
import AdminLoginForm from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAuthenticated();
  if (authed) {
    redirect(routes.adminHome());
  }

  return <AdminLoginForm />;
}