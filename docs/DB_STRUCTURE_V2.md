# DB Structure V2

## 관계도

```text
areas
  └── entities
        ├── golf_courses
        ├── hotels
        ├── restaurants
        │     └── restaurant_locations ──> entities
        ├── content_sections
        └── includes_excludes

categories
  └── faq
        └── related_entity_id ──> entities

entities
  └── travel_times
        ├── from_entity_id
        └── to_entity_id
```

## 핵심 테이블

### areas
실제 지역만 관리합니다. `DOS`, `BEPPU`.

### categories
골프장/호텔/음식점/온천/차량/기타/환불/환전/추가결제 및 시스템 카테고리.

### entities
모든 장소/콘텐츠 대상의 공통 identity입니다.

- `slug`: 기존 문자열 ID 및 URL 키
- `entity_type`: GOLF / HOTEL / RESTAURANT / PLACE
- `area_id`
- `display_name`
- `active`
- `sort`

### golf_courses / hotels / restaurants
각 entity 타입의 상세 필드만 저장합니다.

### restaurant_locations
한 식당이 여러 호텔/골프장/장소와 가까울 수 있으므로 거리 관계를 별도 저장합니다.

### travel_times
호텔→골프장 같은 이동 관계를 FK로 저장합니다. `display_time`은 기존 문자열 표현을 보존하고 `min_minutes/max_minutes`는 검색·정렬·계산용입니다.

### faq
`category_id`, `related_entity_id`가 FK입니다. `related_name`은 저장하지 않고 `entities.display_name`을 JOIN합니다. `area_id=NULL`은 공통(ALL)을 뜻합니다.

### content_sections
골프장/호텔 등 상세 페이지의 반복 가능한 안내 블록입니다.

### includes_excludes
포함/불포함 반복 항목입니다.
