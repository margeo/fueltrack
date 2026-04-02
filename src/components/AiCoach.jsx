import { useState, useRef, useEffect } from "react";

const QUICK_QUESTIONS = [
  "Τι να φάω τώρα;",
  "Τι γυμναστική να κάνω σήμερα;",
  "Πώς πάω αυτή την εβδομάδα;",
  "Τι κάνω λάθος;",
  "Δώσε μου meal plan για αύριο"
];

export default function AiCoach({
  last7Days,
  dailyLogs,
  targetCalories,
  proteinTarget,
  mode,
  goalType,
  streak,
  weightLog,
  favoriteFoods,
  totalCalories,
  totalProtein,
  exerciseValue,
  remainingCalories,
  favoriteFoodsText,
  favoriteExercisesText
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const lastWeight = weightLog?.length
    ? [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight
    : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function buildPayload(chatMessage) {
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

    return {
      weekData,
      todayData: {
        eaten: totalCalories || 0,
        protein: Math.round(totalProtein || 0),
        exercise: exerciseValue || 0,
        remaining: remainingCalories || targetCalories
      },
      profile: {
        goalType, mode, targetCalories, proteinTarget, streak, lastWeight,
        favoriteFoodsText,
        favoriteExercisesText
      },
      favoriteFoods: (favoriteFoods || []).slice(0, 10).map(f => ({
        name: f.name,
        caloriesPer100g: f.caloriesPer100g,
        proteinPer100g: f.proteinPer100g
      })),
      chatMessage
    };
  }

  async function sendMessage(messageText) {
    const text = messageText || input.trim();
    if (!text && hasLoaded) return;
    if (loading) return;

    setLoading(true);
    if (text) {
      setMessages(prev => [...prev, { role: "user", text }]);
      setInput("");
    }

    try {
      const response = await fetch("/.netlify/functions/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(text || null))
      });

      if (!response.ok) throw new Error("Σφάλμα σύνδεσης");
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", text: data.advice }]);
      setHasLoaded(true);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "❌ Δεν ήταν δυνατή η σύνδεση. Δοκίμασε ξανά.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  if (dismissed) {
    return (
      <div className="card" style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>🤖 AI Coach</span>
          <button className="btn btn-light" onClick={() => setDismissed(false)} type="button"
            style={{ fontSize: 12, padding: "4px 10px" }}>Άνοιγμα</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>🤖 AI Coach</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Διατροφολόγος & Γυμναστής</div>
        </div>
        <button className="btn btn-light" onClick={() => setDismissed(true)} type="button"
          style={{ fontSize: 13, padding: "5px 10px" }}>✕</button>
      </div>

      {!hasLoaded && !loading && (
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            Ρώτα με οτιδήποτε ή πάτα μια γρήγορη ερώτηση:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {QUICK_QUESTIONS.map((q) => (
              <button key={q} onClick={() => sendMessage(q)} type="button"
                style={{ padding: "7px 12px", borderRadius: 20, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {q}
              </button>
            ))}
          </div>
          <button className="btn btn-dark" onClick={() => sendMessage(null)} type="button" style={{ width: "100%" }}>
            📊 Ανάλυσε τη μέρα μου
          </button>
        </div>
      )}

      {loading && messages.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤔</div>
          <div className="muted" style={{ fontSize: 13 }}>Αναλύω τα δεδομένα σου...</div>
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 420, overflowY: "auto", paddingRight: 2 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user" ? "var(--color-accent)" : "var(--bg-soft)",
                color: msg.role === "user" ? "var(--bg-card)" : "var(--text-primary)",
                fontSize: 13, lineHeight: 1.65,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
                border: msg.role === "assistant" ? "1px solid var(--border-soft)" : "none"
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, color: "var(--text-muted)" }}>
                💭 Σκέφτομαι...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {hasLoaded && !loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => sendMessage(q)} type="button"
              style={{ padding: "5px 10px", borderRadius: 20, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {(hasLoaded || messages.length > 0) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Ρώτα με κάτι..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) sendMessage(null); }}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <button
            className="btn btn-dark"
            onClick={() => sendMessage(null)}
            type="button"
            disabled={loading || !input.trim()}
            style={{ padding: "12px 16px", flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}