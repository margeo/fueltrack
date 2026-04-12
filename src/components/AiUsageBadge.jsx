import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCachedUsage, computeRemainingRequests } from "../utils/aiUsage";

// Small inline badge that shows "3/5 today" or "480/500 this month"
// next to AI feature buttons. Turns amber when close to limit,
// red when exhausted.
export default function AiUsageBadge({ session, isPaid, isDemo, isAdmin }) {
  const { t } = useTranslation();
  const [usage, setUsage] = useState(() => getCachedUsage(session?.user?.id));

  useEffect(() => {
    function onUsageChange(e) {
      const detail = e?.detail;
      if (detail?.usage) setUsage(detail.usage);
      else setUsage(getCachedUsage(session?.user?.id));
    }
    window.addEventListener("ft-ai-usage-change", onUsageChange);
    return () => window.removeEventListener("ft-ai-usage-change", onUsageChange);
  }, [session]);

  if (!session) return null;

  const info = computeRemainingRequests({ usage, isPaid, isDemo, isAdmin });
  if (info.remaining === Infinity) return null;

  const color = info.remaining <= 0 ? "#ef4444"
    : info.warn ? "#f59e0b"
    : "var(--text-muted)";

  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      color,
      background: info.remaining <= 0 ? "rgba(239,68,68,0.1)" : info.warn ? "rgba(245,158,11,0.1)" : "var(--bg-soft)",
      padding: "2px 8px",
      borderRadius: 20,
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
    }}>
      {info.remaining <= 0
        ? `⛔ ${t("usage.noRemaining")}`
        : `⚡ ${info.remaining} ${t("usage.remaining")}`
      }
    </span>
  );
}
