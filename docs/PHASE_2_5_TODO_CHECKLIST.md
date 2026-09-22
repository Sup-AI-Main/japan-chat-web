# Phase 2.5 TODO Checklist — Shared CMS V2 Foundation + Golf Refactor

> **규칙:** 체크하지 않은 항목이 하나라도 있으면 `PHASE_2_5_RESULT: COMPLETE` 금지.
>
> 체크는 실제 증거가 있을 때만 `[x]`로 변경한다.

---

## A. Baseline / 문서 / 환경

- [ ] `AGENTS.md` 읽음
- [ ] `docs/AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md` 읽음
- [ ] `docs/agent/cms-data-model.md` 읽음
- [ ] `docs/agent/supabase.md` 읽음
- [ ] `docs/agent/verification.md` 읽음
- [ ] 관련 Next.js current docs를 `node_modules/next/dist/docs/`에서 확인
- [ ] `git fetch origin`
- [ ] branch가 `main`
- [ ] worktree clean
- [ ] `HEAD == origin/main`
- [ ] baseline SHA = `ef71e13...`
- [ ] baseline Vercel status 확인
- [ ] baseline `npm run typecheck`
- [ ] baseline `npm run lint`
- [ ] baseline `npm run build`
- [ ] baseline `npm run verify:cms-schema`
- [ ] baseline `git diff --check`
- [ ] 기존 lint debt count 기록
- [ ] Phase 2 Production Golf 9/9 재확인
- [ ] Phase 2 duplicate title 0 재확인
- [ ] Phase 2 Golf/CS overlap 0 재확인
- [ ] Phase 2 QA marker 0 재확인
- [ ] Phase 2 conflict behavior baseline 기록

---

## B. Current Architecture Audit

- [ ] `GolfDetailsEditor.tsx` 책임 inventory
- [ ] `GolfDetailClient.tsx` JSON rendering inventory
- [ ] `GolfEditModal.tsx` writable fields inventory
- [ ] `/api/admin/entity-editor` GET inventory
- [ ] `/api/admin/entity-editor` PUT inventory
- [ ] `admin_save_entity_editor_v1` actual production definition 확인
- [ ] RPC grants 확인
- [ ] RPC `search_path` 확인
- [ ] `entities.updated_at` trigger 확인
- [ ] current `EntityDetailsDocumentV1` usage 검색
- [ ] `details_json` public read call sites 검색
- [ ] `details_json` admin write call sites 검색
- [ ] `section_definitions` Golf runtime usage 검색
- [ ] `field_definitions` Golf runtime usage 검색
- [ ] `LabelManager` runtime 영향 inventory
- [ ] `ContentSectionsRenderer` usage inventory
- [ ] `IncludeExcludeSection` usage inventory
- [ ] `ContentSectionsEditor` immediate-write 여부 기록
- [ ] `IncludesExcludesEditor` immediate-write 여부 기록
- [ ] `FieldCreateModal` immediate-write 여부 기록
- [ ] `FieldPickerModal` immediate-write 여부 기록

---

## C. Shared Type Contracts

- [ ] `src/lib/entity-details/` 디렉터리 설계
- [ ] `types.ts` 생성
- [ ] `CmsEntityType` 정의
- [ ] `EntityDetailItemType` 정의
- [ ] `EntityDetailItemValue` 정의
- [ ] `EntityDetailsItem` 정의
- [ ] item `id`
- [ ] item `key`
- [ ] item `label_ko`
- [ ] item `label_jp`
- [ ] item `type`
- [ ] item typed `value`
- [ ] item `sort`
- [ ] item `is_visible`
- [ ] item `value_jp`
- [ ] item `legacy_id`
- [ ] item source metadata 필요 여부 결정
- [ ] `EntityDetailsSection` 정의
- [ ] section `id`
- [ ] section `key`
- [ ] section `title_ko`
- [ ] section `title_jp`
- [ ] section `emoji`
- [ ] section `sort`
- [ ] section `is_visible`
- [ ] section source metadata
- [ ] section `items`
- [ ] `EntityDetailsDocumentV1`
- [ ] `version`은 1 유지
- [ ] 기존 `src/lib/types.ts` 중복 타입 제거/재-export 전략 결정
- [ ] Golf existing JSON TypeScript 호환 유지
- [ ] Hotel future multi-item schema 수용 가능
- [ ] Restaurant future schema 수용 가능
- [ ] Attraction future schema 수용 가능

---

## D. Stable Identity / Label Policy

- [ ] section `id` immutable
- [ ] section `key` immutable from normal UI
- [ ] item `id` immutable
- [ ] item `key` immutable from normal UI
- [ ] section label과 key 분리
- [ ] item label과 key 분리
- [ ] new section stable key generator
- [ ] new item stable key generator
- [ ] key collision 검증
- [ ] label 변경 시 key 유지
- [ ] sort 변경 시 ID/key 유지
- [ ] visibility 변경 시 ID/key 유지

---

## E. Runtime Validation

- [ ] `validate.ts` 생성
- [ ] document object 검증
- [ ] `version === 1`
- [ ] `sections` array 검증
- [ ] max sections
- [ ] unique section IDs
- [ ] unique section keys
- [ ] non-empty section label
- [ ] section label length
- [ ] finite section sort
- [ ] section visibility boolean
- [ ] items array
- [ ] max items per section
- [ ] unique item IDs
- [ ] unique item keys
- [ ] item label validation
- [ ] item label max length
- [ ] allowed type whitelist
- [ ] text value validation
- [ ] textarea value validation
- [ ] boolean value validation
- [ ] number finite validation
- [ ] url validation
- [ ] URL `http/https` only
- [ ] list array validation
- [ ] list member string validation
- [ ] list max count
- [ ] value text max length
- [ ] payload max bytes
- [ ] `NaN` 금지
- [ ] `Infinity` 금지
- [ ] raw HTML renderer 미지원 확인
- [ ] API boundary에서 validator 실행
- [ ] invalid payload DB write 전 reject
- [ ] invalid payload safe 4xx
- [ ] 기존 Golf JSON validator compatibility test

---

## F. Normalize / Backward Compatibility

- [ ] `normalize.ts` 생성
- [ ] 기존 item key missing 처리
- [ ] 기존 item label missing 처리
- [ ] 기존 item sort missing 처리
- [ ] 기존 item visibility missing 처리
- [ ] legacy item value 보존
- [ ] `value_jp` 보존
- [ ] `legacy_id` 보존
- [ ] section metadata 보존
- [ ] normalize가 DB write하지 않음
- [ ] deterministic fallback key
- [ ] deterministic fallback label
- [ ] repeated normalize idempotent
- [ ] normalized doc validator 통과

---

## G. Dirty Diff

- [ ] `diff.ts` 생성
- [ ] section add count
- [ ] section delete count
- [ ] section label diff
- [ ] section jp label diff
- [ ] section emoji diff
- [ ] section sort diff
- [ ] section visibility diff
- [ ] item add diff
- [ ] item delete diff
- [ ] item label diff
- [ ] item jp label diff
- [ ] item type diff
- [ ] typed value diff
- [ ] item sort diff
- [ ] item visibility diff
- [ ] false vs null 차이 검출
- [ ] 0 vs empty 차이 검출
- [ ] list diff 검출
- [ ] dirty count UI 연결

---

## H. Shared Editor State

- [ ] common editor state 설계
- [ ] loading
- [ ] saving
- [ ] error
- [ ] conflict warning
- [ ] success
- [ ] entity metadata
- [ ] draft doc
- [ ] server canonical doc
- [ ] updatedAt
- [ ] dirty count
- [ ] load canonical
- [ ] deep clone strategy 검토
- [ ] load failure UX
- [ ] retry UX
- [ ] entity type mismatch guard
- [ ] failed save draft 유지
- [ ] validation failure draft 유지
- [ ] success canonical state 교체
- [ ] conflict canonical reload
- [ ] conflict warning preserve

---

## I. `EntityDetailsEditor.tsx`

- [ ] 파일 생성
- [ ] generic `entityId`
- [ ] generic `entityType`
- [ ] Golf 전용 타입/문구 제거
- [ ] loading UI
- [ ] error UI
- [ ] header entity display name
- [ ] dirty indicator
- [ ] `수정완료` button
- [ ] add section
- [ ] remove section
- [ ] update section
- [ ] add item
- [ ] remove item
- [ ] update item
- [ ] sort changes draft only
- [ ] visibility changes draft only
- [ ] label changes draft only
- [ ] value changes draft only
- [ ] no API mutation before save
- [ ] saving inputs disabled/guarded
- [ ] clean state save disabled

---

## J. Section Editor

- [ ] `EntityDetailsSectionEditor.tsx`
- [ ] emoji input
- [ ] Korean label input
- [ ] Japanese label optional
- [ ] visibility toggle
- [ ] sort control
- [ ] remove control
- [ ] internal id hidden/read-only
- [ ] internal key hidden/read-only
- [ ] source metadata not editable
- [ ] nested items
- [ ] section add initializes stable id/key
- [ ] section delete draft-only

---

## K. Item Editor

- [ ] `EntityDetailsItemEditor.tsx`
- [ ] Korean label input
- [ ] Japanese label optional
- [ ] type select
- [ ] visibility
- [ ] sort
- [ ] delete
- [ ] internal id hidden/read-only
- [ ] internal key hidden/read-only
- [ ] text input
- [ ] textarea input
- [ ] boolean control
- [ ] number input
- [ ] URL input
- [ ] list editor
- [ ] list add
- [ ] list remove
- [ ] `false` editable
- [ ] `0` editable
- [ ] null semantics defined
- [ ] item add stable id/key
- [ ] item delete draft-only

---

## L. Shared Modal / Unsaved Guard

- [ ] `EntityDetailsEditorModal.tsx`
- [ ] existing `ModalShell` 재사용
- [ ] modal title generic
- [ ] close X
- [ ] cancel
- [ ] backdrop behavior 결정
- [ ] Escape behavior 결정
- [ ] dirty close confirm
- [ ] dirty cancel confirm
- [ ] no confirm when clean
- [ ] saving 중 close 방지
- [ ] pipeline visible area
- [ ] success state 확인 가능
- [ ] mobile layout
- [ ] desktop layout
- [ ] max height/scroll 정상

---

## M. Save Pipeline

- [ ] `EntitySaveProgress.tsx`
- [ ] step model
- [ ] `pending`
- [ ] `running`
- [ ] `success`
- [ ] `error`
- [ ] `skipped`
- [ ] 입력값 검증 step
- [ ] 변경사항 준비 step
- [ ] 서버 저장 step
- [ ] 충돌 확인 step
- [ ] canonical 재확인 step
- [ ] public revalidation step
- [ ] UI refresh step 필요 여부 결정
- [ ] 완료 step
- [ ] fake timer 없음
- [ ] 실제 event만 success 처리
- [ ] conflict step error 표시
- [ ] save error 표시
- [ ] canonical read failure 표시
- [ ] revalidation failure 표시
- [ ] retry 정책 명확
- [ ] saving 중 double submit 방지

---

## N. Entity Editor API

- [ ] GET auth 유지
- [ ] PUT auth 유지
- [ ] GET entity id validation
- [ ] GET canonical entity metadata
- [ ] GET slug
- [ ] GET display name
- [ ] GET entity type
- [ ] GET area
- [ ] GET updated_at exact
- [ ] GET details_json
- [ ] PUT safe JSON
- [ ] PUT entity lookup
- [ ] PUT entity type whitelist
- [ ] PUT runtime validation
- [ ] PUT normalize
- [ ] PUT RPC call
- [ ] stale conflict preserve
- [ ] no blind overwrite
- [ ] canonical DB re-read
- [ ] request echo 금지
- [ ] targeted revalidation
- [ ] response canonical details
- [ ] response canonical updated_at
- [ ] pipeline metadata truthfully returned
- [ ] raw DB error client 노출 금지
- [ ] secret logging 금지

---

## O. RPC / DB Security

- [ ] actual RPC definition 확인
- [ ] `SECURITY DEFINER` 확인
- [ ] fixed `search_path`
- [ ] PUBLIC execute 없음
- [ ] anon execute 없음
- [ ] authenticated execute 없음
- [ ] service_role execute
- [ ] updated_at trigger 확인
- [ ] stale equality precision 확인
- [ ] RPC 변경 필요성 최소화
- [ ] RPC 변경 시 migration
- [ ] migration history 확인
- [ ] Security Advisor 실행
- [ ] security regression 0

---

## P. Targeted Revalidation

- [ ] `revalidate-entity.ts` 또는 동등 helper
- [ ] GOLF segment mapping
- [ ] HOTEL segment mapping
- [ ] RESTAURANT segment mapping
- [ ] ATTRACTION segment mapping
- [ ] detail path revalidate
- [ ] list path revalidate
- [ ] changed entity만 revalidate
- [ ] all entity loop 금지
- [ ] Golf save 후 즉시 public 반영
- [ ] ISR 자연 만료 대기 필요 없음

---

## Q. Common Renderer

- [ ] `EntityDetailsRenderer.tsx`
- [ ] section sort
- [ ] section visibility
- [ ] section emoji
- [ ] section JSON label 직접 사용
- [ ] item sort
- [ ] item visibility
- [ ] item JSON label 직접 사용
- [ ] text renderer
- [ ] textarea renderer
- [ ] boolean renderer
- [ ] number renderer
- [ ] url renderer
- [ ] list renderer
- [ ] safe URL
- [ ] no raw HTML
- [ ] empty string hidden
- [ ] whitespace-only hidden
- [ ] null hidden
- [ ] empty list hidden
- [ ] false shown
- [ ] 0 shown
- [ ] stable React keys
- [ ] custom section
- [ ] custom item
- [ ] accessibility labels where needed
- [ ] current Golf visual regression 최소화

---

## R. Global Label Override 제거

- [ ] migrated JSON section에 `getSectionLabel()` override 금지
- [ ] migrated JSON item에 global field label override 금지
- [ ] JSON section `title_ko` canonical
- [ ] JSON item `label_ko` canonical
- [ ] legacy fallback에서는 dynamic labels 유지
- [ ] `section_definitions` 삭제 안 함
- [ ] `field_definitions` 삭제 안 함
- [ ] default/template 역할 문서화
- [ ] per-entity label change가 다른 entity에 영향 없는지 E2E

---

## S. Golf Detail Client Refactor

- [ ] inline JSON map renderer 제거
- [ ] common renderer import
- [ ] valid V1 helper
- [ ] valid JSON path
- [ ] legacy fallback path
- [ ] core display 유지
- [ ] FAQ 유지
- [ ] includes/excludes duplicate 방지
- [ ] content sections duplicate 방지
- [ ] admin button 유지
- [ ] generic editor modal 연결
- [ ] Golf-specific editor import 제거
- [ ] old manual modal wrapper 제거 가능 여부 검토

---

## T. Golf Core Edit Modal

- [ ] current writable fields inventory
- [ ] core vs details ownership 표 작성
- [ ] `display_name` core
- [ ] `official_name` core
- [ ] `address` core
- [ ] `phone` core
- [ ] `google_maps_url` core
- [ ] `course_summary` details
- [ ] `play_cart` details
- [ ] `clubhouse_dining` details
- [ ] `bath_shower` details
- [ ] `rental` details
- [ ] `dress_code` details
- [ ] variable detail old inputs 제거/readonly/redirect 결정
- [ ] core save does not independently mutate details
- [ ] details save does not accidentally mutate core
- [ ] UI wording `기본정보 수정`
- [ ] UI wording `세부사항 수정`
- [ ] same logical field double-write 불가

---

## U. Legacy Editor Compatibility

- [ ] `ContentSectionsEditor`는 V2 draft에 직접 연결하지 않음
- [ ] `IncludesExcludesEditor`는 V2 draft에 직접 연결하지 않음
- [ ] `FieldCreateModal` immediate mutation path를 V2에서 사용하지 않음
- [ ] `FieldPickerModal` immediate mutation path를 V2에서 사용하지 않음
- [ ] `LabelManager`는 migrated JSON runtime override로 사용하지 않음
- [ ] legacy admin 기능을 Phase 6 전까지 필요한 범위 유지
- [ ] legacy API 삭제 안 함
- [ ] legacy DB table drop 안 함

---

## V. Golf JSON Enrichment Migration

- [ ] enrichment 필요 field 목록 확정
- [ ] rebuild가 아닌 metadata enrichment로 설계
- [ ] `scripts/enrich-golf-details-json.mjs`
- [ ] `--dry-run`
- [ ] `--write`
- [ ] active Golf inventory
- [ ] BEFORE JSON snapshot
- [ ] current effective labels inventory
- [ ] global/current label parity audit
- [ ] item.key seed policy
- [ ] item.label_ko seed policy
- [ ] item.sort seed policy
- [ ] item.is_visible seed policy
- [ ] item IDs unchanged
- [ ] section IDs unchanged
- [ ] existing values unchanged
- [ ] existing visibility unchanged
- [ ] custom section preserved
- [ ] custom item preserved
- [ ] source metadata preserved
- [ ] no semantic duplicates
- [ ] optimistic expected_updated_at
- [ ] conflict overwrite 금지
- [ ] idempotency
- [ ] second dry-run = no changes
- [ ] 9/9 successful or explicit skip reason
- [ ] failed rows reported
- [ ] rollback data/evidence 확보

---

## W. Golf DB Verification

- [ ] active Golf = 9
- [ ] details_json = 9
- [ ] version 1
- [ ] sections array
- [ ] canonical item metadata present
- [ ] exact duplicate title = 0
- [ ] semantic duplicate regression 없음
- [ ] Golf/content_sections overlap = 0
- [ ] QA markers = 0
- [ ] existing custom sections preserved
- [ ] no unexpected updated rows
- [ ] no inactive row accidental migration

---

## X. Production E2E — Load / Draft

- [ ] intended SHA deployed before test
- [ ] Production admin login
- [ ] safe Golf BEFORE snapshot
- [ ] `세부사항 수정` visible admin only
- [ ] common editor opens
- [ ] GET 200
- [ ] section labels load
- [ ] item labels load
- [ ] item values load
- [ ] section label temp edit
- [ ] item label temp edit
- [ ] item value temp edit
- [ ] new section temp add
- [ ] new item temp add
- [ ] visibility temp edit
- [ ] sort temp edit
- [ ] DB unchanged before `수정완료`
- [ ] no onBlur API write
- [ ] no toggle API write
- [ ] no sort API write
- [ ] no add/delete API write before save

---

## Y. Production E2E — Save Pipeline

- [ ] `수정완료` click
- [ ] validation step visible
- [ ] prepare step visible
- [ ] server save running visible
- [ ] conflict check actual result
- [ ] canonical read actual result
- [ ] revalidation actual result
- [ ] completion visible
- [ ] fake timed completion 없음
- [ ] duplicate submit blocked
- [ ] PUT 200 / expected response
- [ ] canonical updated_at received
- [ ] dirty count resets
- [ ] editor canonical state replaced

---

## Z. Production E2E — Public JSON Labels

- [ ] section label changed publicly
- [ ] item label changed publicly
- [ ] item value changed publicly
- [ ] global dynamic label does not overwrite JSON section label
- [ ] global dynamic label does not overwrite JSON item label
- [ ] custom section visible
- [ ] custom item visible
- [ ] visibility false hides
- [ ] sort reflected
- [ ] reload persists
- [ ] editor reopen persists

---

## AA. Typed Item E2E

- [ ] text field save/render
- [ ] textarea save/render
- [ ] boolean true save/render
- [ ] boolean false save/render
- [ ] number positive save/render
- [ ] number `0` save/render
- [ ] URL http save/render
- [ ] URL https save/render
- [ ] unsafe URL rejected
- [ ] list save/render
- [ ] empty list handling
- [ ] null handling
- [ ] empty string handling

---

## AB. Concurrency E2E

- [ ] Session A/B same T1
- [ ] A save
- [ ] A conflict=false
- [ ] T2 returned
- [ ] B no reload
- [ ] B stale save
- [ ] B conflict=true
- [ ] current_updated_at=T2
- [ ] conflict UI visible
- [ ] A DB value preserved
- [ ] B overwrite blocked
- [ ] B canonical reload
- [ ] conflict warning does not disappear immediately
- [ ] cleanup after conflict

---

## AC. Core vs Details Divergence Test

- [ ] core modal test field selected
- [ ] core temporary save
- [ ] core public reflected
- [ ] details_json variable data unchanged unexpectedly
- [ ] core cleanup
- [ ] details variable field selected
- [ ] details temp save
- [ ] JSON public reflected
- [ ] legacy independent write path cannot override public JSON
- [ ] details cleanup
- [ ] no logical field editable in two independent sources

---

## AD. Unsaved Changes E2E

- [ ] edit then close X
- [ ] unsaved confirmation appears
- [ ] cancel close preserves draft
- [ ] confirm close discards draft
- [ ] edit then cancel button
- [ ] unsaved confirmation
- [ ] clean close no confirm
- [ ] saving close blocked

---

## AE. Error E2E / Targeted Tests

- [ ] invalid label rejected
- [ ] duplicate key rejected
- [ ] invalid boolean rejected
- [ ] invalid number rejected
- [ ] unsafe URL rejected
- [ ] oversized payload rejected
- [ ] 401 behavior
- [ ] unknown entity behavior
- [ ] type mismatch behavior
- [ ] stale conflict behavior
- [ ] network/server failure preserves draft
- [ ] success toast not shown on failure
- [ ] raw DB error not exposed

---

## AF. Cleanup

- [ ] `[PHASE25_SECTION_LABEL]` = 0
- [ ] `[PHASE25_ITEM_LABEL]` = 0
- [ ] `[PHASE25_VALUE]` = 0
- [ ] `[PHASE25_SESSION_A]` = 0
- [ ] `[PHASE25_SESSION_B]` = 0
- [ ] typed test custom fields removed
- [ ] original JSON restored where test required restore
- [ ] public original state restored
- [ ] no test legacy rows
- [ ] no temporary DB objects
- [ ] no debug logs left
- [ ] no temporary feature flags left

---

## AG. Golf Public Regression

- [ ] `beppu_golf_amagase`
- [ ] `dos_golf_kaho`
- [ ] `dos_golf_winners`
- [ ] `dos_golf_forest_nankan`
- [ ] core title
- [ ] address
- [ ] phone
- [ ] Google Maps
- [ ] all JSON details
- [ ] labels
- [ ] values
- [ ] custom sections
- [ ] include/exclude
- [ ] FAQ
- [ ] sort
- [ ] visibility
- [ ] no duplicates
- [ ] no QA markers
- [ ] admin controls hidden when logged out

---

## AH. Cross-Type Regression

- [ ] Hotel public baseline unchanged
- [ ] `/dos/hotel/dos_hotel_holiday` PASS
- [ ] Restaurant list baseline unchanged
- [ ] `/dos/restaurant` PASS
- [ ] no Hotel details_json migration performed
- [ ] no Restaurant details_json migration performed
- [ ] no Attraction migration performed

---

## AI. Security / Secrets / RLS

- [ ] service_role not in client
- [ ] secret key not in client
- [ ] `NEXT_PUBLIC_` only browser-safe
- [ ] admin endpoint remains protected
- [ ] public read does not call protected mutation endpoint
- [ ] RLS not disabled
- [ ] grants not weakened
- [ ] RPC ACL secure
- [ ] RPC search_path secure
- [ ] security advisor checked
- [ ] no new security findings from Phase 2.5

---

## AJ. Performance / Query

- [ ] list page does not fetch full details_json unnecessarily
- [ ] detail page fetch only required data
- [ ] admin editor fetch one entity
- [ ] no N+1 introduced
- [ ] revalidate only changed entity/list
- [ ] no all-entity revalidation loop
- [ ] no unnecessary DB index added
- [ ] clone/diff acceptable for document size

---

## AK. Static Verification

- [ ] `npm run typecheck` PASS
- [ ] `npm run lint` executed
- [ ] pre-existing lint count recorded
- [ ] new lint errors = 0
- [ ] `npm run build` PASS
- [ ] `npm run verify:cms-schema` PASS
- [ ] `git diff --check` PASS
- [ ] no untracked temp files
- [ ] worktree expected state

---

## AL. Commit / Push / Deploy

- [ ] logical commits only
- [ ] no giant mixed commit
- [ ] no force push
- [ ] implementation final SHA recorded
- [ ] report commit recorded
- [ ] `git push origin main` success
- [ ] origin/main latest SHA verified
- [ ] Vercel intended SHA verified
- [ ] Vercel READY/SUCCESS
- [ ] Production test performed after intended SHA live
- [ ] same verification fail 2x retry guard respected

---

## AM. Documentation

- [ ] architecture documentation updated
- [ ] `AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md` updated
- [ ] `HOTEL_GOLF_RESTAURANT_CMS_FIX_TODO_QA.md` updated
- [ ] shared components documented
- [ ] core vs details ownership documented
- [ ] global definitions role documented
- [ ] per-entity label precedence documented
- [ ] save pipeline documented
- [ ] runtime validation documented
- [ ] migration/enrichment documented
- [ ] rollback documented
- [ ] remaining issues documented
- [ ] self-referential SHA avoided

---

## AN. Independent Verification Labels

- [ ] `CODE_VERIFIED = YES`
- [ ] `DB_VERIFIED = YES`
- [ ] `FUNCTION_VERIFIED = YES`
- [ ] `DEPLOY_VERIFIED = YES`

---

## AO. Final Gate

아래가 모두 참이어야 한다.

- [ ] Phase 2 Golf 기능 회귀 없음
- [ ] shared editor 사용
- [ ] shared renderer 사용
- [ ] shared pipeline 사용
- [ ] per-entity section label editable
- [ ] per-entity item label editable
- [ ] typed item values supported
- [ ] `false` preserved
- [ ] `0` preserved
- [ ] all detail changes draft-only
- [ ] one `수정완료` save
- [ ] unsaved guard
- [ ] optimistic concurrency
- [ ] canonical re-read
- [ ] targeted revalidation
- [ ] global label does not override migrated JSON
- [ ] no two writable sources for same logical variable detail
- [ ] Golf enrichment safe/idempotent
- [ ] Golf Production E2E PASS
- [ ] typed item E2E PASS
- [ ] concurrency E2E PASS
- [ ] cleanup PASS
- [ ] Golf regression PASS
- [ ] Hotel regression PASS
- [ ] Restaurant regression PASS
- [ ] security PASS
- [ ] static verification PASS
- [ ] Vercel SUCCESS
- [ ] intended deployed SHA matches
- [ ] Production smoke PASS

최종:

```text
PHASE_2_5_RESULT: COMPLETE
```

조건 미달:

```text
PHASE_2_5_RESULT: FIX_REQUIRED
```

검증/환경 blocker:

```text
PHASE_2_5_RESULT: BLOCKED
```
