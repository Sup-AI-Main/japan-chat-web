# 일본 골프 여행 가이드 관리자/CMS 전면 개편 개발 명세서

> 목적: 현재의 인라인 편집 기능과 `/admin` 관리자 페이지를 하나의 일관된 CMS로 재구성한다.  
> 핵심 원칙은 **실제 사용자 화면에서는 보이는 값을 직관적으로 편집**하고, **관리자 페이지에서는 모든 데이터를 표/필터/상세 편집 UI로 한눈에 관리**하는 것이다.  
> 지역, 카테고리, 골프장, 호텔, 음식점, FAQ, 추가 안내, 상세 필드 등 모든 관리 대상은 DB 기반으로 동적으로 확장할 수 있어야 한다.

---

# 1. 최종 목표

현재 시스템은 관리자 로그인 후 실제 사용자 화면에서 편집하는 방식과 `/admin` 내부 관리 방식이 중복되어 있고, 일부 기능이 서로 다른 UI/CRUD 흐름을 사용하면서 혼란과 오류가 발생하고 있다.

이번 개편에서는 다음 목표를 반드시 달성한다.

1. 관리자 로그인 상태에서는 실제 사용자 화면의 **보이는 모든 관리 대상 콘텐츠를 즉시 편집**할 수 있다.
2. `/admin`에서는 지역별 데이터를 **표 기반으로 조회/검색/필터/추가/수정/삭제/정렬/노출 제어**할 수 있다.
3. 홈 화면과 관리자 페이지에서 수정하는 데이터는 반드시 **동일 DB / 동일 CRUD 레이어 / 동일 검증 로직**을 사용한다.
4. 도스/벳푸 외에 새로운 지역을 코드 수정 없이 추가할 수 있어야 한다.
5. 새로운 카테고리를 코드 수정 없이 추가할 수 있어야 한다.
6. 호텔/골프장/음식점 등 기존 타입에 새로운 상세 필드를 자유롭게 추가할 수 있어야 한다.
7. 기존 상세 필드를 다른 호텔/골프장/음식점에서도 재사용할 수 있어야 한다.
8. 새로 만든 상세 필드는 현재 항목만 / 특정 카테고리 / 특정 지역 / 전체에서 재사용 가능하도록 범위를 지정할 수 있어야 한다.
9. 모든 변경사항은 실제 DB에 저장되어야 한다.
10. 관리자 UI는 한국인 매니저가 쉽게 사용할 수 있도록 **가독성, UX, 모바일 대응, 실수 방지**를 우선한다.
11. 기존의 `Unexpected end of JSON input` 같은 CRUD 응답 오류를 제거한다.
12. 기존 데이터를 손실하지 않고 migration 가능해야 한다.

---

# 2. 가장 중요한 설계 원칙

## 2.1 Single Source of Truth

관리자 홈 인라인 편집과 `/admin` 표 편집은 서로 다른 저장 시스템을 사용하면 안 된다.

반드시 아래 구조를 사용한다.

```text
실제 사용자 화면 관리자 편집
            ↓
공통 CRUD / Service Layer
            ↓
         Supabase DB
            ↑
공통 CRUD / Service Layer
            ↑
/admin 관리자 표 편집
```

Google Sheet가 계속 필요한 경우에도 DB와 별개로 직접 각각 수정하지 않는다.

권장:

```text
Supabase DB = Source of Truth
      ↓
웹사이트 렌더링
관리자 수정
      ↓
필요한 경우 Google Sheet Sync
```

---

## 2.2 홈 편집과 관리자 페이지 역할

### 실제 사용자 화면

실제 화면을 보면서 수정하기 좋은 항목을 편집한다.

예:

- 지역명
- 지역 설명
- 카테고리명
- 골프장/호텔/음식점 카드 내용
- 주소
- 전화번호
- 지도 링크
- 이미지
- 포함사항
- 불포함사항
- FAQ
- 추가 안내
- 대표 메뉴
- 이동시간
- 영업시간
- 기타 사용자에게 노출되는 상세 데이터

관리자 로그인 시 해당 콘텐츠 옆에 최소한 다음 컨트롤을 제공한다.

```text
✏️ 수정
👁 표시/숨김
🗑 삭제
```

컨테이너 단위로 새로운 콘텐츠를 추가할 수 있는 곳은 `+ 추가`를 제공한다.

단, UX 혼란을 막기 위해 단순한 `+ 추가` 대신 의미를 명확히 한다.

예:

```text
+ 음식점 추가
+ 안내 항목 추가
+ FAQ 추가
+ 상세 필드 추가
```

---

### `/admin` 관리자 페이지

데이터 전체를 빠르게 관리하는 곳이다.

주요 기능:

- 표 형태 데이터 관리
- 검색
- 지역 필터
- 카테고리 필터
- 타입 필터
- 노출/숨김 필터
- 정렬
- 새 항목 추가
- 일괄 수정
- 삭제
- 복구 가능 구조
- 상세 편집 Drawer/Modal
- 기존 필드 선택
- 새 필드 생성
- 순서 변경

---

# 3. 관리자 전체 IA

권장 구조:

```text
/admin
├─ 대시보드
│  ├─ 사용자 홈으로
│  ├─ 지역 수
│  ├─ 골프장 수
│  ├─ 호텔 수
│  ├─ 음식점 수
│  ├─ FAQ 수
│  └─ 최근 수정
│
├─ 지역 관리
│  ├─ 도스
│  ├─ 벳푸
│  ├─ 신규 지역...
│  └─ + 지역 추가
│
├─ 콘텐츠 관리
│  ├─ 전체
│  ├─ 골프장
│  ├─ 호텔
│  ├─ 음식점
│  ├─ FAQ
│  ├─ 추가 안내
│  └─ 이동시간
│
├─ 카테고리 관리
│  ├─ 지역 카테고리
│  ├─ 공통 카테고리
│  └─ + 카테고리 추가
│
├─ 필드 관리
│  ├─ 전체 필드
│  ├─ 골프장 필드
│  ├─ 호텔 필드
│  ├─ 음식점 필드
│  └─ + 새 필드 만들기
│
├─ 숨김/삭제 항목
│  ├─ 숨김 콘텐츠
│  └─ 삭제 콘텐츠 복구
│
└─ 시스템
   ├─ DB 상태
   ├─ 동기화 상태
   └─ 변경 로그
```

---

# 4. `/admin` 상단 네비게이션 개선

현재 관리자 페이지에서 홈으로 돌아가는 동선이 명확하지 않다.

반드시 상단에 다음을 제공한다.

```text
🏠 사용자 홈
📊 관리자 대시보드
🔄 새로고침
로그아웃
```

관리자 페이지 안에서는 `⚙️ 관리자 메뉴` 버튼을 중복 노출하지 않는다.

실제 사용자 화면에서는 관리자 로그인 상태일 때만:

```text
⚙️ 관리자 메뉴
```

를 표시한다.

---

# 5. 지역 관리

도스/벳푸 하드코딩 금지.

관리자는 새로운 지역을 추가할 수 있어야 한다.

예:

```text
+ 지역 추가
```

입력 필드 예시:

- region_code
- 한국어 지역명
- 일본어 지역명
- 영문명
- 대표 이모지/아이콘
- 설명
- 배경 이미지
- 표시 여부
- 표시 순서
- slug

예:

```text
한국어: 후쿠오카
일본어: 福岡
영문: Fukuoka
slug: fukuoka
아이콘: 🏯
```

## 신규 지역 생성 시

기본 구조를 선택적으로 생성할 수 있게 한다.

```text
기본 카테고리 생성
☑ 골프장
☑ 호텔
☑ 음식점
☑ FAQ
☑ 추가 안내
```

하지만 실제 데이터는 빈 상태로 둔다.

---

# 6. 카테고리 관리

카테고리도 하드코딩하지 않는다.

관리 가능 필드:

- id
- category_key
- 한국어 이름
- 설명
- 아이콘
- scope
- region_id nullable
- sort_order
- visible
- active

scope 예시:

```text
AREA
COMMON
```

관리자는:

- 기존 카테고리 수정
- 이름 변경
- 아이콘 변경
- 순서 변경
- 숨김
- 삭제
- 신규 카테고리 생성

모두 가능해야 한다.

---

# 7. 콘텐츠 Entity 구조

호텔/골프장/음식점 등은 공통 Entity 모델을 기반으로 관리한다.

권장 개념:

```text
entities
- id
- region_id
- category_id
- entity_type
- name_ko
- name_ja
- name_en
- short_description
- description
- image_key
- sort_order
- visible
- is_deleted
- created_at
- updated_at
```

예:

```text
도스
  → 골프장
      → 카호
      → 위너스

도스
  → 호텔
      → XXX 호텔

도스
  → 음식점
      → SAGAごはん THE GARDEN
```

---

# 8. 핵심 기능: 동적 상세 필드 시스템

이 기능은 반드시 구현한다.

관리자가 호텔/골프장/음식점 등의 상세 데이터를 편집할 때 **정해진 필드만 수정할 수 있는 구조로 만들지 않는다.**

관리자는 항상:

```text
+ 기존 필드 추가
+ 새 필드 만들기
```

두 옵션을 사용할 수 있어야 한다.

---

# 9. 기존 필드 선택

예를 들어 골프장 상세 편집 화면에서:

```text
+ 기존 필드 추가
```

선택 시 검색 가능한 Field Picker를 보여준다.

예:

```text
검색...

□ 주소
□ 전화번호
□ Google Maps
□ 이동시간
□ 홀 수
□ Par
□ 캐디
□ 카트
□ 렌탈클럽
□ 복장 규정
□ 조식
□ 픽업
□ 체크인
□ 체크아웃
□ 대표 메뉴
□ 영업시간
```

선택한 필드를 현재 Entity에 연결한다.

---

# 10. 새 필드 만들기

어느 호텔/골프장/음식점에서도 새로운 필드를 생성할 수 있어야 한다.

예:

```text
필드명: 렌탈 슈즈
필드 key: rental_shoes
타입: text
아이콘: 👟
```

## 지원 타입

최소 다음 타입을 지원한다.

```text
text
textarea
number
currency
url
phone
email
time
date
boolean
select
multi_select
image
image_gallery
map_url
rich_text
```

추후 확장 가능해야 한다.

---

# 11. 새 필드 적용 범위

새 필드를 만들 때 반드시 범위를 지정할 수 있어야 한다.

```text
○ 현재 항목만
○ 현재 카테고리 전체
○ 현재 지역 전체
○ 모든 지역의 동일 카테고리
○ 전체 공용 필드
```

예:

`캐디` → 모든 골프장 공용

`무료 라운지 운영시간` → 특정 호텔만

`한국어 메뉴 제공` → 음식점 전체 공용

---

# 12. Field Definition DB 권장 구조

```text
field_definitions
- id
- field_key
- label_ko
- label_ja
- label_en
- field_type
- icon
- reusable
- scope_type
- scope_region_id nullable
- scope_category_id nullable
- options_json nullable
- validation_json nullable
- sort_order
- active
- created_at
- updated_at
```

실제 값은 별도 저장:

```text
entity_field_values
- id
- entity_id
- field_definition_id
- value_text nullable
- value_json nullable
- sort_order
- visible
- created_at
- updated_at
```

---

# 13. 관리자 표 UI

모든 지역별 데이터는 표로 볼 수 있어야 한다.

## Entity 목록

예:

| 선택 | 타입 | 이름 | 지역 | 카테고리 | 상태 | 순서 | 최근수정 | 작업 |
|---|---|---|---|---|---|---:|---|---|
| □ | 골프장 | 카호 | 도스 | 골프장 | 표시 | 1 | ... | 수정 / 숨김 / 삭제 |
| □ | 골프장 | 위너스 | 도스 | 골프장 | 표시 | 2 | ... | 수정 / 숨김 / 삭제 |
| □ | 호텔 | ... | 도스 | 호텔 | 표시 | 1 | ... | 수정 / 숨김 / 삭제 |

표 위에는:

```text
[검색................]
[지역 ▼] [카테고리 ▼] [타입 ▼] [표시상태 ▼]

+ 새 항목 추가
```

---

# 14. 표에 모든 필드를 다 넣지 말 것

모든 필드를 한 가로 표에 넣으면 UX가 나빠진다.

표는 요약 정보를 보여주고, `수정` 클릭 시 오른쪽 Drawer 또는 큰 Modal을 열어 전체 필드를 수정한다.

권장:

```text
[카호] [도스] [골프장] [표시중] [수정]
```

수정 클릭:

```text
┌─────────────────────────────┐
│ 카호 골프클럽 수정          │
│                             │
│ 기본 정보                    │
│ 상세 정보                    │
│ 지도 / 연락처               │
│ 포함사항                    │
│ 불포함사항                  │
│ FAQ                         │
│ 추가 안내                    │
│ 이미지                      │
│ 노출 설정                    │
│                             │
│ + 기존 필드 추가            │
│ + 새 필드 만들기            │
│                             │
│ 취소        저장             │
└─────────────────────────────┘
```

Desktop: 우측 Drawer 권장  
Mobile: Full-screen Sheet 권장

---

# 15. FAQ 관리

현재 골프장 질문/호텔 질문/음식점 질문 등을 별도 화면에서 관리하고 있으므로, 이를 표 기반으로 통합한다.

예:

| 지역 | 질문 카테고리 | 질문 | 답변 | 표시 | 순서 | 작업 |
|---|---|---|---|---|---:|---|
| 도스 | 골프장 질문 | 골프장 지정 가능? | ... | ON | 1 | 수정 / 삭제 |

필터:

```text
지역
질문 카테고리
노출 여부
검색
```

질문 카테고리 자체도 DB 기반으로 추가/수정/삭제 가능해야 한다.

---

# 16. 추가 안내 관리

현재 상세페이지의 `추가 안내` 역시 동적 관리 대상이다.

예:

| 지역 | 대상 | 섹션 | 제목 | 내용 | 아이콘 | 표시 | 순서 | 작업 |
|---|---|---|---|---|---|---|---:|---|

추가 안내 항목도:

- 추가
- 수정
- 숨김
- 삭제
- 순서 변경

가능해야 한다.

---

# 17. 포함사항 / 불포함사항

현재 포함사항/불포함사항 같은 구조도 하드코딩하지 않는다.

지원:

```text
+ 항목 추가
✏️ 수정
👁 숨김
🗑 삭제
↕ 순서 변경
```

필요하면 섹션 자체도 수정 가능하게 한다.

예:

```text
포함사항 → 패키지 포함
불포함사항 → 별도 결제
```

즉 제목도 DB에서 수정 가능해야 한다.

---

# 18. 음식점 관리

지역별 음식점 관리를 관리자 표에서 별도로 쉽게 볼 수 있어야 한다.

예:

```text
도스 > 음식점
```

필터:

```text
호텔 근처
골프장 근처
지역 음식점
```

하지만 이 세 가지도 하드코딩하지 말고 `restaurant_group` 또는 configurable group으로 저장한다.

관리 가능 항목:

- 한글명
- 일본어명
- 영문명
- 분류
- 설명
- 대표 메뉴
- 주소
- Google Maps
- 전화
- 호텔 기준 거리
- 골프장 기준 거리
- 영업시간
- 휴무
- 이미지
- 추가 사용자 정의 필드

---

# 19. 골프장 관리

관리 가능 기본 항목 예:

- 한글명
- 일본어명
- 영문명
- 짧은 설명
- 상세 설명
- 주소
- 전화번호
- Google Maps
- 이미지
- 이동시간
- 홀 수
- Par
- 거리
- 코스 특징
- 포함사항
- 불포함사항
- FAQ
- 추가 안내
- 플레이 방식
- 카트
- 캐디
- 렌탈
- 사용자 정의 필드

모든 필드는 선택/추가/삭제/재정렬 가능해야 한다.

---

# 20. 호텔 관리

관리 가능 기본 항목 예:

- 한글명
- 일본어명
- 영문명
- 주소
- 전화
- 지도
- 체크인
- 체크아웃
- 조식
- 객실 정보
- 와이파이
- 주차
- 온천
- 셔틀
- 주변 시설
- 이미지
- 사용자 정의 필드

---

# 21. 인라인 편집 UX

관리자로 로그인한 실제 사용자 화면은 일반 사용자 UI를 망치지 않아야 한다.

권장 방식:

평소:

```text
카호
18홀 Par72...
```

관리자 로그인 시 hover 또는 우측 상단:

```text
✏️  👁  🗑
```

모바일에서는 hover가 없으므로:

```text
⋯
```

메뉴를 눌러:

```text
수정
숨김
삭제
```

표시.

---

# 22. 관리자 편집 모드 표시

관리자가 실제 사용자 화면을 보고 있을 때 일반 사용자 화면인지 관리자 모드인지 혼동하지 않게 상단에 작은 Badge를 제공한다.

예:

```text
관리자 편집 모드
```

너무 큰 고정 바는 모바일 공간을 낭비하므로 작게 표시한다.

---

# 23. 저장 UX

저장 UX는 반드시 통일한다.

저장 버튼 클릭 후:

```text
저장 중...
```

성공:

```text
✓ 저장되었습니다.
```

실패:

```text
저장하지 못했습니다.
원인: ...
다시 시도
```

성공했는데 화면에서 즉시 반영되지 않는 상황이 없어야 한다.

필요 시:

- optimistic update
- router.refresh()
- cache invalidation
- revalidatePath / revalidateTag

를 정확히 사용한다.

---

# 24. CRUD API 응답 규칙

현재 발생한 오류:

```text
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

를 반드시 제거한다.

모든 API / Route Handler / Server Action 응답 형식을 통일한다.

성공:

```json
{
  "success": true,
  "data": {}
}
```

실패:

```json
{
  "success": false,
  "error": "에러 메시지",
  "code": "ERROR_CODE"
}
```

빈 body 반환 금지.

프론트엔드에서 무조건 `response.json()`만 호출하지 말고:

1. status 검사
2. content-type 검사
3. body 존재 검사
4. JSON parse 실패 처리

를 구현한다.

---

# 25. 삭제 정책

운영 관리자 실수를 대비해 기본적으로 soft delete를 권장한다.

```text
is_deleted = true
```

관리 화면에서 삭제된 항목을 복구할 수 있어야 한다.

UI:

```text
삭제하시겠습니까?
이 항목은 숨김 처리되고 휴지통에서 복구할 수 있습니다.
```

진짜 hard delete는 SUPER ADMIN 전용 또는 2차 확인으로 제한한다.

---

# 26. 표시/숨김과 삭제 구분

세 상태를 구분한다.

```text
visible = true      → 사용자에게 표시
visible = false     → 관리자에게만 보이고 사용자에게 숨김
is_deleted = true   → 휴지통
```

---

# 27. 순서 변경 UX

현재 위/아래 버튼만 사용하는 방식은 데이터가 많아지면 비효율적이다.

Desktop:

- drag & drop 우선
- 키보드 접근성 보조

Mobile:

- drag handle
- 또는 위/아래 버튼 fallback

변경 즉시 DB에 sort_order 저장.

---

# 28. 검색 및 필터 UX

관리자 페이지에서 데이터를 빨리 찾을 수 있어야 한다.

필수:

```text
검색
지역
카테고리
콘텐츠 타입
표시 상태
```

FAQ 관리에서는:

```text
질문 카테고리
```

음식점에서는:

```text
음식점 그룹
```

필터 상태는 URL query parameter로 유지하는 것을 권장한다.

예:

```text
/admin/content?region=dos&type=golf&visible=true
```

새로고침 후에도 유지.

---

# 29. 모바일 관리자 UX

한국인 매니저가 휴대폰으로도 수정할 수 있어야 한다.

Desktop Table을 그대로 모바일에 압축하지 말 것.

모바일에서는:

```text
카호
도스 · 골프장
표시중

수정   숨김   더보기
```

카드 리스트 형태로 전환.

상세 편집은 Full-screen Sheet.

---

# 30. 이미지 관리

이미지 필드가 있는 경우:

- 기존 이미지 미리보기
- 이미지 교체
- 삭제
- alt text
- 업로드 진행 상태
- 실패 재시도

를 지원한다.

가능하면 원본 직접 렌더 대신 현재 프로젝트의 이미지 최적화/R2 정책을 그대로 사용한다.

---

# 31. 성능 최적화

## 관리자 목록

- 필요한 column만 우선 조회
- pagination 또는 cursor pagination
- 검색 debounce
- 서버 필터링
- 불필요한 전체 재조회 금지

## 상세 편집

Drawer를 열 때 상세 필드 fetch 가능.

즉 목록 진입 시 모든 Entity의 모든 동적 필드를 한 번에 읽지 않는다.

```text
목록 → summary query
수정 클릭 → detail query
```

---

# 32. 캐시 및 최신 데이터

관리자가 수정한 내용이 즉시 실제 화면에 반영되어야 한다.

검토 항목:

- Next.js cache
- fetch cache
- server component cache
- revalidatePath
- revalidateTag
- router.refresh

관리자 수정 성공 후 관련 페이지를 정확히 invalidate한다.

전체 사이트 cache purge 같은 과도한 방식은 피한다.

---

# 33. 권한

모든 mutation은 UI 표시 여부와 별개로 서버에서 관리자 권한을 다시 검사한다.

절대로:

```text
버튼 안 보임 = 보안
```

으로 처리하지 않는다.

모든 create/update/delete action:

```text
1. session 확인
2. admin role 확인
3. permission 확인
4. mutation
```

---

# 34. 동시 편집

기존 admin lock 구조가 있다면 유지하되, UX를 개선한다.

예:

```text
현재 다른 관리자가 편집 중입니다.
마지막 편집: ...
```

RPC 오류와 lock expired를 반드시 구분한다.

DB/RPC 장애를 `편집권한 만료`로 잘못 표시하지 않는다.

---

# 35. Validation

필드 타입에 따라 validation 적용.

예:

```text
url → 유효 URL
phone → 문자열 허용 + format helper
number → 숫자
select → options 중 하나
multi_select → options 배열
```

동적 필드는 `validation_json` 기반으로 관리 가능하게 한다.

---

# 36. 변경 이력

가능하면 관리자 변경 로그를 남긴다.

```text
admin_change_logs
- id
- admin_id
- action
- entity_type
- entity_id
- before_json
- after_json
- created_at
```

최소한:

- 누가
- 무엇을
- 언제
- create/update/delete 중 무엇을 했는지

기록.

---

# 37. UI 디자인 방향

현재 사용자 사이트는 연한 배경 이미지와 흰색 카드 중심이므로 관리자도 완전히 별개의 복잡한 백오피스처럼 만들 필요는 없다.

권장:

- 흰색/연회색 기반
- 기존 초록 accent 유지
- destructive action만 red
- 숨김 action은 orange/neutral
- 카드 radius 통일
- 버튼 높이 통일
- 아이콘 크기 통일
- 입력 필드 spacing 통일

### 중요한 UX 원칙

- 한 화면에 너무 많은 버튼 노출 금지
- 가장 중요한 action만 primary
- 삭제는 절대 primary 금지
- 모바일 터치 영역 최소 44px
- 긴 텍스트는 ellipsis + tooltip
- 저장 전 변경 여부 표시
- 저장되지 않은 상태에서 닫으려 하면 확인

---

# 38. 접근성

최소 다음은 지킨다.

- button에 aria-label
- 아이콘만 있는 버튼에 tooltip
- keyboard tab 가능
- modal focus trap
- escape close
- label/input 연결
- 색상만으로 상태 구분 금지

---

# 39. 관리자 대시보드 UX 예시

```text
관리자
────────────────────────────────────────
🏠 사용자 홈                       로그아웃

[검색.................................]

지역
[도스] [벳푸] [+ 지역 추가]

콘텐츠
[전체] [골프장] [호텔] [음식점] [FAQ] [추가 안내]

필터
[지역 ▼] [카테고리 ▼] [상태 ▼]

+ 새 항목 추가

────────────────────────────────────────
타입      이름          지역   상태    순서   작업
골프장    카호          도스   표시     1    수정 ⋯
골프장    위너스        도스   표시     2    수정 ⋯
호텔      ...           도스   표시     1    수정 ⋯
```

---

# 40. 상세 편집 UX 예시

```text
카호 골프클럽 수정
────────────────────────

기본 정보
이름(한글)      [ 카호 ]
이름(일본어)    [ かほゴルフクラブ ]
설명            [ ................... ]

상세 필드
📍 주소          [ ................... ]
📞 전화번호      [ ................... ]
🗺 Google Maps   [ ................... ]
🏌 홀 수         [ 18 ]

[+ 기존 필드 추가]
[+ 새 필드 만들기]

표시 여부        [ ON ]
순서             [ 1 ]

취소                       저장
```

---

# 41. 기존 필드 선택 UX

```text
필드 추가
──────────────────
[검색...............]

추천
□ 주소
□ 전화번호
□ Google Maps
□ 이동시간

골프장
□ 홀 수
□ Par
□ 카트
□ 캐디
□ 렌탈클럽

호텔
□ 체크인
□ 체크아웃
□ 조식

음식점
□ 대표 메뉴
□ 영업시간
□ 휴무일

선택 추가
```

이미 현재 Entity에 연결된 필드는 disabled 또는 `사용 중` 표시.

---

# 42. 새 필드 생성 UX

```text
새 필드 만들기
──────────────────
필드명         [ 렌탈 슈즈 ]
key            [ rental_shoes ]
타입           [ 텍스트 ▼ ]
아이콘         [ 👟 ]

적용 범위
○ 현재 항목만
○ 현재 카테고리 전체
○ 현재 지역 전체
○ 모든 골프장
○ 전체 공용

표시 순서       [ 10 ]

취소            생성 및 추가
```

`key`는 label에서 자동 생성하되 관리자가 수정할 수 있게 한다.

중복 key 방지.

---

# 43. 기존 데이터 Migration

반드시 기존 데이터를 먼저 조사한다.

금지:

- 기존 DB 구조를 확인하지 않고 새 테이블 생성
- 기존 Google Sheet 구조를 무시하고 migration
- 기존 데이터 삭제 후 재입력

먼저:

```text
1. 현재 DB table 목록
2. 현재 relation
3. 현재 admin_options/category 구조
4. golf/hotel/restaurant 저장 방식
5. FAQ 저장 방식
6. additional info 저장 방식
7. Google Sheet sync 여부
8. 현재 production 데이터 row 수
```

를 audit한다.

그 다음 migration plan 작성.

---

# 44. 기존 기능 보존

개편하면서 다음 기능을 깨뜨리지 않는다.

- 관리자 로그인
- 실제 사용자 페이지 렌더링
- 도스/벳푸 페이지
- 골프장 상세
- 호텔 상세
- 음식점
- FAQ
- 숨김/표시
- 관리자 권한
- 배경 이미지
- 모바일 UI
- 기존 Google Sheet 연동이 있다면 해당 흐름

---

# 45. 에러 처리

현재처럼 raw browser error를 관리자에게 그대로 보여주지 않는다.

금지:

```text
Failed to execute 'json' on 'Response'...
```

관리자 UI:

```text
추가하지 못했습니다.
서버 응답을 확인하지 못했습니다.
[다시 시도]
```

개발 로그에는 실제 stack/error를 기록한다.

---

# 46. Toast 정책

Toast는 너무 많이 쌓이지 않게 한다.

성공:

```text
저장되었습니다.
삭제되었습니다.
숨김 처리되었습니다.
```

실패:

```text
저장하지 못했습니다.
```

동일 작업 toast 중복 방지.

---

# 47. Empty State

데이터가 없을 때 빈 화면으로 두지 않는다.

예:

```text
등록된 음식점이 없습니다.
[+ 첫 음식점 추가]
```

```text
등록된 사용자 정의 필드가 없습니다.
[+ 기존 필드 선택] [+ 새 필드 만들기]
```

---

# 48. Loading State

관리자 표:

- skeleton rows

Drawer:

- skeleton form

저장:

- 버튼 disabled
- spinner

중복 submit 방지.

---

# 49. 위험 작업 보호

다음 작업은 확인 modal 필요.

- 지역 삭제
- 카테고리 삭제
- Entity 삭제
- 공용 Field Definition 삭제

특히 공용 필드 삭제 시 영향을 받는 항목 수를 표시한다.

예:

```text
'Google Maps' 필드는 18개 항목에서 사용 중입니다.
삭제하면 연결된 값이 영향을 받을 수 있습니다.
```

기본은 삭제 대신 비활성화 권장.

---

# 50. Field 삭제 정책

공용 field definition은 실제 삭제보다 inactive 처리 우선.

```text
active = false
```

Entity에 연결된 특정 field 값만 제거하는 것은 별도 처리.

즉:

```text
필드 연결 제거
≠
공용 필드 정의 삭제
```

UI에서 명확히 구분한다.

---

# 51. DB Transaction

복합 create/update 작업은 transaction을 검토한다.

예:

새 지역 생성 + 기본 카테고리 생성 중 일부만 성공하는 상황 방지.

가능하면 RPC/transaction 사용.

실패 시 전체 rollback.

---

# 52. Server Action / Route 설계

가능하면 CRUD layer를 한 곳에 모은다.

예:

```text
src/lib/admin/services/
  regions.ts
  categories.ts
  entities.ts
  fields.ts
  faq.ts
  additional-info.ts
```

또는 현재 프로젝트 구조에 맞는 동일 개념 적용.

UI component에서 DB 직접 호출하지 않는다.

---

# 53. 타입 관리

TypeScript type/interface를 DB 구조와 일치시킨다.

필수:

```text
Region
Category
Entity
FieldDefinition
EntityFieldValue
FAQ
AdditionalInfo
```

가능하면 generated Supabase types 활용.

---

# 54. 테스트 요구사항

## Region

- 지역 추가
- 수정
- 숨김
- 삭제/복구
- 순서 변경

## Category

- 추가
- 수정
- 삭제
- scope 변경

## Entity

- 골프장 추가
- 호텔 추가
- 음식점 추가
- 수정
- 숨김
- 삭제/복구

## Dynamic Field

- 기존 필드 연결
- 새 필드 생성
- 현재 항목 전용 생성
- 전체 골프장 공용 생성
- 필드 값 저장
- 필드 숨김
- 연결 제거

## FAQ

- 추가
- 수정
- 삭제
- 순서 변경
- 카테고리 필터

## Additional Info

- 추가
- 수정
- 삭제
- 순서 변경

---

# 55. Production Smoke Test

배포 후 반드시 실제 Production에서 테스트한다.

테스트 계정으로:

```text
1. 관리자 로그인
2. 사용자 홈 이동
3. 사용자 화면에서 텍스트 수정
4. 새로고침 후 유지 확인
5. /admin 이동
6. 같은 값이 표에 반영되는지 확인
7. /admin에서 값 수정
8. 사용자 화면 반영 확인
9. 음식점 추가
10. 골프장 추가
11. 호텔 추가
12. FAQ 추가
13. 추가 안내 추가
14. 기존 필드 연결
15. 새 사용자 정의 필드 생성
16. 표시/숨김
17. 삭제
18. 복구
19. 새 지역 생성
20. 새 카테고리 생성
```

모두 실제 DB까지 확인한다.

---

# 56. Network 검증

HTTP 200만 보고 성공으로 판단하지 않는다.

각 mutation마다 다음을 검증한다.

```text
HTTP status
response body
success boolean
DB affected row count
updated_at 변경
실제 재조회 값
```

---

# 57. 관리자 UI 성능 목표

권장 목표:

- 초기 관리자 목록 렌더 체감 1초 내외
- 필터 변경 즉시 피드백
- 검색 debounce 250~400ms
- Modal/Drawer open 지연 최소화
- 불필요한 full-page navigation 최소화

---

# 58. 코드에서 제거해야 할 것

가능하면 다음 hardcoding 제거.

```text
DOS
BEPPU
골프장
호텔
음식점
고정 질문 카테고리 목록
고정 Field 목록
고정 restaurant group 목록
```

단, migration/bootstrap용 default seed는 허용.

---

# 59. 절대 하지 말 것

1. UI만 바꾸고 DB는 그대로 임시 처리하지 말 것.
2. Admin과 사용자 화면에서 서로 다른 mutation 코드를 만들지 말 것.
3. 모든 동적 필드를 하나의 giant JSON column 하나에만 저장하지 말 것.
4. 기존 production 데이터 삭제 금지.
5. raw server error를 사용자에게 그대로 출력 금지.
6. 모바일 관리자 UI 검증 없이 완료 처리 금지.
7. 빌드 성공만으로 완료 처리 금지.
8. HTTP 200만으로 CRUD 성공 판단 금지.
9. 하드코딩된 도스/벳푸 분기 추가 금지.
10. 새 카테고리/필드 추가 때 매번 코드 변경을 요구하는 구조 금지.

---

# 60. 구현 순서

## Phase 0 — Audit

- 현재 DB schema 확인
- 현재 Google Sheet 구조 확인
- 현재 CRUD route/action 확인
- 현재 admin 권한/lock 구조 확인
- current production row count 확인
- 현재 JSON parsing 에러 재현

## Phase 1 — DB 모델

- Region 동적화
- Category 동적화
- Entity 공통 구조 정리
- Field Definition
- Entity Field Value
- soft delete
- sort order
- change log

## Phase 2 — 공통 CRUD Layer

- region CRUD
- category CRUD
- entity CRUD
- dynamic field CRUD
- FAQ CRUD
- additional info CRUD
- JSON response 표준화

## Phase 3 — `/admin` UI

- Dashboard
- 지역 관리
- 콘텐츠 표
- filter/search
- detail drawer
- field picker
- field creator
- mobile cards

## Phase 4 — 사용자 화면 인라인 편집

- 관리자 편집 컨트롤 통일
- 동일 CRUD layer 연결
- save feedback
- hide/delete
- cache refresh

## Phase 5 — Migration

- 기존 데이터 migration
- 기존 IDs/URLs 보존
- relationship 보존

## Phase 6 — QA

- desktop
- tablet
- mobile
- production smoke test
- concurrency
- permission
- cache

---

# 61. TODO 체크리스트

## Audit

- [ ] 현재 production DB schema export
- [ ] 현재 table 목록 확인
- [ ] 관계 확인
- [ ] admin_options 구조 확인
- [ ] 도스/벳푸 하드코딩 위치 검색
- [ ] 카테고리 하드코딩 위치 검색
- [ ] FAQ 구조 확인
- [ ] additional info 구조 확인
- [ ] 음식점 저장 구조 확인
- [ ] 호텔 저장 구조 확인
- [ ] 골프장 저장 구조 확인
- [ ] Google Sheet dependency 확인
- [ ] `Unexpected end of JSON input` 재현 및 원인 특정

## DB

- [ ] regions 동적 schema
- [ ] categories 동적 schema
- [ ] entities 구조 정리
- [ ] field_definitions 생성
- [ ] entity_field_values 생성
- [ ] soft delete 지원
- [ ] sort_order 지원
- [ ] visible 지원
- [ ] change log 검토/구현
- [ ] index 추가
- [ ] FK 검증

## CRUD

- [ ] Region CRUD
- [ ] Category CRUD
- [ ] Entity CRUD
- [ ] FAQ CRUD
- [ ] Additional Info CRUD
- [ ] Field Definition CRUD
- [ ] Entity Field Value CRUD
- [ ] field attach/detach
- [ ] field active/inactive
- [ ] soft delete/restore
- [ ] response JSON 통일
- [ ] validation 통일
- [ ] permission 통일

## Admin Dashboard

- [ ] 사용자 홈 버튼
- [ ] logout
- [ ] region navigation
- [ ] content tabs
- [ ] summary counts
- [ ] 최근 수정

## Admin Table

- [ ] 검색
- [ ] 지역 필터
- [ ] 카테고리 필터
- [ ] 타입 필터
- [ ] 상태 필터
- [ ] 정렬
- [ ] pagination
- [ ] desktop table
- [ ] mobile card layout

## Detail Editor

- [ ] Drawer/Desktop
- [ ] Full-screen Sheet/Mobile
- [ ] 기본 정보
- [ ] 상세 정보
- [ ] 이미지
- [ ] 표시 설정
- [ ] sort order
- [ ] 기존 필드 추가
- [ ] 새 필드 만들기
- [ ] field value edit
- [ ] unsaved changes warning

## Region

- [ ] 지역 추가
- [ ] 지역 수정
- [ ] 지역 숨김
- [ ] 지역 삭제/복구
- [ ] 지역 순서 변경
- [ ] 배경 이미지
- [ ] 신규 지역 기본 카테고리 bootstrap 옵션

## Category

- [ ] 카테고리 추가
- [ ] 수정
- [ ] 숨김
- [ ] 삭제
- [ ] 순서 변경
- [ ] AREA/COMMON scope

## Dynamic Fields

- [ ] 기존 필드 picker
- [ ] 검색
- [ ] 이미 사용 중 표시
- [ ] 새 필드 생성
- [ ] 타입 선택
- [ ] 아이콘
- [ ] 옵션 설정
- [ ] 적용 범위
- [ ] 현재 항목 전용
- [ ] 카테고리 공용
- [ ] 지역 공용
- [ ] 동일 타입 전체 공용
- [ ] 전체 공용
- [ ] field deactivate

## FAQ

- [ ] 표 조회
- [ ] 필터
- [ ] 질문 추가
- [ ] 답변 수정
- [ ] 질문 카테고리 추가
- [ ] 순서 변경
- [ ] 숨김
- [ ] 삭제/복구

## Additional Info

- [ ] 목록
- [ ] 추가
- [ ] 수정
- [ ] 삭제
- [ ] 숨김
- [ ] 순서
- [ ] icon

## Inline Editing

- [ ] 관리자 편집 모드 표시
- [ ] desktop icon controls
- [ ] mobile menu controls
- [ ] text edit
- [ ] list edit
- [ ] dynamic field edit
- [ ] add item
- [ ] hide
- [ ] delete
- [ ] admin page와 same DB mutation 사용

## UX

- [ ] loading state
- [ ] empty state
- [ ] success toast
- [ ] error toast
- [ ] delete confirmation
- [ ] destructive 색상 구분
- [ ] mobile touch target
- [ ] keyboard accessibility
- [ ] tooltip
- [ ] unsaved warning

## Optimization

- [ ] summary/detail query 분리
- [ ] pagination
- [ ] debounce search
- [ ] server filtering
- [ ] N+1 query 점검
- [ ] DB index
- [ ] selective cache invalidation
- [ ] image optimization
- [ ] duplicate request 방지
- [ ] double submit 방지

## QA

- [ ] build PASS
- [ ] lint PASS
- [ ] typecheck PASS
- [ ] desktop PASS
- [ ] tablet PASS
- [ ] mobile PASS
- [ ] admin permission PASS
- [ ] non-admin controls hidden PASS
- [ ] direct API unauthorized mutation blocked PASS
- [ ] production CRUD PASS
- [ ] DB persistence PASS
- [ ] refresh persistence PASS
- [ ] admin ↔ user screen data sync PASS
- [ ] new region PASS
- [ ] new category PASS
- [ ] new field PASS
- [ ] soft delete/restore PASS

---

# 62. 완료 보고 형식

Agent는 최종적으로 아래 형식으로 보고한다.

```text
ADMIN CMS REBUILD REPORT

1. Audit
- 기존 구조:
- 문제점:
- migration 방식:

2. DB
- 신규/수정 table:
- migration:
- 기존 데이터 보존 여부:

3. Admin UI
- dashboard:
- table:
- filters:
- detail drawer:

4. Dynamic Fields
- 기존 필드 선택:
- 새 필드 생성:
- scope:
- DB 저장:

5. Inline Editing
- 실제 화면 수정:
- same CRUD layer 여부:

6. Error Handling
- Unexpected end of JSON input 원인:
- 수정 내용:

7. Optimization
- query:
- cache:
- mobile:

8. Verification
Build:
Typecheck:
Desktop:
Mobile:
Production CRUD:
DB Persistence:

9. 남은 TODO
- ...
```

---

# 63. Definition of Done

아래가 모두 충족되어야 완료다.

```text
[ ] 도스/벳푸 외 새로운 지역을 관리자에서 추가 가능
[ ] 새로운 카테고리를 관리자에서 추가 가능
[ ] 호텔/골프장/음식점을 지역별로 추가 가능
[ ] 관리자 표에서 모든 항목 조회 가능
[ ] 관리자 표에서 수정 가능
[ ] 관리자 표에서 삭제/숨김/복구 가능
[ ] 질문/FAQ를 표에서 관리 가능
[ ] 추가 안내를 표에서 관리 가능
[ ] 기존 상세 필드 선택 가능
[ ] 새 상세 필드 생성 가능
[ ] 새 필드의 적용 범위 선택 가능
[ ] 동적 필드 값을 DB에 저장
[ ] 실제 사용자 화면에서도 동일 데이터를 편집 가능
[ ] 홈 편집과 /admin 편집이 같은 DB 데이터 사용
[ ] 모든 사용자 노출 관리 콘텐츠가 DB 기반
[ ] 모든 mutation 서버 권한 검사
[ ] JSON 응답 오류 제거
[ ] 모바일 관리자 UI 정상
[ ] Production 실제 CRUD 검증 완료
[ ] 새로고침 후 데이터 유지
[ ] 기존 데이터 손실 없음
```

**위 항목 중 하나라도 충족되지 않으면 완료로 보고하지 마세요.**

