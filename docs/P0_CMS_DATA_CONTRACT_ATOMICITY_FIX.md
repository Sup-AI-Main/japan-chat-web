# P0 CMS Data Contract / Atomicity Fix Plan

## 기준

- Repository: `Sup-AI-Main/japan-chat-web`
- Base branch: `main`
- Starting HEAD: `41c6444a4a0b1cbdd5055a776a5995244ae956b9`
- Supabase project ref: `hzmaypxlpzbnfkevpqss`
- Supabase project name: `japan-chat-web`

> 반드시 `AGENTS.md`를 먼저 읽고 적용한다.  
> 이번 작업은 **P0만 수정**한다. P1/P2 리팩터링, UI 디자인 변경, unrelated cleanup은 하지 않는다.

## 작업 원칙

- Production 데이터 임의 삭제 금지
- `test_hotel_1`, `test_golf_1`, `dos_hotel_` 삭제 금지
- QA 문서 체크박스를 먼저 `[x]` 처리하지 않는다
- 실제 코드/DB/build/Production QA 통과 후에만 문서를 갱신한다
- Supabase DDL은 반드시 migration 파일로 관리한다
- `service_role`/secret key를 Client Component 또는 `NEXT_PUBLIC_` 변수에 노출하지 않는다
- `restaurant_locations`의 다중 관계를 전부 삭제/재작성하지 않는다
- RestaurantEditModal은 **primary location(정렬상 첫 relation)** 만 수정하고 secondary relation은 보존한다

## P0 목표

1. `field_definitions`의 `field_key` unique 설계를 entity type별로 정상화
2. HOTEL/GOLF/RESTAURANT Modal의 `fieldKey`와 DB `field_definitions.field_key` 계약 일치
3. HOTEL `name_jp` / `address_jp` CREATE → READ → UPDATE round-trip 보장
4. Restaurant CREATE를 entity/restaurants/location/EAV까지 atomic 처리
5. Restaurant UPDATE에서 primary location + `name_jp`까지 atomic 처리
6. 존재하지 않는 UPDATE/DELETE를 HTTP 200 success로 처리하지 않고 404
7. Hotel/Golf child row 0 rows affected를 성공으로 판정하지 않음
8. Restaurant 연결 호텔/골프 옵션 API 응답 파싱 오류 수정
9. entity type별 duplicate `field_key` 허용 후 EAV definition lookup scope 오류 방지

---

# 1. Supabase migration

새 파일:

```text
supabase/migrations/20260921120000_p0_cms_contract_atomicity.sql
```

아래 SQL을 기반으로 작성한다.

```sql
BEGIN;

-- =========================================================
-- A. HOTEL 일본어 주소 core storage
-- =========================================================

ALTER TABLE public.hotels
ADD COLUMN IF NOT EXISTS address_jp text;


-- =========================================================
-- B. field_definitions uniqueness contract
-- =========================================================

DROP INDEX IF EXISTS public.idx_fd_key_global;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_key_global
ON public.field_definitions(field_key)
WHERE scope_entity_id IS NULL
  AND scope_entity_type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_key_entity_type
ON public.field_definitions(scope_entity_type, field_key)
WHERE scope_entity_id IS NULL
  AND scope_entity_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_key_per_entity
ON public.field_definitions(field_key, scope_entity_id)
WHERE scope_entity_id IS NOT NULL;

UPDATE public.field_definitions
SET scope_type = 'ENTITY_TYPE'
WHERE scope_entity_type IN ('HOTEL', 'GOLF', 'RESTAURANT')
  AND scope_entity_id IS NULL
  AND scope_type IS DISTINCT FROM 'ENTITY_TYPE';


-- =========================================================
-- C. Restaurant UI sections
-- =========================================================

INSERT INTO public.section_definitions
  (entity_type, section_key, label_ko, label_ja, sort, is_visible)
SELECT
  'RESTAURANT', 'distance', '위치/거리', '位置/距離', 15, true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.section_definitions
  WHERE entity_type = 'RESTAURANT'
    AND section_key = 'distance'
);

INSERT INTO public.section_definitions
  (entity_type, section_key, label_ko, label_ja, sort, is_visible)
SELECT
  'RESTAURANT', 'nearby_restaurants', '연결 정보', '関連情報', 16, true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.section_definitions
  WHERE entity_type = 'RESTAURANT'
    AND section_key = 'nearby_restaurants'
);


-- =========================================================
-- D. Modal에서 실제 사용하는 field definition 보강
-- =========================================================

WITH defs(
  entity_type,
  field_key,
  label_ko,
  label_ja,
  field_type,
  section_key,
  sort
) AS (
  VALUES
    ('HOTEL', 'display_name',    '호텔명 (한국어)',   'ホテル名（韓国語）', 'text',    'basic_info', 0),
    ('HOTEL', 'address',         '주소 (한국어)',     '住所（韓国語）',     'text',    'address',    1),
    ('HOTEL', 'address_jp',      '주소 (일본어)',     '住所（日本語）',     'text',    'address',    2),
    ('HOTEL', 'phone',           '전화',              '電話',               'text',    'phone',      1),
    ('HOTEL', 'google_maps_url', 'Google Maps URL',   'Google Maps URL',    'url',     'address',    3),

    ('GOLF', 'display_name',     '표시명',            '表示名',             'text',    'basic_info', 0),
    ('GOLF', 'google_maps_url',  'Google Maps URL',   'Google Maps URL',    'url',     'basic_info', 4),

    ('RESTAURANT', 'name',             '식당명 (한국어)',       '店名（韓国語）',      'text',     'basic_info',         0),
    ('RESTAURANT', 'rest_name_jp',     '식당명 (일본어)',       '店名（日本語）',      'text',     'basic_info',         1),
    ('RESTAURANT', 'address',          '주소',                  '住所',                 'text',     'address',            1),
    ('RESTAURANT', 'phone',            '전화',                  '電話',                 'text',     'phone',              1),
    ('RESTAURANT', 'google_maps_url',  'Google Maps URL',       'Google Maps URL',      'url',      'address',            2),
    ('RESTAURANT', 'menu_jp',          '메뉴 (일본어)',         'メニュー（日本語）',   'textarea', 'menu',               3),
    ('RESTAURANT', 'description',      '설명',                  '説明',                 'textarea', 'other_info',         1),
    ('RESTAURANT', 'recommended',      '추천 식당',             'おすすめ',             'boolean',  'other_info',         2),
    ('RESTAURANT', 'distance_km',      '거리 (km)',             '距離 (km)',            'number',   'distance',           1),
    ('RESTAURANT', 'drive_minutes',    '차량 소요시간 (분)',    '車移動時間（分）',     'number',   'distance',           2),
    ('RESTAURANT', 'walk_minutes',     '도보 소요시간 (분)',    '徒歩時間（分）',       'number',   'distance',           3),
    ('RESTAURANT', 'near_type',        '연결 유형',             '関連タイプ',           'select',   'nearby_restaurants', 1),
    ('RESTAURANT', 'near_id',          '연결 대상',             '関連先',               'select',   'nearby_restaurants', 2)
)
INSERT INTO public.field_definitions (
  field_key,
  label_ko,
  label_ja,
  field_type,
  scope_type,
  scope_entity_type,
  section_key,
  sort,
  active
)
SELECT
  d.field_key,
  d.label_ko,
  d.label_ja,
  d.field_type,
  'ENTITY_TYPE',
  d.entity_type,
  d.section_key,
  d.sort,
  true
FROM defs d
WHERE NOT EXISTS (
  SELECT 1
  FROM public.field_definitions fd
  WHERE fd.scope_entity_type = d.entity_type
    AND fd.field_key = d.field_key
    AND fd.scope_entity_id IS NULL
);

UPDATE public.field_definitions
SET
  label_ko = '호텔명 (일본어)',
  label_ja = 'ホテル名（日本語）',
  section_key = 'basic_info',
  scope_type = 'ENTITY_TYPE'
WHERE scope_entity_type = 'HOTEL'
  AND field_key = 'official_name'
  AND scope_entity_id IS NULL;

UPDATE public.field_definitions
SET
  label_ko = '주소 (한국어)',
  label_ja = '住所（韓国語）',
  scope_type = 'ENTITY_TYPE'
WHERE scope_entity_type = 'HOTEL'
  AND field_key = 'address'
  AND scope_entity_id IS NULL;

UPDATE public.field_definitions
SET
  label_ko = '식당명 (한국어)',
  label_ja = '店名（韓国語）',
  section_key = 'basic_info',
  scope_type = 'ENTITY_TYPE'
WHERE scope_entity_type = 'RESTAURANT'
  AND field_key = 'name'
  AND scope_entity_id IS NULL;

UPDATE public.field_definitions
SET
  label_ko = '식당명 (일본어)',
  label_ja = '店名（日本語）',
  section_key = 'basic_info',
  scope_type = 'ENTITY_TYPE'
WHERE scope_entity_type = 'RESTAURANT'
  AND field_key = 'rest_name_jp'
  AND scope_entity_id IS NULL;


-- =========================================================
-- E. Restaurant full atomic CREATE
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_create_restaurant_full(
  p_area_id uuid,
  p_slug text,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entity_id uuid;
  v_near_entity_id uuid;
  v_field_definition_id uuid;
  v_name_jp text;
BEGIN
  INSERT INTO public.entities (
    slug, display_name, entity_type, area_id, active, sort
  )
  VALUES (
    p_slug,
    COALESCE(NULLIF(p_payload->>'name_kr', ''), NULLIF(p_payload->>'name', ''), ''),
    'RESTAURANT',
    p_area_id,
    COALESCE((p_payload->>'active')::boolean, true),
    COALESCE(NULLIF(p_payload->>'sort', '')::integer, 999)
  )
  RETURNING id INTO v_entity_id;

  INSERT INTO public.restaurants (
    entity_id, category, address, hours, price_range, phone,
    menu_kr, menu_jp, menu_price, closed_days, description,
    recommended, google_maps_url, source_url, status, last_verified
  )
  VALUES (
    v_entity_id,
    COALESCE(p_payload->>'category', ''),
    COALESCE(p_payload->>'address', ''),
    COALESCE(p_payload->>'hours', ''),
    COALESCE(p_payload->>'price_range', ''),
    COALESCE(p_payload->>'phone', ''),
    COALESCE(p_payload->>'menu_kr', ''),
    COALESCE(p_payload->>'menu_jp', ''),
    COALESCE(p_payload->>'menu_price', ''),
    COALESCE(p_payload->>'closed_days', ''),
    COALESCE(p_payload->>'description', ''),
    CASE
      WHEN p_payload ? 'recommended'
      THEN (p_payload->>'recommended')::boolean
      ELSE NULL
    END,
    COALESCE(p_payload->>'google_maps_url', ''),
    COALESCE(p_payload->>'source_url', ''),
    COALESCE(p_payload->>'status', ''),
    NULLIF(p_payload->>'last_verified', '')::date
  );

  IF COALESCE(p_payload->>'near_type', 'AREA') IN ('HOTEL', 'GOLF')
     AND NULLIF(p_payload->>'near_id', '') IS NOT NULL
  THEN
    SELECT e.id
      INTO v_near_entity_id
    FROM public.entities e
    WHERE e.slug = p_payload->>'near_id'
      AND e.entity_type = p_payload->>'near_type'
    LIMIT 1;

    IF v_near_entity_id IS NULL THEN
      RAISE EXCEPTION 'NEAR_ENTITY_NOT_FOUND'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.restaurant_locations (
      restaurant_entity_id, near_entity_id, distance_text,
      distance_km, drive_minutes, walk_minutes, sort
    )
    VALUES (
      v_entity_id,
      v_near_entity_id,
      NULLIF(p_payload->>'distance_text', ''),
      NULLIF(p_payload->>'distance_km', '')::numeric,
      NULLIF(p_payload->>'drive_minutes', '')::integer,
      NULLIF(p_payload->>'walk_minutes', '')::integer,
      1
    );
  END IF;

  v_name_jp := COALESCE(
    p_payload->>'name_jp',
    p_payload->>'rest_name_jp'
  );

  IF (p_payload ? 'name_jp') OR (p_payload ? 'rest_name_jp') THEN
    SELECT fd.id
      INTO v_field_definition_id
    FROM public.field_definitions fd
    WHERE fd.scope_entity_type = 'RESTAURANT'
      AND fd.field_key = 'rest_name_jp'
      AND fd.scope_entity_id IS NULL
    LIMIT 1;

    IF v_field_definition_id IS NULL THEN
      RAISE EXCEPTION 'RESTAURANT_NAME_JP_DEFINITION_MISSING'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.entity_field_values (
      entity_id, field_definition_id, value_text
    )
    VALUES (
      v_entity_id,
      v_field_definition_id,
      NULLIF(v_name_jp, '')
    )
    ON CONFLICT (entity_id, field_definition_id)
    DO UPDATE SET
      value_text = EXCLUDED.value_text,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'id', v_entity_id,
    'slug', p_slug
  );
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.admin_create_restaurant_full(uuid, text, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_create_restaurant_full(uuid, text, jsonb)
TO service_role;


-- =========================================================
-- F. Restaurant full atomic UPDATE
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_update_restaurant_full(
  p_entity_id uuid,
  p_expected_updated_at timestamptz,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_updated_at timestamptz;
  v_slug text;
  v_primary_location_id uuid;
  v_target_location_id uuid;
  v_near_entity_id uuid;
  v_field_definition_id uuid;
  v_name_jp text;
BEGIN
  SELECT e.updated_at, e.slug
    INTO v_current_updated_at, v_slug
  FROM public.entities e
  WHERE e.id = p_entity_id
    AND e.entity_type = 'RESTAURANT'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESTAURANT_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.entity_id = p_entity_id
  ) THEN
    RAISE EXCEPTION 'RESTAURANT_CHILD_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_expected_updated_at IS NOT NULL
     AND v_current_updated_at IS DISTINCT FROM p_expected_updated_at
  THEN
    RAISE EXCEPTION 'RESTAURANT_CONFLICT'
      USING ERRCODE = '40001';
  END IF;

  UPDATE public.entities e
  SET
    display_name = CASE
      WHEN (p_payload ? 'name_kr') OR (p_payload ? 'name')
      THEN COALESCE(NULLIF(p_payload->>'name_kr', ''), NULLIF(p_payload->>'name', ''), '')
      ELSE e.display_name
    END,
    active = CASE
      WHEN p_payload ? 'active'
      THEN (p_payload->>'active')::boolean
      ELSE e.active
    END,
    sort = CASE
      WHEN p_payload ? 'sort'
      THEN (p_payload->>'sort')::integer
      ELSE e.sort
    END,
    updated_at = now()
  WHERE e.id = p_entity_id;

  UPDATE public.restaurants r
  SET
    category = CASE WHEN p_payload ? 'category'
      THEN COALESCE(p_payload->>'category', '') ELSE r.category END,
    address = CASE WHEN p_payload ? 'address'
      THEN COALESCE(p_payload->>'address', '') ELSE r.address END,
    hours = CASE WHEN p_payload ? 'hours'
      THEN COALESCE(p_payload->>'hours', '') ELSE r.hours END,
    price_range = CASE WHEN p_payload ? 'price_range'
      THEN COALESCE(p_payload->>'price_range', '') ELSE r.price_range END,
    phone = CASE WHEN p_payload ? 'phone'
      THEN COALESCE(p_payload->>'phone', '') ELSE r.phone END,
    menu_kr = CASE WHEN p_payload ? 'menu_kr'
      THEN COALESCE(p_payload->>'menu_kr', '') ELSE r.menu_kr END,
    menu_jp = CASE WHEN p_payload ? 'menu_jp'
      THEN COALESCE(p_payload->>'menu_jp', '') ELSE r.menu_jp END,
    menu_price = CASE WHEN p_payload ? 'menu_price'
      THEN COALESCE(p_payload->>'menu_price', '') ELSE r.menu_price END,
    closed_days = CASE WHEN p_payload ? 'closed_days'
      THEN COALESCE(p_payload->>'closed_days', '') ELSE r.closed_days END,
    description = CASE WHEN p_payload ? 'description'
      THEN COALESCE(p_payload->>'description', '') ELSE r.description END,
    recommended = CASE WHEN p_payload ? 'recommended'
      THEN (p_payload->>'recommended')::boolean ELSE r.recommended END,
    google_maps_url = CASE WHEN p_payload ? 'google_maps_url'
      THEN COALESCE(p_payload->>'google_maps_url', '') ELSE r.google_maps_url END,
    source_url = CASE WHEN p_payload ? 'source_url'
      THEN COALESCE(p_payload->>'source_url', '') ELSE r.source_url END,
    status = CASE WHEN p_payload ? 'status'
      THEN COALESCE(p_payload->>'status', '') ELSE r.status END,
    last_verified = CASE WHEN p_payload ? 'last_verified'
      THEN NULLIF(p_payload->>'last_verified', '')::date ELSE r.last_verified END
  WHERE r.entity_id = p_entity_id;

  IF (p_payload ? 'near_type')
     OR (p_payload ? 'near_id')
     OR (p_payload ? 'distance_km')
     OR (p_payload ? 'drive_minutes')
     OR (p_payload ? 'walk_minutes')
  THEN
    SELECT rl.id
      INTO v_primary_location_id
    FROM public.restaurant_locations rl
    WHERE rl.restaurant_entity_id = p_entity_id
    ORDER BY rl.sort, rl.id
    LIMIT 1
    FOR UPDATE;

    IF COALESCE(p_payload->>'near_type', 'AREA') IN ('HOTEL', 'GOLF')
       AND NULLIF(p_payload->>'near_id', '') IS NOT NULL
    THEN
      SELECT e.id
        INTO v_near_entity_id
      FROM public.entities e
      WHERE e.slug = p_payload->>'near_id'
        AND e.entity_type = p_payload->>'near_type'
      LIMIT 1;

      IF v_near_entity_id IS NULL THEN
        RAISE EXCEPTION 'NEAR_ENTITY_NOT_FOUND'
          USING ERRCODE = 'P0002';
      END IF;

      SELECT rl.id
        INTO v_target_location_id
      FROM public.restaurant_locations rl
      WHERE rl.restaurant_entity_id = p_entity_id
        AND rl.near_entity_id = v_near_entity_id
      ORDER BY rl.sort, rl.id
      LIMIT 1
      FOR UPDATE;

      IF v_target_location_id IS NOT NULL THEN
        UPDATE public.restaurant_locations
        SET
          distance_km = NULLIF(p_payload->>'distance_km', '')::numeric,
          drive_minutes = NULLIF(p_payload->>'drive_minutes', '')::integer,
          walk_minutes = NULLIF(p_payload->>'walk_minutes', '')::integer,
          updated_at = now()
        WHERE id = v_target_location_id;

        IF v_primary_location_id IS NOT NULL
           AND v_primary_location_id <> v_target_location_id
        THEN
          DELETE FROM public.restaurant_locations
          WHERE id = v_primary_location_id;
        END IF;

      ELSIF v_primary_location_id IS NOT NULL THEN
        UPDATE public.restaurant_locations
        SET
          near_entity_id = v_near_entity_id,
          distance_km = NULLIF(p_payload->>'distance_km', '')::numeric,
          drive_minutes = NULLIF(p_payload->>'drive_minutes', '')::integer,
          walk_minutes = NULLIF(p_payload->>'walk_minutes', '')::integer,
          updated_at = now()
        WHERE id = v_primary_location_id;

      ELSE
        INSERT INTO public.restaurant_locations (
          restaurant_entity_id, near_entity_id,
          distance_km, drive_minutes, walk_minutes, sort
        )
        VALUES (
          p_entity_id,
          v_near_entity_id,
          NULLIF(p_payload->>'distance_km', '')::numeric,
          NULLIF(p_payload->>'drive_minutes', '')::integer,
          NULLIF(p_payload->>'walk_minutes', '')::integer,
          1
        );
      END IF;

    ELSE
      IF v_primary_location_id IS NOT NULL THEN
        DELETE FROM public.restaurant_locations
        WHERE id = v_primary_location_id;
      END IF;
    END IF;
  END IF;

  IF (p_payload ? 'name_jp') OR (p_payload ? 'rest_name_jp') THEN
    v_name_jp := COALESCE(
      p_payload->>'name_jp',
      p_payload->>'rest_name_jp'
    );

    SELECT fd.id
      INTO v_field_definition_id
    FROM public.field_definitions fd
    WHERE fd.scope_entity_type = 'RESTAURANT'
      AND fd.field_key = 'rest_name_jp'
      AND fd.scope_entity_id IS NULL
    LIMIT 1;

    IF v_field_definition_id IS NULL THEN
      RAISE EXCEPTION 'RESTAURANT_NAME_JP_DEFINITION_MISSING'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.entity_field_values (
      entity_id, field_definition_id, value_text
    )
    VALUES (
      p_entity_id,
      v_field_definition_id,
      NULLIF(v_name_jp, '')
    )
    ON CONFLICT (entity_id, field_definition_id)
    DO UPDATE SET
      value_text = EXCLUDED.value_text,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'id', p_entity_id,
    'slug', v_slug
  );
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.admin_update_restaurant_full(uuid, timestamptz, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_update_restaurant_full(uuid, timestamptz, jsonb)
TO service_role;

COMMIT;
```

---

# 2. `src/components/inline-cms/HotelEditModal.tsx`

`formKey`는 UI state 이름, `fieldKey`는 DB canonical key로 통일한다.

변경:

```ts
{ fieldKey: "display_name", formKey: "name_kr", fallback: "호텔명 (한국어)", placeholder: "호텔 이름" },
{ fieldKey: "official_name", formKey: "name_jp", fallback: "호텔명 (일본어)", placeholder: "公式名称" },
{ fieldKey: "address", formKey: "address_kr", fallback: "주소 (한국어)", placeholder: "주소" },
{ fieldKey: "address_jp", formKey: "address_jp", fallback: "주소 (일본어)", placeholder: "住所" },
{ fieldKey: "transport_note", formKey: "transport", fallback: "교통", placeholder: "공항에서 차량 약60분" },
```

`handleSave()` payload alias는 유지:

```ts
const payload: HotelFormPayload = {
  ...form,
  display_name: form.name_kr,
  address: form.address_kr,
  transport_note: form.transport,
  official_name: form.name_jp,
  id: hotel?.id,
  area: area.toUpperCase(),
};
```

---

# 3. `src/components/inline-cms/RestaurantEditModal.tsx`

변경:

```ts
// BEFORE
{ fieldKey: "rest_name_kr", formKey: "name_kr", ... }

// AFTER
{ fieldKey: "name", formKey: "name_kr", ... }
```

`rest_name_jp`는 유지:

```ts
{ fieldKey: "rest_name_jp", formKey: "name_jp", ... }
```

Restaurant 저장은 단일 `/api/admin/restaurant` 요청만 사용한다.

---

# 4. `src/lib/supabase-cms.ts`

## 4.1 Required aliases

추가:

```ts
const REQUIRED_FIELD_ALIASES: Record<
  string,
  Record<string, readonly string[]>
> = {
  HOTEL: {
    display_name: ["name_kr"],
    official_name: ["name_jp"],
    address: ["address_kr"],
    address_jp: ["address_jp"],
    transport_note: ["transport"],
  },
  RESTAURANT: {
    name: ["name_kr"],
    rest_name_jp: ["name_jp"],
  },
  GOLF: {},
};

function getSubmittedFieldValue(
  entityType: string,
  fieldKey: string,
  data: Record<string, unknown>
): unknown {
  if (Object.prototype.hasOwnProperty.call(data, fieldKey)) {
    return data[fieldKey];
  }

  const aliases = REQUIRED_FIELD_ALIASES[entityType]?.[fieldKey] ?? [];

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(data, alias)) {
      return data[alias];
    }
  }

  return undefined;
}
```

`validateRequiredFields()` 교체:

```ts
export async function validateRequiredFields(
  entityType: string,
  data: Record<string, unknown>
): Promise<string | null> {
  const type = entityType.toUpperCase();

  const { data: fields, error } = await db()
    .from("field_definitions")
    .select("field_key, label_ko, validation_json")
    .eq("scope_entity_type", type)
    .eq("active", true);

  if (error) {
    logError("READ", "field_definitions", type, error);
    throw error;
  }

  if (!fields) {
    throw new Error(`Required field definitions unavailable: ${type}`);
  }

  for (const f of fields) {
    const validation =
      (f.validation_json as Record<string, unknown> | null) ?? null;

    if (validation?.required !== true) continue;

    const fieldKey = f.field_key as string;
    const label = (f.label_ko as string) || fieldKey;
    const value = getSubmittedFieldValue(type, fieldKey, data);

    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim())
    ) {
      return `${label}은(는) 필수입니다.`;
    }
  }

  return null;
}
```

## 4.2 `saveFieldValue()`

`field_key` 하나만 보고 `.limit(1)` 하는 구현을 제거한다.

우선순위:

1. entity-specific
2. entity-type
3. true global

교체 코드:

```ts
async function saveFieldValue(
  entityId: string,
  fieldKey: string,
  value: string
): Promise<void> {
  const { data: entity, error: entityError } = await db()
    .from("entities")
    .select("entity_type")
    .eq("id", entityId)
    .maybeSingle();

  if (entityError) {
    logError("READ", "entities", entityId, entityError);
    throw entityError;
  }

  if (!entity) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  let definitionId: string | null = null;

  {
    const { data: fd, error } = await db()
      .from("field_definitions")
      .select("id")
      .eq("field_key", fieldKey)
      .eq("scope_entity_id", entityId)
      .maybeSingle();

    if (error) throw error;
    if (fd?.id) definitionId = fd.id;
  }

  if (!definitionId) {
    const { data: fd, error } = await db()
      .from("field_definitions")
      .select("id")
      .eq("field_key", fieldKey)
      .eq("scope_entity_type", entity.entity_type)
      .is("scope_entity_id", null)
      .maybeSingle();

    if (error) throw error;
    if (fd?.id) definitionId = fd.id;
  }

  if (!definitionId) {
    const { data: fd, error } = await db()
      .from("field_definitions")
      .select("id")
      .eq("field_key", fieldKey)
      .is("scope_entity_type", null)
      .is("scope_entity_id", null)
      .maybeSingle();

    if (error) throw error;
    if (fd?.id) definitionId = fd.id;
  }

  if (!definitionId) return;

  const { error } = await adminDb()
    .from("entity_field_values")
    .upsert(
      {
        entity_id: entityId,
        field_definition_id: definitionId,
        value_text: value || null,
      },
      { onConflict: "entity_id,field_definition_id" }
    );

  if (error) {
    logError("UPSERT", "entity_field_values", entityId, error);
    throw error;
  }
}
```

## 4.3 HOTEL round-trip

`mapHotel()`:

```ts
name_jp: (hotel.official_name as string) || "",
address_jp: (hotel.address_jp as string) || "",
```

`getHotels()` / `getHotelById()` SELECT에 `address_jp` 추가.

`appendHotel()`:

```ts
address_jp: data.address_jp || "",
```

`updateHotel()` direct fields:

```ts
"address_jp",
```

`updateHotel()`은 parent entity update 전에 hotel child 존재를 확인한다.

```ts
const { data: existingHotel, error: hotelFindError } = await db()
  .from("hotels")
  .select("entity_id")
  .eq("entity_id", entity.id)
  .maybeSingle();

if (hotelFindError) {
  logError("READ", "hotels", id, hotelFindError);
  throw hotelFindError;
}

if (!existingHotel) return false;
```

UPDATE affected row도 확인:

```ts
const { data: updatedHotel, error } = await adminDb()
  .from("hotels")
  .update(hotelUpdates)
  .eq("entity_id", entity.id)
  .select("entity_id")
  .maybeSingle();

if (error) {
  logError("UPDATE", "hotels", id, error);
  throw error;
}

if (!updatedHotel) return false;
```

`deleteHotel()`은 hotel child 존재를 기준으로 처리:

```ts
export async function deleteHotel(id: string): Promise<boolean> {
  const { data: hotel, error: findError } = await db()
    .from("hotels")
    .select("entity_id")
    .eq("entity_id", id)
    .maybeSingle();

  if (findError) {
    logError("READ", "hotels", id, findError);
    throw findError;
  }

  if (!hotel) return false;

  await adminDb()
    .from("faq")
    .delete()
    .eq("scope", "SPECIFIC")
    .eq("related_entity_id", hotel.entity_id);

  const { data: deleted, error } = await adminDb()
    .from("entities")
    .delete()
    .eq("id", hotel.entity_id)
    .select("id")
    .maybeSingle();

  if (error) {
    logError("DELETE", "entities", id, error);
    throw error;
  }

  return !!deleted;
}
```

---

# 5. GOLF zero-row 처리

`updateGolfCourse()`에서 child 존재 확인:

```ts
const { data: existingGolf, error: golfFindError } = await db()
  .from("golf_courses")
  .select("entity_id")
  .eq("entity_id", entity.id)
  .maybeSingle();

if (golfFindError) {
  logError("READ", "golf_courses", id, golfFindError);
  throw golfFindError;
}

if (!existingGolf) return false;
```

UPDATE affected row 확인:

```ts
const { data: updatedGolf, error } = await adminDb()
  .from("golf_courses")
  .update(golfUpdates)
  .eq("entity_id", entity.id)
  .select("entity_id")
  .maybeSingle();

if (error) {
  logError("UPDATE", "golf_courses", id, error);
  throw error;
}

if (!updatedGolf) return false;
```

`deleteGolfCourse()`도 `golf_courses` child 존재 확인 후 entity를 삭제한다.

---

# 6. Restaurant atomic repository

`appendRestaurant()`는 기존 multi-step insert를 삭제하고 RPC만 사용한다.

```ts
export async function appendRestaurant(
  data: Record<string, unknown>
): Promise<{ id: string; slug: string }> {
  const areaCode = typeof data.area === "string" ? data.area : "";
  const areaId = await resolveAreaId(areaCode);

  if (!areaId) {
    throw new Error(`Area not found: ${areaCode}`);
  }

  const slug = generateUniqueSlug(areaCode, "restaurant");

  const payload: Record<string, unknown> = { ...data };

  if (Object.prototype.hasOwnProperty.call(data, "recommended")) {
    payload.recommended = isActive(data.recommended);
  }

  if (Object.prototype.hasOwnProperty.call(data, "active")) {
    payload.active = isActive(data.active);
  }

  const { data: created, error } = await adminDb().rpc(
    "admin_create_restaurant_full",
    {
      p_area_id: areaId,
      p_slug: slug,
      p_payload: payload,
    }
  );

  if (error) {
    logError("INSERT", "restaurants", slug, error);
    throw error;
  }

  const row = created as { id?: string; slug?: string } | null;

  if (!row?.id || !row?.slug) {
    throw new Error("Restaurant atomic create returned invalid result");
  }

  return {
    id: row.id,
    slug: row.slug,
  };
}
```

`updateRestaurant()`:

```ts
export async function updateRestaurant(
  id: string,
  data: Record<string, unknown>,
  expectedUpdatedAt?: string
): Promise<boolean> {
  const payload: Record<string, unknown> = { ...data };

  if (Object.prototype.hasOwnProperty.call(data, "recommended")) {
    payload.recommended = isActive(data.recommended);
  }

  if (Object.prototype.hasOwnProperty.call(data, "active")) {
    payload.active = isActive(data.active);
  }

  const { data: updated, error } = await adminDb().rpc(
    "admin_update_restaurant_full",
    {
      p_entity_id: id,
      p_expected_updated_at: expectedUpdatedAt || null,
      p_payload: payload,
    }
  );

  if (error) {
    if (error.code === "P0002") return false;
    if (error.code === "40001") throw new ConflictError();

    logError("UPDATE", "restaurants", id, error);
    throw error;
  }

  const row = updated as { id?: string; slug?: string } | null;

  return !!row?.id;
}
```

기존 `recommended ? isActive(...) : null` 로직은 삭제한다.

`deleteRestaurantRow()`도 child 존재 확인 후 삭제한다.

---

# 7. `src/lib/crud/field-definitions.ts`

collision handler에 새 index 추가:

```ts
if (
  error.code === "23505" &&
  (
    error.message?.includes("idx_fd_key_global") ||
    error.message?.includes("idx_fd_key_entity_type") ||
    error.message?.includes("idx_fd_key_per_entity")
  )
) {
  ...
}
```

---

# 8. API 404 contract

수정 파일:

```text
src/app/api/admin/hotel/route.ts
src/app/api/admin/golf/route.ts
src/app/api/admin/restaurant/route.ts
```

`notFound` import 추가.

Hotel:

```ts
const success = await updateHotel(...);
if (!success) return notFound("Hotel not found");
```

```ts
const success = await deleteHotel(id);
if (!success) return notFound("Hotel not found");
```

Golf:

```ts
if (!success) return notFound("Golf course not found");
```

Restaurant:

```ts
const success = await updateRestaurant(
  id as string,
  restData,
  updated_at as string | undefined
);

if (!success) {
  return notFound("Restaurant not found");
}
```

POST의 불필요한 cast 제거:

```ts
const { id, slug } = await appendRestaurant(body);
```

DELETE:

```ts
const success = await deleteRestaurantRow(id);

if (!success) {
  return notFound("Restaurant not found");
}
```

---

# 9. Restaurant near-options parser

수정 파일:

```text
src/app/[area]/restaurant/RestaurantListClient.tsx
src/app/[area]/restaurant/[id]/RestaurantDetailClient.tsx
```

Hotel:

```ts
const json = await res.json();
const hotels = json.data?.hotels ?? [];

setNearOptions(
  hotels.map(
    (h: {
      id: string;
      slug: string;
      name_kr?: string;
      official_name: string;
    }) => ({
      id: h.slug,
      name: h.name_kr || h.official_name,
    })
  )
);
```

Golf:

```ts
const json = await res.json();
const courses = json.data?.courses ?? [];

setNearOptions(
  courses.map(
    (c: {
      id: string;
      slug: string;
      display_name: string;
    }) => ({
      id: c.slug,
      name: c.display_name,
    })
  )
);
```

---

# 10. DB verification

Migration 적용 후 실행:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'hotels'
  and column_name = 'address_jp';
```

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'field_definitions'
  and indexname in (
    'idx_fd_key_global',
    'idx_fd_key_entity_type',
    'idx_fd_key_per_entity'
  )
order by indexname;
```

```sql
select
  scope_entity_type,
  field_key,
  section_key,
  active,
  validation_json
from public.field_definitions
where scope_entity_type in ('HOTEL','GOLF','RESTAURANT')
  and field_key in (
    'display_name',
    'official_name',
    'address',
    'address_jp',
    'phone',
    'google_maps_url',
    'name',
    'rest_name_jp',
    'distance_km',
    'drive_minutes',
    'walk_minutes',
    'near_type',
    'near_id'
  )
order by field_key, scope_entity_type;
```

RPC 권한:

```sql
select
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'admin_create_restaurant_full',
    'admin_update_restaurant_full'
  )
order by p.proname;
```

기대:

```text
anon_exec          false
authenticated_exec false
service_role_exec  true
```

---

# 11. Atomic rollback test

유효한 area를 이용해 실패를 의도적으로 발생시키고 rollback 검증:

```sql
DO $$
DECLARE
  v_area_id uuid;
BEGIN
  SELECT id
  INTO v_area_id
  FROM public.areas
  WHERE active = true
  ORDER BY sort
  LIMIT 1;

  BEGIN
    PERFORM public.admin_create_restaurant_full(
      v_area_id,
      'p0_atomic_rollback_test',
      jsonb_build_object(
        'name_kr', 'P0 Atomic Rollback Test',
        'active', true,
        'recommended', false,
        'near_type', 'HOTEL',
        'near_id', '__does_not_exist__'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;
```

확인:

```sql
select count(*)
from public.entities
where slug = 'p0_atomic_rollback_test';
```

기대:

```text
0
```

---

# 12. Static verification

반드시 전부 실행:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify:cms-schema
git diff --check
```

전부 exit code `0`.

---

# 13. Production QA

## HOTEL

테스트 값:

```text
name_kr      = P0 QA HOTEL
name_jp      = P0 QA HOTEL 日本語
address_kr   = P0 QA HOTEL KR ADDRESS
address_jp   = P0 QA HOTEL JP ADDRESS
```

검증:

- CREATE 성공
- canonical response의 `name_jp` 유지
- canonical response의 `address_jp` 유지
- detail 첫 접근 200
- Modal 재오픈 시 `name_jp/address_jp` 유지
- UPDATE 후 reload 유지
- boolean false 유지
- DELETE 성공
- DELETE 후 detail 404
- DB entities/hotels 0 rows

## RESTAURANT

테스트:

```text
name_kr     = P0 QA RESTAURANT
name_jp     = P0 QA RESTAURANT 日本語
recommended = false
```

특정 HOTEL/GOLF relation과 거리 값 지정.

검증:

- CREATE 후 entities/restaurants/EAV/location 존재
- `recommended=false`가 DB에서 false
- `null`이면 실패
- UPDATE에서 near target/거리/name_jp 변경
- reload 후 동일
- primary location만 변경
- secondary relation 보존
- DELETE 후 관련 row 0
- detail 404

## 존재하지 않는 ID

HOTEL/GOLF/RESTAURANT 각각 UPDATE/DELETE:

```text
HTTP 404
success: false
code: NOT_FOUND
```

`HTTP 200 + data.success=false`면 실패.

---

# 14. Required contract QA

HOTEL:

```text
scope_entity_type = HOTEL
field_key = address
validation_json = {"required": true}
```

`address_kr=""`:

- Client 차단
- Server 직접 요청도 400

값 입력 후 성공.

RESTAURANT:

```text
field_key = name
validation_json = {"required": true}
```

`name_kr=""`:

- Client 차단
- Server 직접 요청도 400

`rest_name_jp`도 `name_jp`와 연결 확인.

검증 후 `validation_json` 원복.

---

# 15. 이번 P0에서 하지 않을 것

- Golf/Restaurant public detail 전체 section visibility 리팩터링
- `@supabase/ssr` 전환
- slug `randomBytes` / collision retry 개선
- 전체 Payload Zod 도입
- dynamicLabels 전체 fail-closed 리팩터링
- legacy orphan cleanup
- `dos_hotel_` 삭제
- UI 디자인 변경
- package upgrade

---

# 16. QA 문서 갱신

파일:

```text
docs/HOTEL_GOLF_RESTAURANT_CMS_FIX_TODO_QA.md
```

실제 검증 완료 후에만 갱신.

특히 다음은 근거를 다시 작성:

- Restaurant partial state 방지
- Restaurant location 수정 persistence
- 0-row → 404
- Client/Server required 일치
- HOTEL `name_jp/address_jp` persistence

단순 `[x]` 처리 금지.  
함수/RPC/Production QA 근거까지 기록.

---

# 17. Commit / push

모든 검증 성공 시:

```text
fix: enforce P0 CMS data contracts and restaurant atomicity
```

push 전:

```bash
git status
git diff --stat
git diff --check
```

확인 후 `main → origin/main` push.

---

# 18. 최종 보고 형식

반드시 아래를 모두 보고한다.

1. Starting SHA / Final SHA
2. 변경한 모든 파일 경로
3. 각 파일에서 수정한 함수명
4. migration 이름
5. Production migration 적용 여부
6. `field_definitions` index 검증 결과
7. RPC privilege 검증 결과
8. HOTEL `name_jp/address_jp` round-trip 실제 값
9. Restaurant create/update/delete 실제 결과
10. `restaurant_locations` 변경 전/후
11. `recommended=false` DB 결과
12. atomic rollback count
13. nonexistent UPDATE/DELETE HTTP status
14. typecheck
15. lint
16. build
17. `verify:cms-schema`
18. `git diff --check`
19. Production deploy SHA
20. QA 데이터 cleanup
21. 남은 P1/P2

문제가 하나라도 있으면 “전부 완료”라고 하지 않는다.
