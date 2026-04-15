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

### ⛔ DO NOT break the dual-scroll pattern

Both the AI Coach and the Grocery List use a **two-step scroll** that must be preserved:

1. **Scroll 1 (on request):** Page-level scroll brings the AI Coach / plans section to the top of the viewport. Uses `document.scrollingElement.scrollTo()` (NOT `scrollIntoView` — it's flaky on Android WebView).
2. **Scroll 2 (on response):** After results load, scrolls the specific content (last chat message / grocery list) to the top. Uses `requestAnimationFrame` + `setTimeout(300)` to wait for layout settle.

**Files:**
- `src/components/AiCoach.jsx` ~line 478-508 (chat scroll with double rAF + 300ms)
- `src/components/tabs/SummaryTab.jsx` ~line 137-182 (grocery scroll, same pattern)

These were broken and re-fixed multiple times. Do NOT simplify, refactor, or replace with `scrollIntoView`.

### ⛔ DO NOT amend commits

Always create NEW commits. If a pre-commit hook fails, fix the issue and create a new commit. Never `--amend` — it can destroy the previous commit's work.

### ⛔ DO NOT push to branches other than your assigned branch

Check the task description for your branch name. Push only there unless explicitly told otherwise.

### ⛔ Dev-first workflow — NEVER push directly to main

The production app (fueltrack.me) is live and visible to real users. **All code changes go to the `dev` branch first.**

- **Dev branch**: `dev` → auto-deploys to `dev.fueltrack.me`
- **Production branch**: `main` → auto-deploys to `fueltrack.me`

**Workflow:**
1. All changes are developed and pushed to `dev`
2. Marios tests at the dev URL
3. **Only when Marios explicitly says** "πέρνα το στο main" / "push to production" → merge `dev` into `main`

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

### Netlify Access

- **Site name**: `fueltrack-marios`
- **Site ID**: `a8c157d9-9ef2-44f0-8813-c680074181dc`
- **DNS**: Managed via Netlify DNS (nameservers: `dns{1-4}.p08.nsone.net`)
- **Branch deploys**: `dev` branch → `dev.fueltrack.me`

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

1. **All 276 tests pass** (as of April 15, 2026, evening). The 26 failures from the April 14 UI overhaul were fixed in 5 separate test-only commits — every fix only touches `src/**/__tests__/*.test.jsx`, never component code. The pattern was always (a) seed sessionStorage keys for cards that became collapsible by default, and/or (b) loosen exact-string matchers to regexes that absorb the new emoji/branding chrome. CI Test workflow on `main` should now go green.
2. **Bundle size** — 1.19 MB / 331 KB gzipped. Vite warns at >500KB. Needs code-splitting (item #27).
3. **ML Kit barcode on emulator** — Google Barcode Scanner Module can't download on emulator. Works on real devices. The code calls `installGoogleBarcodeScannerModule()` automatically on first use.
4. **Calorie accuracy** — Flash Lite sometimes puts target calories instead of actual food calories (item #9, needs prompt fix).

## Pending Tasks (updated April 15, 2026)

### Εκκρεμούν — χρειάζονται τον Marios
- [ ] **iOS Apple review resubmit (URGENT)** — Version 1.0 build 3 rejected 14/4/2026 για 2 issues: (a) 5.1.1 Account Deletion — **FIXED in code** (`src/components/DeleteAccountModal.jsx` + `netlify/functions/delete-account.js`, Delete my account link δίπλα στο Privacy Policy στο Profile tab), (b) 2.1 App Completeness (Upgrade to Pro button not working on iOS native) — **FIXED in code** μέσω Apple IAP (StoreKit 2) — βλ. iOS IAP section πιο κάτω.
  - **Το resubmit απαιτεί νέο iOS build (4)** που περιέχει τον νέο κώδικα, και σύνδεση με το subscription product στο App Store Connect.
  - Στο App Store Connect (iOS Submission page) υπάρχει "Respond to Apple" message thread — εκεί γράφουμε τι φτιάξαμε και submit build 4.
- [ ] **Paid Apps Agreement** — Requested 15/4/2026, status **Processing**. Απαιτείται **Active** πριν το sandbox IAP testing δουλέψει. Παίρνει ~24h. Check: App Store Connect → Business → Agreements.
- [ ] **Small Business Program** — Applied 15/4/2026, waiting approval email. 15% commission αντί 30% για όλα τα iOS IAP sales. Must-have πριν το πρώτο sale.
- [ ] **Sandbox Tester → στο iPhone** — Created 15/4/2026 με email `mariosgeorgiadis.sandbox@gmail.com` + password που όρισε ο Marios (NOT stored — αν ξεχαστεί, delete + recreate). Για testing: iPhone Settings → App Store → Sandbox Account → Sign In με αυτά.
- [ ] **MacinCloud iOS build 4** — Όταν Paid Apps = Active: `git pull origin main && npm install && npx cap sync ios && npx cap open ios`. Στο Xcode: bump build 3→4, Archive, Upload to TestFlight.
- [ ] **Barcode test σε πραγματικό κινητό** — Ο emulator δεν μπορεί να κατεβάσει το Google ML Kit barcode module. Σε πραγματικό Android κινητό θα κατέβει αυτόματα. Χρειάζεται USB debugging ή build APK και εγκατάσταση.
- [ ] **Test plan chooser** — Φτιάξε νέο account (με νέο email) και δοκίμασε αν εμφανίζεται το "Welcome to FuelTrack! Choose your plan" modal μετά το πρώτο login.
- [ ] **Google Play verification** — Υποβλήθηκε 12/4/2026, αναμονή 1-2 μέρες. Χρειάζεται ταυτοποίηση + Android device verification μέσω Play Console app.
- [ ] **Keystore + signed AAB** — Μετά το verification: (1) δημιούργησε keystore αρχείο με keytool, (2) βάλε paths/passwords στο gradle.properties, (3) τρέξε `.\gradlew bundleRelease`, (4) upload AAB στο Play Console. **ΚΡΙΣΙΜΟ: αν χαθεί το keystore, δεν μπορείς ΠΟΤΕ να κάνεις update στο app.**
- [ ] **Stripe live mode** — Στο Netlify dashboard, αντικατέστησε `STRIPE_SECRET_KEY` από `sk_test_...` σε `sk_live_...` (παίρνεις το live key από Stripe Dashboard → Developers → API keys). Επίσης δημιούργησε νέο live webhook endpoint και αντικατέστησε `STRIPE_WEBHOOK_SECRET`.
- [ ] **Upload Play Store** — Screenshots (8 τύποι — λίστα στο `store-listing.md`), κείμενα (έτοιμα στο `store-listing.md`), content rating, privacy policy URL.
- [x] **Resend DNS verification** — DNS records (DKIM, SPF) προστέθηκαν στο Netlify DNS (NS1). Verified 13/4/2026.
- [x] **Supabase SMTP setup** — Custom SMTP ενεργοποιήθηκε: smtp.resend.com:465, sender: noreply@fueltrack.me
- [ ] **Apple & Google Privacy Policy update** — Ενημέρωση privacy policy URL (`https://fueltrack.me/privacy.html`) στο App Store Connect (App Privacy) και Google Play Console (App content → Privacy policy + Data safety section).

### iOS IAP (Apple StoreKit 2) — ✅ Infrastructure ready, απαιτεί build 4 για να ενεργοποιηθεί

**Γιατί χρειάστηκε**: Apple 2.1 rejection — απαγορεύει external Stripe checkout σε iOS native app. Raised rejection 14/4/2026. Επιλέξαμε **Option B (full Apple IAP)** με **€2.99 pricing parity** και Small Business Program (15%).

**Package**: `@capgo/native-purchases@8.3.3` (MIT, free, Capacitor 8 compatible, native StoreKit 2 με JWS). Εγκαταστάθηκε 15/4/2026. Κρατήσαμε Stripe για web/Android. **ΜΗΝ** downgrade Capacitor ή αντικαταστήσεις το plugin — τα άλλα options (squareetlabs, capgo-purchases) δεν υποστηρίζουν v8.

**Backend validation**: `@apple/app-store-server-library@3.0.0` (Apple's official, MIT). Verify-άρει JWS signatures αυτόματα με Apple root CA chain. Δεν χρειάζεται manual crypto — δεν το ξαναγράφεις εσύ.

**Κρίσιμα αρχεία:**
- `src/utils/iosIAP.js` — wrapper γύρω από @capgo/native-purchases. Product ID `me.fueltrack.app.pro_monthly` (hardcoded, πρέπει να match App Store Connect ακριβώς). `isIosIapAvailable()` gate — μηδέν risk για web/Android.
- `src/utils/subscription.js` — platform dispatcher. `startProMonthlyPurchase()` → iOS: StoreKit + POST JWS στο backend validator. web/Android: `openCheckout()` (Stripe). `openManageSubscription(source)` → iOS: `NativePurchases.manageSubscriptions()`. Άλλο: Stripe portal. **ΟΛΕΣ οι subscription actions** στο UI πρέπει να πάνε από εδώ — όχι direct Stripe call.
- `netlify/functions/ios-validate-receipt.js` — client-authenticated POST. Τρέχει verification PRODUCTION πρώτα, SANDBOX fallback (match Apple's pattern). Enforce: bundleId, productId, appAccountToken (= Supabase user id), expiresDate. Γράφει στο `profiles.is_paid`, `subscription_source='ios'`, `ios_original_transaction_id`.
- `netlify/functions/ios-store-notification.js` — App Store Server Notifications v2 webhook. Lookup user via `ios_original_transaction_id`. `PAID_EFFECT` map: SUBSCRIBED/DID_RENEW → true, EXPIRED/REVOKE/REFUND → false. **Πάντα** επιστρέφει 200 (Apple retries σε άλλο status).
- `netlify/functions/_appleCerts.js` — reads base64-encoded Apple root CAs από env vars. Only G3 cert needed για StoreKit 2 — το Inc RSA legacy cert όχι.
- `supabase/migrations/003_ios_subscription.sql` — `subscription_source TEXT CHECK (...)` + `ios_original_transaction_id TEXT` + index στο profiles. **Έχει τρέξει στο Supabase**.
- `src/components/tabs/ProfileTab.jsx` — fetches `subscription_source` από profiles, passes στο `openManageSubscription(source)`. ⚠️ Νέα state `subscriptionSource`.
- `src/components/AiLimitLock.jsx`, `src/components/PlanChooser.jsx` — χρησιμοποιούν `startProMonthlyPurchase()` αντί `openCheckout()` direct.

**Netlify env vars (already set 15/4/2026):**
- `RESEND_API_KEY` — για όλα τα transactional emails
- `APPLE_ROOT_CA_G3_B64` — base64 του AppleRootCA-G3.cer (cert είναι public)
- `APPLE_BUNDLE_ID` = `me.fueltrack.app`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — already existed

**App Store Connect setup (done 15/4/2026):**
- Subscription Group: `FuelTrack Pro`
- Subscription: `FuelTrack Pro Monthly` με Product ID `me.fueltrack.app.pro_monthly` (1 month, €2.99 base, 175 countries)
- Localizations EN + EL (Prepare for Submission)
- Review screenshot + notes uploaded
- **Server Notifications URLs** (Production + Sandbox): `https://fueltrack.me/.netlify/functions/ios-store-notification` (V2)

### Εκκρεμούν — code tasks
- [ ] **#7 Ποικιλία στα meal plans** — Τα generated meal plans επαναλαμβάνουν τα ίδια φαγητά (π.χ. Greek yogurt κάθε πρωί, chicken breast κάθε μεσημέρι). Χρειάζεται prompt improvement ή seed/randomization ώστε κάθε generate να δίνει διαφορετικά γεύματα.
- [ ] **#8 Toggle "απλά υλικά"** — Υπάρχει ήδη toggle `simpleMode` στο UI. Όταν ενεργοποιημένο, η grocery list πρέπει να έχει λιγότερα/απλούστερα υλικά (π.χ. αντί 15 διαφορετικά λαχανικά, μόνο 5 βασικά). Χρειάζεται prompt adjustment.
- [ ] **#4 Meal plan: 2 API calls → 1** — Τώρα ο AI Coach κάνει 2 ξεχωριστά calls (ένα για meals, ένα για snacks) αντί για 1 call. Αυτό κοστίζει διπλά tokens και μπορεί να δώσει ασυνέπειες. ⚠️ ΠΡΟΣΟΧΗ: Στο PR #53 ένα προηγούμενο session διέγραψε "dead code" στο `buildMealPlanJSON()` και ΕΣΠΑΣΕ το app — revert-αρίστηκε. Πρέπει πρώτα full runtime data-flow trace πριν αγγίξεις κάτι.
- [ ] **#5 Grocery list από user input** — Ο user γράφει σε ελεύθερο κείμενο τι θέλει να ψωνίσει (π.χ. "κοτόπουλο, ρύζι, ντομάτες, γιαούρτι") και το AI το μετατρέπει σε organized JSON λίστα με κατηγορίες (Κρέατα, Γαλακτοκομικά κλπ) και ποσότητες. Τώρα η grocery list δημιουργείται μόνο από meal plan. (Θέλει σκέψη — αν χρειάζεται τελικά.)
- [ ] **Tab headers/info polish** — Οι πληροφορίες στο πάνω μέρος κάθε tab (Summary, Food, Exercise, Profile) είναι πρόχειρα φτιαγμένες. Χρειάζεται UI/UX βελτίωση — καλύτερο layout, spacing, typography, consistency μεταξύ tabs.
- [ ] **SMTP env cleanup** — Όταν iOS IAP επιβεβαιωθεί ότι δουλεύει σε sandbox, διέγραψε τα ΑΧΡΗΣΙΜΟΠΟΙΗΤΑ `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` env vars στο Netlify (τα αντικατέστησε το `RESEND_API_KEY` στις 15/4/2026).
- [ ] **Apple DSA trader email → change to `info@fueltrack.me`** — During the 15/4/2026 App Store Connect setup Marios accepted the DSA trader compliance flow using his personal email instead of the `info@fueltrack.me` alias we had agreed on. That email is DISPLAYED PUBLICLY on the App Store product page (EU Digital Services Act requirement) and will pull scraper-spam within a week of launch. Fix path: App Store Connect → avatar → Business → Agreements → Marios Georgiadis section → Edit → swap the contact email to `info@fueltrack.me` (or `support@fueltrack.me`). Safe while the app is still rejected / not live; priority before resubmit approval. The Paid Apps Agreement internal contacts (Sr. Executive / Financial / Technical) stay private to Apple — no change needed there.
- [ ] **Terms of Service page (`public/terms.html`)** — Discussed adapting MyFitnessPal's ToS to FuelTrack on 15/4/2026. Agreed plan: 12-section adaptation (who can use, account, services, Pro subscription with Stripe+Apple IAP paths, not-medical-advice, AI/ML disclaimer, content+IP, prohibited uses, third parties Supabase/Netlify/Stripe/Apple/Google/OpenRouter, disclaimer+liability capped at €500, Greek governing law + EU ODR, changes, contact `info@fueltrack.me`). Host at fueltrack.me/terms.html matching privacy.html style/tone. Link from Profile footer + HelpModal footer + optional "By creating an account you agree to our Terms of Service" on the signup form. Content in English (standard for legal docs). ⚠️ Draft only — Marios should have a Greek lawyer glance at it before production use (~1-2h, €100-200). Pre-requisites before drafting: confirm legal-entity name (personal vs. ΙΚΕ), public address, phone for legal notices, confirmed €2.99/mo pricing. **Start by continuing this conversation with the user — they wanted to keep it in memory, not draft tonight.**
- [ ] **Help & Support card in Profile tab** — Discussed 15/4/2026 before the ToS tangent. Plan: new collapsible card in the Profile tab containing six FAQ categories (🚀 Getting Started, 🍽️ Food Logging, 💪 Exercise Tracking, 🤖 Coach & AI, ⭐ Subscription & Billing, 🔒 Account & Privacy) with ~4-6 Q&A pairs each, all static content in the locale files (no AI round-trip). Footer: `📧 info@fueltrack.me`, `🌐 fueltrack.me`, Privacy Policy + Terms links. Keeps the existing ℹ️ header button (contextual per-tab help) untouched — the new card is comprehensive self-service help. Bilingual (EN + EL).
- [ ] **Info button copy refresh** — The ℹ️ HelpModal content (locales `help.{profile,summary,food,exercise}.howTo/tips`) still references UI elements that changed during the April 14 overhaul: e.g. summary.howTo mentions "macro bars" but the hero now has the calorie donut + macro pie + tips; profile.howTo references "unit toggle (top right)" and "language selector" / "sign in at bottom" which are now inside the Account card. Needs a per-tab pass updating the strings in both en.json and el.json. No component changes.

- [ ] **#10 Barcode UX βελτιώσεις** — Μετά που δουλέψει ο barcode scanner σε real device: UX polish, animation, error handling, ιστορικό σκαναρισμάτων.
- [ ] **#19 Google OAuth login** — Τώρα υπάρχει μόνο email/password login. Πρόσθεση Google Sign-In μέσω Supabase Auth (χρειάζεται Google Cloud Console → OAuth consent screen → credentials → Supabase config).
- [ ] **#27 Bundle size** — Το JS bundle είναι 1.19MB (331KB gzipped), Vite warning >500KB. Λύση: code-splitting με dynamic `import()` ώστε ο AI Coach, Food Photo κλπ φορτώνουν μόνο όταν ο user πατήσει το αντίστοιχο tab, όχι στο αρχικό load.

### Εκκρεμούν — future features
- [ ] **Google Fit integration** — Ο κώδικας υπάρχει (`src/components/GoogleFitButton.jsx`), χρειάζεται testing + Google Cloud Console OAuth setup.
- [ ] **Apple Health integration** — iOS only, χρειάζεται Capacitor plugin (`@capacitor/health`). Μόνο αφού κυκλοφορήσει η iOS app.
- [ ] **PDF export βελτίωση** — Βελτίωση εμφάνισης/formatting του exported PDF (meal plans, food log).
- [ ] **Push notifications** — FCM (Firebase Cloud Messaging) setup για reminders (π.χ. "Δεν έχεις καταγράψει γεύμα σήμερα").
- [ ] **Offline mode** — IndexedDB caching ώστε η app να δουλεύει χωρίς internet (food search, logging). Sync μετά.
- [ ] **Social features** — Friends, challenges, shared meal plans, leaderboard streak.
- [ ] **Apple Sign-In** — Login με Apple ID (απαιτείται από Apple αν έχεις Google/Facebook login).
- [ ] **Facebook login** — Πρόσθεση Facebook Sign-In μέσω Supabase Auth.
- [ ] **Analytics / Επισκεψιμότητα** — Setup analytics (Google Analytics ή Plausible/PostHog) για tracking επισκέψεων, ενεργών χρηστών, conversions (free→pro), retention.
- [ ] **ASO (App Store Optimization)** — Βελτιστοποίηση keywords, screenshots, description στο App Store & Google Play.
- [ ] **Marketing & Promotion** — Στρατηγική προώθησης: paid ads, social media, reviews/ratings campaigns.

### Completed session April 15, 2026 (evening — dashboard polish)
- [x] **Calorie donut** in the Dashboard hero Macros section — 150 px SVG donut, arc colour mirrors `getRemainingColor()` so the ring tracks the big "Remaining" text above, centre reads `remaining kcal` + "REMAINING" + `/ target kcal` small print.
- [x] **Macro target pie** next to the calorie donut — filled three-slice SVG (protein #3b82f6, carbs #f59e0b, fat #ef4444 — same as the .macro-bar-* CSS classes), whole-% labels inside each slice (≥ 8 % only). Outer intake ring (same three colours, 8 px stroke) shows the day's eaten-kcal distribution around the target pie; identical visible diameter to the calorie donut so the rows read as matched pairs.
- [x] **Rule-based 👉 tips** — three max, computed locally from remainingCalories, macro overshoot vs target share, and exerciseValue. No AI. Lives in the right column of row 1 (where the pie's actual-intake ring used to be the answer). Keys under `summary.tips.*` in en.json + el.json.
- [x] **Symmetrical 2×2 layout** — row 1: calorie donut + tips; row 2: macro pie + per-macro list (emoji + label + cur/tgt grams + colored bar). `justify-content: center` with gap 24, flex-wrap for narrow viewports.
- [x] **Old horizontal macro bars removed** — the per-macro list on row 2 carries their information alongside the pie.

### Completed session April 15, 2026
- [x] **Duplicate admin emails → fixed**: migrated `new-user-notify.js` από GreenGeeks SMTP (ams201.greengeeks.net, έκανε duplicate delivery) σε Resend HTTP API με Idempotency-Key. Admin email subject/body πλέον σε Αγγλικά.
- [x] **`nodemailer` dependency removed** from package.json (μόνο new-user-notify το χρησιμοποιούσε).
- [x] **Welcome email (Apple-friendly approach)**: δεν στέλνουμε ξεχωριστό welcome email. Αντί αυτού, το Supabase "Confirm signup" email template στο Supabase Dashboard επεκτάθηκε να λέει "Welcome to FuelTrack! ... Once confirmed, you'll get: AI meal plans, barcode scanning, photo meal analysis, tracking". Απλό, καμία νέα υποδομή.
- [x] **Account deletion (Apple 5.1.1 compliance)**: `netlify/functions/delete-account.js` (admin.deleteUser → CASCADE delete from profiles/user_state/ai_usage) + `src/components/DeleteAccountModal.jsx` (type-DELETE confirmation) + link "Delete my account" δίπλα στο "Privacy Policy" στο Profile footer. Translations EN + EL.
- [x] **Slogan banner removed** από όλους τους 4 tabs (SloganBanner.jsx deleted).
- [x] **iOS IAP full infrastructure**: βλ. "iOS IAP" section. 4 steps (DB migration, plugin install, frontend dispatcher, backend validation + webhook).
- [x] **App Store Connect setup για iOS IAP**: DSA compliance (trader), Legal entity info, Paid Apps Agreement requested, Banking info, Small Business Program applied, Subscription product με €2.99 pricing σε 175 countries, Server Notifications URLs, Sandbox tester created.
- [x] **Netlify env vars**: `RESEND_API_KEY`, `APPLE_ROOT_CA_G3_B64`, `APPLE_BUNDLE_ID`.
- [x] **CLAUDE.md session context** for resuming.

### Completed session April 14, 2026
- [x] Expand/collapse on Food Profile, Exercise Profile, Your Target sections
- [x] "Your Target" card with Goal + Analysis subcategories
- [x] Rename "Fitness Profile" → "Exercise Profile"
- [x] Tagline "Plan → Track → Achieve!" in header and welcome screen
- [x] Subscription section merged into Account card (PRO/FREE badge)
- [x] Language selector with SVG flags in Account card
- [x] € instead of $ everywhere
- [x] "Ai Coach" → "Coach" in all user-facing text
- [x] "AI queries/requests" → "Coach requests"
- [x] Header redesign: EN/EL text, ☀️/🌙, ℹ️ controls
- [x] Tab reorder: Dashboard, Food, Exercise, Profile
- [x] Expand/collapse on all tabs (Dashboard, Food, Exercise) with sessionStorage persistence
- [x] Collapsible Macros section in hero card
- [x] Exercise favorites + button adds directly (30min default)
- [x] Food/Exercise: shorter card titles (Add, Favorites, Recent, Custom)
- [x] CI workflow: only runs on main pushes and PRs
- [x] Dev branch setup: dev.fueltrack.me deploys from `dev` branch
- [x] Deleted old branches (staging, claude/*, revert-*)
- [x] Comprehensive privacy policy (no named third parties, regional sections)
- [x] Welcome screen: SVG Greek flag, scroll to top on Get Started
- [x] Profile incomplete hint moved inside Profile card

### Completed session April 13, 2026
- [x] Grocery list scroll fix (document.scrollingElement + double rAF pattern)
- [x] Grocery list iPhone fix (error handling instead of silent fail)
- [x] Password reset form (detect PASSWORD_RECOVERY event, show modal)
- [x] Password reset modal: show/hide password toggle + X close button + opaque background
- [x] Email templates branded (FuelTrack colors + logo) for Supabase
- [x] Resend DNS records added to GreenGeeks (DKIM, SPF) — pending verification
- [x] Apple Developer Account setup
- [x] App Store Connect: FuelTrack - Diet & Fitness created
- [x] App Privacy configured (Email, Health, Fitness, User ID, Product Interaction)
- [x] Bundle ID registered: me.fueltrack.app
- [x] MacinCloud setup + iOS project created
- [x] iOS build succeeded (removed camera/barcode plugins for iOS compatibility)
- [x] AppDelegate.swift fixed for Xcode 16.2
- [x] Native plugin check skipped on iOS (nativeCapabilities.js)
- [x] App icon fixed (AppIcon-512@2x.png)
- [x] iOS app uploaded to App Store Connect (build 3)
- [x] Submitted for App Store review

### Completed session April 12, 2026
- [x] Camera native plugin fix (stale APK detection via PluginHeaders)
- [x] Barcode scanner ML Kit module auto-install
- [x] Kotlin stdlib duplicate class fix
- [x] Stripe integration (checkout, webhook, portal)
- [x] Google Play Console signup
- [x] Remove server.url for production
- [x] Release signing config in gradle
- [x] AI usage badge ("⚡ 2 left")
- [x] Subscription section in Profile tab
- [x] Plan chooser (Free vs Pro) after first login
- [x] Subscribe to Pro CTA on limit screens
- [x] Admin panel: Reset AI button
- [x] Fix 403 admin check errors (new check-admin endpoint)
- [x] Fix 2 pre-existing test failures (276/276 pass)
- [x] Calorie accuracy prompt fix (#9)
- [x] iOS Safari popup blocker fix for Stripe checkout
- [x] Grocery list auth fix (authedFetch)
- [x] limit_reached error suppression in chat
- [x] CI workflow fix (stop GitHub email notifications)
- [x] PayPal enabled in Stripe
- [x] CLAUDE.md created
- [x] Store listing texts (EN + EL)

### Stripe Keys (test mode — in Netlify env vars)
- `STRIPE_PRICE_ID`: `price_1TLHgyKV5fcTURUn53ScTvv8`
- Webhook endpoint: `https://fueltrack.me/.netlify/functions/stripe-webhook`
- Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Supabase: `stripe_customer_id` column added to profiles table

## Deployment

- **Dev**: Push to `dev` → Netlify deploys to `dev.fueltrack.me` (test here first!)
- **Production**: Merge `dev` → `main` (only when Marios approves) → Netlify deploys to fueltrack.me
- **Android**: `npm run build` → `npx cap sync android` → Android Studio Build → Run
- **Play Store**: `./gradlew bundleRelease` → upload AAB to Google Play Console (verification pending as of April 2026)

## Translation

Two locale files: `src/locales/en.json` and `src/locales/el.json`. Always update both when adding i18n keys. Use `{{variable}}` syntax for interpolation.
