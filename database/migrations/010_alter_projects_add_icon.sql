-- Migration: Add icon column to projects

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '';


