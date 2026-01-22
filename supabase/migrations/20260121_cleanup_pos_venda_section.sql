-- Migration: Cleanup orphan pos_venda section
-- Description: The section 'pos_venda' in system_fields is not a valid section in the UI constants.
-- This migration deactivates fields with this orphan section to prevent confusion.

-- First, let's see what fields have this section (for reference)
-- SELECT key, label, section, active FROM system_fields WHERE section = 'pos_venda';

-- Option 1: Deactivate orphan fields (safe - keeps data, hides from UI)
UPDATE system_fields 
SET active = false 
WHERE section = 'pos_venda';

-- Option 2 (alternative): Migrate to a valid section like 'observacoes_criticas'
-- UPDATE system_fields SET section = 'observacoes_criticas' WHERE section = 'pos_venda';

-- Verification query
SELECT key, label, section, active 
FROM system_fields 
WHERE section = 'pos_venda';
