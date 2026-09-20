# CMS / Data Model Rules

Read only when work touches CMS fields, entities/subtypes, categories, relationships, FAQ, content sections, dynamic fields/EAV, includes/excludes, locations, attractions, or travel-time content.

## Identity
- `entities.id` UUID is relational identity.
- URL routing uses explicit slugs where designed.
- Never ambiguously treat a slug as a UUID or vice versa.
- Hotel/golf/restaurant subtype rows must remain consistent with their parent entity.
- Multi-write entity creation should remain atomic when a subtype is required.

## Relationships / PostgREST
- Do not assume PostgREST relation cardinality from TypeScript casts. Verify whether the actual relation returns object, array, or null.
- Do not take only the first relationship when the model permits multiple relationships.
- Preserve category/entity-category consistency and relationship direction.
- Never invent missing relationships.

## FAQ
Preserve `AREA` vs `SPECIFIC` semantics.
- AREA/global FAQ must survive deletion of one entity.
- Entity-specific FAQ must not become meaningless orphan content.
- Use exact DB values/casing; do not assume `area` when the DB value is `AREA`.

## Dynamic fields / EAV
Use the established `field_definitions`, `field_definition_scopes`, `entity_field_values`, and `section_definitions` model for extensible/admin-defined content where appropriate.

Keep a clear source of truth for field definitions, labels, section assignment, values, visibility, sort order, and scope. Every admin-editable input must persist authoritatively and survive reload.

## Public reads
Public content must use an appropriate public/server read path. Do not fetch protected admin mutation endpoints from public Client Components.

After admin changes that affect public pages, verify the existing cache/revalidation strategy and the public result after reload.

## Missing business data
Never fabricate travel times, translations, prices, addresses, FAQ content, or other business facts. Preserve a valid missing state and make the value admin-editable when the product requires it.
