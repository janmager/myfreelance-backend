-- Migration: Alter notes - add project_id FK to projects

ALTER TABLE IF EXISTS notes
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);



