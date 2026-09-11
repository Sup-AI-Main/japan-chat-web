import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  listEntities,
  createEntity,
  updateEntity,
  deleteEntityFull,
  getEntityDeleteImpactReport,
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
    const area = params.get("area") || undefined;
    const category = params.get("category") || undefined;
    const entity_type = params.get("entity_type") || undefined;

    const entities = await listEntities({ area, category, entity_type });
    return ok(entities);
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
    if (!body.display_name) missing.push("display_name");
    if (!body.area && !body.area_id) missing.push("area");
    if (!body.entity_type) missing.push("entity_type");
    if (missing.length > 0) {
      return badRequest(`필수 항목 누락: ${missing.join(", ")}`);
    }

    // Support area as code (resolve to UUID) or area_id directly
    const entityData: Record<string, unknown> = { ...body };
    if (body.area && !body.area_id) {
      entityData.area_id = body.area;
      delete entityData.area;
    }

    const entity = await createEntity(entityData);
    return created(entity);
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

    const { id, updated_at, area, ...data } = body as Record<string, unknown>;
    if (!id) return badRequest("id가 필요합니다.");

    // Support area as code or area_id
    if (area && !data.area_id) {
      data.area_id = area;
    }

    const result = await updateEntity(id as string, data, updated_at as string | undefined);
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

    if (!confirmed) {
      // Return impact report
      const impact = await getEntityDeleteImpactReport(id);
      return ok(impact);
    }

    await deleteEntityFull(id);
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
