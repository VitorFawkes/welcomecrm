-- Fix for "function gen_random_bytes(integer) does not exist" error
-- This error occurs because the previous security migration emptied the search_path,
-- but the function body calls 'gen_random_bytes' without the 'extensions.' prefix.

-- We restore the search_path to include 'extensions' (where pgcrypto lives) and 'public' (where tables live).
ALTER FUNCTION public.generate_api_key(text, jsonb, integer, timestamp with time zone) SET search_path = public, extensions;
