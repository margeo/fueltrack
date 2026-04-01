import { useState } from "react";

export default function AiCoach({
  last7Days,
  dailyLogs,
  targetCalories,
  proteinTarget,
  mode,
  goalType,
  streak,
  weightLog
}) {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const lastWeight = weightLog?.length
    ? [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight
    : null;

  async function fetchAdvice() {
    setLoading(true);
    setError("");
    setDismissed(false);

    try {
      const weekData = last7Days.map((day) => {
        const log = dailyLogs[day.date] || { entries: [], exercises: [] };
        const entries = Array.isArray(log.entries) ? log.entries : [];
        const protein = entries.reduce((sum, item) => sum + Number(item.protein || 0), 0);
        return {
          eaten: day.eaten,
          exercise: day.exercise,
          remaining: day.remaining,
          protein: Math.round(protein)
        };
      });

      const response = await fetch("/.netlify/functions/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekData,
          profile: { goalType, mode, targetCalories, proteinTarget, streak, lastWeight }
        })
      });

      if (!response.ok) throw new Error("Σφάλμα σύνδεσης");
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAdvice(data.advice);
      setHasLoaded(true);
    } catch {
      setError("Δεν ήταν δυνατή η σύνδεση με τον AI Coach. Δοκίμασε ξανά.");
    } finally {
      setLoading(false);
    }
  }

  if (dismissed) {
    return (
      <div className="card" style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>🤖 AI Coach</span>
          <button
            className="btn btn-light"
            onClick={() => setDismissed(false)}
            type="button"
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            Άνοιγμα
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>🤖 AI Coach</h2>
        <button
          className="btn btn-light"
          onClick={() => setDismissed(true)}
          type="button"
          style={{ fontSize: 13, padding: "5px 10px" }}
        >
          ✕
        </button>
      </div>

      {!hasLoaded && !loading && (
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Ανάλυση δεδομένων εβδομάδας με personalized συμβουλές.
          </div>
          <button className="btn btn-dark" onClick={fetchAdvice} type="button" style={{ width: "100%" }}>
            Ανάλυσε την εβδομάδα μου
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤔</div>
          <div className="muted" style={{ fontSize: 13 }}>Αναλύω τα δεδομένα σου...</div>
        </div>
      )}

      {error && (
        <div>
          <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div>
          <button className="btn btn-light" onClick={fetchAdvice} type="button">
            Δοκίμασε ξανά
          </button>
        </div>
      )}

      {hasLoaded && !loading && advice && (
        <div>
          <div style={{
            background: "var(--bg-soft)",
            border: "1px solid var(--border-soft)",
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            lineHeight: 1.75,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}>
            {advice}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              className="btn btn-light"
              onClick={fetchAdvice}
              type="button"
              style={{ flex: 1, fontSize: 13 }}
            >
              🔄 Ανανέωση
            </button>
            <button
              className="btn btn-light"
              onClick={() => setDismissed(true)}
              type="button"
              style={{ fontSize: 13, padding: "8px 14px" }}
            >
              ✕ Κλείσιμο
            </button>
          </div>
        </div>
      )}
    </div>
  );
}