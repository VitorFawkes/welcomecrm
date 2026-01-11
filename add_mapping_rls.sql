-- Enable RLS on mapping tables (if not already)
ALTER TABLE integration_router_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_stage_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_user_map ENABLE ROW LEVEL SECURITY;

-- Add policies for integration_router_config
CREATE POLICY "Authenticated users can view router config" ON integration_router_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert/update router config" ON integration_router_config
    FOR ALL USING (auth.role() = 'authenticated');

-- Add policies for integration_stage_map
CREATE POLICY "Authenticated users can view stage map" ON integration_stage_map
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert/update stage map" ON integration_stage_map
    FOR ALL USING (auth.role() = 'authenticated');

-- Add policies for integration_user_map
CREATE POLICY "Authenticated users can view user map" ON integration_user_map
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert/update user map" ON integration_user_map
    FOR ALL USING (auth.role() = 'authenticated');
