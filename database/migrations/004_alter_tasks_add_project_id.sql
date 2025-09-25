-- Migration: Alter tasks - add project_id FK to projects

-- Add column if not exists (safe for repeated runs)
ALTER TABLE IF EXISTS tasks
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);


