import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { migrateGroupColumn, migrateUpdatedAt, migrateAdminOptionsId } from "@/lib/google-sheets";

export async function POST() {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const groupResult = await migrateGroupColumn();
    const updatedAtResult = await migrateUpdatedAt();
    const optionsIdResult = await migrateAdminOptionsId();
    return NextResponse.json({ group: groupResult, updatedAt: updatedAtResult, optionsId: optionsIdResult });
  } catch {
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}
