-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Fix marketing_data keys - Remove 'card.' prefix from legacy data
--
-- PROBLEM: Cards created before the enterprise storage update have keys like
-- 'card.mkt_cidade' instead of 'mkt_cidade' inside marketing_data JSONB.
-- This prevents the frontend from finding the values.
--
-- SOLUTION: Rename all keys that start with 'card.' to remove the prefix.
-- ═══════════════════════════════════════════════════════════════════════════════

-- First, let's see how many cards are affected
-- SELECT COUNT(*) FROM cards WHERE marketing_data::text LIKE '%"card.%';

-- Function to fix marketing_data keys
CREATE OR REPLACE FUNCTION fix_marketing_data_keys(data jsonb)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}';
    key text;
    value jsonb;
BEGIN
    IF data IS NULL THEN
        RETURN NULL;
    END IF;

    FOR key, value IN SELECT * FROM jsonb_each(data)
    LOOP
        -- If key starts with 'card.', remove the prefix
        IF key LIKE 'card.%' THEN
            result := result || jsonb_build_object(substring(key from 6), value);
        ELSE
            result := result || jsonb_build_object(key, value);
        END IF;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Apply the fix to all affected cards
UPDATE cards
SET
    marketing_data = fix_marketing_data_keys(marketing_data),
    updated_at = NOW()
WHERE marketing_data::text LIKE '%"card.%';

-- Drop the temporary function
DROP FUNCTION fix_marketing_data_keys(jsonb);

-- Verify: Check that no more 'card.' prefixed keys exist
-- SELECT id, marketing_data FROM cards WHERE marketing_data::text LIKE '%"card.%' LIMIT 5;
