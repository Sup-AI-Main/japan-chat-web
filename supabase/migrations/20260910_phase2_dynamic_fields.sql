-- Phase 2: Dynamic Field System + Change Log + Entity-Category 관계
-- 실행일: 2026-09-10

-- =========================================================
-- 1. field_definitions (동적 필드 메타데이터)
-- =========================================================
CREATE TABLE IF NOT EXISTS field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL,
  label_ko text NOT NULL,
  label_ja text,
  label_en text,
  field_type text NOT NULL DEFAULT 'text',
  icon text,
  scope_type text NOT NULL DEFAULT 'ITEM'
    CHECK (scope_type IN ('ITEM', 'CATEGORY', 'AREA', 'ENTITY_TYPE', 'GLOBAL')),
  -- ITEM: scope_entity_id로 특정 entity에만 적용
  -- CATEGORY: field_definition_scopes 테이블로 여러 category에 적용
  -- AREA: field_definition_scopes 테이블로 여러 area에 적용
  -- ENTITY_TYPE: field_definition_scopes 테이블로 여러 entity_type에 적용
  -- GLOBAL: 모든 곳에서 사용 가능 (scopes에 세부 범위 지정 가능)
  scope_entity_type text,
  scope_entity_id uuid REFERENCES entities(id) ON DELETE CASCADE,
  scope_area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  scope_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  options_json jsonb,
  validation_json jsonb,
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- field_key UNIQUE: 글로벌은 전역 유니크, ITEM은 (field_key + scope_entity_id) 유니크
CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_key_global
  ON field_definitions(field_key) WHERE scope_entity_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fd_key_per_entity
  ON field_definitions(field_key, scope_entity_id) WHERE scope_entity_id IS NOT NULL;

-- =========================================================
-- 2. field_definition_scopes (필드를 여러 범위에서 재사용)
-- =========================================================
CREATE TABLE IF NOT EXISTS field_definition_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id uuid NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('AREA', 'CATEGORY', 'ENTITY_TYPE', 'ENTITY', 'GLOBAL')),
  area_id uuid REFERENCES areas(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES entities(id) ON DELETE CASCADE,
  entity_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fds_field_def ON field_definition_scopes(field_definition_id);
CREATE INDEX IF NOT EXISTS idx_fds_area ON field_definition_scopes(area_id);
CREATE INDEX IF NOT EXISTS idx_fds_category ON field_definition_scopes(category_id);
CREATE INDEX IF NOT EXISTS idx_fds_entity ON field_definition_scopes(entity_id);

ALTER TABLE field_definition_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_select_fds ON field_definition_scopes FOR SELECT TO anon USING (true);

-- =========================================================
-- 3. entity_field_values (엔티티별 필드 값)
-- =========================================================
CREATE TABLE IF NOT EXISTS entity_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  field_definition_id uuid NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
  value_text text,
  value_json jsonb,
  sort integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_efv_entity ON entity_field_values(entity_id);
CREATE INDEX IF NOT EXISTS idx_efv_field_def ON entity_field_values(field_definition_id);

ALTER TABLE entity_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_select_efv ON entity_field_values FOR SELECT TO anon USING (true);

-- =========================================================
-- 4. admin_change_logs (관리자 변경 이력)
-- =========================================================
CREATE TABLE IF NOT EXISTS admin_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type text NOT NULL,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  actor_hash text,
  actor_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acl_entity ON admin_change_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_acl_created ON admin_change_logs(created_at DESC);

ALTER TABLE admin_change_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_select_acl ON admin_change_logs FOR SELECT TO anon USING (true);

-- =========================================================
-- 5. entity_categories (엔티티 ↔ 카테고리 다대다 관계)
-- =========================================================
CREATE TABLE IF NOT EXISTS entity_categories (
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_ec_entity ON entity_categories(entity_id);
CREATE INDEX IF NOT EXISTS idx_ec_category ON entity_categories(category_id);

ALTER TABLE entity_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_select_ec ON entity_categories FOR SELECT TO anon USING (true);

-- =========================================================
-- 6. entities 테이블 변경
-- =========================================================
-- category_id 컬럼 추가 (이 entity가 속하는 주 카테고리)
ALTER TABLE entities ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_entities_category ON entities(category_id);

-- entity_type CHECK 제거 (새 카테고리/타입을 코드 수정 없이 추가 가능하도록)
ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_entity_type_check;

-- 기존 데이터 backfill: entity_type → category_id 매핑
UPDATE entities SET category_id = (
  SELECT id FROM categories WHERE code = 'GOLF' AND group_type = 'AREA' LIMIT 1
) WHERE entity_type = 'GOLF' AND category_id IS NULL;

UPDATE entities SET category_id = (
  SELECT id FROM categories WHERE code = 'HOTEL' AND group_type = 'AREA' LIMIT 1
) WHERE entity_type = 'HOTEL' AND category_id IS NULL;

UPDATE entities SET category_id = (
  SELECT id FROM categories WHERE code = 'RESTAURANT' AND group_type = 'AREA' LIMIT 1
) WHERE entity_type = 'RESTAURANT' AND category_id IS NULL;

-- 기존 category_id를 junction table에도 복사
INSERT INTO entity_categories (entity_id, category_id)
SELECT id, category_id FROM entities WHERE category_id IS NOT NULL
ON CONFLICT (entity_id, category_id) DO NOTHING;

-- =========================================================
-- 7. 인덱스 추가
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_fd_scope_type ON field_definitions(scope_type);
CREATE INDEX IF NOT EXISTS idx_fd_entity_type ON field_definitions(scope_entity_type);
CREATE INDEX IF NOT EXISTS idx_fd_active ON field_definitions(active);
CREATE INDEX IF NOT EXISTS idx_fd_sort ON field_definitions(sort);
CREATE INDEX IF NOT EXISTS idx_fd_scope_entity ON field_definitions(scope_entity_id);

-- =========================================================
-- 8. RLS 설정
-- =========================================================
ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_select_fd ON field_definitions FOR SELECT TO anon USING (true);