import { useState, useRef, useEffect } from "react";
import { MODES } from "../data/modes";

const QUICK_QUESTIONS = [
  "Τι να φάω τώρα;",
  "Εβδομαδιαίο πρόγραμμα διατροφής",
  "Εβδομαδιαίο πρόγραμμα γυμναστικής",
  "Πώς πάω αυτή την εβδομάδα;",
  "Τι κάνω λάθος;"
];

export default function AiCoach({
  last7Days, dailyLogs, targetCalories, proteinTarget,
  mode, goalType, streak, weightLog, favoriteFoods,
  foods, totalCalories, totalProtein, exerciseValue,
  remainingCalories, favoriteFoodsText, favoriteExercisesText,
  favoriteExercises, age, weight, height, gender,
  savedPlans, onSavePlan
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

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

  // Αυτόματη αποθήκευση plan
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const text = last.text;
    const hasMealPlan = text.includes("📅") && text.includes("🌅") && text.includes("🌞");
    const hasTrainingPlan = text.includes("📅") && (text.includes("💪") || text.includes("🏃") || text.includes("🏋"));
    if (hasMealPlan && !hasTrainingPlan) {
      onSavePlan?.({ type: "meal", content: text, date: new Date().toLocaleDateString("el-GR") });
    } else if (hasTrainingPlan) {
      onSavePlan?.({ type: "training", content: text, date: new Date().toLocaleDateString("el-GR") });
    }
  }, [messages]);

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
      ? Math.round((currentWeight / ((height / 100) ** 2)) * 10) / 10 : null;

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
      ? incompatible.map(f => `${f.name} (${f.carbsPer100g}g carbs — εκτός ορίου)`).join(", ")
      : "Κανένα";
    const topCompatible = compatibleFoods
      .sort((a, b) => Number(b.proteinPer100g || 0) - Number(a.proteinPer100g || 0))
      .slice(0, 20)
      .map(f => `${f.name} (${f.caloriesPer100g}kcal, P${f.proteinPer100g}g, C${f.carbsPer100g}g, F${f.fatPer100g}g)`)
      .join(", ");
    const favExList = (favoriteExercises || []).map(e => `${e.name} (${e.caloriesPerMinute}kcal/λεπτό)`).join(", ");

    return `Είσαι ο προσωπικός διατροφολόγος και personal trainer στο FuelTrack. Μιλάς ΠΑΝΤΑ στα Ελληνικά και ΠΑΝΤΑ στον ΕΝΙΚΟ (εσύ/σου/σε — ΠΟΤΕ σας/εσάς). Είσαι φιλικός, συγκεκριμένος, interactive — σαν πραγματικός διατροφολόγος.

━━━ ΣΤΟΙΧΕΙΑ ΧΡΗΣΤΗ ━━━
Ηλικία: ${age || "—"} χρονών | Φύλο: ${gender === "male" ? "Άνδρας" : "Γυναίκα"}
Ύψος: ${height || "—"} cm | Βάρος: ${currentWeight || "—"} kg${bmi ? ` | BMI: ${bmi}` : ""}
${weightTrend ? `Τάση βάρους: ${weightTrend} kg` : ""}
Στόχος: ${goalLabel} | Διατροφή: ${currentMode.label}
Θερμίδες: ${targetCalories} kcal | Πρωτεΐνη: ${proteinTarget}g/ημέρα
Macro split: ${currentMode.proteinPercent}% P / ${currentMode.carbsPercent}% C / ${currentMode.fatPercent}% F
Streak: ${streak} μέρες

━━━ ΚΑΝΟΝΕΣ ΔΙΑΤΡΟΦΗΣ (${currentMode.label}) ━━━
${currentMode.aiRule}

━━━ ΑΓΑΠΗΜΕΝΑ ━━━
✅ Κατάλληλα: ${compatFavList}
❌ Ακατάλληλα: ${incompatFavList}
Δηλωμένα: ${favoriteFoodsText || "—"}

━━━ ΚΑΤΑΛΛΗΛΑ ΤΡΟΦΙΜΑ ΑΠΟ ΤΗ ΒΑΣΗ ━━━
${topCompatible || "—"}

━━━ ΑΣΚΗΣΕΙΣ ━━━
Αγαπημένες: ${favExList || "—"} | Δηλωμένες: ${favoriteExercisesText || "—"}

━━━ ΣΗΜΕΡΑ ━━━
Έφαγε: ${totalCalories || 0}/${targetCalories} kcal | Πρωτεΐνη: ${Math.round(totalProtein || 0)}/${proteinTarget}g
Άσκηση: ${exerciseValue || 0} kcal | Υπόλοιπο: ${remainingCalories || targetCalories} kcal

━━━ ΕΒΔΟΜΑΔΑ ━━━
${weekSummary || "Δεν υπάρχουν δεδομένα"}

━━━ ΚΑΝΟΝΕΣ ━━━
1. ΕΝΙΚΟΣ παντα — "τι έφαγες;" ποτέ "τι φάγατε;"

2. ΦΑΓΗΤΟ: Πρώτα κατάλληλα αγαπημένα, αν δεν υπάρχουν από τη βάση. Αν αγαπημένο είναι ακατάλληλο → εξήγησε + δώσε εναλλακτικό.

3. MEAL PLAN — ΧΡΟΝΙΚΗ ΣΕΙΡΑ ΜΕΣΑ ΣΤΗΝ ΗΜΕΡΑ:
   07:00-09:00 🌅 Πρωινό (20-25% θερμίδων)
      Carnivore/Keto: αυγά 2-3, τυρί, βούτυρο. ΟΧΙ καφές ως γεύμα.
      Balanced/Mediterranean: βρώμη, αυγά, γιαούρτι, φρούτο.
      High Protein: αυγά + γιαούρτι 0% + whey.
      Vegan/Vegetarian: βρώμη, φυτικό γάλα, ξηροί καρποί.
   11:00-11:30 🍎 Πρωινό σνακ (5-10% θερμίδων) — μικρό, εύκολο
   13:00-14:00 🌞 Μεσημεριανό (30-35% θερμίδων) — κύριο γεύμα
   16:00-17:00 🍎 Απογευματινό σνακ (5-10% θερμίδων)
   19:00-21:00 🌙 Βραδινό (25-30% θερμίδων) — ελαφρύτερο

   ΚΑΝΟΝΕΣ:
   - ΜΗΝ επαναλαμβάνεις το ίδιο τρόφιμο 2 φορές/μέρα
   - Συγκεκριμένες ποσότητες: "3 αυγά", "150g κοτόπουλο"
   - Θερμίδες ΑΚΡΙΒΩΣ στον στόχο (${targetCalories} kcal)
   - Χωρίς αστερίσκους, χωρίς bullet points με "-" — χρησιμοποίησε μόνο emojis και καθαρό κείμενο
   - ΠΑΝΤΑ μετά από meal plan ρώτα: "Θέλεις να αλλάξω κάτι; Π.χ. δεν σου αρέσει κάποιο γεύμα;"

4. FORMAT ΕΒΔΟΜΑΔΙΑΙΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ΔΙΑΤΡΟΦΗΣ:

📅 ΔΕΥΤΕΡΑ
07:30 🌅 Πρωινό — [τρόφιμο + ποσότητα] ([X] kcal)
11:00 🍎 Σνακ — [τρόφιμο + ποσότητα] ([X] kcal)
13:30 🌞 Μεσημεριανό — [τρόφιμο + ποσότητα] ([X] kcal)
16:30 🍎 Σνακ — [τρόφιμο + ποσότητα] ([X] kcal)
20:00 🌙 Βραδινό — [τρόφιμο + ποσότητα] ([X] kcal)
Σύνολο: [X] kcal

(Χωρίς macros ανά γεύμα — μόνο ώρα, emoji, τρόφιμο, ποσότητα, kcal)
Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"

5. FORMAT ΕΒΔΟΜΑΔΙΑΙΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ΓΥΜΝΑΣΤΙΚΗΣ:

📅 ΔΕΥΤΕΡΑ — Strength
09:00 💪 [Άσκηση]: [σετ × επαναλήψεις]
09:15 💪 [Άσκηση]: [σετ × επαναλήψεις]
Διάρκεια: ~45 λεπτά

📅 ΤΡΙΤΗ — Ανάπαυση 😴

(Να περιλαμβάνει 2 rest days)
Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"

6. INTERACTIVE: Ρώτα τι αρέσει, τι δεν θέλει. Προσάρμοσε βάσει απαντήσεων.

7. ΛΑΘΗ: Επισήμαινε βάσει ΠΡΑΓΜΑΤΙΚΩΝ δεδομένων.

8. ΠΟΤΕ μην κόβεις απάντηση στη μέση.`;
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
        <div ref={chatRef} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 500, overflowY: "auto", overflowX: "hidden", paddingRight: 4, scrollbarWidth: "thin", scrollbarColor: "var(--border-color) transparent" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "90%", padding: "10px 14px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? "var(--color-accent)" : "var(--bg-soft)", color: msg.role === "user" ? "var(--bg-card)" : "var(--text-primary)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", border: msg.role === "assistant" ? "1px solid var(--border-soft)" : "none" }}>
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
          <input
            ref={inputRef}
            className="input"
            placeholder="Ρώτα με κάτι..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading && input.trim()) sendMessage(null); }}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <button
            onClick={() => inputRef.current?.focus()}
            type="button"
            style={{ padding: "12px 14px", flexShrink: 0, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            title="Φωνητική εισαγωγή — πάτα το 🎤 στο keyboard"
          >
            🎤
          </button>
          <button
            className="btn btn-dark"
            onClick={() => sendMessage(null)}
            type="button"
            disabled={loading || !input.trim()}
            style={{ padding: "12px 16px", flexShrink: 0, opacity: loading || !input.trim() ? 0.4 : 1 }}
          >↑</button>
        </div>
      )}
    </div>
  );
}