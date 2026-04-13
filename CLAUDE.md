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

## Pending Tasks (updated April 12, 2026)

### Εκκρεμούν — χρειάζονται τον Marios
- [ ] **Barcode test σε πραγματικό κινητό** — Ο emulator δεν μπορεί να κατεβάσει το Google ML Kit barcode module. Σε πραγματικό Android κινητό θα κατέβει αυτόματα. Χρειάζεται USB debugging ή build APK και εγκατάσταση.
- [ ] **Test plan chooser** — Φτιάξε νέο account (με νέο email) και δοκίμασε αν εμφανίζεται το "Welcome to FuelTrack! Choose your plan" modal μετά το πρώτο login.
- [ ] **Google Play verification** — Υποβλήθηκε 12/4/2026, αναμονή 1-2 μέρες. Χρειάζεται ταυτοποίηση + Android device verification μέσω Play Console app.
- [ ] **Keystore + signed AAB** — Μετά το verification: (1) δημιούργησε keystore αρχείο με keytool, (2) βάλε paths/passwords στο gradle.properties, (3) τρέξε `.\gradlew bundleRelease`, (4) upload AAB στο Play Console. **ΚΡΙΣΙΜΟ: αν χαθεί το keystore, δεν μπορείς ΠΟΤΕ να κάνεις update στο app.**
- [ ] **Stripe live mode** — Στο Netlify dashboard, αντικατέστησε `STRIPE_SECRET_KEY` από `sk_test_...` σε `sk_live_...` (παίρνεις το live key από Stripe Dashboard → Developers → API keys). Επίσης δημιούργησε νέο live webhook endpoint και αντικατέστησε `STRIPE_WEBHOOK_SECRET`.
- [ ] **Upload Play Store** — Screenshots (8 τύποι — λίστα στο `store-listing.md`), κείμενα (έτοιμα στο `store-listing.md`), content rating, privacy policy URL.
- [ ] **Resend DNS verification** — Τα DNS records (DKIM, SPF) προστέθηκαν στο GreenGeeks. Πρέπει να γίνει Reverify στο resend.com → Domains. Μετά setup SMTP στο Supabase.
- [ ] **Supabase SMTP setup** — Μετά Resend verify: Supabase Dashboard → Project Settings → Auth → SMTP → Host: smtp.resend.com, Port: 465, User: resend, Password: Resend API key, Sender: noreply@fueltrack.me
- [ ] **Apple App Store review** — Submitted 13/4/2026, αναμονή 1-2 μέρες. Build 3 με σωστό icon.

### Εκκρεμούν — code tasks
- [ ] **#7 Ποικιλία στα meal plans** — Τα generated meal plans επαναλαμβάνουν τα ίδια φαγητά (π.χ. Greek yogurt κάθε πρωί, chicken breast κάθε μεσημέρι). Χρειάζεται prompt improvement ή seed/randomization ώστε κάθε generate να δίνει διαφορετικά γεύματα.
- [ ] **#8 Toggle "απλά υλικά"** — Υπάρχει ήδη toggle `simpleMode` στο UI. Όταν ενεργοποιημένο, η grocery list πρέπει να έχει λιγότερα/απλούστερα υλικά (π.χ. αντί 15 διαφορετικά λαχανικά, μόνο 5 βασικά). Χρειάζεται prompt adjustment.
- [ ] **#4 Meal plan: 2 API calls → 1** — Τώρα ο AI Coach κάνει 2 ξεχωριστά calls (ένα για meals, ένα για snacks) αντί για 1 call. Αυτό κοστίζει διπλά tokens και μπορεί να δώσει ασυνέπειες. ⚠️ ΠΡΟΣΟΧΗ: Στο PR #53 ένα προηγούμενο session διέγραψε "dead code" στο `buildMealPlanJSON()` και ΕΣΠΑΣΕ το app — revert-αρίστηκε. Πρέπει πρώτα full runtime data-flow trace πριν αγγίξεις κάτι.
- [ ] **#5 Grocery list από user input** — Ο user γράφει σε ελεύθερο κείμενο τι θέλει να ψωνίσει (π.χ. "κοτόπουλο, ρύζι, ντομάτες, γιαούρτι") και το AI το μετατρέπει σε organized JSON λίστα με κατηγορίες (Κρέατα, Γαλακτοκομικά κλπ) και ποσότητες. Τώρα η grocery list δημιουργείται μόνο από meal plan.
- [ ] **#6 Αυτόματη επιλογή AI model** — Τώρα χρησιμοποιείται πάντα Gemini 2.5 Flash Lite (φθηνό, $0.10/$0.40). Για πολύπλοκα tasks (meal plans 7 ημερών, training plans) θα πρέπει αυτόματα να χρησιμοποιεί ακριβότερο/καλύτερο model (π.χ. Gemini Flash $0.30/$2.50) για καλύτερα αποτελέσματα. Για απλές ερωτήσεις (analyze my day, quick chat) παραμένει το φθηνό.
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

- **Web**: Push to `main` → Netlify auto-deploys to fueltrack.me
- **Android**: `npm run build` → `npx cap sync android` → Android Studio Build → Run
- **Play Store**: `./gradlew bundleRelease` → upload AAB to Google Play Console (verification pending as of April 2026)

## Translation

Two locale files: `src/locales/en.json` and `src/locales/el.json`. Always update both when adding i18n keys. Use `{{variable}}` syntax for interpolation.
