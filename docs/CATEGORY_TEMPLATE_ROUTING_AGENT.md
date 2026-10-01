# Category Template Routing — Agent Execution Brief

## Objective

Stop 404s caused by newly created area/common categories being linked to routes that do not exist.

Categories must select an existing page template. The template loads the category/entity content from the database and renders the existing layout. Do not create one page file per category.

## Non-goals

- Do not delete or reset production data.
- Do not weaken RLS or expose service-role credentials.
- Do not redesign Golf/Hotel/Restaurant/Attraction layouts.
- Do not make screenshots or image input part of verification.
- Do not silently change existing category codes or public URLs unless required for the routing fix.

## Current architecture to preserve

Existing fixed templates include:

- `src/app/[area]/golf/page.tsx`
- `src/app/[area]/hotel/page.tsx`
- `src/app/[area]/restaurant/page.tsx`
- `src/app/[area]/attraction/page.tsx`
- `src/app/[area]/faq/[category]/page.tsx`
- `src/app/guide/[category]/page.tsx`

Existing category data is read through `src/lib/supabase-cms.ts`. Existing JSON/detail renderers must be reused where applicable.

## Required behavior

### 1. Add an explicit template discriminator

Use a persisted `template_type` (or an equivalent existing field if one is already present). Supported values:

```text
GOLF
HOTEL
RESTAURANT
ATTRACTION
AREA
COMMON
```

If a schema change is necessary, add a forward-only migration and update the committed schema documentation. Do not guess production state: inspect the live schema, migrations, and `docs/06_DB_스키마_운영가이드.md` first.

Suggested semantics:

- `GOLF`, `HOTEL`, `RESTAURANT`, `ATTRACTION`: existing entity/list templates.
- `AREA`: `/{area}/faq/{category}` or the existing area-content template.
- `COMMON`: `/guide/{category}` or the existing common-content template.

### 2. Centralize route resolution

Create one typed helper, preferably under `src/lib/`, that converts `{ area, category, template_type }` into a real route. Do not duplicate route rules in home pages, admin pages, and clients.

The helper must:

- normalize area/category codes consistently;
- never return `/{area}/{arbitraryCategoryCode}` unless that route actually exists;
- return a typed result or a safe fallback for unsupported template values;
- be usable by server and client code without importing server-only modules.

Update all category link producers, especially:

- `src/app/[area]/page.tsx`;
- `src/components/HomeContentClient.tsx`;
- admin dashboard/category cards that currently generate links for every category;
- any prefetching link that creates repeated 404 requests.

### 3. Render DB content through the selected template

For `AREA` and `COMMON` categories, the dynamic page must:

1. resolve the area/category;
2. verify the category is active and belongs to the allowed group;
3. query the category's persisted content/FAQ/JSON data;
4. render it through the existing area/common layout;
5. call `notFound()` only when the area/category truly does not exist or is inactive.

For entity templates, preserve the existing entity lookup and JSON detail rendering. A newly created category must not be mistaken for an entity route.

### 4. Remove implicit emoji invention

Category creation/editing must preserve an explicitly entered/selected icon. If empty, store `null`/empty according to the existing schema contract; do not silently persist `📌`.

Display fallback emojis may remain only as presentation fallback when the stored icon is empty. They must not overwrite the database value.

Keep the emoji picker and direct input. Limit input safely, but do not invent a category-specific emoji from the code.

### 5. Correct active/group validation

Do not resolve an `AREA` category through the `COMMON` resolver or vice versa. Add targeted tests for:

- active AREA category;
- active COMMON category;
- inactive category;
- unknown category;
- unknown template type;
- category code containing spaces or mixed case;
- system entity template categories.

## Implementation sequence

1. Read `AGENTS.md`, relevant schema/CMS documents, and the current route/category code.
2. Inspect production schema/data read-only if credentials/tools are available.
3. Identify the canonical category content table/JSON source; do not introduce a second writable source.
4. Add or reuse `template_type`.
5. Add the centralized route resolver and unit tests.
6. Update public and admin link generation.
7. Update AREA/COMMON page data loading and rendering.
8. Change emoji persistence to preserve empty input without default writes.
9. Run typecheck, lint, and targeted tests.
10. Verify text-only HTTP/route behavior after deployment only when deployed SHA matches the intended SHA.

## Double-check requirements for the reviewing agent

Before reporting completion, inspect the diff and answer explicitly:

- Can any newly created active category still generate a URL with no matching route?
- Does every route shown in a category link resolve to a real page file?
- Does an AREA category load its own DB content rather than COMMON content?
- Does a COMMON category load its own DB content rather than AREA content?
- Does an inactive/unknown category return 404 intentionally?
- Are entity templates still using their existing layouts and JSON data?
- Is any default emoji being written during create/update?
- Are repeated 404s caused by prefetch or stale links still possible?
- Were production verification claims separated from code/test verification?

## Completion evidence

Report separately:

- `CODE_VERIFIED`: files, tests, typecheck/lint;
- `DB_VERIFIED`: only if actual database reads/writes were checked;
- `FUNCTION_VERIFIED`: only if route/API behavior was exercised;
- `DEPLOY_VERIFIED`: only if deployed SHA and production behavior were checked.

Do not claim one label implies another.
