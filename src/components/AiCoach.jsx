import { useState, useRef, useEffect } from "react";

const QUICK_QUESTIONS = [
  "Τι να φάω τώρα;",
  "Τι γυμναστική να κάνω σήμερα;",
  "Πώς πάω αυτή την εβδομάδα;",
  "Δώσε μου meal plan για αύριο",
  "Τι κάνω λάθος;"
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
  favoriteExercisesText,
  favoriteExercises
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const lastWeight = weightLog?.length
    ? [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight
    : null;

  // Βάρος 30 ημερών για trend
  const weightTrend = (() => {
    if (!weightLog || weightLog.length < 2) return null;
    const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
    const first = sorted[0]?.weight;
    const last30 = sorted[sorted.length - 1]?.weight;
    if (!first || !last30) return null;
    const diff = Math.round((last30 - first) * 10) / 10;
    return diff > 0 ? `+${diff}` : `${diff}`;
  })();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function buildSystemPrompt() {
    const goalLabel = goalType === "lose" ? "Απώλεια βάρους" :
      goalType === "gain" ? "Μυϊκή ανάπτυξη" :
      goalType === "fitness" ? "Fitness & Cardio" : "Διατήρηση";

    const weekSummary = (last7Days || []).map((d, i) => {
      const log = dailyLogs?.[d.date] || { entries: [], exercises: [] };
      const entries = Array.isArray(log.entries) ? log.entries : [];
      const protein = Math.round(entries.reduce((sum, item) => sum + Number(item.protein || 0), 0));
      const exerciseNames = Array.isArray(log.exercises) && log.exercises.length > 0
        ? log.exercises.map(e => e.name).join(", ")
        : "Καμία";
      return `  Μέρα ${i + 1} (${d.date}): ${d.eaten} kcal, πρωτεΐνη ${protein}g, άσκηση ${d.exercise} kcal (${exerciseNames})`;
    }).join("\n");

    const favFoodsList = (favoriteFoods || []).slice(0, 10).map(f =>
      `${f.name} (${f.caloriesPer100g} kcal/100g, P${f.proteinPer100g}g)`
    ).join(", ");

    const favExercisesList = (favoriteExercises || []).map(e =>
      `${e.icon || ""} ${e.name} (${e.caloriesPerMinute} kcal/λεπτό)`
    ).join(", ");

    return `Είσαι ο προσωπικός διατροφολόγος και personal trainer του χρήστη στο app FuelTrack. Μιλάς ΠΑΝΤΑ στα Ελληνικά. Είσαι φιλικός, συγκεκριμένος και πρακτικός — δεν δίνεις γενικόλογες συμβουλές.

━━━ ΠΡΟΦΙΛ ━━━
Στόχος: ${goalLabel}
Τρόπος διατροφής: ${mode}
Ημερήσιος στόχος: ${targetCalories} kcal
Στόχος πρωτεΐνης: ${proteinTarget}g/ημέρα
Streak: ${streak} συνεχόμενες μέρες
${lastWeight ? `Τελευταίο βάρος: ${lastWeight} kg` : ""}
${weightTrend ? `Τάση βάρους (πρόσφατα): ${weightTrend} kg` : ""}

━━━ ΓΟΥΣΤΑ ΧΡΗΣΤΗ ━━━
Αγαπημένα φαγητά (δηλωμένα): ${favoriteFoodsText || "Δεν έχει δηλώσει"}
Αγαπημένες ασκήσεις (δηλωμένες): ${favoriteExercisesText || "Δεν έχει δηλώσει"}
Αγαπημένα φαγητά στο app: ${favFoodsList || "Κανένα ακόμα"}
Αγαπημένες ασκήσεις στο app: ${favExercisesList || "Καμία ακόμα"}

━━━ ΣΗΜΕΡΑ ━━━
Έφαγε: ${totalCalories || 0} / ${targetCalories} kcal
Πρωτεΐνη: ${Math.round(totalProtein || 0)}g / ${proteinTarget}g
Άσκηση: ${exerciseValue || 0} kcal
Υπόλοιπο: ${remainingCalories || targetCalories} kcal

━━━ ΤΕΛΕΥΤΑΙΕΣ 7 ΜΕΡΕΣ ━━━
${weekSummary || "Δεν υπάρχουν δεδομένα"}

━━━ ΚΑΝΟΝΕΣ ━━━
1. Χρησιμοποίησε ΠΑΝΤΑ τα αγαπημένα φαγητά/ασκήσεις του χρήστη στις προτάσεις σου
2. Meal plan: Δώσε συγκεκριμένο πρόγραμμα (πρωινό, μεσημεριανό, βραδινό, σνακ) με kcal και macros
3. Training plan: Δώσε συγκεκριμένο πρόγραμμα (τύπος άσκησης, διάρκεια, σετ/επαναλήψεις αν χρειάζεται)
4. Να επισημαίνεις λάθη βασισμένα στα ΠΡΑΓΜΑΤΙΚΑ δεδομένα της εβδομάδας
5. Χρησιμοποίησε bullet points και emojis με μέτρο
6. Να είσαι σύντομος αλλά πλήρης — η απάντηση πρέπει να είναι ΟΛΟΚΛΗΡΩΜΕΝΗ
7. Μιλάς ως επαγγελματίας — δεν βγάζεις αβάσιμες ισχυρισμούς για υγεία`;
  }

  function buildMessages(chatMessage) {
    // Στέλνουμε ολόκληρο το conversation history
    const history = messages.map(msg => ({
      role: msg.role,
      content: msg.text
    }));

    if (chatMessage) {
      history.push({ role: "user", content: chatMessage });
    }

    return history;
  }

  async function sendMessage(messageText) {
    const text = (messageText || input).trim();
    if (!text && hasLoaded) return;
    if (loading) return;

    setLoading(true);

    if (text) {
      setMessages(prev => [...prev, { role: "user", text }]);
      setInput("");
    }

    const isInitial = !text && !hasLoaded;
    const effectiveMessage = isInitial
      ? `Κοίτα τα δεδομένα μου και πες μου:\n1. Τι να φάω για την υπόλοιπη μέρα (από τα αγαπημένα μου αν υπάρχουν)\n2. Αν πρέπει να γυμναστώ σήμερα και τι ακριβώς\n3. Ένα πράγμα που κάνω λάθος αυτή την εβδομάδα`
      : text;

    try {
      const response = await fetch("/.netlify/functions/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(),
          messages: buildMessages(effectiveMessage)
        })
      });

      if (!response.ok) throw new Error(`Σφάλμα σύνδεσης (${response.status})`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", text: data.advice }]);
      setHasLoaded(true);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: `❌ ${err.message || "Δεν ήταν δυνατή η σύνδεση. Δοκίμασε ξανά."}`,
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  }

  // Collapsed state
  if (collapsed) {
    return (
      <div className="card" style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>🤖 AI Coach</span>
            {streak > 0 && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>Streak {streak} μέρες 🔥</span>}
          </div>
          <button
            className="btn btn-dark"
            onClick={() => setCollapsed(false)}
            type="button"
            style={{ fontSize: 12, padding: "5px 12px" }}
          >
            Άνοιγμα
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>🤖 AI Coach</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Διατροφολόγος & Personal Trainer</div>
        </div>
        <button
          className="btn btn-light"
          onClick={() => setCollapsed(true)}
          type="button"
          style={{ fontSize: 13, padding: "5px 10px", flexShrink: 0 }}
        >✕</button>
      </div>

      {/* Initial state — quick questions + analyze button */}
      {!hasLoaded && !loading && messages.length === 0 && (
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            Ρώτα με οτιδήποτε ή πάτα για γρήγορη ανάλυση:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                type="button"
                style={{
                  padding: "7px 12px",
                  borderRadius: 20,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-soft)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <button
            className="btn btn-dark"
            onClick={() => sendMessage(null)}
            type="button"
            style={{ width: "100%" }}
          >
            📊 Ανάλυσε τη μέρα μου
          </button>
        </div>
      )}

      {/* Loading spinner — αρχική φόρτωση */}
      {loading && messages.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
          <div className="muted" style={{ fontSize: 13 }}>Αναλύω τα δεδομένα σου...</div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 12,
          maxHeight: 480,
          overflowY: "auto",
          paddingRight: 2
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "88%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user" ? "var(--color-accent)" : "var(--bg-soft)",
                color: msg.role === "user" ? "var(--bg-card)" : "var(--text-primary)",
                fontSize: 13,
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                border: msg.role === "assistant" ? "1px solid var(--border-soft)" : "none",
                opacity: msg.error ? 0.7 : 1
              }}>
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                padding: "10px 14px",
                borderRadius: "18px 18px 18px 4px",
                background: "var(--bg-soft)",
                border: "1px solid var(--border-soft)",
                fontSize: 13,
                color: "var(--text-muted)"
              }}>
                💭 Σκέφτομαι...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Quick questions — after first response */}
      {hasLoaded && !loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              type="button"
              style={{
                padding: "5px 10px",
                borderRadius: 20,
                border: "1px solid var(--border-color)",
                background: "var(--bg-soft)",
                color: "var(--text-primary)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input — εμφανίζεται αφού γίνει έστω 1 ανταλλαγή */}
      {(hasLoaded || messages.length > 0) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Ρώτα με κάτι..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading && input.trim()) sendMessage(null); }}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <button
            className="btn btn-dark"
            onClick={() => sendMessage(null)}
            type="button"
            disabled={loading || !input.trim()}
            style={{
              padding: "12px 16px",
              flexShrink: 0,
              opacity: loading || !input.trim() ? 0.4 : 1
            }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}