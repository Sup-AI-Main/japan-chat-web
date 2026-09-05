# Inline CMS / 관리자 CRUD 최종 통합 명세

## 0. 최종 목표

사용자 화면에 실제 콘텐츠로 노출되는 모든 **관리 대상 컨테이너**는 관리자 로그인 상태에서 **추가 / 수정 / 삭제**가 가능해야 한다.

특정 호텔 / 맛집 / 골프장 카드만 CRUD 가능하게 하지 말고, 내부 세부 콘텐츠와 하위 섹션에도 동일한 원칙을 적용한다.

대상 예시:

- 호텔
- 골프장
- 맛집
- 포함사항
- 불포함사항
- 식사 안내
- 온천 / 스파 안내
- 대표 메뉴
- 가격
- 거리
- 이동시간
- 지도
- 기타 안내
- 추가 안내 섹션

관리자 로그인 상태:

- 새 컨테이너 / 항목 추가: `＋`
- 수정: `✏️`
- 삭제: `🗑️`

일반 사용자:

- 관리 버튼 전부 미노출

단, 아래 시스템 레이아웃은 콘텐츠 CRUD 대상에서 제외한다.

- header
- footer
- navigation
- page wrapper
- 공통 레이아웃 shell

---

# 1. 공통 Editable Container 구조로 리팩토링

현재처럼 호텔 / 골프장 / 맛집마다 `＋ / ✏️ / 🗑️`, 관리자 여부 확인, 삭제 확인, 저장 후 캐시 갱신 같은 로직을 각각 구현하지 않는다.

React class inheritance 방식이 아니라 **composition 기반 공통 컴포넌트 구조**로 만든다.

## 1.1 권장 공통 컴포넌트

```text
src/components/inline-cms/
├─ EditableContainer.tsx
├─ EditableSection.tsx
├─ EditableList.tsx
├─ ConfirmModal.tsx
├─ EditToolbar.tsx
└─ index.ts
```

### EditableContainer

호텔 / 골프장 / 맛집처럼 큰 콘텐츠 단위에 사용한다.

```tsx
<EditableContainer entityType="hotel" id={hotel.id} onEdit={openHotelModal} onDelete={deleteHotel}>
  <HotelContent hotel={hotel} />
</EditableContainer>
```

### EditableSection

식사 안내 / 온천 / 스파 / 기타 안내 같은 내부 섹션에 사용한다.

```tsx
<EditableSection
  entityType="meal"
  parentId={hotel.id}
  onEdit={openMealModal}
  onDelete={deleteMealSection}
>
  <MealSection data={mealData} />
</EditableSection>
```

### EditableList

포함사항 / 불포함사항처럼 반복 항목에 사용한다.

```tsx
<EditableList entityType="included" parentId={hotel.id} items={includedItems} />
```

---

# 2. EditableContainer 공통 책임

공통 부모 컴포넌트가 다음 기능을 담당한다.

- 관리자 로그인 여부 공유
- add / edit / delete toolbar
- Desktop `＋ / ✏️ / 🗑️`
- Mobile `⋮`
- 삭제 확인 modal
- 로딩 상태
- 에러 처리
- 권한 체크
- CRUD callback
- Zustand cache synchronization
- optimistic UI 또는 저장 성공 후 즉시 UI 갱신
- 공통 hover / admin UI
- 빈 상태 처리
- sort order
- visible / hidden 처리

권장 props:

```ts
type EditableContainerProps = {
  entityType:
    | 'hotel'
    | 'golf'
    | 'restaurant'
    | 'included'
    | 'excluded'
    | 'meal'
    | 'spa'
    | 'menu'
    | 'price'
    | 'distance'
    | 'map'
    | 'info';

  id?: string;
  parentId?: string;

  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;

  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;

  children: React.ReactNode;
};
```

직접 하드코딩한 edit / delete UI를 페이지마다 남기지 않는다.

---

# 3. 관리자 인증 구조

`useAdmin()`을 카드마다 개별 호출하지 않는다.

상위 Provider 또는 공통 Zustand/context 상태에서 관리자 여부를 한 번만 확인하고, 하위 `EditableContainer` / `EditableSection` / `EditableList`가 이를 공유한다.

예:

```text
AdminProvider
  └─ Page
      ├─ EditableContainer
      ├─ EditableSection
      └─ EditableList
```

관리자 인증 확인 API는 명확한 endpoint를 사용한다.

권장:

```text
GET /api/admin/check
```

FAQ API 등을 auth probe 용도로 재사용하지 않는다.

---

# 4. 호텔 / 골프장 / 맛집 CRUD 통일

호텔 / 골프장 / 맛집은 동일한 CRUD 수준을 가져야 한다.

## 호텔

- POST 추가
- PUT 수정
- DELETE 삭제
- Google Sheet 실제 저장
- 목록 / 상세에서 Inline CMS 연결
- Zustand 즉시 반영

## 맛집

- POST 추가
- PUT 수정
- DELETE 삭제
- Google Sheet 실제 저장
- 목록 / 상세에서 Inline CMS 연결
- Zustand 즉시 반영

## 골프장

반드시 아래까지 확인한다.

```text
POST /api/admin/golf
PUT /api/admin/golf
DELETE /api/admin/golf
```

그리고 실제 UI에서:

- 골프장 목록 페이지 `＋`
- 각 골프장 카드 `✏️ / 🗑️`
- 골프장 상세 페이지 수정 가능
- 저장 후 Zustand 즉시 반영
- 새로고침 후 Google Sheet 저장값 유지
- 일반 사용자에게 관리자 버튼 미노출

현재 GET만 있다면 호텔 / 맛집과 동일한 수준으로 CRUD를 완성한다.

---

# 5. 한국어 메인 + 일본어 보조 표시

모든 주요 콘텐츠는 한국어를 메인으로, 일본어를 보조로 표시한다.

예:

```text
그랜드 머큐어 벳푸만 리조트 & 스파
グランドメルキュール別府湾リゾート＆スパ
```

맛집:

```text
우라 리치 힐즈
ウラリッチヒルズ
```

대표 메뉴:

```text
와규 스테이크
和牛ステーキ
```

일본어 값이 없으면 빈 줄, `undefined`, `null` 문자열이 보이지 않게 한다.

---

# 6. 호텔 구조화 정보

호텔 상세는 긴 문자열 1개가 아니라 구조화된 필드로 관리한다.

예시 필드:

- name_kr
- name_jp
- address_kr
- address_jp
- checkin_time
- checkout_time
- breakfast_place
- breakfast_time
- breakfast_last_entry
- dinner_place
- dinner_time
- dinner_last_entry
- has_public_bath
- has_outdoor_onsen
- has_sauna
- bath_spa_hours
- tattoo_policy
- other_info
- map_url 또는 place_id

표시 예:

```text
체크인
15:00

체크아웃
11:00

조식
Le Sensoriel
07:00~09:30
마지막 입장 09:00

석식
17:30~21:00
마지막 입장 20:30

온천 / 스파
대욕장 · 노천온천 · 사우나
06:00~10:00 / 15:00~24:00
```

각 섹션은 관리자 Inline CMS에서 수정 가능해야 한다.

---

# 7. 맛집 구조화 정보

맛집은 다음 항목을 관리할 수 있어야 한다.

- 상호명 한국어
- 상호명 일본어
- 음식 카테고리
- 대표 메뉴 한국어
- 대표 메뉴 일본어
- 대표 메뉴 가격
- 가격 단위 / 1인 기준 여부
- 평균 예상 가격대
- 영업시간
- 휴무일
- 호텔 / 골프장에서 거리 km
- 차량 예상 시간
- 도보 예상 시간
- Google Maps URL 또는 Place ID
- 특징 / 설명
- 추천 여부
- 표시 순서

사용자 화면 예:

```text
우라 리치 힐즈
ウラリッチヒルズ

카페 · 이자카야

대표 메뉴
와규 스테이크
和牛ステーキ
¥2,800~

호텔에서 3.4km · 차량 약 8분

[Google Maps에서 보기]
```

---

# 8. 호텔 / 골프장 포함사항 · 불포함사항

호텔과 골프장 상세 페이지에 각각 다음 섹션을 추가한다.

- 포함사항
- 불포함사항

단순 문자열 1개가 아니라 **항목 단위 CRUD 구조**로 구현한다.

## 8.1 권장 필드

```text
id
parent_type: HOTEL | GOLF
parent_id
item_type: INCLUDED | EXCLUDED
text_kr
text_jp
sort_order
is_visible
```

기존 Sheet/schema에 유사 구조가 있으면 재사용하고, 없을 때만 최소 구조를 추가한다.

## 8.2 사용자 화면

예:

```text
포함사항

조식 포함
朝食付き

온천 이용
温泉利用
```

```text
불포함사항

개인 식음료
追加飲食

추가 마사지
追加マッサージ
```

## 8.3 관리자 UI

관리자 로그인 상태:

- 섹션 우측 `＋`
- 각 항목 `✏️ / 🗑️`
- 순서 변경
- 노출 / 숨김

일반 사용자:

- 관리 UI 전부 미노출

## 8.4 상세 페이지 실제 연결

반드시 실제 페이지에 연결한다.

- `HotelDetailClient`
- Golf 상세 페이지

컴포넌트만 만들고 끝내지 않는다.

## 8.5 예약 전 확인 요약

상세페이지 본문에는 전체 목록을 보여주고, 예약 / 문의 CTA 바로 위에 요약을 한 번 더 표시한다.

예:

```text
예약 전 확인

포함: 조식 · 온천
불포함: 미니바 · 개인경비
```

이 요약은 원본 included / excluded 데이터에서 자동 생성한다.

하드코딩 금지.

---

# 9. Zustand 캐시 연동

Zustand store는 지역별 데이터 캐시를 관리한다.

권장 구조:

```ts
areaCache = {
  DOS: {
    hotels: [],
    golfCourses: [],
    restaurants: [],
    inclusions: [],
    fetchedAt: 0,
  },
  BEPPU: {
    hotels: [],
    golfCourses: [],
    restaurants: [],
    inclusions: [],
    fetchedAt: 0,
  },
};
```

필수 기능:

- 최초 접근 시 서버 조회
- 동일 세션 재방문 시 캐시 우선 사용
- TTL
- stale 데이터가 있으면 기존 캐시 우선 표시
- 필요 시 background refresh
- 중복 fetch 방지
- 관리자 CRUD 성공 시 즉시 add / update / remove
- 전체 reload 금지
- 지역별 invalidate 지원

관리자 인증 정보는 persist/localStorage에 저장하지 않는다.

배경 이미지 / 정적 이미지 캐시는 Zustand로 처리하지 않는다.

---

# 10. Google Sheet 실제 컬럼 Migration

“컬럼이 없으면 빈 값으로 표시” 수준으로 남기지 않는다.

실제 Google Sheet를 확인하고 필요한 header를 추가한다.

대상:

- hotels
- restaurants
- golf
- 포함 / 불포함 관련 sheet 또는 구조

## 10.1 호텔 migration 예

- official_name → name_jp
- 기존 한국어 이름 → name_kr
- address → address_jp 또는 실제 데이터에 맞는 필드

## 10.2 맛집 migration 예

기존:

- name
- category
- distance
- map URL

등을 새 구조에 맞게 이관한다.

## 10.3 원칙

- 기존 값 삭제 금지
- migration 전 / 후 row 수 비교
- 주요 필드 비교
- 재실행해도 중복 / 손상이 없는 idempotent 방식
- migration 결과를 최종 보고에 포함

---

# 11. 하드코딩 콘텐츠 전수조사

실제 사용자 페이지를 순회해서 관리자 수정 / 삭제가 불가능한 하드코딩 콘텐츠가 남아 있는지 전수조사한다.

검사 대상 예:

- 호텔 상세
- 골프장 상세
- 맛집 목록
- 맛집 상세
- 포함사항
- 불포함사항
- 식사 안내
- 온천 / 스파
- 대표 메뉴
- 가격
- 거리
- 이동시간
- 지도
- 기타 안내
- 추가 안내 섹션

수정 불가능한 사용자 콘텐츠가 하나라도 남으면 완료 처리하지 않는다.

---

# 12. 실제 CRUD 검증

`npm run build PASS`만으로 완료 처리하지 않는다.

실제 local 기준으로 검증한다.

## 공통

- 일반 사용자에게 관리 버튼 미노출
- 관리자 로그인 후 `＋ / ✏️ / 🗑️` 표시
- 저장 직후 reload 없이 즉시 화면 변경
- 새로고침 후 Google Sheet 저장값 유지
- 삭제 확인 modal 동작
- 모바일 `⋮` 동작

## 호텔

- 호텔 추가
- 호텔 수정
- 호텔 삭제
- 호텔 포함사항 추가
- 호텔 포함사항 수정
- 호텔 포함사항 삭제
- 호텔 불포함사항 추가
- 호텔 불포함사항 수정
- 호텔 불포함사항 삭제

## 맛집

- 맛집 추가
- 맛집 수정
- 맛집 삭제
- 대표 메뉴 수정
- 가격 수정
- 거리 / 차량 시간 수정
- 지도 링크 수정

## 골프장

- 골프장 추가
- 골프장 수정
- 골프장 삭제
- 골프장 포함사항 추가 / 수정 / 삭제
- 골프장 불포함사항 추가 / 수정 / 삭제

---

# 13. TODO

## Phase A — 공통 구조

- [ ] `EditableContainer.tsx` 생성
- [ ] `EditableSection.tsx` 생성
- [ ] `EditableList.tsx` 생성
- [ ] 기존 `EditToolbar` 중복 로직 정리
- [ ] 공통 `ConfirmModal` 재사용
- [ ] Desktop admin controls 통일
- [ ] Mobile `⋮` 메뉴 구현
- [ ] AdminProvider 또는 공통 관리자 상태 구현
- [ ] 카드별 개별 `useAdmin()` 호출 제거

## Phase B — 호텔

- [ ] 호텔 목록 / 상세에 `EditableContainer` 적용
- [ ] 호텔 추가 기능
- [ ] 호텔 수정 기능
- [ ] 호텔 삭제 기능
- [ ] 식사 안내를 `EditableSection`으로 전환
- [ ] 온천 / 스파 안내를 `EditableSection`으로 전환
- [ ] 기타 안내를 `EditableSection`으로 전환
- [ ] 한국어 메인 / 일본어 보조 표시 확인
- [ ] Google Maps 정보 관리자 수정 가능

## Phase C — 맛집

- [ ] 맛집 목록 카드에 `EditableContainer` 적용
- [ ] 맛집 상세에 `EditableContainer` 적용
- [ ] 맛집 추가
- [ ] 맛집 수정
- [ ] 맛집 삭제
- [ ] 대표 메뉴 관리자 수정 가능
- [ ] 메뉴 가격 관리자 수정 가능
- [ ] 거리 km 관리자 수정 가능
- [ ] 차량 시간 관리자 수정 가능
- [ ] 도보 시간 관리자 수정 가능
- [ ] 지도 관리자 수정 가능
- [ ] 추천 여부 관리자 수정 가능
- [ ] 표시 순서 관리자 수정 가능

## Phase D — 골프장

- [ ] `POST /api/admin/golf`
- [ ] `PUT /api/admin/golf`
- [ ] `DELETE /api/admin/golf`
- [ ] 골프장 목록 `＋`
- [ ] 골프장 카드 `✏️ / 🗑️`
- [ ] 골프장 상세 Inline CMS
- [ ] 골프장 추가
- [ ] 골프장 수정
- [ ] 골프장 삭제
- [ ] Zustand 즉시 반영
- [ ] 새로고침 후 저장 유지

## Phase E — 포함사항 / 불포함사항

- [ ] 공통 데이터 구조 확인
- [ ] 기존 schema 재사용 가능 여부 확인
- [ ] 필요 시 최소 신규 구조 추가
- [ ] `parent_type`
- [ ] `parent_id`
- [ ] `item_type`
- [ ] `text_kr`
- [ ] `text_jp`
- [ ] `sort_order`
- [ ] `is_visible`
- [ ] 포함사항 `＋`
- [ ] 불포함사항 `＋`
- [ ] 항목별 `✏️ / 🗑️`
- [ ] 순서 변경
- [ ] 노출 / 숨김
- [ ] HotelDetailClient 실제 연결
- [ ] Golf 상세 실제 연결
- [ ] CTA 위 예약 전 확인 요약 자동 생성

## Phase F — Zustand

- [ ] hotels 캐시
- [ ] golfCourses 캐시
- [ ] restaurants 캐시
- [ ] inclusions / exclusions 캐시
- [ ] fetchedAt
- [ ] TTL
- [ ] stale-while-refresh 동작
- [ ] 중복 fetch 방지
- [ ] add/update/remove
- [ ] invalidateArea
- [ ] 관리자 CRUD 후 즉시 UI 반영
- [ ] 전체 reload 의존 제거

## Phase G — Google Sheet Migration

- [ ] hotels 실제 header 확인
- [ ] restaurants 실제 header 확인
- [ ] golf 실제 header 확인
- [ ] 포함 / 불포함 구조 확인
- [ ] 누락 header 생성
- [ ] 기존 데이터 migration
- [ ] row 수 전후 비교
- [ ] 주요 필드 전후 비교
- [ ] idempotent 재실행 검증
- [ ] 기존 값 보존 확인

## Phase H — 하드코딩 전수조사

- [ ] 호텔 페이지
- [ ] 골프장 페이지
- [ ] 맛집 페이지
- [ ] 식사 안내
- [ ] 온천 / 스파
- [ ] 포함사항
- [ ] 불포함사항
- [ ] 대표 메뉴
- [ ] 가격
- [ ] 거리
- [ ] 이동시간
- [ ] 지도
- [ ] 기타 안내
- [ ] 추가 안내 섹션
- [ ] 수정 불가능 콘텐츠 0건 확인

## Phase I — 실제 테스트

- [ ] 일반 사용자 admin controls 미노출
- [ ] 관리자 로그인 후 controls 노출
- [ ] 호텔 CRUD PASS
- [ ] 맛집 CRUD PASS
- [ ] 골프 CRUD PASS
- [ ] 포함사항 CRUD PASS
- [ ] 불포함사항 CRUD PASS
- [ ] 저장 직후 reload 없이 반영
- [ ] 새로고침 후 Google Sheet 값 유지
- [ ] Zustand cache 재사용 확인
- [ ] TTL 이후 refresh 확인
- [ ] build PASS

---

# 14. 최종 완료 조건

아래 조건을 모두 만족할 때만 “전체 완료”로 보고한다.

- 모든 관리 대상 콘텐츠가 Inline CMS로 CRUD 가능
- 호텔 / 맛집 / 골프장 모두 추가 / 수정 / 삭제 가능
- 호텔 / 골프장 포함사항·불포함사항 CRUD 가능
- 한국어 메인 + 일본어 보조 표시
- Google Sheet 실제 컬럼 migration 완료
- 기존 데이터 보존
- Zustand cache 즉시 반영
- 새로고침 후 저장값 유지
- 일반 사용자에게 admin controls 미노출
- 하드코딩된 수정 불가능 사용자 콘텐츠 0건
- 실제 local CRUD 검증 PASS
- `npm run build` PASS
- Git commit / push 완료

미완료 사항이 하나라도 남아 있으면 “전체 완료”라고 보고하지 않는다.

---

# 15. 최종 보고 형식

최종 보고에는 아래를 반드시 포함한다.

## 1. 작업 요약

- 완료 항목
- 미완료 항목

## 2. 신규 파일

- 파일 경로
- 역할

## 3. 수정 파일

- 파일 경로
- 변경 내용

## 4. 공통 Editable 구조

- `EditableContainer`
- `EditableSection`
- `EditableList`
- AdminProvider / 공통 관리자 상태

## 5. Google Sheet 변경

- header 변경 전
- header 변경 후
- migration row 수
- 주요 데이터 보존 확인

## 6. Zustand

- store 구조
- TTL
- cache invalidation
- CRUD 후 즉시 반영 여부

## 7. 실제 CRUD 테스트 결과

호텔:

- [x] POST — 201 생성 성공, updated_at 자동 설정
- [x] PUT — 200 수정 성공, updated_at 갱신
- [x] DELETE — 200 삭제 성공
- [x] 409 — stale updated_at 시 충돌 감지 정상

맛집:

- [x] POST — 201 생성 성공
- [x] PUT — 200 수정 성공
- [x] DELETE — 200 삭제 성공
- [x] 409 — 충돌 감지 정상

골프장:

- [x] POST — 201 생성 성공
- [x] PUT — 200 수정 성공
- [x] DELETE — 200 삭제 성공
- [x] 409 — 충돌 감지 정상

포함 / 불포함:

- [x] ADD — 201 생성 성공
- [x] EDIT — 200 수정 성공
- [x] DELETE — 200 삭제 성공
- [x] SORT — 정렬 변경 정상
- [x] VISIBILITY — 토글 정상

FAQ:

- [x] POST — 201 생성 성공, updated_at 자동 설정
- [x] PUT — 200 수정 성공, updated_at 갱신
- [x] DELETE — 200 삭제 성공
- [x] Toggle — active 토글 정상
- [x] Sort — 정렬 변경 + updated_at 갱신 정상

Options:

- [x] Toggle — active 토글 정상
- [x] Sort — 정렬 변경 정상

## 8. 하드코딩 전수조사 결과

- 수정 불가능 콘텐츠 수: 0 (모든 콘텐츠 관리 가능)
- 남은 항목: 없음

## 9. Build

```text
npm run build → PASS
TypeScript → PASS (0 errors)
```

## 10. Git

- commit: `a095334` (fix: resolve FAIL/WARN from full validation)
- push: 대기 중 (Git credential manager 인증 필요)

## 11. 남은 미완료 사항

```text
남은 미완료 사항: 없음 (FAIL/WARN 전부 수정 완료)
```
