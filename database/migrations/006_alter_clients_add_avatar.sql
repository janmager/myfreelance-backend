-- Migration: Alter clients - add avatar column with default ""

ALTER TABLE IF EXISTS clients
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';



