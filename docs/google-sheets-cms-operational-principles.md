# Google Sheets CMS 연동 및 cms_schema 운영 원칙

## 목적

현재 CMS는 Google Sheets를 실제 데이터 저장소로 사용합니다.

앞으로 Agent가 다음과 같은 작업을 할 때:

* 카테고리 추가
* 골프장/호텔/맛집 정보 수정
* 새로운 안내 필드 추가
* content section 추가
* FAQ 추가
* include / exclude 수정
* travel time 수정
* 새로운 Google Sheet column 추가

매번 프로젝트 전체 코드를 다시 분석하거나 Google Sheet 구조를 추측하지 않도록 명확한 운영 규칙을 유지합니다.

핵심은 다음 두 가지입니다.

```text
Google Sheets API
= 실제 데이터를 수정하는 수단

cms_schema
= 어떤 데이터를 어디에서 수정해야 하는지 알려주는 데이터 위치 지도
```

둘은 서로 대체 관계가 아닙니다.

---

# 1. Google Sheets API의 역할

Agent 실행 환경에 다음 중 하나가 정상적으로 연결되어 있다면 Agent는 Google Sheet를 직접 수정할 수 있습니다.

* Google Service Account
* Google OAuth
* Google Sheets API
* 현재 프로젝트에서 사용하는 Google credentials

구조:

```text
Agent
→ Google Sheets API
→ 실제 Google Spreadsheet
→ 실제 row / column 수정
```

따라서 사람이 직접 Google Sheet를 열어서 모든 데이터를 수정할 필요는 없습니다.

Agent가 API 권한을 가지고 있다면 실제 데이터 변경은 Agent가 수행할 수 있습니다.

---

# 2. cms_schema의 역할

`cms_schema`는 Google Sheets API 인증이나 연결을 위한 문서가 아닙니다.

`cms_schema`의 역할은:

> Agent가 어떤 데이터가 어느 Sheet, 어느 column, 어느 route, 어느 코드 함수와 연결되어 있는지 즉시 파악할 수 있도록 하는 데이터 위치 지도

입니다.

예:

```text
사용자 요청:
"골프장 코스 안내 수정해"

Agent:

cms_schema 조회

→ entity = golf_courses
→ sheet_name = golf_courses
→ field_key = course_summary
→ physical_column = 코스요약
→ route_path = /[area]/golf/[id]
→ data_access_function = getGolfCourseById

→ Google Sheets API로 실제 row 수정
```

---

# 3. 최종 구조

전체 CMS 데이터 흐름은 다음 구조를 유지합니다.

```text
Google Sheet
    ↓
google-sheets.ts
    ↓
header normalization
    ↓
HEADER_ALIASES
    ↓
canonical field key
    ↓
typed model
    ↓
page / API
    ↓
client UI
```

관리자 수정:

```text
Admin UI
    ↓
API
    ↓
canonical field_key
    ↓
physical Sheet column resolution
    ↓
Google Sheets API WRITE
    ↓
updated row
    ↓
client local state update
    ↓
Toast
```

---

# 4. cms_schema 필수 컬럼

`cms_schema`는 최소 다음 정보를 유지해야 합니다.

| Field                | 설명                      |
| -------------------- | ----------------------- |
| entity               | 데이터 entity              |
| sheet_name           | 실제 Google Sheet tab 이름  |
| field_key            | 코드에서 사용하는 canonical key |
| physical_column      | 실제 Google Sheet header  |
| display_label        | 관리자 UI 표시명              |
| primary_key          | primary key 여부          |
| relation_target      | 다른 entity와 관계가 있을 경우 대상 |
| route_path           | 해당 데이터가 사용되는 route      |
| data_access_function | 데이터를 읽는 주요 함수           |
| description          | 필드 용도 설명                |

선택:

| Field        | 설명            |
| ------------ | ------------- |
| column_index | 참고용 column 번호 |

중요:

```text
column_index는 source of truth가 아닙니다.

physical_column 이름이 source of truth입니다.
```

---

# 5. Agent의 데이터 수정 기본 절차

앞으로 Agent는 Google Sheet 관련 작업을 수행할 때 반드시 다음 순서를 따릅니다.

## STEP 1 — cms_schema 확인

먼저 대상 데이터를 확인합니다.

확인 항목:

```text
entity
sheet_name
field_key
physical_column
primary_key
relation_target
route_path
data_access_function
```

Google Sheet 구조를 추측하지 않습니다.

---

## STEP 2 — 실제 Sheet 구조 확인

필요한 경우 Google Sheets API를 통해 실제 header와 row를 확인합니다.

특히 다음 작업에서는 실제 Sheet를 반드시 확인합니다.

```text
새 category 생성
새 field 생성
새 column 생성
새 content section 구조 생성
relation 추가
schema 변경
migration
```

---

## STEP 3 — Google Sheets API로 수정

실제 데이터 수정은 Google Sheets API를 사용합니다.

예:

```text
cms_schema 확인
→ 대상 Sheet 결정
→ primary key로 row 탐색
→ physical_column 확인
→ 해당 cell 업데이트
```

---

## STEP 4 — 필요 시 cms_schema 동기화

다음 변경이 발생하면 `cms_schema`도 같은 작업에서 반드시 갱신합니다.

```text
새 field 추가
새 column 추가
column 이름 변경
새 entity 추가
새 relation 추가
새 route 추가
data access function 변경
새 Sheet tab 생성
```

단순 row 내용 수정은 `cms_schema` 수정이 필요하지 않습니다.

---

## STEP 5 — 검증

변경 후:

```bash
npm run verify:cms-schema
```

를 실행합니다.

필요하면 실제 WRITE → READ 검증도 수행합니다.

---

# 6. Google Sheet 구조를 추측하지 말 것

Agent는 다음과 같이 행동하면 안 됩니다.

잘못된 방식:

```text
"새 카테고리니까 새 Sheet tab을 만들겠습니다."
```

이렇게 임의 판단하지 않습니다.

먼저 현재 category 저장 구조를 확인합니다.

예:

```text
모든 category가 admin_options 한 Sheet의 row 기반
```

이라면 신규 category도 같은 방식으로 추가합니다.

반대로 실제 프로젝트가 category별 별도 Sheet tab 구조라면 동일한 방식으로 생성합니다.

최우선 원칙:

```text
기존 데이터 구조와 동일하게 생성
```

---

# 7. canonical field_key 원칙

코드 내부에서는 가능한 한 Google Sheet의 실제 한글 header를 직접 사용하지 않습니다.

잘못된 예:

```ts
row["코스요약"]
row["조식"]
row["공식명"]
```

권장:

```ts
row.course_summary
row.breakfast
row.official_name
```

Google Sheet physical header와 코드 key의 연결은 normalization layer에서 처리합니다.

---

# 8. HEADER_ALIASES 역할

현재 Google Sheet에는 한글/영문 header가 혼합되어 있으므로 `HEADER_ALIASES`는 유지합니다.

예:

```text
course_summary ↔ 코스요약
breakfast ↔ 조식
official_name ↔ 공식명
```

목표 구조:

```text
Raw Google Sheet header
→ normalize header
→ HEADER_ALIASES
→ canonical object
→ entity mapper
```

UI/business code가 physical Sheet header를 알 필요가 없게 합니다.

---

# 9. HEADER_ALIASES는 단일 위치에서만 관리

한글/영문 compatibility mapping은 한 곳에만 유지합니다.

금지:

```ts
row.course_summary || row["코스요약"]
```

또 다른 파일:

```ts
row["코스요약"] ?? row.course_summary
```

또 다른 helper:

```ts
resolveLegacyGolfHeader(...)
```

이런 식의 개별 fallback을 만들지 않습니다.

최종 원칙:

```text
HEADER_ALIASES
= physical header compatibility의 single source of truth
```

---

# 10. 빈 문자열 처리 중요

field resolution에서 다음처럼 falsy 체크하지 않습니다.

잘못된 예:

```ts
if (value) return value;
```

이 방식은 관리자가 의도적으로 빈 문자열을 저장했을 때 과거 alias 값이 다시 살아날 수 있습니다.

예:

```text
course_summary = ""
코스요약 = "예전 값"
```

이 상태에서 falsy fallback을 사용하면 `"예전 값"`이 다시 표시될 수 있습니다.

따라서 존재 여부를 기준으로 처리합니다.

예:

```ts
if (Object.prototype.hasOwnProperty.call(row, key)) {
  return row[key] ?? "";
}
```

반드시 아래 값을 정상값으로 보존해야 합니다.

```text
""
"0"
"0분"
"FALSE"
```

---

# 11. Content Sections 원칙

자유 형식 설명 콘텐츠는 가능한 한 `content_sections`를 사용합니다.

예:

```text
골프장 안내사항
추가 안내
복장 안내
렌탈 안내
식사 안내
목욕/샤워 안내
기타 사용자 정의 안내
```

구조:

```text
content_sections
→ dynamic descriptive content
```

하지만 다음 structured field는 유지합니다.

```text
id
area
name
address
phone
maps URL
status
active
sort
```

즉 structured entity data와 자유 설명 content를 구분합니다.

---

# 12. 새로운 필드 추가 시

예:

사용자 요청:

```text
"골프장 안내에 캐디피 안내를 추가해"
```

Agent는 바로 코드부터 수정하지 않습니다.

먼저:

```text
1. cms_schema 확인
2. 기존 golf_courses 구조 확인
3. structured field인지 content_sections인지 판정
4. 필요한 Sheet 구조 확인
```

자유 설명이라면 가능한 한:

```text
content_sections
```

로 처리합니다.

정말 별도의 structured field가 필요한 경우에만:

```text
새 physical column
+ canonical field_key
+ HEADER_ALIASES 필요 여부
+ cms_schema row
+ typed model
```

을 함께 추가합니다.

---

# 13. 새로운 Category 추가 시

새 category라고 해서 자동으로 새 Google Sheet tab을 만들지 않습니다.

먼저:

```text
admin_options
category storage structure
area/common group structure
route generation structure
```

를 확인합니다.

현재 구조가 row 기반이라면:

```text
기존 Sheet에 새로운 row 추가
```

합니다.

동적 route가 이미 data-driven이면 별도 Next.js route 파일을 생성하지 않습니다.

---

# 14. Sheet 구조 변경 시 반드시 같이 갱신할 것

다음 항목 중 하나라도 변경되면 관련 문서/코드를 같이 갱신합니다.

```text
physical column
field_key
Sheet tab
entity
relation
route
data access function
typed model
```

특히:

```text
Google Sheet만 수정
코드만 수정
cms_schema만 수정
```

처럼 일부만 변경한 상태로 작업을 끝내지 않습니다.

---

# 15. verify:cms-schema 역할

`verify:cms-schema`는 다음을 검증해야 합니다.

```text
cms_schema에 정의된 Sheet 존재 여부
physical_column 존재 여부
필수 schema column 존재 여부
잘못된 field mapping 여부
누락된 entity 여부
```

가능하면 다음도 확인합니다.

```text
primary key 존재
중복 primary key
relation target 존재
```

---

# 16. 일반 runtime에서 cms_schema를 읽지 말 것

`cms_schema`는 일반 사용자 페이지 렌더링용 데이터가 아닙니다.

최종 원칙:

```text
cms_schema
→ verification
→ migration
→ documentation
→ Agent navigation
```

일반 사용자 runtime:

```text
Google Sheet
→ typed read
→ page/API
```

따라서 일반 page request마다 `cms_schema`를 읽는 구조를 만들지 않습니다.

---

# 17. Agent가 항상 따라야 하는 규칙

Google Sheet 관련 변경 작업 전 다음을 준수하세요.

```text
1. Google Sheet 구조를 추측하지 않는다.

2. cms_schema를 먼저 확인한다.

3. entity / sheet_name / field_key / physical_column을 확인한다.

4. 기존 데이터 저장 방식을 그대로 따른다.

5. 실제 데이터 변경은 Google Sheets API로 수행한다.

6. 코드에서는 canonical field_key를 사용한다.

7. physical Sheet header 접근은 normalization layer 밖으로 새지 않게 한다.

8. 새로운 schema 구조가 생기면 cms_schema도 같이 갱신한다.

9. 단순 row 내용 수정 시 cms_schema를 불필요하게 변경하지 않는다.

10. 변경 후 verify:cms-schema를 실행한다.

11. 중요한 CREATE / migration / schema 변경은 WRITE → READ 검증한다.

12. 일반 UPDATE는 불필요하게 과도한 read-back을 반복하지 않는다.
```

---

# 18. 사용자가 요청했을 때 Agent가 판단하는 방식

## 예 1

사용자:

```text
호텔 조식 내용을 바꿔줘.
```

Agent:

```text
cms_schema
→ hotels
→ breakfast
→ physical column = 조식
→ 대상 hotel id 조회
→ Google Sheets API UPDATE
→ 결과 확인
```

---

## 예 2

사용자:

```text
골프장에 새로운 안내사항 추가해줘.
```

Agent:

```text
기존 content_sections 구조 확인
→ descriptive content라면 content_sections에 row 생성
→ 새로운 golf_courses column 생성하지 않음
```

---

## 예 3

사용자:

```text
새 카테고리 만들어줘.
```

Agent:

```text
기존 category storage 구조 확인
→ admin_options row 기반이면 row 추가
→ 새로운 Sheet tab 임의 생성 금지
```

---

# 19. 최종 책임 분리

## Google Sheets API

역할:

```text
실제 데이터 읽기
실제 데이터 쓰기
row 생성
row 수정
row 삭제
header 확인
```

---

## cms_schema

역할:

```text
데이터 위치 지도
Sheet 구조 문서
canonical ↔ physical mapping 설명
route 연결 설명
code access function 설명
Agent navigation
schema verification 기준
```

---

## HEADER_ALIASES

역할:

```text
한글/영문 physical header compatibility
```

---

## google-sheets.ts

역할:

```text
Google Sheet raw data
→ canonical typed data 변환
```

---

## content_sections

역할:

```text
동적으로 추가/삭제/수정 가능한 설명형 콘텐츠
```

---

# 20. 최종 Architecture

```text
                 ┌─────────────────────┐
                 │     cms_schema      │
                 │  Data Location Map  │
                 └──────────┬──────────┘
                            │
                     Agent 참고/검증
                            │
                            ▼
┌─────────────────────────────────────────────┐
│                Google Sheets                │
│                                             │
│ golf_courses                                │
│ hotels                                      │
│ restaurants                                 │
│ admin_options                               │
│ content_sections                            │
│ includes_excludes                           │
│ travel_times                                │
│ faq                                         │
└──────────────────────┬──────────────────────┘
                       │
                 Google Sheets API
                       │
                       ▼
              google-sheets.ts
                       │
                       ▼
             normalizeHeaders()
                       │
                       ▼
              HEADER_ALIASES
                       │
                       ▼
                canonical row
                       │
                       ▼
                 typed model
                       │
                ┌──────┴──────┐
                ▼             ▼
             Page/API      Admin API
                              │
                              ▼
                       Google Sheet WRITE
                              │
                              ▼
                      updated client state
```

---

# 21. 최종 원칙

가장 중요한 원칙은 다음입니다.

```text
Google Sheets API는 "손"이다.

cms_schema는 "지도"다.
```

API만 있어도 데이터는 수정할 수 있지만, 구조 문서가 없으면 Agent가 매번 위치와 관계를 다시 분석해야 합니다.

cms_schema만 있어도 구조는 알 수 있지만, API 권한이 없다면 실제 Google Sheet를 수정할 수 없습니다.

따라서 현재 프로젝트는 반드시:

```text
Google Sheets API
+
cms_schema
+
HEADER_ALIASES
+
verify:cms-schema
```

조합을 유지합니다.

이 구조를 앞으로 모든 CMS 확장 작업의 기본 규칙으로 사용하세요.