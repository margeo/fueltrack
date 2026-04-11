-- FuelTrack Migration: AI Usage Tracking (Phase A1)
-- Run this in Supabase SQL Editor
-- This creates the ai_usage table and the RPC functions for
-- atomic increment and client-side read of the current user's usage.

-- ============================================================================
-- 1. ai_usage table — one row per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_count    INTEGER NOT NULL DEFAULT 0,
  daily_date     DATE    NOT NULL DEFAULT CURRENT_DATE,
  monthly_count  INTEGER NOT NULL DEFAULT 0,
  monthly_month  TEXT    NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
  lifetime_count INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Row Level Security — users can read (but not write) their own row.
--    Writes happen exclusively via the SECURITY DEFINER function below,
--    called from the Netlify backend with the service role key.
-- ============================================================================
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own usage" ON public.ai_usage;
CREATE POLICY "Users can read their own usage"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. get_my_ai_usage() — called from the CLIENT.
--    Returns the current user's usage with daily/monthly reset logic applied.
--    If the row does not exist yet, returns zeros.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_ai_usage()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
  v_month   TEXT := to_char(NOW(), 'YYYY-MM');
  v_row     public.ai_usage%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.ai_usage WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'dailyCount',    0,
      'monthlyCount',  0,
      'lifetimeCount', 0
    );
  END IF;

  RETURN json_build_object(
    'dailyCount',    CASE WHEN v_row.daily_date    = v_today THEN v_row.daily_count    ELSE 0 END,
    'monthlyCount',  CASE WHEN v_row.monthly_month = v_month THEN v_row.monthly_count  ELSE 0 END,
    'lifetimeCount', v_row.lifetime_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_ai_usage() TO authenticated;

-- ============================================================================
-- 4. increment_ai_usage(p_user_id) — called from the BACKEND only.
--    Atomically increments daily/monthly/lifetime counts with reset logic.
--    Access restricted to the service_role key.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today    DATE := CURRENT_DATE;
  v_month    TEXT := to_char(NOW(), 'YYYY-MM');
  v_daily    INTEGER;
  v_monthly  INTEGER;
  v_lifetime INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, daily_count, daily_date, monthly_count, monthly_month, lifetime_count, updated_at)
  VALUES (p_user_id, 1, v_today, 1, v_month, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    daily_count = CASE
      WHEN public.ai_usage.daily_date = v_today THEN public.ai_usage.daily_count + 1
      ELSE 1
    END,
    daily_date = v_today,
    monthly_count = CASE
      WHEN public.ai_usage.monthly_month = v_month THEN public.ai_usage.monthly_count + 1
      ELSE 1
    END,
    monthly_month = v_month,
    lifetime_count = public.ai_usage.lifetime_count + 1,
    updated_at = NOW()
  RETURNING daily_count, monthly_count, lifetime_count
  INTO v_daily, v_monthly, v_lifetime;

  RETURN json_build_object(
    'dailyCount',    v_daily,
    'monthlyCount',  v_monthly,
    'lifetimeCount', v_lifetime
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_ai_usage(UUID) TO service_role;
