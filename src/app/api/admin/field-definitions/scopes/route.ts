import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  addFieldScope,
  removeFieldScope,
  setFieldScopes,
  ok,
  badRequest,
  unauthorized,
  serverError,
  safeJson,
} from "@/lib/crud";

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const body = await safeJson(req);
    if (!body) return badRequest("요청 본문이 비어 있습니다.");

    if (!body.field_definition_id) {
      return badRequest("field_definition_id가 필요합니다.");
    }
    if (!body.scope_type) {
      return badRequest("scope_type가 필요합니다.");
    }

    const scope = await addFieldScope(String(body.field_definition_id), {
      scope_type: String(body.scope_type),
      area_id: body.area_id ? String(body.area_id) : undefined,
      category_id: body.category_id ? String(body.category_id) : undefined,
      entity_id: body.entity_id ? String(body.entity_id) : undefined,
      entity_type: body.entity_type ? String(body.entity_type) : undefined,
    });
    return ok(scope);
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

    if (!body.field_definition_id) {
      return badRequest("field_definition_id가 필요합니다.");
    }
    if (!Array.isArray(body.scopes)) {
      return badRequest("scopes 배열이 필요합니다.");
    }

    const scopes = await setFieldScopes(
      String(body.field_definition_id),
      body.scopes as Array<{ scope_type: string; area_id?: string; category_id?: string; entity_id?: string; entity_type?: string }>
    );
    return ok(scopes);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const scopeId = req.nextUrl.searchParams.get("scope_id");
    if (!scopeId) return badRequest("scope_id가 필요합니다.");

    await removeFieldScope(scopeId);
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
