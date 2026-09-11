import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    message: "This endpoint is deprecated. All data is managed via Supabase/PostgreSQL.",
    status: "noop",
  });
}
