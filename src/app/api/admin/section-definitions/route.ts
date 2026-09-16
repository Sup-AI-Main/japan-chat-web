import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  listSectionDefinitions,
  createSectionDefinition,
  updateSectionDefinition,
  deleteSectionDefinition,
  getSectionDefinition,
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
    const entityType = req.nextUrl.searchParams.get("entity_type") || undefined;
    const definitions = await listSectionDefinitions(entityType);
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

    const definition = await createSectionDefinition(body);
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

    const result = await updateSectionDefinition(
      id as string,
      data,
      updated_at as string | undefined
    );

    // Revalidate all public pages for this entity type
    await revalidateEntityPaths(result.entity_type);

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
    const existing = await getSectionDefinition(id);
    await deleteSectionDefinition(id);

    if (existing) {
      await revalidateEntityPaths(existing.entity_type);
    }

    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
