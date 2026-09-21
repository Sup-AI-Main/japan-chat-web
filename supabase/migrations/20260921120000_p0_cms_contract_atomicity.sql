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
