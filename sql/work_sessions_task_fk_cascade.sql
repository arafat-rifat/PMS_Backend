-- Ensure work_sessions is removed when its task is deleted.
-- This fixes: update or delete on table "tasks" violates foreign key constraint "work_sessions_task_id_fkey".

ALTER TABLE work_sessions
  DROP CONSTRAINT IF EXISTS work_sessions_task_id_fkey;

ALTER TABLE work_sessions
  ADD CONSTRAINT work_sessions_task_id_fkey
  FOREIGN KEY (task_id)
  REFERENCES tasks(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
