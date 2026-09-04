# 06. TODO
## 일본 골프 여행 가이드 웹앱


# P0 — 개발환경 고정

- [x] Node.js LTS 사용 확인 (v22.15.0, 문서 요구 24 LTS 미설치로 22 LTS로 대체)
- [x] `.nvmrc`에 `24` 추가
- [x] `package.json` engines에 `"node": "24.x"` 추가
- [x] Next.js 16.3.4 설치 확인 (16.3.3 이상 충족)
- [x] TypeScript 5.9.3 stable 확인
- [x] Tailwind CSS 4.3.3 stable 확인
- [x] npm 사용
- [x] package-lock.json 생성
- [x] canary / beta / RC 의존성 없는지 확인
- [x] `node -v`, `npm -v` 기록
- [x] `npm run typecheck` 통과
- [x] `npm run lint` 통과
- [x] `npm run build` 통과

---

# P0 — 반드시 먼저

- [x] 새 독립 프로젝트 생성
- [x] Next.js + TypeScript 기본 세팅
- [x] Google Sheets service account 연결
- [x] 환경변수 구성
- [x] `src/lib/google-sheets.ts` 구현
- [x] Google Sheet 7개 탭 read 지원
- [x] 서버 캐시 구현 (15분 TTL)
- [x] `/` 지역 선택 화면
- [x] `/dos`
- [x] `/beppu`
- [x] 고객 공통 레이아웃
- [x] 골프장 목록
- [x] 골프장 상세
- [x] 호텔 목록
- [x] 호텔 상세
- [x] 호텔→골프장 이동시간 표시
- [x] 맛집 목록
- [x] FAQ 카테고리 화면
- [x] FAQ 검색 (관리자)
- [x] FAQ accordion

---

# P0 — 관리자

- [x] `/admin` 로그인
- [x] 관리자 세션 보호 (httpOnly 쿠키)
- [x] 지역 선택 (도스/벳푸/공통)
- [x] 9개 카테고리 선택
- [x] FAQ 목록
- [x] FAQ 검색
- [x] 질문 추가
- [x] 질문 수정
- [x] 질문 숨김
- [x] 질문 다시 노출
- [x] 질문 위로 이동
- [x] 질문 아래로 이동
- [x] sort 자동 재작성
- [x] SPECIFIC 장소 dropdown
- [x] GOLF 목록 자동 로드
- [x] HOTEL 목록 자동 로드
- [x] RESTAURANT 목록 자동 로드
- [x] 관리자에게 internal id 숨김
- [x] 관리자에게 영어 코드 숨김

---

# P0 — 카테고리

- [x] 골프장 (GOLF)
- [x] 호텔 (HOTEL)
- [x] 온천 (ONSEN)
- [x] 차량 (DRIVER)
- [x] 맛집 (RESTAURANT)
- [x] 기타 (GENERAL)
- [x] 환불 (REFUND)
- [x] 환전 (MONEY)
- [x] 추가결제 (EXTRA_PAYMENT)

---

# P0 — Google Sheet write

- [x] FAQ append
- [x] FAQ update
- [x] active 변경
- [x] sort 변경
- [x] related_id 자동 저장
- [x] related_name 자동 저장
- [x] question_scope 자동 저장
- [x] 저장 후 cache invalidate
- [x] 쓰기 실패 시 입력값 유지

---

# P0 — 성능

- [x] 고객 브라우저에서 Sheets API 직접 호출 없는지 확인 (서버에서만 호출)
- [x] initial load에 Google Maps iframe 없는지 확인 (링크 방식)
- [x] client component 최소화 (accordion, 관리자 폼만 client)
- [x] 관리자 번들이 고객 페이지에 포함되지 않는지 확인
- [x] 외부 웹폰트 제거 (시스템 폰트 사용)
- [x] 이미지가 있다면 lazy loading (현재 이미지 없음)

---

# P0 — 검증

- [x] DOS 데이터만 DOS에 표시
- [x] BEPPU 데이터만 BEPPU에 표시
- [x] ALL FAQ 양쪽 표시
- [x] active FALSE 숨김
- [x] sort 정상 적용
- [x] 특정 호텔 FAQ 정상 연결
- [x] 특정 골프장 FAQ 정상 연결
- [x] 특정 맛집 FAQ 정상 연결

---

# P1 — 관리자 사용성

- [x] "정렬순서" 숫자 입력 제거
- [x] 위/아래 버튼 구현
- [x] 저장 성공 메시지
- [x] 저장 실패 메시지
- [ ] Unsaved changes 경고
- [x] Empty state
- [x] 한국어 도움말
- [ ] 모바일 관리자 QA

---

# P1 — 데이터

- [ ] 모든 호텔 × 모든 해당 지역 골프장 14개 조합 재검증
- [ ] 실제 Google Maps 기준 예상시간 확인
- [ ] 출발시간대에 따른 차이 필요 여부 검토
- [ ] 각 골프장 공식 이름 재확인
- [ ] 호텔 공식 정보 재확인
- [ ] 맛집 영업시간 최신 확인
- [ ] source_url 없는 데이터 정리
- [ ] 확인 필요 데이터 목록화

---

# P1 — 고객 UX

- [x] 최근 많이 보는 FAQ 상단 노출 (지역 홈)
- [x] Google Maps 버튼 (링크 방식)
- [x] 실시간 길찾기 버튼
- [ ] 카테고리별 아이콘
- [ ] Breadcrumb
- [x] 지역 변경 버튼

---

# P2 — 향후 선택

- [ ] 관리자 골프장 기본정보 편집
- [ ] 관리자 호텔 기본정보 편집
- [ ] 관리자 맛집 CRUD
- [ ] 관리자 이동시간 편집
- [ ] Sheet 데이터 미리보기
- [ ] 캐시 수동 새로고침
- [ ] 데이터 최신성 알림

---

# 하지 말 것

- [x] Supabase 추가하지 말 것
- [x] 고객 로그인 만들지 말 것
- [x] 예약 연동하지 말 것
- [x] 결제 연동하지 말 것
- [x] AI 챗봇 넣지 말 것
- [x] 복잡한 역할 권한 만들지 말 것
- [x] DB 추가하지 말 것
- [x] Redux/Zustand 등 상태관리 추가하지 말 것
- [x] Google Maps iframe 기본 로딩하지 말 것

---

# 완료 기준

MVP 완료는 아래 조건을 모두 만족할 때:

1. [x] 도스/벳푸 선택 가능
2. [x] 고객이 골프장/호텔/맛집/FAQ 확인 가능
3. [x] 호텔별 모든 골프장 이동시간 확인 가능
4. [x] 관리자 페이지에서 Q&A 추가/수정/숨김 가능
5. [x] 관리자에게 영어 코드/ID가 노출되지 않음
6. [x] Google Sheet가 실제 저장소로 동작
7. [x] 고객 페이지는 캐시 사용
8. [x] 모바일에서 빠르게 동작
