-- Phase 2: 지역 기본 카테고리 통일
-- 1. ATTRACTION 카테고리 추가 (AREA 그룹, sort=4)
-- 2. RESTAURANT 라벨 "맛집 질문" → "음식점 질문" 수정
-- 3. section_definitions "주변 맛집" → "주변 음식점" 수정

-- ATTRACTION 카테고리 추가
INSERT INTO categories (code, label, icon, group_type, description, allows_specific_target, allowed_entity_types, navigation_visible, active, sort)
VALUES (
  'ATTRACTION',
  '주변 볼거리',
  '🗺️',
  'AREA',
  '주변 관광지, 명소, 볼거리, 쇼핑몰, 비치 등',
  true,
  ARRAY['ATTRACTION']::text[],
  true,
  true,
  4
)
ON CONFLICT (code) DO NOTHING;

-- RESTAURANT 라벨 수정
UPDATE categories SET label = '음식점 질문' WHERE code = 'RESTAURANT';

-- section_definitions "주변 맛집" → "주변 음식점" 수정
UPDATE section_definitions SET label_ko = '주변 음식점' WHERE label_ko = '주변 맛집';
