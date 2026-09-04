# 07. Agent 실행 명령문

아래 문서를 먼저 전부 읽고 구현하라.

```text
01_메뉴구조도_IA.md
02_기능명세서.md
03_화면설계서.md
04_Agent_개발가이드.md
05_디자인시스템_가이드.md
06_TODO.md
```


## 개발환경 먼저 고정

구현 시작 전에 반드시 아래 버전을 확인하고 맞춰라.

```text
Node.js: 24 LTS
Next.js: 16.3.3 이상 / 16.x Active LTS
TypeScript: 5.x stable
Tailwind CSS: 4.x stable
Package Manager: npm
Deployment: Vercel
CMS: Google Sheets API
Database: 사용하지 않음
```

반드시:

```text
.nvmrc = 24
package.json engines.node = 24.x
package-lock.json 커밋
```

Node 26 Current, Next.js canary/beta/RC, 기타 preview 의존성은 사용하지 않는다.

개발 시작 시 아래 결과를 확인한다.

```bash
node -v
npm -v
npm list next react react-dom typescript tailwindcss
```

문서 기준과 다른 버전이 설치되어 있으면 임의로 최신 major로 올리지 말고,
stable/LTS 범위에서 맞춘 뒤 변경 내용을 보고한다.


## 작업 목표

Google Sheets를 실제 CMS 저장소로 사용하는 도스·벳푸 일본 골프 여행 가이드 웹앱을 구현하라.

최우선:

```text
속도 > 단순함 > 관리자 편의성
```

## 중요

기존 NowTravel 프로젝트와 연결하지 말고 완전 별도 프로젝트로 유지한다.

Google Sheet:

- golf_courses
- hotels
- travel_times
- restaurants
- faq
- admin_options

를 사용한다.

관리자는 컴퓨터를 거의 모르는 사용자라고 가정한다.

따라서 관리자 UI에서:

- 영어 코드
- ID
- related_id
- sort 숫자
- TRUE/FALSE

를 노출하지 않는다.

모두 한국어 UI와 선택형 입력으로 처리한다.

## 관리자 질문 카테고리

반드시 아래 9개:

- 골프장
- 호텔
- 온천
- 차량
- 맛집
- 기타
- 환불
- 환전
- 추가결제

## 정렬

관리자에게 정렬 숫자를 입력시키지 않는다.

`위로 / 아래로` 버튼으로 변경하고 내부 sort는 자동 재계산한다.

## 성능

- 고객 브라우저에서 Google Sheets 직접 호출 금지
- 서버에서 읽고 10~30분 캐시
- 관리자 저장 성공 시 관련 캐시 무효화
- Google Maps iframe 초기 로딩 금지
- 필요 시 Maps 링크만 제공
- 외부 라이브러리 최소화
- 고객 페이지 client JS 최소화

## 구현 순서

1. 현재 문서 정합성 확인
2. 기본 프로젝트 구조
3. Google Sheets read
4. 고객 페이지
5. 관리자 인증
6. FAQ CRUD
7. 정렬
8. 캐시 무효화
9. 모바일 QA
10. 성능 QA
11. 문서 업데이트

## 수정 원칙

필요 이상의 기능을 만들지 않는다.

문서와 구현이 다르면 구현 완료 후 문서를 현재 코드 기준으로 업데이트한다.

## 완료 보고

아래 형식으로만 보고:

1. 생성/수정 파일
2. 구현 완료 페이지
3. Google Sheets 연결
4. 관리자 기능
5. 캐시 방식
6. 테스트
7. 남은 TODO
