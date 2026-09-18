-- Add rest_name_jp field definition for RESTAURANT entity type (EAV)
-- Needed because field_key has a global unique index and 'name_jp' is already used by ATTRACTION
INSERT INTO field_definitions (field_key, label_ko, label_ja, label_en, field_type, scope_entity_type, scope_entity_id, sort, active)
VALUES ('rest_name_jp', '이름 (日本語)', '名前（日本語）', 'Name (Japanese)', 'text', 'RESTAURANT', NULL, 1, true)
ON CONFLICT DO NOTHING;
