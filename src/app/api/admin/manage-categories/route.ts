import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategoryFull,
  ok,
  created,
  badRequest,
  unauthorized,
  conflict,
  serverError,
  safeJson,
} from "@/lib/crud";
import { ConflictError } from "@/lib/types";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const categories = await listCategories();
    return ok(categories);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const body = await safeJson(req);
    if (!body) return badRequest("요청 본문이 비어 있습니다.");

    const missing: string[] = [];
    if (!body.code) missing.push("code");
    if (!body.label) missing.push("label");
    if (!body.group_type) missing.push("group_type");
    if (missing.length > 0) {
      return badRequest(`필수 항목 누락: ${missing.join(", ")}`);
    }

    const category = await createCategory(body);
    return created(category);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const body = await safeJson(req);
    if (!body) return badRequest("요청 본문이 비어 있습니다.");

    const { id, updated_at, ...data } = body as Record<string, unknown>;
    if (!id) return badRequest("id가 필요합니다.");

    const result = await updateCategory(id as string, data, updated_at as string | undefined);
    return ok(result);
  } catch (err) {
    if (err instanceof ConflictError) {
      return conflict(err.message);
    }
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return badRequest("id가 필요합니다.");

    const confirmed = req.nextUrl.searchParams.get("confirmed") === "true";

    const result = await deleteCategoryFull(id, confirmed);
    return ok(result ?? { deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
