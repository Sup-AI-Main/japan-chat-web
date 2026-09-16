-- Phase 4: Section Definitions for Dynamic Labels
-- Section headings, field labels, visibility are now admin-configurable.

-- =========================================================
-- 1. section_definitions (섹션 메타데이터)
-- =========================================================
CREATE TABLE IF NOT EXISTS section_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,  -- 'GOLF', 'HOTEL', 'RESTAURANT'
  section_key text NOT NULL,  -- 'basic_info', 'breakfast', 'onsen_spa', etc.
  label_ko text NOT NULL,
  label_ja text,
  sort integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, section_key)
);

CREATE INDEX IF NOT EXISTS idx_sd_entity_type ON section_definitions(entity_type);
CREATE INDEX IF NOT EXISTS idx_sd_sort ON section_definitions(entity_type, sort);

ALTER TABLE section_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_select_sd ON section_definitions FOR SELECT TO anon USING (true);

-- =========================================================
-- 2. field_definitions에 section_key 추가
-- =========================================================
ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS section_key text;
CREATE INDEX IF NOT EXISTS idx_fd_section_key ON field_definitions(section_key);

-- =========================================================
-- 3. Seed: Golf 섹션 정의
-- =========================================================
INSERT INTO section_definitions (entity_type, section_key, label_ko, label_ja, sort) VALUES
  ('GOLF', 'basic_info',       '기본 정보',       '基本情報',     1),
  ('GOLF', 'description',      '골프장 설명',     'ゴルフ場説明', 2),
  ('GOLF', 'play_cart',        '플레이/카트',     'プレー/カート', 3),
  ('GOLF', 'clubhouse',        '클럽하우스 식사', 'クラブハウス食事', 4),
  ('GOLF', 'bath_shower',      '목욕/샤워',       '入浴/シャワー', 5),
  ('GOLF', 'rental',           '렌탈 골프채',     'レンタルゴルフ', 6),
  ('GOLF', 'dress_code',       '복장',            '服装',         7),
  ('GOLF', 'includes',         '포함사항',        '含むもの',     8),
  ('GOLF', 'excludes',         '불포함사항',      '含まないもの', 9),
  ('GOLF', 'additional_guide', '추가 안내',       '追加案内',     10),
  ('GOLF', 'nearby_restaurants', '주변 맛집',     '周辺グルメ',   11)
ON CONFLICT (entity_type, section_key) DO NOTHING;

-- =========================================================
-- 4. Seed: Hotel 섹션 정의
-- =========================================================
INSERT INTO section_definitions (entity_type, section_key, label_ko, label_ja, sort) VALUES
  ('HOTEL', 'basic_info',       '기본 정보',       '基本情報',       1),
  ('HOTEL', 'checkin',          '체크인',          'チェックイン',   2),
  ('HOTEL', 'checkout',         '체크아웃',        'チェックアウト', 3),
  ('HOTEL', 'address',          '주소',            '住所',           4),
  ('HOTEL', 'phone',            '전화',            '電話',           5),
  ('HOTEL', 'breakfast',        '조식',            '朝食',           6),
  ('HOTEL', 'dinner',           '석식',            '夕食',           7),
  ('HOTEL', 'onsen_spa',        '온천/스파',       '温泉/スパ',      8),
  ('HOTEL', 'bath_hours',       '운영시간',        '営業時間',       9),
  ('HOTEL', 'tattoo_policy',    '타투 정책',       'タトゥーポリシー', 10),
  ('HOTEL', 'other_info',       '기타 안내',       'その他案内',     11),
  ('HOTEL', 'atm_payment',      'ATM/결제',        'ATM/決済',       12),
  ('HOTEL', 'transport',        '교통',            '交通',           13),
  ('HOTEL', 'additional_guide', '추가 안내',       '追加案内',       14),
  ('HOTEL', 'nearby_restaurants', '주변 맛집',     '周辺グルメ',     15)
ON CONFLICT (entity_type, section_key) DO NOTHING;

-- =========================================================
-- 5. Seed: Restaurant 섹션 정의
-- =========================================================
INSERT INTO section_definitions (entity_type, section_key, label_ko, label_ja, sort) VALUES
  ('RESTAURANT', 'basic_info',       '기본 정보',   '基本情報',     1),
  ('RESTAURANT', 'address',          '주소',        '住所',         2),
  ('RESTAURANT', 'phone',            '전화',        '電話',         3),
  ('RESTAURANT', 'hours',            '영업시간',    '営業時間',     4),
  ('RESTAURANT', 'closed_days',      '휴무일',      '定休日',       5),
  ('RESTAURANT', 'menu',             '대표 메뉴',   '代表メニュー', 6),
  ('RESTAURANT', 'price_range',      '가격대',      '価格帯',       7),
  ('RESTAURANT', 'payment',          '결제',        '決済',         8),
  ('RESTAURANT', 'parking',          '주차',        '駐車',         9),
  ('RESTAURANT', 'seating',          '좌석',        '座席',         10),
  ('RESTAURANT', 'reservation',      '예약',        '予約',         11),
  ('RESTAURANT', 'smoking',          '흡연/금연',   '喫煙/禁煙',    12),
  ('RESTAURANT', 'other_info',       '기타 안내',   'その他案内',   13),
  ('RESTAURANT', 'additional_guide', '추가 안내',   '追加案内',     14)
ON CONFLICT (entity_type, section_key) DO NOTHING;

-- =========================================================
-- 6. Seed: Golf field_definitions (섹션 연결)
-- =========================================================
INSERT INTO field_definitions (field_key, label_ko, label_ja, field_type, scope_type, scope_entity_type, section_key, sort, active) VALUES
  ('official_name',     '골프장 이름',     'ゴルフ場名',     'text',     'ENTITY_TYPE', 'GOLF', 'basic_info',       1,  true),
  ('address',           '주소',            '住所',           'text',     'ENTITY_TYPE', 'GOLF', 'basic_info',       2,  true),
  ('phone',             '전화',            '電話',           'text',     'ENTITY_TYPE', 'GOLF', 'basic_info',       3,  true),
  ('course_summary',    '골프장 설명',     'ゴルフ場説明',   'textarea', 'ENTITY_TYPE', 'GOLF', 'description',      1,  true),
  ('play_cart',         '플레이/카트',     'プレー/カート',  'textarea', 'ENTITY_TYPE', 'GOLF', 'play_cart',        1,  true),
  ('clubhouse_dining',  '클럽하우스 식사', 'クラブハウス食事','textarea', 'ENTITY_TYPE', 'GOLF', 'clubhouse',        1,  true),
  ('bath_shower',       '목욕/샤워',       '入浴/シャワー',  'textarea', 'ENTITY_TYPE', 'GOLF', 'bath_shower',      1,  true),
  ('rental',            '렌탈 골프채',     'レンタルゴルフ', 'textarea', 'ENTITY_TYPE', 'GOLF', 'rental',           1,  true),
  ('dress_code',        '복장',            '服装',           'textarea', 'ENTITY_TYPE', 'GOLF', 'dress_code',       1,  true)
ON CONFLICT (field_key) WHERE scope_entity_id IS NULL DO NOTHING;

-- =========================================================
-- 7. Seed: Hotel field_definitions (섹션 연결)
-- =========================================================
INSERT INTO field_definitions (field_key, label_ko, label_ja, field_type, scope_type, scope_entity_type, section_key, sort, active) VALUES
  ('official_name',        '호텔 이름',     'ホテル名',           'text',     'ENTITY_TYPE', 'HOTEL', 'basic_info',       1,  true),
  ('address',              '주소',          '住所',               'text',     'ENTITY_TYPE', 'HOTEL', 'address',          1,  true),
  ('phone',                '전화',          '電話',               'text',     'ENTITY_TYPE', 'HOTEL', 'phone',            1,  true),
  ('checkin_time',         '체크인 시간',   'チェックイン時間',   'text',     'ENTITY_TYPE', 'HOTEL', 'checkin',          1,  true),
  ('checkout_time',        '체크아웃 시간', 'チェックアウト時間', 'text',     'ENTITY_TYPE', 'HOTEL', 'checkout',         1,  true),
  ('breakfast_place',      '조식 장소',     '朝食場所',           'text',     'ENTITY_TYPE', 'HOTEL', 'breakfast',        1,  true),
  ('breakfast_time',       '조식 시간',     '朝食時間',           'text',     'ENTITY_TYPE', 'HOTEL', 'breakfast',        2,  true),
  ('breakfast_last_entry', '조식 입장 마감', '朝食入場締切',      'text',     'ENTITY_TYPE', 'HOTEL', 'breakfast',        3,  true),
  ('dinner_place',         '석식 장소',     '夕食場所',           'text',     'ENTITY_TYPE', 'HOTEL', 'dinner',           1,  true),
  ('dinner_time',          '석식 시간',     '夕食時間',           'text',     'ENTITY_TYPE', 'HOTEL', 'dinner',           2,  true),
  ('dinner_last_entry',    '석식 입장 마감', '夕食入場締切',      'text',     'ENTITY_TYPE', 'HOTEL', 'dinner',           3,  true),
  ('has_public_bath',      '대욕장',        '大浴場',             'boolean', 'ENTITY_TYPE', 'HOTEL', 'onsen_spa',        1,  true),
  ('has_outdoor_onsen',    '노천온천',      '露天風呂',           'boolean', 'ENTITY_TYPE', 'HOTEL', 'onsen_spa',        2,  true),
  ('has_sauna',            '사우나',        'サウナ',             'boolean', 'ENTITY_TYPE', 'HOTEL', 'onsen_spa',        3,  true),
  ('bath_spa_hours',       '운영시간',      '営業時間',           'text',     'ENTITY_TYPE', 'HOTEL', 'bath_hours',       1,  true),
  ('tattoo_policy',        '타투 정책',     'タトゥーポリシー',   'text',     'ENTITY_TYPE', 'HOTEL', 'tattoo_policy',    1,  true),
  ('other_info',           '기타 안내',     'その他案内',         'textarea', 'ENTITY_TYPE', 'HOTEL', 'other_info',       1,  true),
  ('atm_payment',          'ATM/결제',      'ATM/決済',           'text',     'ENTITY_TYPE', 'HOTEL', 'atm_payment',      1,  true),
  ('transport_note',       '교통 안내',     '交通案内',           'text',     'ENTITY_TYPE', 'HOTEL', 'transport',        1,  true)
ON CONFLICT (field_key) WHERE scope_entity_id IS NULL DO NOTHING;

-- =========================================================
-- 8. Seed: Restaurant field_definitions (섹션 연결)
-- =========================================================
INSERT INTO field_definitions (field_key, label_ko, label_ja, field_type, scope_type, scope_entity_type, section_key, sort, active) VALUES
  ('name',           '식당 이름',   'レストラン名',   'text',     'ENTITY_TYPE', 'RESTAURANT', 'basic_info',  1,  true),
  ('category',       '카테고리',   'カテゴリ',       'text',     'ENTITY_TYPE', 'RESTAURANT', 'basic_info',  2,  true),
  ('address',        '주소',       '住所',           'text',     'ENTITY_TYPE', 'RESTAURANT', 'address',     1,  true),
  ('phone',          '전화',       '電話',           'text',     'ENTITY_TYPE', 'RESTAURANT', 'phone',       1,  true),
  ('hours',          '영업시간',   '営業時間',       'text',     'ENTITY_TYPE', 'RESTAURANT', 'hours',       1,  true),
  ('closed_days',    '휴무일',     '定休日',         'text',     'ENTITY_TYPE', 'RESTAURANT', 'closed_days', 1,  true),
  ('menu_kr',        '대표 메뉴',  '代表メニュー',   'textarea', 'ENTITY_TYPE', 'RESTAURANT', 'menu',        1,  true),
  ('menu_price',     '메뉴 가격',  'メニュー価格',   'text',     'ENTITY_TYPE', 'RESTAURANT', 'menu',        2,  true),
  ('price_range',    '가격대',     '価格帯',         'text',     'ENTITY_TYPE', 'RESTAURANT', 'price_range', 1,  true)
ON CONFLICT (field_key) WHERE scope_entity_id IS NULL DO NOTHING;
