-- DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to debug webhook issues

-- 1. Check Active Platforms
SELECT id, name, provider, is_active, last_event_at 
FROM whatsapp_platforms;

-- 2. Check Recent Raw Events (Last 10)
SELECT 
    e.id, 
    p.name as platform, 
    e.event_type, 
    e.idempotency_key, 
    e.status, 
    e.created_at,
    e.raw_payload ->> 'message_id' as payload_msg_id
FROM whatsapp_raw_events e
JOIN whatsapp_platforms p ON e.platform_id = p.id
ORDER BY e.created_at DESC
LIMIT 10;

-- 3. Check Realtime Configuration
SELECT pubname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'whatsapp_raw_events';
