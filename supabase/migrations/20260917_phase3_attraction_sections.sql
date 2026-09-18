-- Phase 3: ATTRACTION section_definitions + field_definitions
-- 기존 GOLF/HOTEL/RESTAURANT 데이터 변경 없음

-- =========================================================
-- 1. ATTRACTION 섹션 정의
-- =========================================================
INSERT INTO section_definitions (entity_type, section_key, label_ko, label_ja, sort) VALUES
  ('ATTRACTION', 'basic_info',       '기본 정보',       '基本情報',       1),
  ('ATTRACTION', 'address',          '주소',            '住所',           2),
  ('ATTRACTION', 'hours',            '운영시간',        '営業時間',       3),
  ('ATTRACTION', 'admission',        '입장료',          '入場料',         4),
  ('ATTRACTION', 'parking',          '주차',            '駐車場',         5),
  ('ATTRACTION', 'description',      '설명',            '説明',           6),
  ('ATTRACTION', 'other_info',       '기타 안내',       'その他案内',     7)
ON CONFLICT (entity_type, section_key) DO NOTHING;

-- =========================================================
-- 2. ATTRACTION 전용 field_definitions
--    (이미 존재하는 phone/hours/closed_days/other_info는 공유됨)
-- =========================================================
INSERT INTO field_definitions (field_key, label_ko, label_ja, field_type, scope_type, scope_entity_type, section_key, sort, active) VALUES
  ('name_jp',             '이름 (일본어)',       '名前（日本語）',     'text',     'ENTITY_TYPE', 'ATTRACTION', 'basic_info',  1,  true),
  ('address_kr',          '주소 (한국어)',       '住所（韓国語）',     'text',     'ENTITY_TYPE', 'ATTRACTION', 'address',     1,  true),
  ('address_jp',          '주소 (일본어)',       '住所（日本語）',     'text',     'ENTITY_TYPE', 'ATTRACTION', 'address',     2,  true),
  ('google_maps_url',     'Google Maps URL',    'Google Maps URL',    'text',     'ENTITY_TYPE', 'ATTRACTION', 'basic_info',  2,  true),
  ('admission_fee',       '입장료',              '入場料',             'text',     'ENTITY_TYPE', 'ATTRACTION', 'admission',   1,  true),
  ('recommended_duration','추천 체류시간',       '推奨滞在時間',       'text',     'ENTITY_TYPE', 'ATTRACTION', 'admission',   2,  true),
  ('parking_info',        '주차 정보',           '駐車場情報',         'textarea', 'ENTITY_TYPE', 'ATTRACTION', 'parking',     1,  true),
  ('description',         '설명',                '説明',               'textarea', 'ENTITY_TYPE', 'ATTRACTION', 'description', 1,  true)
ON CONFLICT (field_key) WHERE scope_entity_id IS NULL DO NOTHING;
