# Phase 6 보정 — Agent 실행 지시서

## 실행 요청

이 문서를 읽고 Phase 6의 남아 있는 레거시 관리자 편집 경로를 최소 변경으로 제거하라. 계획만 제시하지 말고 구현과 가능한 검증까지 수행하라. 검증되지 않은 항목을 PASS로 기록하지 마라.

프로젝트: `D:\japan-chat-web`

점검 기준 커밋: `b9f40246d84181734495ce1d2ce7de984799108c`

Phase 6 이전 기준: `f5c673f423b954dbdd661cbbc402de7d7477aacd`

이 문서는 실행 지시서이며 수정 완료 보고서가 아니다. 아래 운영 조회 결과는 이전 점검 당시의 값이며 실행 시점에 다시 조회해야 한다.

## 1. 적용 규칙과 범위

1. 루트 `AGENTS.md`, `docs/agent/cms-data-model.md`, `docs/agent/verification.md`를 읽어라. 운영 DB를 조회할 때 `docs/agent/supabase.md`와 Supabase 스킬을 적용하라.
2. Next.js 코드를 수정하기 전에 설치된 `node_modules/next/dist/docs/`에서 관련 가이드를 읽어라.
3. 이미지·스크린샷·이미지 URL을 모델 요청이나 검증 증거로 사용하지 마라. DOM text, HTTP, 콘솔, 네트워크, SQL, 코드만 사용하라.
4. 시작 시 `git status --short`, `git rev-parse HEAD`를 확인하라. 기존 사용자 변경을 덮어쓰거나 정리하지 마라. 이전 점검에서 `AGENTS.md` 수정과 untracked 파일들이 있었다.
5. 이번 범위는 **레거시 편집 진입점 제거와 검증 보정**이다. DB 데이터·스키마·RLS·grants·인증 변경, 기존 API 삭제, CMS V2 구조 개편은 범위 밖이다.
6. 아래에서 명시하는 사용하지 않는 TSX 소스 삭제는 코드 정리이다. DB hard DELETE나 운영 콘텐츠 삭제를 실행하라는 뜻이 아니다.
7. 이미 승인된 범위의 코드 수정에 중복 승인을 요구하지 마라. 운영 배포는 현재 세션에 push/deploy 권한이 명시되어 있는지 확인하고 그 범위 안에서 수행하라. 배포 권한이 없더라도 로컬 수정·검증·리뷰 가능한 diff를 먼저 완성하라.

## 2. 정확한 문제와 근거

### 실제 Phase 6 명세 위치

`docs/AGENT_CMS_V2_PER_ENTITY_JSON_EDITOR.md:1880`의 `Phase 6 — Legacy UI retirement`:

- global LabelManager nav 제거 / Legacy 표시
- old ContentSections / Includes inline editing 제거
- old APIs unused 확인
- 별도 승인 없는 table drop 금지

`docs/HOTEL_GOLF_RESTAURANT_CMS_FIX_TODO_QA.md`만 읽고 Phase 6 완료를 판단하지 마라. 단계별 CMS V2 명세도 함께 대조하라.

### P1 — 관리자 상세 drawer에서 기존 API 쓰기가 여전히 가능

실제 호출 경로:

```text
src/app/admin/[area]/entities/page.tsx:23
  -> EntityList
src/components/admin/EntityList.tsx:499
  -> EntityDetailDrawer
src/components/admin/EntityDetailDrawer.tsx:668
  -> IncludesExcludesEditor
src/components/admin/EntityDetailDrawer.tsx:673
  -> ContentSectionsEditor
```

줄 번호는 기준 커밋 기준이다. 현재 파일에서 심볼을 재확인하라.

| 파일 | 함수 | 기존 API / method |
| --- | --- | --- |
| `src/components/admin/IncludesExcludesEditor.tsx:35` | `handleAdd` | `/api/admin/includes` POST |
| 같은 파일 `:57` | `handleUpdate` | `/api/admin/includes` PUT |
| 같은 파일 `:72` | `handleDelete` | `/api/admin/includes?id=...` DELETE |
| `src/components/admin/ContentSectionsEditor.tsx:36` | `handleAdd` | `/api/admin/content-sections` POST |
| 같은 파일 `:59` | `handleUpdate` | `/api/admin/content-sections` PUT |
| 같은 파일 `:74` | `handleDelete` | `/api/admin/content-sections?id=...` DELETE |

해당 컴포넌트들은 단순히 남아 있는 dead code가 아니다. 현재 라우트에서 import/render된다. `defaultOpen={false}`는 접힌 상태일 뿐, 호출 경로를 제거하지 않는다.

따라서 이전 보고의 `CONTENT_SECTIONS_WRITE_RUNTIME_CALLERS: 0`, `INCLUDES_WRITE_RUNTIME_CALLERS: 0`은 부정확하다. 공개 상세의 인라인 편집기만 제거하고 관리자 drawer를 놓친 상태다. CMS V2와 별개로 레거시 데이터가 편집되어 관리 경로가 이원화될 수 있다.

### 검증 보고의 문제

- build 성공은 공개 페이지의 실제 기능 회귀 PASS가 아니다.
- SQL을 실행하지 않았다는 사실만으로 작업 전후 운영 row count 동일을 증명할 수 없다.
- GitHub Vercel 체크 성공은 운영 도메인의 배포 SHA 일치 및 기능 정상과 별개다.
- `ATTRACTION` 실데이터가 없으면 실데이터 편집 E2E는 검증 불가다. 목록 empty state 검증과 분리하라.

## 3. 구현 지시 — 파일별 수정

### A. `src/components/admin/EntityDetailDrawer.tsx`

다음 import 두 개를 제거하라.

```tsx
import IncludesExcludesEditor from "@/components/admin/IncludesExcludesEditor";
import ContentSectionsEditor from "@/components/admin/ContentSectionsEditor";
```

다음 JSX 블록 두 개를 전체 제거하라.

```tsx
{/* ======== Includes/Excludes ======== */}
<Section title="포함/불포함 사항" icon="✅" defaultOpen={false}>
  <IncludesExcludesEditor
    entityId={entityId}
    initialItems={detail.includes_excludes}
    onUpdate={loadDetail}
  />
</Section>

{/* ======== Content Sections ======== */}
<Section title="추가 안내" icon="📝" defaultOpen={false}>
  <ContentSectionsEditor
    entityId={entityId}
    initialSections={detail.content_sections}
    onUpdate={loadDetail}
  />
</Section>
```

제거 위치는 동적 필드 섹션 다음, `Restaurant Locations` 섹션 이전이다. 두 블록 제거 후 인접한 JSX 계층을 확인하라.

이 drawer에 새 CMS V2 편집기를 중복 삽입하지 마라. 각 엔티티 공개 상세에 이미 연결된 `EntityDetailsEditor` 경로를 유지하라. 불필요한 안내 UI나 새 링크도 이번 수정에 추가하지 마라.

`EntityDetail` 인터페이스의 `includes_excludes`, `content_sections`는 서버 응답 계약을 표현하므로 그대로 유지해도 된다. 미사용이라는 이유만으로 조회 API 응답이나 server read를 삭제하지 마라.

`loadDetail`, 다른 편집기의 `onUpdate`, 기본정보·동적 필드·주변 시설·이동시간·엔티티 삭제 동작은 유지하라.

### B. 사용하지 않게 된 관리자 편집기 소스 정리

전체 호출 지점 확인이 필요한 작업이므로 다음 검색은 허용된다.

```powershell
rg -n 'ContentSectionsEditor|IncludesExcludesEditor' src
```

A 수정 후 다른 import/re-export/dynamic import/렌더 경로가 없는지 확인하라. 미사용임이 확인되면 다음 두 소스 파일을 삭제하라.

```text
src/components/admin/ContentSectionsEditor.tsx
src/components/admin/IncludesExcludesEditor.tsx
```

이것으로 `handleAdd`, `handleUpdate`, `handleDelete`의 기존 API 호출 코드도 제거된다. 다른 실제 호출자가 발견되면 해당 경로를 보고하고 동일한 레거시 편집 제거 범위인지 확인한 뒤 최소한으로 정리하라. 참조가 남은 상태에서 파일만 삭제하지 마라.

### C. 반드시 유지할 파일과 동작

```text
src/app/api/admin/content-sections/route.ts
src/app/api/admin/includes/route.ts
src/components/inline-cms/ContentSectionsRenderer.tsx
src/components/inline-cms/IncludeExcludeSection.tsx
src/app/admin/[area]/labels/page.tsx
```

- 기존 API route 파일과 인증 검사를 유지하라. 사용하지 않는다고 API를 삭제하거나 public으로 바꾸지 마라.
- 레거시 공개 읽기, visibility/sort 적용, 기존 데이터 표시를 유지하라.
- LabelManager의 일반 메뉴 제거와 직접 접근 페이지의 Legacy 표시를 유지하라.
- `src/app/[area]/{golf,hotel,restaurant}/[id]/*DetailClient.tsx` 및 attraction 상세의 CMS V2 editor 연결을 유지하라.
- server read 함수 `getContentSections`, `getIncludesExcludes`를 기존 admin HTTP API caller로 오분류하지 마라. 공개 읽기 함수는 유지 대상이다.

## 4. 운영 DB 검증 — SELECT만 실행

이전 점검에서 실제 연결된 프로젝트:

```text
name: japan-chat-web
project_id: hzmaypxlpzbnfkevpqss
```

실행 시 프로젝트 식별자와 대상 환경을 다시 확인하라. 다른 프로젝트에 추측으로 조회하지 마라. 키·토큰을 출력하지 마라.

다음 쿼리를 코드 변경 전과 검증 완료 후 각각 실행하고 조회 시각을 기록하라.

```sql
select 'content_sections' as table_name, count(*) as row_count
from public.content_sections
union all
select 'includes_excludes', count(*) from public.includes_excludes
union all
select 'field_definitions', count(*) from public.field_definitions
union all
select 'section_definitions', count(*) from public.section_definitions;
```

이전 점검 실측: 순서대로 `53 / 0 / 61 / 52`. 이것을 새 BEFORE 값으로 복사하지 마라. 동일 count는 row 내용 전체 동일의 증거가 아님을 명시하라.

다음은 별도 SQL 호출로 실행하라. 이전 도구는 여러 SELECT를 한 호출에 넣었을 때 마지막 결과만 반환했다.

```sql
select entity_type,
       count(*) as total,
       count(*) filter (where active) as active_count,
       count(*) filter (where details_json is not null) as with_details
from public.entities
group by entity_type
order by entity_type;
```

이전 점검에는 `ATTRACTION` 0건, HOTEL active 3건, GOLF active 9건, RESTAURANT active 11건이었다. Attraction E2E를 통과시키기 위해 임의 운영 데이터를 생성하지 마라. DB 접근이 불가능하면 실제 오류를 기록하고 DB 검증만 미확인으로 남겨라.

## 5. 정적 검증

### API 호출과 컴포넌트 연결 확인

```powershell
rg -n 'ContentSectionsEditor|IncludesExcludesEditor' src
rg -n 'api/admin/(content-sections|includes)' src
rg -n 'content-sections|/includes' src/components src/app
rg -n 'EntityDetailsEditor' src/app
git diff --check
npm run typecheck
npm run build
```

- 앞의 두 검색은 예상 결과가 0건이다. `rg` exit code 1은 no match이며 실패가 아니다.
- 넓은 문자열 검색 결과는 경로 조합·상수·간접 호출 여부를 사람이 판독하라. 단일 정규식 0건만으로 런타임 전체 0을 주장하지 마라.
- API route 파일 존재와 admin 인증 검사 유지도 코드로 확인하라.
- build 실패가 환경·인증·네트워크 때문이면 코드 결함과 구분하라. 통과시키려고 임의 코드 변경을 하지 마라.
- 같은 검증이 두 번 실패하면 세 번째 자동 재시도 금지. 아래 BLOCKED 형식으로 멈춰라.
- 큰 스위트나 새 테스트 프레임워크를 추가하지 마라. UI 제거 범위에 맞춘 정적 점검과 기존 빌드, 실제 DOM 검증을 수행하라.

## 6. 배포 확인과 읽기 전용 기능 검증

### 배포 확인

1. 수정 전 SHA, 수정 후 commit SHA, pushed SHA, 운영 deployed SHA를 별도 기록하라. 미커밋 상태면 SHA를 만들어 적지 마라.
2. GitHub 저장소는 `Sup-AI-Main/japan-chat-web`이다. 이전 `b9f4024`의 Vercel 체크는 점검 당시 success였다. 새 수정 커밋의 배포 성공을 뜻하지 않는다.
3. 운영 URL은 `https://japan-chat-web.vercel.app`이다.
4. 이전 CLI 조회는 기본 context `yyeonmis-projects`에서 배포를 찾지 못했다. GitHub 체크의 실제 배포 링크는 `supais-projects/japan-chat-web`이었다.
5. CLI help로 scope 옵션을 확인한 뒤, 해당 팀에 접근 가능한 연결에서 조회하라. 가능한 명령 예시는 다음과 같으며 인증/권한 없는 상태에서 반복하지 마라.

```powershell
vercel inspect --help
vercel inspect https://japan-chat-web.vercel.app --scope supais-projects
```

6. inspect 출력에 commit SHA가 없다면 READY만으로 SHA 일치를 추정하지 마라. 접근 가능한 Vercel deployment metadata 또는 동등한 읽기 전용 근거로 운영 alias가 의도한 commit을 가리키는지 확인하라.
7. SHA가 다르면 deployment mismatch/pending으로 기록하라. 그 상태의 운영 E2E를 최신 코드의 PASS/FAIL 증거로 사용하지 마라.

### 관리자 DOM / 네트워크 검증

로그인 가능한 승인된 세션을 사용하라. 브라우저 스킬을 읽고 이미지가 반환되지 않는 텍스트 전용 방식으로 수행하라.

1. `/admin/[area]/entities`에서 실제 엔티티를 열어 상세 drawer를 확인한다.
2. drawer의 `포함/불포함 사항`, `추가 안내` 레거시 편집 섹션과 추가·수정·삭제 버튼이 제거됐는지 확인한다.
3. drawer 열기·닫기·재열기와 페이지 reload 후에도 동일함을 확인한다.
4. 해당 흐름에서 `/api/admin/content-sections`, `/api/admin/includes` 요청이 발생하지 않는지 네트워크 기록으로 확인한다.
5. 다른 기본정보·동적 필드·주변 시설·이동시간 UI가 유지됐는지 확인한다. 이번 검증을 위해 저장·삭제를 누르지 마라.
6. 일반 관리자 메뉴에 LabelManager 링크가 없고 직접 legacy 페이지에는 Legacy 안내가 있는지 확인한다.
7. 실제 GOLF/HOTEL/RESTAURANT 상세에서 CMS V2 세부사항 editor를 열고 기존 데이터가 로드되는지 확인한다. 저장 없이 닫는다.

### 공개 회귀

- 실제 존재하는 GOLF/HOTEL/RESTAURANT URL을 DB 또는 목록에서 선택한다. HTTP 상태와 DOM의 주요 콘텐츠를 확인하고 reload 후 재확인한다.
- 예전 URL을 사용할 경우 현재 존재 여부부터 확인한다. 대표 과거 URL: `/dos/golf/dos_golf_kaho`, `/dos/hotel/dos_hotel_holiday`.
- 레거시 공개 읽기 보존은 데이터가 있는 실제 표본에서 확인한다. `includes_excludes=0`이면 비어 있는 상태만 검증할 수 있으므로 비어 있지 않은 데이터 렌더링까지 PASS로 적지 마라.
- Attraction 목록이 비어 있는 상태는 실제 DOM으로 확인한다. 운영 Attraction 실데이터 editor E2E와 분리한다.
- hydration 오류, 콘솔 오류, 실패한 관련 네트워크 요청을 텍스트로 기록한다.
- 이번 수정은 편집 제거이다. 기존 CMS V2 저장/충돌 처리 전체 E2E까지 수행했다고 주장하지 마라.

## 7. 완료 보고 및 중단 형식

`docs/PHASE_6_CORRECTION_QA.md`에 실제 결과를 기록하라. 과거 보고를 근거 없이 PASS로 재사용하지 마라. 다음 항목을 포함하라.

```text
AGENTS.md_APPLIED:
BASELINE_SHA:
IMPLEMENTATION_SHA:
PUSHED_SHA:
DEPLOYED_PRODUCTION_SHA:
PRODUCTION_SHA_MATCH:

DRAWER_LEGACY_EDITORS_REMOVED:
UNUSED_LEGACY_EDITOR_FILES_REMOVED:
CONTENT_SECTIONS_GET_UI_CALLERS:
CONTENT_SECTIONS_WRITE_UI_CALLERS:
INCLUDES_GET_UI_CALLERS:
INCLUDES_WRITE_UI_CALLERS:
OLD_API_FILES_AND_AUTH_RETAINED:
PUBLIC_READ_RETAINED:
CMS_V2_EDITOR_CONNECTIONS_RETAINED:

DB_QUERY_TIME_BEFORE:
DB_COUNTS_BEFORE:
DB_QUERY_TIME_AFTER:
DB_COUNTS_AFTER:
DB_COUNTS_UNCHANGED:
PRODUCTION_DATA_WRITES: NONE

TYPECHECK:
BUILD:
ADMIN_DRAWER_DOM_AND_RELOAD:
LEGACY_API_NETWORK_CALLS_DURING_TEST:
GOLF_PUBLIC:
HOTEL_PUBLIC:
RESTAURANT_PUBLIC:
ATTRACTION_EMPTY_STATE:
ATTRACTION_REAL_DATA_E2E:

CODE_VERIFIED:
DB_VERIFIED:
FUNCTION_VERIFIED:
DEPLOY_VERIFIED:
PHASE_6_RESULT:
PHASE_6_CLOSED:
```

각 결과에 명령·조회·파일·DOM/HTTP 근거를 붙여라. `DB_VERIFIED`는 이번 읽기 전용 count 검증 범위임을 명시하라. 네 개 VERIFIED 라벨은 독립적으로 판정하라. 운영 검증이 남으면 `PHASE_6_CLOSED: NO`로 기록하라. Phase 5의 Attraction 실데이터 blocker는 별도 유지하라.

같은 검증 두 번 실패 또는 필요한 접근 권한 부재로 검증이 막히면 다음을 포함하라.

```text
STATUS: BLOCKED
FAILED_COMMAND_OR_REQUEST: 정확한 명령 또는 요청
HTTP_STATUS: 실제 상태 또는 N/A
STDERR_OR_ERROR: 민감정보를 제거한 실제 오류
CONFIRMED: 이미 확인한 사실
UNKNOWN: 아직 확인하지 못한 사실
NEXT_ACTION: 진행에 필요한 다음 조치 정확히 한 가지
```

최종 답변은 수정 파일과 핵심 결과, 미검증 항목, QA 문서 경로를 간결하게 전달하라. 실패한 환경 검증을 숨기거나 Phase 6을 조기 종료하지 마라.
