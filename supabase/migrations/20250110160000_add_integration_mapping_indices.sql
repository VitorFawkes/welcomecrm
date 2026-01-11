-- Ensure integration_catalog has unique index for upsert
-- Note: parent_external_id is nullable, but app logic uses '' for empty.
-- If rows have NULL, they are distinct. Ideally we should standardize on '' or NULL.
-- For now, we create the index. If duplicates exist, this might fail, but it's needed for upsert.
CREATE UNIQUE INDEX IF NOT EXISTS integration_catalog_upsert_idx ON integration_catalog (integration_id, entity_type, external_id, parent_external_id);

-- Ensure integration_field_map has unique index for upsert
CREATE UNIQUE INDEX IF NOT EXISTS integration_field_map_upsert_idx ON integration_field_map (integration_id, external_field_id);
