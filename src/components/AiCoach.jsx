import { useState, useRef, useEffect } from "react";
import { MODES } from "../../data/modes";

const QUICK_QUESTIONS = [
  "Τι να φάω τώρα;",
  "Εβδομαδιαίο πρόγραμμα",
  "Τι γυμναστική σήμερα;",
  "Πώς πάω αυτή την εβδομάδα;",
  "Τι κάνω λάθος;"
];

export default function AiCoach({
  last7Days, dailyLogs, targetCalories, proteinTarget,
  mode, goalType, streak, weightLog, favoriteFoods,
  foods, totalCalories, totalProtein, exerciseValue,
  remainingCalories, favoriteFoodsText, favoriteExercisesText,
  favoriteExercises, age, weight, height, gender
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const chatRef = useRef(null);

  const lastWeight = weightLog?.length
    ? [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight
    : null;

  const weightTrend = (() => {
    if (!weightLog || weightLog.length < 2) return null;
    const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
    const first = sorted[0]?.weight;
    const last8 = sorted[sorted.length - 1]?.weight;
    if (!first || !last8) return null;
    const diff = Math.round((last8 - first) * 10) / 10;
    return diff > 0 ? `+${diff}` : `${diff}`;
  })();

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function getCompatibleFoods() {
    if (!Array.isArray(foods)) return [];
    const currentMode = MODES[mode];
    const limit = currentMode?.carbLimit;
    if (limit === null || limit === undefined) return foods;
    return foods.filter((f) => Number(f.carbsPer100g || 0) <= limit);
  }

  function categorizeFavorites() {
    const compatible = [], incompatible = [];
    const currentMode = MODES[mode];
    const limit = currentMode?.carbLimit;
    (favoriteFoods || []).forEach(f => {
      const carbs = Number(f.carbsPer100g || 0);
      const ok = (limit === null || limit === undefined) ? true : carbs <= limit;
      if (ok) compatible.push(f); else incompatible.push(f);
    });
    return { compatible, incompatible };
  }

  function buildSystemPrompt() {
    const currentMode = MODES[mode] || MODES.balanced;
    const goalLabel = goalType === "lose" ? "Απώλεια βάρους" :
      goalType === "gain" ? "Μυϊκή ανάπτυξη" :
      goalType === "fitness" ? "Fitness & Cardio" : "Διατήρηση";

    const currentWeight = lastWeight || weight;
    const bmi = currentWeight && height
      ? Math.round((currentWeight / ((height / 100) ** 2)) * 10) / 10
      : null;

    const weekSummary = (last7Days || []).map((d, i) => {
      const log = dailyLogs?.[d.date] || { entries: [], exercises: [] };
      const entries = Array.isArray(log.entries) ? log.entries : [];
      const protein = Math.round(entries.reduce((s, item) => s + Number(item.protein || 0), 0));
      const exNames = Array.isArray(log.exercises) && log.exercises.length > 0
        ? log.exercises.map(e => e.name).join(", ") : "—";
      return `  Μέρα ${i + 1} (${d.date}): ${d.eaten} kcal, πρωτεΐνη ${protein}g, άσκηση ${d.exercise} kcal [${exNames}]`;
    }).join("\n");

    const { compatible, incompatible } = categorizeFavorites();
    const compatibleFoods = getCompatibleFoods();

    const compatFavList = compatible.length > 0
      ? compatible.map(f => `${f.name} (${f.caloriesPer100g}kcal, P${f.proteinPer100g}g, C${f.carbsPer100g}g)`).join(", ")
      : "Κανένα";

    const incompatFavList = incompatible.length > 0
      ? incompatible.map(f => `${f.name} (${f.carbsPer100g}g carbs — εκτός ορίου για ${currentMode.label})`).join(", ")
      : "Κανένα";

    const topCompatible = compatibleFoods
      .sort((a, b) => Number(b.proteinPer100g || 0) - Number(a.proteinPer100g || 0))
      .slice(0, 20)
      .map(f => `${f.name} (${f.caloriesPer100g}kcal, P${f.proteinPer100g}g, C${f.carbsPer100g}g, F${f.fatPer100g}g)`)
      .join(", ");

    const favExList = (favoriteExercises || []).map(e => `${e.name} (${e.caloriesPerMinute}kcal/λεπτό)`).join(", ");

    return `Είσαι ο προσωπικός διατροφολόγος και personal trainer στο FuelTrack. Μιλάς ΠΑΝΤΑ στα Ελληνικά. Λειτουργείς σαν πραγματικός επαγγελματίας διατροφολόγος — φιλικός, συγκεκριμένος, interactive.

━━━ ΣΤΟΙΧΕΙΑ ΧΡΗΣΤΗ ━━━
Ηλικία: ${age || "—"} χρονών | Φύλο: ${gender === "male" ? "Άνδρας" : "Γυναίκα"}
Ύψος: ${height || "—"} cm | Βάρος: ${currentWeight || "—"} kg${bmi ? ` | BMI: ${bmi}` : ""}
${weightTrend ? `Τάση βάρους: ${weightTrend} kg (πρόσφατα)` : ""}
Στόχος: ${goalLabel} | Διατροφή: ${currentMode.label}
Ημερήσιες θερμίδες: ${targetCalories} kcal | Πρωτεΐνη: ${proteinTarget}g/ημέρα
Macro split: ${currentMode.proteinPercent}% P / ${currentMode.carbsPercent}% C / ${currentMode.fatPercent}% F
Streak: ${streak} συνεχόμενες μέρες

━━━ ΚΑΝΟΝΕΣ ΔΙΑΤΡΟΦΗΣ (${currentMode.label}) ━━━
${currentMode.aiRule}

━━━ ΑΓΑΠΗΜΕΝΑ ΦΑΓΗΤΑ ━━━
✅ Κατάλληλα: ${compatFavList}
❌ Ακατάλληλα (δώσε εναλλακτικά): ${incompatFavList}
Δηλωμένα αγαπημένα: ${favoriteFoodsText || "—"}

━━━ ΚΑΤΑΛΛΗΛΑ ΤΡΟΦΙΜΑ ΑΠΟ ΤΗ ΒΑΣΗ ━━━
${topCompatible || "—"}

━━━ ΑΣΚΗΣΕΙΣ ━━━
Αγαπημένες: ${favExList || "—"} | Δηλωμένες: ${favoriteExercisesText || "—"}

━━━ ΣΗΜΕΡΑ ━━━
Έφαγε: ${totalCalories || 0} / ${targetCalories} kcal | Πρωτεΐνη: ${Math.round(totalProtein || 0)} / ${proteinTarget}g
Άσκηση: ${exerciseValue || 0} kcal | Υπόλοιπο: ${remainingCalories || targetCalories} kcal

━━━ ΤΕΛΕΥΤΑΙΕΣ 7 ΜΕΡΕΣ ━━━
${weekSummary || "Δεν υπάρχουν δεδομένα"}

━━━ ΚΑΝΟΝΕΣ ΣΥΜΠΕΡΙΦΟΡΑΣ ━━━
1. ΦΑΓΗΤΟ: Πρότεινε πρώτα κατάλληλα αγαπημένα. Αν δεν υπάρχουν, πρότεινε από τη βάση. Αν αγαπημένο είναι ακατάλληλο → εξήγησε γιατί + δώσε παρόμοιο εναλλακτικό.

2. ΗΜΕΡΗΣΙΑ ΔΙΑΙΤΑ: Θερμίδες ΑΚΡΙΒΩΣ στον στόχο (${targetCalories} kcal). Λαμβάνεις υπόψη ηλικία (${age}), βάρος (${currentWeight}kg)${bmi ? `, BMI (${bmi})` : ""}, στόχο. Προτείνεις σαν κανονικός διατροφολόγος.

3. ΕΒΔΟΜΑΔΙΑΙΟ ΠΡΟΓΡΑΜΜΑ — παρουσίασε ΩΔΕ:
📅 ΔΕΥΤΕΡΑ
🌅 Πρωινό: [τρόφιμο + ποσότητα] — [X] kcal
🌞 Μεσημεριανό: [τρόφιμο + ποσότητα] — [X] kcal
🌙 Βραδινό: [τρόφιμο + ποσότητα] — [X] kcal
🍎 Σνακ: [τρόφιμο + ποσότητα] — [X] kcal
📊 Σύνολο: [X] kcal
(ΜΗΝ βάζεις carbs/fat/protein breakdown ανά γεύμα — μόνο kcal και ποσότητα)

4. INTERACTIVE: Ρώτα τι αρέσει, τι δεν θέλει, τι θέλει να αλλάξει. Προσάρμοσε βάσει απαντήσεων.

5. ΛΑΘΗ: Επισήμαινε βάσει ΠΡΑΓΜΑΤΙΚΩΝ δεδομένων.

6. ΓΥΜΝΑΣΤΙΚΗ: Από αγαπημένες ασκήσεις. Διάρκεια + ένταση.

7. ΠΟΤΕ μην κόβεις απάντηση στη μέση.`;
  }

  function buildMessages(chatMessage) {
    const history = messages.map(msg => ({ role: msg.role, content: msg.text }));
    if (chatMessage) history.push({ role: "user", content: chatMessage });
    return history;
  }

  async function sendMessage(messageText) {
    const text = (messageText || input).trim();
    if (!text && hasLoaded) return;
    if (loading) return;
    setLoading(true);
    if (text) { setMessages(prev => [...prev, { role: "user", text }]); setInput(""); }
    const currentMode = MODES[mode] || MODES.balanced;
    const isInitial = !text && !hasLoaded;
    const effectiveMessage = isInitial
      ? `Κοίτα τα δεδομένα μου και:\n1. Πες μου τι να φάω για την υπόλοιπη μέρα (ΜΟΝΟ κατάλληλα για ${currentMode.label})\n2. Αν πρέπει να γυμναστώ σήμερα και τι ακριβώς\n3. Ένα συγκεκριμένο πράγμα που κάνω λάθος\n4. Ρώτα με κάτι για να με γνωρίσεις καλύτερα`
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
      setMessages(prev => [...prev, { role: "assistant", text: `❌ ${err.message || "Δεν ήταν δυνατή η σύνδεση."}`, error: true }]);
    } finally { setLoading(false); }
  }

  if (collapsed) return (
    <div className="card" style={{ padding: "10px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>🤖 AI Coach</span>
          {streak > 0 && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>Streak {streak} μέρες 🔥</span>}
        </div>
        <button className="btn btn-dark" onClick={() => setCollapsed(false)} type="button" style={{ fontSize: 12, padding: "5px 12px" }}>Άνοιγμα</button>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>🤖 AI Coach</h2>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Διατροφολόγος & Personal Trainer</div>
        </div>
        <button className="btn btn-light" onClick={() => setCollapsed(true)} type="button" style={{ fontSize: 13, padding: "5px 10px", flexShrink: 0 }}>✕</button>
      </div>

      {!hasLoaded && !loading && messages.length === 0 && (
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Ρώτα με οτιδήποτε ή πάτα για γρήγορη ανάλυση:</div>
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
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
          <div className="muted" style={{ fontSize: 13 }}>Αναλύω τα δεδομένα σου...</div>
        </div>
      )}

      {messages.length > 0 && (
        <div
          ref={chatRef}
          style={{
            display: "flex", flexDirection: "column", gap: 10,
            marginBottom: 12, maxHeight: 500,
            overflowY: "auto", overflowX: "hidden",
            paddingRight: 4,
            scrollbarWidth: "thin",
            scrollbarColor: "var(--border-color) transparent"
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "90%", padding: "10px 14px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user" ? "var(--color-accent)" : "var(--bg-soft)",
                color: msg.role === "user" ? "var(--bg-card)" : "var(--text-primary)",
                fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word",
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
        </div>
      )}

      {hasLoaded && !loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
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
          <input className="input" placeholder="Ρώτα με κάτι..." value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading && input.trim()) sendMessage(null); }}
            style={{ flex: 1 }} disabled={loading} />
          <button className="btn btn-dark" onClick={() => sendMessage(null)} type="button"
            disabled={loading || !input.trim()}
            style={{ padding: "12px 16px", flexShrink: 0, opacity: loading || !input.trim() ? 0.4 : 1 }}>
            ↑
          </button>
        </div>
      )}
    </div>
  );
}