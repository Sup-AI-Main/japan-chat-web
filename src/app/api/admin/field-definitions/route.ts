import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  listFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  getFieldDefinition,
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
import { revalidateEntityPaths } from "@/lib/revalidate-labels";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const params = req.nextUrl.searchParams;
    const scope_type = params.get("scope_type") || undefined;
    const scope_entity_type = params.get("scope_entity_type") || undefined;
    const scope_entity_id = params.get("scope_entity_id") || undefined;

    const definitions = await listFieldDefinitions({ scope_type, scope_entity_type, scope_entity_id });
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

    // Revalidate public pages for this entity type
    const revalidation = definition.scope_entity_type
      ? await revalidateEntityPaths(definition.scope_entity_type)
      : { revalidatedCount: 0, errors: [] };

    return created({ ...definition, _revalidation: revalidation.errors.length > 0 ? { warning: revalidation.errors } : undefined });
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

    // Revalidate all public pages for this entity type
    if (result.scope_entity_type) {
      const revalidation = await revalidateEntityPaths(result.scope_entity_type);
      if (revalidation.errors.length > 0) {
        console.error("[FIELD_DEF_PUT_REVALIDATION_ERRORS]", revalidation.errors);
      }
    }

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

    // Get entity_type before deleting for revalidation
    const existing = await getFieldDefinition(id);
    await deleteFieldDefinitionFull(id);

    if (existing?.scope_entity_type) {
      const revalidation = await revalidateEntityPaths(existing.scope_entity_type);
      if (revalidation.errors.length > 0) {
        console.error("[FIELD_DEF_DELETE_REVALIDATION_ERRORS]", revalidation.errors);
      }
    }

    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
