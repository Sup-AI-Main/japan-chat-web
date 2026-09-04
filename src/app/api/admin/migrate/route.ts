import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { migrateGroupColumn } from "@/lib/google-sheets";

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await migrateGroupColumn();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
