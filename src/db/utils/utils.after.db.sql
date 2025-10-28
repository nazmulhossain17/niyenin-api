INSERT INTO roles (role_id, specified_for, name, level, created_at, updated_at)
                VALUES
                    ('ROLE_001_ADMIN', 'admin', 0, NOW(), NOW()),
                    ('ROLE_002_MANAGER', 'vendor', 1, NOW(), NOW()),
                    ('ROLE_003_USER', 'customer', 2, NOW(), NOW()),
                ON CONFLICT (level) DO NOTHING;


-- Role is required for group conversation participants
-- this trigger for conversation is grou and role is not null if personal then null
-- Drop trigger if it exists
DROP TRIGGER IF EXISTS check_group_role_trigger ON conversation_participants;

-- Drop the function if it exists (to prevent redefinition errors)
DROP FUNCTION IF EXISTS check_group_role();

-- Now, recreate the function and the trigger
CREATE OR REPLACE FUNCTION check_group_role()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM conversations WHERE conversation_id = NEW.conversation_id AND type = 'group') THEN
        IF NEW.role IS NULL THEN
            RAISE EXCEPTION 'Role is required for group conversation participants';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_group_role_trigger
BEFORE INSERT OR UPDATE ON conversation_participants
FOR EACH ROW
EXECUTE FUNCTION check_group_role();



UPDATE task_times tt
SET end_time = COALESCE((
    SELECT ts.end_time
    FROM task_time_snapshot ts
    WHERE ts.time_id = tt.time_id
    ORDER BY ts.created_at DESC
    LIMIT 1
), tt.start_time)
WHERE tt.end_time IS NULL;
  -- AND tt.time_id NOT IN (
  --   SELECT DISTINCT ON (user_id) time_id
  --   FROM task_times
  --   WHERE end_time IS NULL
  --   ORDER BY user_id, created_at DESC
  -- );
