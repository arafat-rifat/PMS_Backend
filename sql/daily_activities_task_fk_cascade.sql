-- Ensure daily_activities is removed when its task is deleted.
-- This fixes: update or delete on table "tasks" violates foreign key constraint "daily_activities_task_id_fkey".

ALTER TABLE daily_activities
  DROP CONSTRAINT IF EXISTS daily_activities_task_id_fkey;

ALTER TABLE daily_activities
  ADD CONSTRAINT daily_activities_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES tasks(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
