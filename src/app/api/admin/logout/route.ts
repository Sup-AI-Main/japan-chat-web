import { NextResponse } from "next/server";
import { removeAuthCookie } from "@/lib/auth";

export async function GET() {
  await removeAuthCookie();
  return NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}