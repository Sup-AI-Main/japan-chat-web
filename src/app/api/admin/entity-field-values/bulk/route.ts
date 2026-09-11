import { NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  bulkSetEntityFieldValues,
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

    if (!body.entity_id) {
      return badRequest("entity_id가 필요합니다.");
    }
    if (!Array.isArray(body.values)) {
      return badRequest("values 배열이 필요합니다.");
    }

    for (const v of body.values) {
      if (!v.field_definition_id) {
        return badRequest("각 항목에 field_definition_id가 필요합니다.");
      }
    }

    const results = await bulkSetEntityFieldValues(
      String(body.entity_id),
      body.values as Array<{ field_definition_id: string; value_text?: string | null; value_json?: unknown }>
    );
    return ok(results);
  } catch (err) {
    return serverError(err);
  }
}
