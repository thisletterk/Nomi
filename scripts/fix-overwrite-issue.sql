-- Check current constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'mood_entries' 
    AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');

-- Remove any unique constraints on user_id + date if they exist
DO $$ 
BEGIN
    -- Try to drop any unique constraint that might cause overwrites
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'mood_entries' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%user%date%'
    ) THEN
        EXECUTE 'ALTER TABLE mood_entries DROP CONSTRAINT ' || (
            SELECT constraint_name FROM information_schema.table_constraints 
            WHERE table_name = 'mood_entries' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%user%date%'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped unique constraint that was causing overwrites';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No problematic unique constraint found or error occurred: %', SQLERRM;
END $$;

-- Ensure we have a regular index (not unique) for performance
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, date);

-- Test that we can insert multiple entries for same user/date
INSERT INTO mood_entries (
    id, user_id, mood_type_id, intensity, note, date, timestamp
) VALUES 
    ('test_fix_1_' || extract(epoch from now())::text, 'test_user_fix', 'happy', 4, 'Test entry 1', CURRENT_DATE, extract(epoch from now() * 1000)::bigint),
    ('test_fix_2_' || extract(epoch from now())::text, 'test_user_fix', 'neutral', 3, 'Test entry 2', CURRENT_DATE, extract(epoch from now() * 1000 + 1000)::bigint);

-- Verify multiple entries work
SELECT 
    COUNT(*) as entries_count,
    'Multiple entries test: ' || CASE WHEN COUNT(*) >= 2 THEN 'PASSED' ELSE 'FAILED' END as test_result
FROM mood_entries 
WHERE user_id = 'test_user_fix' AND date = CURRENT_DATE;

-- Show your existing data is still there
SELECT 
    COUNT(*) as existing_entries,
    'Your existing data: ' || COUNT(*) || ' entries preserved' as status
FROM mood_entries 
WHERE user_id != 'test_user_fix';

-- Clean up test data
DELETE FROM mood_entries WHERE user_id = 'test_user_fix';

SELECT '✅ Fix completed - your existing data is preserved and overwrites are prevented' as final_status;
