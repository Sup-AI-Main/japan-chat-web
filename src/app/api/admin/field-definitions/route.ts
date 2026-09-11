import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  listFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinitionFull,
  ok,
  created,
  badRequest,
  unauthorized,
  conflict,
  serverError,
  safeJson,
} from "@/lib/crud";
import { ConflictError } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const params = req.nextUrl.searchParams;
    const scope_type = params.get("scope_type") || undefined;
    const scope_entity_id = params.get("scope_entity_id") || undefined;

    const definitions = await listFieldDefinitions({ scope_type, scope_entity_id });
    return ok(definitions);
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
    if (!body.label_ko) missing.push("label_ko");
    if (!body.scope_type) missing.push("scope_type");
    if (missing.length > 0) {
      return badRequest(`필수 항목 누락: ${missing.join(", ")}`);
    }

    const definition = await createFieldDefinition(body);
    return created(definition);
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

    const result = await updateFieldDefinition(
      id as string,
      data,
      updated_at as string | undefined
    );
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

    await deleteFieldDefinitionFull(id);
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
