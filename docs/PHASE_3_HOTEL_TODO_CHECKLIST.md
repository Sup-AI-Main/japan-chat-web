# Phase 3 TODO Checklist — HOTEL Shared CMS V2 Rollout
## Baseline: 87eb2ea / Post Phase 2.5

> 실제 증거가 있을 때만 `[x]`.
> 하나라도 필수 항목이 미완료면 `PHASE_3_RESULT: COMPLETE` 금지.

## A. Baseline / Rules
- [ ] AGENTS + CMS/Supabase/Delete/Verification docs 읽음
- [ ] current Next.js local docs 확인
- [ ] git fetch / main / HEAD==origin/main
- [ ] baseline SHA 확인
- [ ] baseline Vercel SUCCESS
- [ ] baseline typecheck/lint/build/schema/diff
- [ ] baseline Security Advisor 0

## B. Shared conflict audit/fix
- [ ] EntityDetailsEditor save flow audit
- [ ] adminFetchJson 409 behavior audit
- [ ] StaleVersionError contract 확인
- [ ] entity-editor 409 contract 확인
- [ ] unreachable/dead result.conflict path 기록
- [ ] StaleVersionError 명시 처리
- [ ] conflict pipeline error
- [ ] conflictWarning visible
- [ ] canonical reload
- [ ] stale overwrite 금지
- [ ] Golf conflict regression 계획

## C. Pipeline truthfulness
- [ ] revalidation exception behavior audit
- [ ] response에 truthful revalidation result
- [ ] client actual result 반영
- [ ] fake revalidate success 제거
- [ ] persistence success / revalidation failure 구분
- [ ] double-save 유발 false failure 금지
- [ ] Golf pipeline regression

## D. Production Hotel inventory
- [ ] total / active / details count
- [ ] Grand Mercure snapshot
- [ ] dos_hotel_ snapshot
- [ ] dos_hotel_bfeeaaa4 snapshot
- [ ] Greenrich snapshot
- [ ] Holiday snapshot
- [ ] test_hotel_1 snapshot
- [ ] content_sections inventory
- [ ] includes_excludes inventory
- [ ] FAQ dependencies
- [ ] travel_times dependencies
- [ ] restaurant_locations dependencies
- [ ] entity_field_values dependencies
- [ ] other FK/cascade dependencies

## E. Garbage/QA audit
- [ ] dos_hotel_ exact id + DB evidence + QA history + dependencies
- [ ] delete decision documented; ambiguous→BLOCKED
- [ ] dos_hotel_bfeeaaa4 exact id + QA history + dependencies
- [ ] delete decision documented; ambiguous→BLOCKED
- [ ] inactive test_hotel_1 untouched

## F. Holiday child QA audit
- [ ] 9a244beb... audited
- [ ] 2d82764d... audited
- [ ] f9999c19... audited
- [ ] duplicate legacy_id recorded
- [ ] 269219ed... audited
- [ ] prior QA evidence cross-referenced
- [ ] only proven QA approved for cleanup

## G. Backup safety
- [ ] local JSON before delete/backfill
- [ ] scripts/backups only
- [ ] restore-critical columns and row counts verified
- [ ] gitignored
- [ ] no secrets
- [ ] NO public backup table
- [ ] Security Advisor stays 0

## H. Hygiene execution
- [ ] exact proven rows only
- [ ] safe hard delete/transaction
- [ ] deleted row count verified
- [ ] cascade verified
- [ ] unrelated Hotels unchanged
- [ ] inactive test unchanged
- [ ] source child rows cleaned before backfill
- [ ] active count recalculated

## I. Ownership
- [ ] relational core documented
- [ ] JSON details documented
- [ ] source/status/last_verified relational
- [ ] FAQ/travel/location relations relational
- [ ] legacy variable columns retained fallback/rollback
- [ ] legacy variable columns removed from normal write source

## J. Shared type source
- [ ] duplicate EntityDetails type audit
- [ ] src/lib/entity-details/types.ts canonical
- [ ] src/lib/types.ts compatible import/re-export
- [ ] Hotel.details_json added
- [ ] Golf compile
- [ ] typed boolean/list/number/url compile

## K. Hotel read layer
- [ ] mapHotel details_json
- [ ] getHotelById selects details_json
- [ ] admin read selects details_json if needed
- [ ] getHotels list does NOT fetch details_json
- [ ] active/area/error behavior unchanged

## L. JSON mapper identity
- [ ] deterministic section IDs
- [ ] deterministic item IDs
- [ ] stable section keys
- [ ] item keys exact source keys
- [ ] source/source_table/source_column
- [ ] legacy_id where relevant
- [ ] null/false/true preserved

## M. stay_info
- [ ] checkin_time
- [ ] checkout_time
- [ ] effective labels snapshotted
- [ ] address/phone/maps NOT duplicated

## N. breakfast
- [ ] breakfast_summary preserved + initial hidden
- [ ] breakfast_place
- [ ] breakfast_time
- [ ] breakfast_last_entry
- [ ] labels/types/sort

## O. dinner
- [ ] dinner_summary preserved + initial hidden
- [ ] dinner_place
- [ ] dinner_time
- [ ] dinner_last_entry
- [ ] labels/types/sort

## P. onsen_spa
- [ ] bath_spa_summary preserved + initial hidden
- [ ] has_public_bath boolean/null
- [ ] has_outdoor_onsen boolean/null
- [ ] has_sauna boolean/null
- [ ] bath_spa_hours
- [ ] tattoo_policy
- [ ] correct labels/types

## Q. other_info
- [ ] other_info
- [ ] atm_payment
- [ ] transport_note
- [ ] duplicate-title label behavior checked

## R. Includes/custom
- [ ] legitimate includes/excludes identified
- [ ] QA excluded
- [ ] list structure if legitimate
- [ ] no 항목 N
- [ ] legitimate content_sections only
- [ ] QA/garbled excluded after proof
- [ ] no custom/canonical duplication

## S. Dynamic label snapshot
- [ ] Hotel section_definitions inventory
- [ ] field_definitions inventory
- [ ] effective label resolution documented
- [ ] labels copied to each Hotel JSON
- [ ] JSON label canonical
- [ ] global runtime override 없음 on JSON path
- [ ] legacy fallback dynamic labels 유지
- [ ] per-entity label edit isolated

## T. Backfill script safety
- [ ] scripts/backfill-hotel-details-json.mjs
- [ ] --dry-run / --write / --verify
- [ ] default no write
- [ ] active legitimate only
- [ ] inactive skip
- [ ] details_json non-null skip
- [ ] local BEFORE backup
- [ ] RPC + expected_updated_at
- [ ] conflict report/no overwrite
- [ ] all failures report
- [ ] idempotent
- [ ] second dry-run no writes
- [ ] destructive --repair 없음
- [ ] --force-rebuild 없음

## U. Dry run
- [ ] writes 0
- [ ] target count correct
- [ ] sections/items/labels/types/visibility printed
- [ ] boolean true/false/null correct
- [ ] no QA data
- [ ] no inactive Hotel

## V. Write/verify
- [ ] intended Hotel saves success
- [ ] no conflict overwrite
- [ ] legit active details count correct
- [ ] version=1 / validator pass
- [ ] second dry-run idempotent
- [ ] legacy values unchanged
- [ ] no unexpected entity updated

## W. HotelEditModal core-only
- [ ] writer callsites audited
- [ ] display_name core
- [ ] official_name core
- [ ] address/address_jp core
- [ ] phone core
- [ ] google_maps_url core
- [ ] checkin/out removed
- [ ] breakfast/dinner removed
- [ ] booleans/bath/tattoo removed
- [ ] other/atm/transport removed
- [ ] title `기본정보 수정`
- [ ] creation still works

## X. Core API hardening
- [ ] /api/admin/hotel callsites audited
- [ ] HotelFormPayload split/update
- [ ] core-only normal update
- [ ] normal API cannot independently write migrated variable detail
- [ ] optional updateHotelCore helper
- [ ] dashboard regression 없음

## Y. Shared editor connection
- [ ] NO HotelDetailsEditor
- [ ] EntityDetailsEditor entityType=HOTEL
- [ ] 세부사항 수정 admin-only
- [ ] common modal/section/item/pipeline
- [ ] dirty/draft/unsaved guard

## Z. Public renderer
- [ ] EntityDetailsRenderer
- [ ] valid V1 detection
- [ ] JSON→shared renderer
- [ ] null/invalid→legacy fallback
- [ ] core remains relational
- [ ] no core/JSON duplicate
- [ ] no legacy variable duplicate
- [ ] FAQ remains
- [ ] legacy include/content renderer skipped on JSON path
- [ ] false visible / null hidden
- [ ] summary initially hidden

## AA. DB integrity
- [ ] active/details counts
- [ ] placeholder labels 0
- [ ] duplicate section titles 0
- [ ] duplicate section keys 0
- [ ] duplicate item keys 0
- [ ] QA markers 0
- [ ] inactive test unchanged
- [ ] typed JSON booleans/null

## AB. Production draft E2E
- [ ] intended SHA live first
- [ ] safe Hotel BEFORE snapshot
- [ ] shared editor opens
- [ ] labels/values load
- [ ] temp section/item/value changes
- [ ] add/sort/visibility
- [ ] DB unchanged before save
- [ ] public unchanged before save

## AC. Save pipeline E2E
- [ ] validate/prepare/save/conflict/canonical/revalidate/done actual statuses
- [ ] revalidation false not marked success
- [ ] duplicate submit blocked
- [ ] updated_at canonical
- [ ] dirty resets
- [ ] reopen persistence

## AD. Targeted revalidation
- [ ] list + detail paths
- [ ] standard URL latest
- [ ] `?_t=` only success is not PASS
- [ ] unrelated pages not globally revalidated

## AE. Hotel conflict E2E
- [ ] A/B same T1
- [ ] A save
- [ ] B 409 STALE_VERSION
- [ ] StaleVersionError caught
- [ ] conflict step error/warning visible
- [ ] A preserved/B blocked
- [ ] canonical reload
- [ ] cleanup

## AF. Boolean E2E
- [ ] original snapshot
- [ ] null→false
- [ ] public false shown
- [ ] false→true
- [ ] public true shown
- [ ] true→null
- [ ] public null hidden
- [ ] original restored
- [ ] legacy relational boolean unchanged by JSON edit

## AG. Core vs details E2E
- [ ] core temp save → relational only
- [ ] core public + restore
- [ ] detail temp save → JSON only
- [ ] legacy variable unchanged
- [ ] detail public + restore
- [ ] no same-field dual writer

## AH. Cleanup
- [ ] PHASE3_HOTEL_SECTION 0
- [ ] PHASE3_HOTEL_LABEL 0
- [ ] PHASE3_HOTEL_VALUE 0
- [ ] PHASE3_SESSION_A 0
- [ ] PHASE3_SESSION_B 0
- [ ] original state restored
- [ ] no temp public backup table
- [ ] no debug/temp artifacts committed

## AI. Hotel public regression
- [ ] Grand Mercure
- [ ] Greenrich
- [ ] Holiday
- [ ] core info
- [ ] all variable details
- [ ] FAQ
- [ ] no duplicates/placeholders/QA

## AJ. Golf regression
- [ ] active/details 9/9
- [ ] placeholder 0 / QA 0 / includes rows 0
- [ ] Amagase/Kaho/Winners/Forest Nankan
- [ ] save
- [ ] conflict UI
- [ ] truthful pipeline
- [ ] targeted revalidation

## AK. Restaurant regression
- [ ] list
- [ ] representative detail
- [ ] existing admin edit
- [ ] restaurant_locations behavior
- [ ] no Restaurant migration

## AL. Attraction regression
- [ ] list/detail/edit
- [ ] no Attraction migration
- [ ] no EAV migration

## AM. Security
- [ ] service role client exposure 0
- [ ] admin endpoints auth
- [ ] RLS/grants not weakened
- [ ] RPC SECURITY DEFINER/search_path/ACL correct
- [ ] no public backup tables
- [ ] Security Advisor 0

## AN. Performance
- [ ] Hotel list no details_json
- [ ] Hotel detail one details_json
- [ ] editor one entity
- [ ] no N+1
- [ ] targeted revalidate only

## AO. Static
- [ ] npm run typecheck
- [ ] npm run lint
- [ ] pre-existing lint recorded
- [ ] new lint 0
- [ ] npm run build
- [ ] npm run verify:cms-schema
- [ ] git diff --check
- [ ] no unintended untracked files

## AP. Push/deploy
- [ ] logical commits
- [ ] no secrets/backups
- [ ] implementation SHA
- [ ] push main
- [ ] HEAD==origin/main
- [ ] Vercel intended SHA SUCCESS

## AQ. Production smoke
- [ ] latest SHA live
- [ ] 3 legitimate Hotels
- [ ] Golf regression
- [ ] Restaurant regression
- [ ] Attraction regression
- [ ] logged-out/logged-in
- [ ] standard URLs no stale target state

## AR. Docs
- [ ] architecture updated
- [ ] Phase 3 report
- [ ] Hotel ownership/backfill mapping
- [ ] cleanup evidence
- [ ] conflict/revalidation fix
- [ ] remaining legacy fallback
- [ ] Phase 4 handoff

## AS. Verification labels
- [ ] CODE_VERIFIED=YES
- [ ] DB_VERIFIED=YES
- [ ] FUNCTION_VERIFIED=YES
- [ ] DEPLOY_VERIFIED=YES

## AT. Final gate
- [ ] shared conflict correct
- [ ] pipeline truthful
- [ ] hygiene complete
- [ ] active legitimate Hotels backfilled
- [ ] per-entity labels
- [ ] boolean null/false/true
- [ ] shared editor/renderer/pipeline
- [ ] core-only Hotel modal
- [ ] no two writable sources
- [ ] standard URL revalidation
- [ ] Hotel save/conflict/boolean E2E
- [ ] cleanup 0
- [ ] Golf/Restaurant/Attraction regressions
- [ ] security 0
- [ ] static PASS
- [ ] Vercel SUCCESS / intended SHA live

전부 참일 때만:

```text
PHASE_3_RESULT: COMPLETE
```

그 외:

```text
PHASE_3_RESULT: FIX_REQUIRED
```

데이터 삭제 판정 불명확/infra blocker:

```text
PHASE_3_RESULT: BLOCKED
```
