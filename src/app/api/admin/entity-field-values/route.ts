import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  getEntityFieldValues,
  setEntityFieldValue,
  deleteEntityFieldValue,
  deleteEntityFieldValueByPair,
  ok,
  created,
  badRequest,
  unauthorized,
  serverError,
  safeJson,
} from "@/lib/crud";

export async function GET(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const entityId = req.nextUrl.searchParams.get("entity_id");
    if (!entityId) return badRequest("entity_id가 필요합니다.");

    const values = await getEntityFieldValues(entityId);
    return ok(values);
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
    if (!body.entity_id) missing.push("entity_id");
    if (!body.field_definition_id) missing.push("field_definition_id");
    if (missing.length > 0) {
      return badRequest(`필수 항목 누락: ${missing.join(", ")}`);
    }

    const result = await setEntityFieldValue(String(body.entity_id), String(body.field_definition_id), {
      value_text: body.value_text ? String(body.value_text) : null,
      value_json: body.value_json ?? null,
    });
    return created(result);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return unauthorized();

  try {
    const entityId = req.nextUrl.searchParams.get("entity_id");
    const fieldDefinitionId = req.nextUrl.searchParams.get("field_definition_id");
    const id = req.nextUrl.searchParams.get("id");

    if (id) {
      await deleteEntityFieldValue(id);
      return ok({ deleted: true });
    }

    if (!entityId || !fieldDefinitionId) {
      return badRequest("id 또는 (entity_id + field_definition_id)가 필요합니다.");
    }

    await deleteEntityFieldValueByPair(entityId, fieldDefinitionId);
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
