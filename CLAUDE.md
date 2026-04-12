# CLAUDE.md — FuelTrack Project Context

> This file is read automatically by Claude at the start of every session.
> It prevents repeated context-gathering and protects critical code paths.

## What is FuelTrack?

A calorie & macro tracking web/mobile app. Users log food, exercise, and get AI-powered coaching (meal plans, food photo analysis, barcode scanning).

- **Stack**: React (Vite) + Supabase + Netlify Functions + Capacitor (Android)
- **Live URL**: https://fueltrack.me
- **Languages**: Greek (primary) + English
- **Monetization**: Stripe (web-only), $2.99/month Pro subscription

## Critical Rules

### ⛔ DO NOT TOUCH — buildMealPlanJSON()

In `src/components/AiCoach.jsx` around line ~1021, there are functions related to meal plan generation including `buildMealPlanJSON()`. In PR #53, a previous session deleted what looked like "dead code" in this function and **broke the app** — it was reverted. The code is NOT dead. **Do a full runtime data-flow trace before modifying anything in the meal plan generation pipeline.**

### ⛔ DO NOT amend commits

Always create NEW commits. If a pre-commit hook fails, fix the issue and create a new commit. Never `--amend` — it can destroy the previous commit's work.

### ⛔ DO NOT push to branches other than your assigned branch

Check the task description for your branch name. Push only there unless explicitly told otherwise.

## Architecture

### Web vs Native

- **Web (PWA)**: Served from fueltrack.me via Netlify. All features work via browser APIs.
- **Native (Android)**: Capacitor wraps the web app. `capacitor.config.ts` previously had `server.url: 'https://fueltrack.me'` for dev iteration — this was **removed** for Play Store submission. The production app bundles `dist/` locally.
- **API calls**: Always go to `https://fueltrack.me/.netlify/functions/*` via `src/utils/apiBase.js` (`NATIVE_API_BASE`), even when the UI is bundled.

### JS ↔ APK Version Contract

When adding a new Capacitor native plugin:
1. `npm install @capacitor/<plugin>`
2. `npx cap sync android`
3. Add the plugin's `registerPlugin` name to `REQUIRED_NATIVE_PLUGINS` in `src/utils/nativeCapabilities.js`
4. Rebuild the APK

If step 4 is skipped, `src/utils/nativeCapabilities.js` detects the mismatch via `window.Capacitor.PluginHeaders` and shows a warning banner. This prevents the silent web-fallback bug that caused confusion in the April 11 2026 session.

### Native Plugin Names (for PluginHeaders)

| npm package | registerPlugin name |
|---|---|
| `@capacitor/camera` | `Camera` |
| `@capacitor-mlkit/barcode-scanning` | `BarcodeScanner` |

### Stripe Integration (web-only)

Payments go through Stripe Checkout on the web. The native app does NOT have a buy button inside — this avoids Google Play Billing SDK and the 30% commission. When users hit their AI limit, they see "Subscribe to Pro" which opens fueltrack.me in the external browser.

- `netlify/functions/stripe-checkout.js` — creates checkout session
- `netlify/functions/stripe-webhook.js` — handles subscription events, updates `is_paid` in Supabase
- `netlify/functions/stripe-portal.js` — customer portal for managing subscription
- `src/utils/stripe.js` — frontend helpers

**Env vars** (Netlify): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`

## Key Files

| File | Role |
|---|---|
| `src/App.jsx` | Main app shell, routing, state management |
| `src/components/AiCoach.jsx` | AI coach chat (meal plans, training, custom chat) — **LARGE FILE, be careful** |
| `src/components/FoodPhotoAnalyzer.jsx` | AI food photo analysis with native camera support |
| `src/components/BarcodeScanner.jsx` | ML Kit barcode scanner (native) + zxing fallback (web) |
| `src/components/AiLimitLock.jsx` | Paywall/limit UI shown when AI usage exhausted |
| `src/components/NativeStaleBuildBanner.jsx` | Warning banner for stale APK |
| `src/utils/nativeCapabilities.js` | Runtime native plugin detection |
| `src/utils/apiBase.js` | API URL helper (native vs web) |
| `src/utils/aiUsage.js` | AI usage tracking, limits, caching |
| `src/utils/authFetch.js` | Fetch wrapper with Supabase JWT |
| `src/utils/stripe.js` | Stripe checkout/portal helpers |
| `netlify/functions/_aiGate.js` | Server-side AI usage gating (shared by ai-coach, food-photo) |
| `netlify/functions/_cors.js` | CORS wrapper for all Netlify functions |
| `capacitor.config.ts` | Capacitor config — NO server.url for production |
| `android/app/build.gradle` | Android build config with release signing setup |
| `android/build.gradle` | Top-level gradle with Kotlin version resolution |

## AI Usage Limits

| User Type | Daily | Monthly | Lifetime |
|---|---|---|---|
| Free | 5 | 20 | 20 |
| Paid ($2.99/mo) | — | 500 | — |
| Demo / Admin | Unlimited | Unlimited | Unlimited |

Gating happens in `netlify/functions/_aiGate.js` (server) and `src/utils/aiUsage.js` (client).

## Database (Supabase)

Key tables:
- `profiles` — `id`, `email`, `is_paid`, `is_demo`, `stripe_customer_id`
- `ai_usage` — `user_id`, `daily_count`, `daily_date`, `monthly_count`, `monthly_month`, `lifetime_count`
- User state (food logs, exercise, profile settings) is stored client-side in localStorage and synced via Supabase columns on the profiles table.

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # Production build → dist/
npm test -- --run    # Run vitest (274 pass, 2 pre-existing failures)
npm run lint         # ESLint

npx cap sync android # Sync web assets + plugins to Android
npx cap open android # Open Android Studio

# Release AAB (needs keystore in ~/.gradle/gradle.properties)
cd android && ./gradlew bundleRelease
```

## Known Issues

1. **2 pre-existing test failures** — `ProfileTab > shows fasting info` and `SummaryTab > shows Σήμερα button`. Not regressions, not blocking deployment.
2. **Bundle size** — 1.19 MB / 331 KB gzipped. Vite warns at >500KB. Needs code-splitting (item #27).
3. **ML Kit barcode on emulator** — Google Barcode Scanner Module can't download on emulator. Works on real devices. The code calls `installGoogleBarcodeScannerModule()` automatically on first use.
4. **Calorie accuracy** — Flash Lite sometimes puts target calories instead of actual food calories (item #9, needs prompt fix).

## Deployment

- **Web**: Push to `main` → Netlify auto-deploys to fueltrack.me
- **Android**: `npm run build` → `npx cap sync android` → Android Studio Build → Run
- **Play Store**: `./gradlew bundleRelease` → upload AAB to Google Play Console (verification pending as of April 2026)

## Translation

Two locale files: `src/locales/en.json` and `src/locales/el.json`. Always update both when adding i18n keys. Use `{{variable}}` syntax for interpolation.
