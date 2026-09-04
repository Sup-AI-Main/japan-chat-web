# 04. Agent 개발 가이드
## 일본 골프 여행 가이드 웹앱

이 문서는 개발 Agent가 구현할 때 반드시 지켜야 할 기준이다.

---

# 1. 프로젝트 성격

이 프로젝트는 기존 NowTravel과 독립된 별도 웹앱이다.

절대 기존 NowTravel:

- DB
- 회원
- 예약
- 결제
- 관리자
- Supabase

와 연결하지 않는다.

---

# 2. 목표

가장 중요한 우선순위:

```text
속도 > 단순함 > 관리 편의성 > 기능 수
```

과도한 기능 추가 금지.

---


# 2. 개발 환경 / 도구 / 버전 고정

이 프로젝트는 운영 안정성과 재현성을 위해 아래 개발환경을 기준으로 고정한다.

```text
Runtime: Node.js 22 LTS
Framework: Next.js 16.x Active LTS
Minimum Next.js: 16.3.3 이상
Language: TypeScript 5.x stable
UI: React (Next.js 16 기본 호환 버전)
CSS: Tailwind CSS 4.x stable
Package Manager: npm
Deployment: Vercel
CMS/Data Source: Google Sheets API
Database: 사용하지 않음
```

## 금지

- Node.js 26 Current 사용 금지
- Next.js canary / beta / RC 사용 금지
- React canary 사용 금지
- Tailwind beta/preview 사용 금지
- 사용자 승인 없이 major version 임의 업그레이드 금지

## 버전 재현

프로젝트 루트에 `.nvmrc`를 생성한다.

```text
22
```

`package.json`에는 Node 엔진을 명시한다.

```json
{
  "engines": {
    "node": "22.x"
  }
}
```

`package-lock.json`을 반드시 커밋한다.

Agent는 개발 시작 전에 다음을 먼저 확인한다.

```bash
node -v
npm -v
npm list next react react-dom typescript tailwindcss
```

현재 설치 버전이 본 문서 기준과 다르면 무조건 자동 업그레이드하지 말고,
차이와 이유를 먼저 보고한 뒤 안정적인 stable/LTS 범위에서 맞춘다.

---

# 3. 권장 개발 도구

개발 및 검증 도구:

```text
Editor: VS Code 또는 Agent 사용 환경
Runtime: Node.js 24 LTS
Package Manager: npm
Version Control: Git
Hosting: Vercel
Browser QA: Chromium 기반 브라우저
API/Data: Google Sheets API
```

권장 스크립트:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

가능하면 구현 완료 전 아래를 실행한다.

```bash
npm run typecheck
npm run lint
npm run build
```


# 4. 권장 스택

가능하면:

- Next.js 16.x Active LTS
- TypeScript 5.x stable
- Tailwind CSS 4.x stable
- Google Sheets API

추가 라이브러리는 최소화.

상태관리 라이브러리 불필요.

상태관리 라이브러리 불필요.

---

# 5. 데이터 레이어

반드시 한 곳으로 통합.

예:

```text
src/lib/google-sheets.ts
```

역할:

- Sheets 인증
- 탭별 읽기
- 데이터 parse
- active 필터
- sort
- 캐시
- 오류 처리

컴포넌트에서 직접 Google API 호출 금지.

---

# 6. 데이터 함수 예시

```ts
getGolfCourses(area)
getHotels(area)
getTravelTimes(area)
getRestaurants(area)
getFaq(area, category)
getAdminOptions()
```

---

# 7. 캐시

Next.js 환경에 맞는 서버 캐시 사용.

고객:

- 10~30분

관리자 저장:

- 저장 후 관련 캐시 무효화

---

# 8. 관리자 페이지

경로:

```text
/admin
/admin/questions
/admin/questions/new
/admin/questions/[id]
```

관리자는 데이터 구조를 몰라도 사용 가능해야 한다.

---

# 9. 관리자 선택값

`admin_options`를 읽어서 사용.

카테고리, 지역을 프론트 코드에 중복 정의하지 말 것.

단, 장애 대비 fallback label map 정도는 허용.

---

# 10. 질문 저장

저장 시 서버가 자동 생성:

```text
id
area
category
related_type
related_id
related_name
question_scope
active
sort
```

관리자는 question/answer 중심으로만 입력.

---

# 11. ID 생성

간단한 collision-safe ID 사용.

예:

```text
faq_<timestamp>_<short_random>
```

UUID 라이브러리를 추가할 필요가 없으면 Web Crypto 사용.

---

# 12. 정렬

관리자가 숫자를 입력하지 않게 할 것.

MVP:

- 위로
- 아래로

서버가 해당 그룹:

```text
area + category
```

내에서 sort를 재작성.

---

# 13. 그룹 정렬 예외

특정 장소 질문도 기본적으로 동일 category 안에서 정렬한다.

필요하면 나중에:

```text
area + category + related_id
```

단위로 확장 가능.

MVP에서는 복잡하게 만들지 않는다.

---

# 14. FAQ 수정

기존 행을 id로 찾아 update.

행 전체 삭제 금지.

숨김은:

```text
active = FALSE
```

---

# 15. 관리자 인증

MVP는 1개 관리자 credential로 충분.

필수:

- 서버 검증
- httpOnly session cookie
- secure in production
- sameSite

localStorage에 관리자 비밀번호 저장 금지.

---

# 16. Google Sheets 쓰기

브라우저 → 서버 route/action → Sheets API.

브라우저에서 service account credential 사용 금지.

---

# 17. 데이터 Validation

서버에서 필수 검증:

```text
area
category
question_scope
question
answer
```

SPECIFIC이면:

```text
related_type
related_id
```

필수.

---

# 18. related_name

related_id를 기반으로 서버가 실제 sheet에서 이름을 찾아 자동 입력.

관리자 직접 입력 금지.

---

# 19. 카테고리와 장소 관계

admin_options 기준:

- GOLF → GOLF 선택 가능
- HOTEL → HOTEL 선택 가능
- ONSEN → HOTEL 선택 가능
- DRIVER → GOLF/HOTEL 선택 가능
- RESTAURANT → RESTAURANT 선택 가능
- GENERAL → 보통 지역 공통
- REFUND → 보통 지역 공통
- MONEY → 보통 지역 공통
- EXTRA_PAYMENT → GOLF/HOTEL 선택 가능

---

# 20. 고객 페이지

서버 렌더링 우선.

클라이언트 JS는:

- 검색
- accordion
- 최소 UI interaction

에만 사용.

가능하면 대형 client component 금지.

---

# 21. Google Maps

지도 iframe을 기본 로딩하지 않는다.

버튼:

```text
Google Maps에서 보기
실시간 길찾기
```

링크 방식 우선.

속도 유지.

---

# 22. 이미지

초기 MVP에서는 이미지 없이 구현 가능.

이미지를 사용할 경우:

- WebP/AVIF
- lazy loading
- 크기 지정
- 외부 대형 원본 직접 사용 금지

---

# 23. 오류 시

고객:

```text
현재 정보를 불러오지 못했습니다.
잠시 후 다시 확인해주세요.
```

관리자:

```text
저장하지 못했습니다.
입력한 내용은 유지되어 있습니다.
```

---

# 24. 로그

서버에서:

- Sheets read failure
- Sheets write failure
- auth failure

정도만 기록.

credential/raw body/개인정보 로그 금지.

---

# 25. 성능 검증

필수 확인:

- 페이지 새로고침마다 Sheets API가 불필요하게 반복 호출되는지
- 고객 번들에 admin 코드가 포함되는지
- Google Maps iframe이 초기 로딩되는지
- 과도한 JS library가 들어갔는지
- 모바일에서 layout shift가 있는지

---

# 26. 코드 원칙

- 한 기능을 위해 5개 파일로 과도하게 나누지 말 것
- 추상화 과다 금지
- repository pattern 등 불필요
- 데이터 타입은 명확하게 정의
- 읽기 쉬운 함수명
- 중복만 제거

---

# 27. 구현 완료 보고 형식

Agent는 완료 후 아래만 보고:

```text
1. 생성/수정 파일
2. 구현 페이지
3. Google Sheets 연결 구조
4. 관리자 기능
5. 캐시 방식
6. 보안 방식
7. 테스트 결과
8. 남은 TODO
```

긴 자기평가 금지.

---

# 28. 금지

- Supabase 추가
- Prisma 추가
- 별도 DB 추가
- Redis 필수화
- Redux/Zustand 추가
- 관리자 멀티권한
- 고객 로그인
- 결제
- 예약
- AI
- 실시간 채팅
- CMS 프레임워크 추가

사용자가 별도 요청하기 전에는 하지 않는다.

---

# 29. 이모지 + 색상 시스템

`src/lib/display.ts`에서 모든 이모지와 색상을 관리한다.

```ts
getAreaEmoji(code)        // 지역 이모지
getCategoryEmoji(code)    // 카테고리 이모지
getCategoryColor(code)    // 텍스트 색상
getCategoryBg(code)       // 배경 색상
getCategoryBorder(code)   // 테두리 색상
getCategoryConfig(code)   // 전체 설정
```

카테고리별 고유 색상으로 카드, accordion, 제목에 적용한다.

---

# 30. 반응형 배경 이미지

고객 페이지에는 지역별 반응형 배경 이미지를 적용한다.

## 파일

`public/background/`에 9개 WebP 파일:

- main-background-{mobile,tablet,desktop}.webp
- sub-background-1-{mobile,tablet,desktop}.webp
- sub-background-2-{mobile,tablet,desktop}.webp

## CSS 클래스

`globals.css`에 정의:

- `.page-bg`: 배경 크기/위치/overlay
- `.bg-main`: 메인 배경
- `.bg-dos`: 도스 배경
- `.bg-beppu`: 벳푸 배경

## 적용

- `src/app/page.tsx`: 메인에 `page-bg bg-main` 적용
- `src/app/[area]/layout.tsx`: 지역별 배경 자동 적용

모든 하위 페이지는 layout을 통해 배경을 상속한다.

## Overlay

`rgba(255, 255, 255, 0.78)` 반투명 흰색 overlay.

---

# 31. 동적 지역/카테고리

`admin_options` Google Sheet 탭을 기반으로 지역과 카테고리를 동적으로 관리한다.

## API

```text
GET  /api/admin/options          - 목록 조회
POST /api/admin/options          - 새 옵션 추가
PUT  /api/admin/options          - 옵션 수정
PATCH /api/admin/options/toggle  - 활성/비활성 토글
PATCH /api/admin/options/sort    - 정렬 변경
```

## 데이터 함수

```ts
getAdminOptions()      // 전체 옵션
getActiveAreas()       // 활성 지역만
getActiveCategories()  // 활성 카테고리만
appendAdminOption()    // 추가
updateAdminOption()    // 수정
updateAdminOptionSort() // 정렬
```

## 적용

- 관리자 홈: 동적 지역 목록
- 관리자 카테고리: 동적 카테고리 목록
- 고객 홈: 동적 지역 목록 (ALL 제외)
- 고객 지역 페이지: 동적 카테고리 목록
