export const ADMIN_ACTIVITY_EVENT = "admin-activity";

export type AdminActivity =
  | { kind: "start"; id: number; mutation: boolean }
  | { kind: "success"; id: number; mutation: boolean }
  | { kind: "failure"; id: number; mutation: boolean; code: string; message: string; status?: number }
  | { kind: "toast"; message: string };

let nextRequestId = 0;

export function publishAdminActivity(activity: AdminActivity): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<AdminActivity>(ADMIN_ACTIVITY_EVENT, { detail: activity }));
  }
}

function isTrackedMutation(url: string, method: string): boolean {
  const path = url.split("?")[0];
  const impactPreview = method === "DELETE" &&
    ["/api/admin/areas", "/api/admin/manage-categories", "/api/admin/manage-entities"].includes(path) &&
    new URL(url, "http://localhost").searchParams.get("confirmed") !== "true";
  return url.startsWith("/api/admin/") &&
    !url.startsWith("/api/admin/login") &&
    !url.startsWith("/api/admin/logout") &&
    !impactPreview &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

export async function trackedAdminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const tracked = url.startsWith("/api/admin/") &&
    !url.startsWith("/api/admin/login") && !url.startsWith("/api/admin/logout");
  const mutation = isTrackedMutation(url, method);
  if (!tracked) return fetch(url, options);

  const id = ++nextRequestId;
  publishAdminActivity({ kind: "start", id, mutation });
  try {
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      if (method !== "GET" || !(error instanceof TypeError)) throw error;
      response = await fetch(url, { ...options, cache: "no-store" });
    }
    let body: { success?: boolean; code?: string; error?: string; message?: string } = {};
    try { body = await response.clone().json(); } catch { /* Response can be empty. */ }
    if (response.ok && body.success !== false) {
      publishAdminActivity({ kind: "success", id, mutation });
    } else {
      publishAdminActivity({
        kind: "failure", id, mutation, status: response.status,
        code: body.code ?? (response.ok ? "INVALID_RESPONSE" : `HTTP_${response.status}`),
        message: body.error ?? body.message ?? `요청이 실패했습니다 (${response.status}).`,
      });
    }
    return response;
  } catch (error) {
    publishAdminActivity({
      kind: "failure", id, mutation, code: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "네트워크 요청이 실패했습니다.",
    });
    throw error;
  }
}
