-- =====================================================
-- PROPOSAL PLATFORM V3 - DATABASE MIGRATION
-- Execute via Supabase Dashboard SQL Editor
-- =====================================================

-- 1. Add image_url column to proposal_items
ALTER TABLE proposal_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Add new section types to enum
-- Note: PostgreSQL requires separate transactions for each ADD VALUE
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'text' 
                   AND enumtypid = 'proposal_section_type'::regtype) THEN
        ALTER TYPE proposal_section_type ADD VALUE 'text';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'image' 
                   AND enumtypid = 'proposal_section_type'::regtype) THEN
        ALTER TYPE proposal_section_type ADD VALUE 'image';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'divider' 
                   AND enumtypid = 'proposal_section_type'::regtype) THEN
        ALTER TYPE proposal_section_type ADD VALUE 'divider';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'table' 
                   AND enumtypid = 'proposal_section_type'::regtype) THEN
        ALTER TYPE proposal_section_type ADD VALUE 'table';
    END IF;
END $$;

-- 3. Create index for image lookups
CREATE INDEX IF NOT EXISTS idx_proposal_items_image 
ON proposal_items(image_url) WHERE image_url IS NOT NULL;

-- 4. Seed library items with sample thumbnails
UPDATE proposal_library SET thumbnail_url = 
    CASE category
        WHEN 'hotel' THEN 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'
        WHEN 'flight' THEN 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400'
        WHEN 'experience' THEN 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400'
        WHEN 'transfer' THEN 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400'
        ELSE NULL
    END
WHERE thumbnail_url IS NULL;

-- 5. Verification query (run after migration)
SELECT 
    'image_url column' as check_item,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'proposal_items' AND column_name = 'image_url') as exists
UNION ALL
SELECT 
    'library thumbnails populated',
    (SELECT COUNT(*) FROM proposal_library WHERE thumbnail_url IS NOT NULL) > 0;
