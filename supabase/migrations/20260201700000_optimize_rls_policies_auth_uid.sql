-- Migration: Optimize RLS policies to use (SELECT auth.uid()) pattern
-- This prevents multiple evaluations of auth.uid() per row
-- Created: 2026-02-01

-- PARTE 1: profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO public
    USING ((SELECT auth.uid()) = id);

-- PARTE 2: pipeline_card_settings
DROP POLICY IF EXISTS "Settings editable by owner" ON pipeline_card_settings;
CREATE POLICY "Settings editable by owner" ON pipeline_card_settings
    FOR ALL TO authenticated
    USING (usuario_id = (SELECT auth.uid()))
    WITH CHECK (usuario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Settings viewable by authenticated" ON pipeline_card_settings;
CREATE POLICY "Settings viewable by authenticated" ON pipeline_card_settings
    FOR SELECT TO authenticated
    USING (usuario_id IS NULL OR usuario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own settings" ON pipeline_card_settings;
CREATE POLICY "Users can update their own settings" ON pipeline_card_settings
    FOR UPDATE TO public
    USING (usuario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own settings or default settings" ON pipeline_card_settings;
CREATE POLICY "Users can view their own settings or default settings" ON pipeline_card_settings
    FOR SELECT TO public
    USING (usuario_id = (SELECT auth.uid()) OR usuario_id IS NULL);

-- PARTE 3: tarefas
DROP POLICY IF EXISTS "Tarefas delete by owner or admin" ON tarefas;
CREATE POLICY "Tarefas delete by owner or admin" ON tarefas
    FOR DELETE TO authenticated
    USING (created_by = (SELECT auth.uid()) OR responsavel_id = (SELECT auth.uid()) OR is_admin());

-- PARTE 4: reunioes
DROP POLICY IF EXISTS "Users can view own meetings" ON reunioes;
CREATE POLICY "Users can view own meetings" ON reunioes
    FOR ALL TO authenticated
    USING (created_by = (SELECT auth.uid()) OR responsavel_id = (SELECT auth.uid()) OR sdr_responsavel_id = (SELECT auth.uid()));

-- PARTE 5: text_blocks
DROP POLICY IF EXISTS "Users can delete own text_blocks" ON text_blocks;
CREATE POLICY "Users can delete own text_blocks" ON text_blocks
    FOR DELETE TO public
    USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own text_blocks" ON text_blocks;
CREATE POLICY "Users can update own text_blocks" ON text_blocks
    FOR UPDATE TO public
    USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own and global text_blocks" ON text_blocks;
CREATE POLICY "Users can view own and global text_blocks" ON text_blocks
    FOR SELECT TO public
    USING (ownership_type = 'global' OR created_by = (SELECT auth.uid()));
