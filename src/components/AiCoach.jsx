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

  const lastWeight = weightLog?.length
    ? [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight
    : null;

  async function fetchAdvice() {
    setLoading(true);
    setError("");

    try {
      const weekData = last7Days.map((day) => {
        const log = dailyLogs[day.date] || { entries: [], exercises: [] };
        const entries = Array.isArray(log.entries) ? log.entries : [];
        const exercises = Array.isArray(log.exercises) ? log.exercises : [];
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
          profile: {
            goalType,
            mode,
            targetCalories,
            proteinTarget,
            streak,
            lastWeight
          }
        })
      });

      if (!response.ok) throw new Error("Σφάλμα σύνδεσης");

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setAdvice(data.advice);
      setHasLoaded(true);
    } catch (err) {
      setError("Δεν ήταν δυνατή η σύνδεση με τον AI Coach. Δοκίμασε ξανά.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>🤖 AI Coach</h2>

      {!hasLoaded && !loading && (
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Ο AI Coach αναλύει τα δεδομένα της εβδομάδας σου και δίνει personalized συμβουλές.
          </div>
          <button className="btn btn-dark" onClick={fetchAdvice} type="button" style={{ width: "100%" }}>
            Ανάλυσε την εβδομάδα μου
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤔</div>
          <div className="muted" style={{ fontSize: 13 }}>Ο coach αναλύει τα δεδομένα σου...</div>
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
            lineHeight: 1.7,
            whiteSpace: "pre-wrap"
          }}>
            {advice}
          </div>
          <button
            className="btn btn-light"
            onClick={fetchAdvice}
            type="button"
            style={{ marginTop: 10, width: "100%", fontSize: 13 }}
          >
            🔄 Ανανέωση ανάλυσης
          </button>
        </div>
      )}
    </div>
  );
}