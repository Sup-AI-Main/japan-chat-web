# Category Template Routing Remediation — Agent Execution Brief

## Mission

Fix category navigation so an administrator can create a category without creating a new page file. The category must select an existing template, the template must load the category's persisted DB content, and no valid category link may lead to an accidental 404.

This document supersedes the earlier routing plan where it conflicts with the current repository evidence.

## User requirement

The product has fixed layouts:

- golf-course layout;
- hotel layout;
- restaurant layout;
- attraction layout;
- area-specific content layout;
- common-content layout.

New categories must reuse one of those layouts. Category content is data, not a new Next.js page. The implementation must route to an existing dynamic page and render the category's DB-backed content/JSON through that layout.

## Confirmed current defects to fix

Do not mark these as complete without code and runtime evidence.

1. `template_type` is referenced by application code, but no committed migration adding `categories.template_type` exists under `supabase/migrations`.
2. `src/lib/crud/categories.ts` creates categories without `template_type`.
3. `src/lib/supabase-cms.ts` defaults missing template values to `COMMON`, which can turn an AREA category into a COMMON route.
4. `src/lib/routes.ts` routes an AREA category with COMMON template to `/area/faq/category`, but `src/app/[area]/faq/[category]/page.tsx` rejects `template_type === COMMON` with `notFound()`.
5. `src/components/GuideCategoriesClient.tsx` hardcodes `group: "COMMON"` and tests `/guide/{code}`, so it cannot correctly create an AREA category.
6. `src/components/GuideCategoriesClient.tsx` still writes `icon.trim() || "📌"`; an omitted icon must not be invented and persisted.
7. `src/app/guide/[category]/page.tsx` resolves only COMMON categories, while AREA categories must use the area-scoped route.
8. Admin route producers and prefetch behavior have not been proven to avoid nonexistent URLs.
9. The existing TODO contains unchecked work but the prior report claimed DB/deployment completion. Do not repeat that claim without independent evidence.

## Mandatory investigation first

1. Read `AGENTS.md`.
2. Read `docs/agent/cms-data-model.md`, `docs/agent/verification.md`, and `docs/06_DB_스키마_운영가이드.md`.
3. Inspect the actual production schema read-only, committed migrations, and current category rows. If production access is unavailable, report `DB_VERIFIED: NOT VERIFIED`.
4. Inventory these files before editing:

```text
src/app/[area]/page.tsx
src/app/[area]/faq/[category]/page.tsx
src/app/guide/[category]/page.tsx
src/lib/routes.ts
src/lib/supabase-cms.ts
src/lib/crud/categories.ts
src/app/api/admin/manage-categories/route.ts
src/app/api/admin/options/route.ts
src/components/GuideCategoriesClient.tsx
src/components/HomeContentClient.tsx
src/components/admin/Dashboard.tsx
```

5. Establish which endpoint is canonical for category CRUD. Do not silently use `/api/admin/options` if it writes `display_options` rather than `categories`.

## Required data contract

Use one persisted discriminator on `categories`:

```text
template_type: GOLF | HOTEL | RESTAURANT | ATTRACTION | AREA | COMMON
```

Allowed combinations:

| group_type | allowed template types | route |
|---|---|---|
| AREA | GOLF, HOTEL, RESTAURANT, ATTRACTION | `/{area}/golf`, `/{area}/hotel`, `/{area}/restaurant`, `/{area}/attraction` |
| AREA | AREA | `/{area}/faq/{category}` |
| COMMON | COMMON | `/guide/{category}` |
| SYSTEM | only an explicitly supported system template | no public link unless a real template exists |

Reject invalid combinations at the API boundary. Do not use an implicit `COMMON` fallback for an AREA category.

If the column does not exist in production, add a forward-only migration with:

- nullable/additive introduction if needed for existing rows;
- deterministic backfill for known system categories;
- a safe default only after backfill and only if it cannot produce a broken route;
- constraints/checks appropriate to the existing schema;
- documentation update in `docs/06_DB_스키마_운영가이드.md`.

Never claim the migration is applied merely because the file exists.

## Required implementation

### A. Canonical category CRUD

Update the actual category CRUD path, not a legacy display-options path.

- create: accept and persist `group_type`, `template_type`, `code`, `label`, `icon`;
- read/list: select and return `template_type`;
- update: allow safe template changes with validation;
- delete: preserve existing hard-delete safeguards;
- response: return the canonical persisted row and verify it after reload.

If `GuideCategoriesClient` is legacy and writes the wrong endpoint, either migrate it to `/api/admin/manage-categories` or clearly remove/replace the legacy flow. Do not leave two category write sources.

### B. Category creation UI

The form must let the administrator choose the template. At minimum:

- AREA + AREA template for arbitrary local categories;
- COMMON + COMMON template for shared categories;
- entity templates only where the corresponding entity page exists.

After create, derive the route using the same shared resolver used by the public page. Do not hardcode `/guide/{code}`.

### C. One route resolver

Keep route policy in one client-safe typed helper. It must:

- normalize codes and area slugs;
- return only routes backed by an existing page file;
- reject invalid group/template combinations;
- return a typed null/error for unsupported values;
- be used by public area cards, home cards, category creation verification, and admin links.

Do not route an AREA category with COMMON template to the AREA FAQ page unless the page explicitly supports that combination. Prefer rejecting the invalid data at creation/update.

### D. AREA and COMMON rendering

`src/app/[area]/faq/[category]/page.tsx` must:

1. resolve the area;
2. resolve an active AREA category with `template_type=AREA`;
3. query the canonical area/category content source;
4. render content through the existing area layout;
5. show an empty state when valid content is absent;
6. call `notFound()` only for unknown/inactive/mismatched records.

`src/app/guide/[category]/page.tsx` must resolve an active COMMON category with `template_type=COMMON` and render its canonical common content.

Do not claim that a generic `details_json` renderer is used unless the queried table/column actually stores the category content. Existing FAQ rows and entity `details_json` must not be conflated.

### E. Entity templates

Preserve the existing fixed Golf/Hotel/Restaurant/Attraction page layouts. A category with an entity template must resolve to the corresponding existing list page; it must not pretend that the category itself is an entity.

### F. Emoji behavior

- preserve picker and direct input;
- persist the entered emoji, or `null`/empty according to the schema contract;
- do not write `📌` when the field is blank;
- allow display-only fallback in `getCategoryEmoji` if desired;
- do not overwrite a stored custom emoji with a code-based default.

## Required verification

### Code checks

Run and record:

```text
npx tsc --noEmit
npm run lint
```

Run targeted tests for route resolution and category CRUD. If no test framework exists, add a small deterministic unit test rather than claiming tests passed.

### Text-only functional checks

Exercise and record HTTP/API/DB responses for:

1. existing GOLF category → existing golf page;
2. new AREA category with AREA template and no content → 200 empty state;
3. new AREA category with content → 200 and category content text;
4. new COMMON category with no content → 200 empty state;
5. new COMMON category with content → 200 and category content text;
6. inactive category → intentional 404;
7. unknown category → intentional 404;
8. invalid group/template combination → rejected at API boundary;
9. blank emoji → DB remains blank/null;
10. custom emoji → survives save and reload;
11. category list links contain no unsupported arbitrary route;
12. no repeated 404s are caused by prefetch or admin card links.

### Deployment claims

Use these labels independently:

- `CODE_VERIFIED`: code inspection and checks passed;
- `DB_VERIFIED`: actual schema/data/mutation queries passed;
- `FUNCTION_VERIFIED`: requested flows exercised end-to-end, including reload;
- `DEPLOY_VERIFIED`: intended SHA is READY in deployment and production smoke tests passed.

If any evidence is missing, write `NOT VERIFIED`, not `PASS`.

## Completion report format

Report:

1. root cause;
2. changed files;
3. migration and production DB status;
4. route matrix;
5. test commands and text outputs;
6. independent verification labels;
7. remaining risks or one exact next action.

Do not mark the task complete while a required route, migration, CRUD path, or verification item remains unresolved.
