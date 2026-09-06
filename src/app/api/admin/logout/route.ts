import { NextResponse } from "next/server";
import { removeAuthCookie } from "@/lib/auth";

export async function GET() {
  await removeAuthCookie();
  return NextResponse.json({ success: true });
}