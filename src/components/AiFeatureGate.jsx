import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { authedFetch } from "../utils/authFetch";
import { fetchUsage, getCachedUsage, computeLimitState } from "../utils/aiUsage";
import AiLimitLock from "./AiLimitLock";

// Unified gate for every AI / premium feature in the app. Wraps any
// feature UI and, when the user doesn't have access, blurs the UI
// behind a centred AiLimitLock overlay.
//
// Three supported states:
//   1. not signed in     → 🔒 Login / Register prompt
//   2. signed in + free  → subscribe-to-Pro CTA (Stripe on web/Android,
//                          StoreKit IAP on iOS — handled inside
//                          AiLimitLock via startProMonthlyPurchase)
//   3. signed in + paid  → feature unlocked, children render as-is
//
// Three gating modes:
// - mode="usage" (default)  Standard AI features: daily/monthly/
//                            lifetime/paid limit enforcement via
//                            computeLimitState. Used by Coach and
//                            the Food Photo Analyzer.
// - mode="pro"               Premium-only feature (no AI round-trip,
//                            positioned as paid-only). Unlocks for
//                            paid / demo / admin accounts only —
//                            signed-out AND free accounts see the
//                            lock. Used by the Barcode Scanner.
// - mode="auth"              Signed-in-only feature. Unlocks for any
//                            signed-in account regardless of paid
//                            status. Only signed-out users see the
//                            lock. Used by the food search input in
//                            FoodTab since the USDA / Open Food
//                            Facts / FatSecret backends are free
//                            and every signed-in user should have
//                            access without an upgrade step.
export default function AiFeatureGate({
  session,
  onShowAuth,
  onShowRegister,
  mode = "usage",
  children,
}) {
  const [usage, setUsage] = useState(() => getCachedUsage(session?.user?.id));
  const [isPaid, setIsPaid] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setUsage(getCachedUsage(session?.user?.id));
    if (!session?.user?.id) {
      setIsPaid(false);
      setIsDemo(false);
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    fetchUsage(session.user.id).then((fresh) => { if (!cancelled && fresh) setUsage(fresh); }).catch(() => {});
    supabase
      .from("profiles")
      .select("is_paid, is_demo")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setIsPaid(data?.is_paid === true);
        setIsDemo(data?.is_demo === true);
      })
      .catch(() => {});
    authedFetch("/.netlify/functions/check-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(res => res.json()).then(data => { if (!cancelled) setIsAdmin(data?.isAdmin === true); }).catch(() => {});
    return () => { cancelled = true; };
  }, [session]);

  // Listen for usage-change broadcasts from siblings (Coach, Photo)
  // so the gate re-evaluates in real-time when another feature spends
  // a request.
  useEffect(() => {
    function onUsageChange(e) {
      const detail = e?.detail;
      if (detail?.usage) setUsage(detail.usage);
      else setUsage(getCachedUsage(session?.user?.id));
    }
    window.addEventListener("ft-ai-usage-change", onUsageChange);
    return () => window.removeEventListener("ft-ai-usage-change", onUsageChange);
  }, [session]);

  const needsAccount = !session;
  const usageState = computeLimitState({ usage, isPaid, isDemo, isAdmin, needsAccount });
  const unlimited = usageState.unlimited;

  // Compute the locked state per mode. "auth" is the loosest gate
  // (signed-in is enough), "pro" is the strictest (paid-only), and
  // "usage" defers to the daily/monthly/lifetime/paid limits.
  const locked =
    mode === "auth" ? needsAccount :
    mode === "pro"  ? (needsAccount || !(unlimited || isPaid)) :
                      usageState.limitReached;

  if (!locked) return children;

  return (
    <div style={{ position: "relative" }}>
      {/* Blur the feature UI behind the lock so the user still gets a
          "teaser" of what's waiting for them without being able to
          interact with any of the controls. */}
      <div
        aria-hidden="true"
        style={{
          filter: "blur(6px)",
          opacity: 0.5,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}>
        <div style={{
          width: "100%", maxWidth: 420,
          background: "var(--bg-card)",
          border: "1px solid var(--border-soft)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}>
          <AiLimitLock
            needsAccount={needsAccount}
            paidLimitReached={usageState.paidLimitReached}
            lifetimeLimitReached={usageState.lifetimeLimitReached}
            monthlyLimitReached={usageState.monthlyLimitReached}
            isPaid={isPaid}
            onShowAuth={onShowAuth}
            onShowRegister={onShowRegister}
          />
        </div>
      </div>
    </div>
  );
}
