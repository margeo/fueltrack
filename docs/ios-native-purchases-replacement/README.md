# iOS Native Purchases — custom replacement plugin

## Context

`@capgo/native-purchases@8.3.3` has Swift compile errors against
capacitor-swift-pm 8.3.1 — ~27 errors on `call.reject` and single-argument
`call.getString` / `call.getBool`. Earlier builds (build 3 on App Store
Connect) only compiled because the plugin was being dead-stripped by Swift's
linker (no `import NativePurchasesPlugin` in `ios/App/CapApp-SPM/Sources/CapApp-SPM/CapApp-SPM.swift`),
which is exactly why Apple rejected the "Upgrade to Pro" button — the plugin
never loaded at runtime.

Downgrading the plugin to 8.3.0 produced the same errors. The API expectations
inside the plugin source don't match what our installed Capacitor exposes.

This directory contains a custom Swift plugin that replaces
`@capgo/native-purchases` with only the 4 methods `src/utils/iosIAP.js`
actually uses. It talks directly to StoreKit 2, no intermediate layer, and
uses `call.options["key"] as? Type` instead of `call.getString(...)` so it
doesn't depend on whatever API surface the capgo plugin couldn't find.

## ⚠️ Prerequisite: Xcode 16.4 or later

capacitor-swift-pm 8.3.1 gates `call.reject(...)`, `call.getString(key, default)`,
and several other methods behind `#if compiler(>=5.3) && $NonescapableTypes`.
`$NonescapableTypes` is a Swift 6.2+ feature flag; **Xcode 16.3 and earlier do
not define it**, so those methods are invisible to user code at compile time.

We proved this on 17/4/2026 in MacinCloud's default Xcode 16.2 image (Swift
6.0.3): our custom plugin, the camera plugin, and capgo all hit the same
"no member 'reject'" / "missing argument for parameter #2" errors. No downgrade
path worked — 8.0.x / 8.1.x of camera have the same incompatibility in different
directions, and downgrading Capacitor itself to 8.0.2 / 8.2.x did not make the
compiled xcframework expose the old API.

**On Xcode 16.4+ this entire runbook compiles clean with zero workarounds.**
On older Xcode it does not and there's no clean patch — upgrade Xcode first.

## Install (on a Mac with Xcode 16.4+, next session)

**Do these in order. Total time: ~15-20 minutes.**

### 1. Drop in the Swift file

```bash
cp ~/fueltrack/docs/ios-native-purchases-replacement/NativePurchasesPlugin.swift \
   ~/fueltrack/ios/App/App/NativePurchasesPlugin.swift
```

Then in Xcode → Project Navigator → right-click on the `App` group →
**Add Files to "App"…** → select `NativePurchasesPlugin.swift` → ✅ **Copy
items if needed** UNCHECKED (it's already in place) → ✅ **Add to target:
App** → Add.

Verify it appears in the `App` target's Build Phases → Compile Sources.

### 2. Remove @capgo/native-purchases from package.json

```bash
cd ~/fueltrack
npm uninstall @capgo/native-purchases
```

This also removes the entry from `ios/App/CapApp-SPM/Package.swift` on the
next `cap sync ios`.

### 3. Revert the forced import that exposed the broken plugin

```bash
cat > ~/fueltrack/ios/App/CapApp-SPM/Sources/CapApp-SPM/CapApp-SPM.swift << 'EOF'
public let isCapacitorApp = true
EOF
```

(The `import NativePurchasesPlugin` line is what triggered the capgo compile
errors. With the node_module gone, the line would fail to resolve anyway.)

### 4. Rebuild web + sync

```bash
cd ~/fueltrack
npm run build
npx cap sync ios
```

### 5. Bump build number

```bash
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 5" \
  ~/fueltrack/ios/App/App/Info.plist
```

### 6. Xcode

1. Signing & Capabilities → confirm Team = Marios Georgiadis
2. **Product → Clean Build Folder**
3. **Product → Archive**

Archive should pass cleanly — the custom plugin compiles against
capacitor-swift-pm 8.3.x because it uses `call.options[...]` raw dictionary
access, not the methods that broke.

### 7. Validate + upload

1. Organizer → new archive → **Validate App** → App Store Connect → Upload
   symbols → Automatically manage signing → Validate → expect "Validation
   successful".
2. Same archive → **Distribute App** → App Store Connect → Upload → etc.

### 8. Install on iPhone via TestFlight

TestFlight auto-distribution is already enabled on the "Internal Testers"
group (created 17/4/2026). Within 5-10 min after upload the new build
appears in the TestFlight app on `newland@otenet.gr`'s iPhone.

### 9. Smoke test on iPhone

1. Open FuelTrack.
2. **Expect NO yellow banner** at the top of the welcome screen. The
   `NativeStaleBuildBanner` only fires when `hasNativePlugin("NativePurchases")`
   returns false. With our custom plugin registered under jsName
   `"NativePurchases"`, `PluginHeaders` will list it and the banner stays hidden.
3. Navigate: sign in → Profile tab → tap "Subscribe to Pro" / "Upgrade"
   (or hit the AiLimitLock).
4. Native iOS StoreKit sheet should appear with "FuelTrack Pro Monthly
   €2.99 / month".
5. Use the sandbox tester account (`mariosgeorgiadis.sandbox@gmail.com`,
   set via iPhone Settings → App Store → Sandbox Account) to complete
   the purchase. **Free** in sandbox.
6. After purchase, `iosIAP.js` posts the JWS to
   `/.netlify/functions/ios-validate-receipt`, which flips `profiles.is_paid`
   to true. Reopen the app, confirm Pro features unlocked.

### 10. Record Apple review video (screen recording)

On the same iPhone, Settings → Control Center → add Screen Recording. Start
recording, demonstrate:
- Create a new account or sign in with the demo account
  (provided to Apple in App Review Information).
- Profile tab → "Delete my account" link → type DELETE → confirm →
  app signs out, account deleted.

Stop recording. AirDrop / email the video from Photos to the PC.

### 11. Resubmit to Apple

1. App Store Connect → FuelTrack → Distribution → iOS App Version 1.0.
2. Build section → remove old build, add new build 5.
3. Save.
4. App Review section → open the rejected submission (status "Removed" if
   we removed it today) → reply to Apple's message, attach the screen
   recording, and "Resubmit to App Review".

Suggested reply text (same as the one we drafted in the 17/4/2026
session):

> Hello Apple Review Team,
>
> Thank you for the detailed feedback. Build 5 addresses both issues:
>
> 1. Guideline 5.1.1 — Account Deletion. The Profile tab now has a
>    "Delete my account" link next to the Privacy Policy link. Tapping
>    it opens a confirmation modal that requires typing DELETE, then
>    calls our backend which permanently removes the Supabase auth
>    record together with all associated data (profile, food logs,
>    exercise logs, AI usage) via database CASCADE. A screen recording
>    demonstrating the flow is attached.
>
> 2. Guideline 2.1 — App Completeness (Upgrade to Pro). On iOS the
>    "Upgrade to Pro" button now triggers Apple's native StoreKit 2
>    purchase sheet for the "FuelTrack Pro Monthly" subscription
>    (me.fueltrack.app.pro_monthly) at €2.99/month. Purchase receipts are
>    validated server-side using Apple's App Store Server Library, and
>    subscription status is kept in sync via App Store Server
>    Notifications v2. Stripe is only used on web and Android; iOS
>    uses Apple IAP exclusively.
>
> Please re-review when convenient. Thank you.

## Why not just patch @capgo/native-purchases?

Tried. It would require editing `node_modules/@capgo/native-purchases/ios/Sources/NativePurchasesPlugin/NativePurchasesPlugin.swift`
directly, which gets blown away on every `npm install`. Would need a
patch-package step, which adds build complexity. And the plugin has ~27
broken call sites — the patch would be brittle.

A ~180-line custom plugin we own is cheaper to maintain than a patched
third-party dependency against an incompatible Capacitor version.

## Why not try different plugin versions?

Tried `@capgo/native-purchases@8.3.0` — same errors. `@capgo/native-purchases@8.3.3`
same. Older 8.x versions (8.2.x, 8.1.x) target earlier Capacitor API and
would need us to downgrade `@capacitor/core` from 8.3.1, which could
cascade into other plugin incompatibilities. Risk > benefit.

## Files this touches

- **Add**: `ios/App/App/NativePurchasesPlugin.swift` (new, from this directory)
- **Edit**: `ios/App/CapApp-SPM/Sources/CapApp-SPM/CapApp-SPM.swift` (revert to 1 line)
- **Edit**: `package.json` + `package-lock.json` (remove `@capgo/native-purchases`)
- **Edit**: `ios/App/App/Info.plist` (CFBundleVersion 4 → 5)

**Already edited in the 17/4/2026 session**: `src/utils/iosIAP.js` now uses
`registerPlugin("NativePurchases")` from `@capacitor/core` instead of
`import("@capgo/native-purchases")`. That's why `npm uninstall` doesn't
break the Vite build — no JS code references the removed package.

No other JS changes. `src/utils/subscription.js` is untouched and still
dispatches to `iosIAP.js`.
