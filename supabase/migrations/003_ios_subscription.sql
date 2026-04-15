-- FuelTrack Migration: iOS subscription tracking
--
-- Background:
--   The web/Android subscription path goes through Stripe and updates
--   profiles.is_paid via the Stripe webhook (netlify/functions/stripe-webhook).
--   For iOS we are forced by App Store policy to use Apple StoreKit
--   in-app purchases instead of Stripe. The two paths run in parallel,
--   each updating profiles.is_paid for the same user.
--
-- This migration adds two columns so the backend can:
--   1. Tell which payment provider activated a given subscription
--      (so we render the right "Manage subscription" link — App Store
--      vs Stripe portal — and never try to refund / cancel via the
--      wrong provider).
--   2. Map an incoming App Store Server Notification (renewal,
--      cancellation, refund) back to the right user via the Apple
--      original_transaction_id.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_source TEXT
    CHECK (subscription_source IS NULL OR subscription_source IN ('stripe', 'ios', 'android'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ios_original_transaction_id TEXT;

-- Lookup index for incoming Apple notifications. The webhook only has
-- the original_transaction_id, not the user id, so this query has to
-- be fast.
CREATE INDEX IF NOT EXISTS profiles_ios_orig_tx_idx
  ON public.profiles (ios_original_transaction_id)
  WHERE ios_original_transaction_id IS NOT NULL;
