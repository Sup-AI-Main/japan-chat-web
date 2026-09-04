import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getRestaurants, appendRestaurant, updateRestaurant, deleteRestaurantRow } from "@/lib/google-sheets";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const area = req.nextUrl.searchParams.get("area") || undefined;
  const restaurants = await getRestaurants(area || undefined);
  return NextResponse.json({ restaurants });
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = await appendRestaurant(body);
  return NextResponse.json({ id }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await updateRestaurant(id, data);
  return NextResponse.json({ success: ok });
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const ok = await deleteRestaurantRow(id);
  return NextResponse.json({ success: ok });
}
