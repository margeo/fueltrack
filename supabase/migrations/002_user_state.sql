-- FuelTrack Migration: User Data Sync (Phase A2)
-- Run this in Supabase SQL Editor AFTER the A1 migration (001_ai_usage.sql).
-- Creates a single table with JSONB columns for all synced user data.

-- ============================================================================
-- 1. user_state table — one row per user with grouped JSONB columns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic profile
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- expected keys: age, gender, height, weight, activity, goalType, mode,
  --                targetWeightLoss, weeks

  -- Food preferences
  food_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- expected keys: foodCategories, allergies, cookingLevel, cookingTime,
  --                simpleMode, mealsPerDay, snacksPerDay

  -- Fitness preferences
  fitness_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- expected keys: fitnessLevel, workoutLocation, equipment, limitations,
  --                workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories

  -- User-generated content
  custom_foods           JSONB NOT NULL DEFAULT '[]'::jsonb,
  favorite_food_keys     JSONB NOT NULL DEFAULT '[]'::jsonb,
  recent_foods           JSONB NOT NULL DEFAULT '[]'::jsonb,
  favorite_exercise_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  recent_exercises       JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Tracking data
  daily_logs  JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight_log  JSONB NOT NULL DEFAULT '[]'::jsonb,
  saved_plans JSONB NOT NULL DEFAULT '[]'::jsonb,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Row Level Security — each user can read AND write only their own row.
-- ============================================================================
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their state" ON public.user_state;
CREATE POLICY "Users can manage their state"
  ON public.user_state
  FOR ALL
  TO authenticated
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. Auto-bump updated_at on every write
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_user_state_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_state_updated_at ON public.user_state;
CREATE TRIGGER user_state_updated_at
  BEFORE UPDATE ON public.user_state
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_state_updated_at();
