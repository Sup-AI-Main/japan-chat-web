import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getGolfCourses } from "@/lib/google-sheets";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const area = req.nextUrl.searchParams.get("area") || undefined;
  const courses = await getGolfCourses(area || undefined);
  return NextResponse.json({ courses });
}
