-- FuelTrack Migration: Health Profile (Phase B — Health Factors)
-- Run this in Supabase SQL Editor AFTER 002_user_state.sql.
--
-- Adds a single JSONB column `health_prefs` to the existing user_state
-- table to hold the new Health Profile selections (e.g. blood_sugar,
-- heart, joints, digestion, hormonal, recovery). Mirrors the
-- food_prefs / fitness_prefs pattern: one column, JSON blob, no new
-- table. App.jsx writes an object of the shape { healthFactors: [...] }
-- via saveCloudColumn(uid, "health_prefs", ...).

ALTER TABLE public.user_state
  ADD COLUMN IF NOT EXISTS health_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- No new RLS policy or trigger needed — the existing "Users can manage
-- their state" policy already covers all columns on user_state, and
-- the updated_at trigger fires on any UPDATE.
