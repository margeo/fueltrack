import { useState, useRef, useEffect } from "react";
import { MODES } from "../data/modes";

const QUICK_QUESTIONS = [
  "Τι να φάω τώρα;",
  "Εβδομαδιαίο πρόγραμμα διατροφής",
  "Εβδομαδιαίο πρόγραμμα γυμναστικής",
  "Πώς πάω αυτή την εβδομάδα;",
  "Τι κάνω λάθος;"
];

const DISCLAIMER = "Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή. Συμβουλέψου ειδικό αν έχεις νοσήματα, αλλεργίες ή λαμβάνεις φαρμακευτική αγωγή.";

const BASE_PROMPT = `Ρόλος: διατροφολόγος + personal trainer. Απάντα πάντα στα Ελληνικά, στον ενικό, φιλικά και πρακτικά. Λαμβάνεις υπόψη στόχο, mode, θερμίδες, πρωτεΐνη και προτιμήσεις. Επισήμανε άμεσα ασύμβατα τρόφιμα με το mode. Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν ειδικό.`;

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
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const text = last.text;
    const hasMealPlan = text.includes("Σύνολο:") && text.includes("🌅") && text.includes("🌞") && text.includes("🌙");
    const hasTrainingPlan = !hasMealPlan && text.includes("📅") && (
      text.includes("σετ ×") || text.includes("σετ x") || (text.includes("λεπτά") && text.includes("💪"))
    );
    if (hasMealPlan) {
      onSavePlan?.({ type: "meal", content: text, date: new Date().toLocaleDateString("el-GR") });
    } else if (hasTrainingPlan) {
      onSavePlan?.({ type: "training", content: text, date: new Date().toLocaleDateString("el-GR") });
    }
  }, [messages]);

  function buildUserContext() {
    const currentMode = MODES[mode] || MODES.balanced;
    const goalLabel = goalType === "lose" ? "Απώλεια βάρους" :
      goalType === "gain" ? "Μυϊκή ανάπτυξη" :
      goalType === "fitness" ? "Fitness & Cardio" : "Διατήρηση";
    const currentWeight = lastWeight || weight;
    const bmi = currentWeight && height
      ? Math.round((currentWeight / ((height / 100) ** 2)) * 10) / 10 : null;

    const today = new Date();
    const dayNames = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
    const todayName = dayNames[today.getDay()];
    const todayDate = today.toLocaleDateString("el-GR");

    const totalEaten = (last7Days || []).reduce((s, d) => s + (d.eaten || 0), 0);
    const daysWithData = (last7Days || []).filter(d => d.eaten > 0).length;
    const avgCalories = daysWithData > 0 ? Math.round(totalEaten / daysWithData) : 0;
    const totalProtein7 = (last7Days || []).reduce((s, d) => {
      const log = dailyLogs?.[d.date] || { entries: [] };
      const entries = Array.isArray(log.entries) ? log.entries : [];
      return s + Math.round(entries.reduce((a, item) => a + Number(item.protein || 0), 0));
    }, 0);
    const avgProtein = daysWithData > 0 ? Math.round(totalProtein7 / daysWithData) : 0;
    const emptyDays = (last7Days || []).filter(d => d.eaten === 0).length;

    const favFoods = favoriteFoods?.length
      ? favoriteFoods.slice(0, 6).map(f => f.name).join(", ")
      : favoriteFoodsText || "";
    const favEx = favoriteExercises?.length
      ? favoriteExercises.slice(0, 5).map(e => e.name).join(", ")
      : favoriteExercisesText || "";

    const bmiText = bmi ? ` | BMI ${bmi}` : "";
    const trendText = weightTrend ? ` | Τάση ${weightTrend}kg` : "";
    const streakText = streak > 0 ? ` | Streak: ${streak}` : "";
    const favFoodsLine = favFoods ? `\nΑγαπημένα φαγητά: ${favFoods}` : "";
    const favExLine = favEx ? `\nΑγαπημένες ασκήσεις: ${favEx}` : "";
    const emptyText = emptyDays > 0 ? ` | ${emptyDays} μέρες χωρίς καταγραφή` : "";

    return `ΗΜΕΡΑ: ${todayName} ${todayDate}
ΧΡΗΣΤΗΣ: ${age || "—"} ετών | ${gender === "male" ? "Άνδρας" : "Γυναίκα"} | ${height || "—"}cm | ${currentWeight || "—"}kg${bmiText}${trendText}
ΣΤΟΧΟΣ: ${goalLabel} | Mode: ${currentMode.label} | ${targetCalories} kcal | ${proteinTarget}g πρωτ.${streakText}
ΣΗΜΕΡΑ: ${totalCalories || 0}/${targetCalories} kcal | Πρωτ. ${Math.round(totalProtein || 0)}/${proteinTarget}g | Άσκηση ${exerciseValue || 0} kcal | Υπόλοιπο ${remainingCalories || targetCalories} kcal
ΕΒΔΟΜΑΔΑ: Μέσος όρος ${avgCalories} kcal, ${avgProtein}g πρωτ.${emptyText}${favFoodsLine}${favExLine}
MODE ΚΑΝΟΝΑΣ: ${currentMode.aiRule}`;
  }

  function buildSystemPrompt(taskType) {
    const currentMode = MODES[mode] || MODES.balanced;
    const userCtx = buildUserContext();

    if (taskType === "meal") {
      return `${BASE_PROMPT}

${userCtx}

Φτιάξε εβδομαδιαίο πλάνο διατροφής 7 ημερών. Στόχος: ${targetCalories} kcal/μέρα ±5%.
Κατανομή: Πρωινό ${Math.round(targetCalories * 0.25)}, Σνακ x2 ${Math.round(targetCalories * 0.1)}, Μεσημεριανό ${Math.round(targetCalories * 0.35)}, Βραδινό ${Math.round(targetCalories * 0.20)} kcal.
Χρησιμοποίησε αγαπημένα φαγητά όταν ταιριάζουν με ${currentMode.label}.
Format:
📅 ΗΜΕΡΑ
07:30 🌅 Πρωινό — [γεύμα] ([X] kcal)
11:00 🍎 Σνακ — [σνακ] ([X] kcal)
13:30 🌞 Μεσημεριανό — [γεύμα] ([X] kcal)
16:30 🍎 Σνακ — [σνακ] ([X] kcal)
20:00 🌙 Βραδινό — [γεύμα] ([X] kcal)
Σύνολο: [X] kcal
─────────────────
Στο τέλος: "${DISCLAIMER}" και "Θέλεις να αλλάξω κάτι;"`;
    }

    if (taskType === "workout") {
      return `${BASE_PROMPT}

${userCtx}

Φτιάξε εβδομαδιαίο πλάνο γυμναστικής 7 ημερών. Τουλάχιστον 2 rest days. Λάβε υπόψη αγαπημένες ασκήσεις.
Format:
📅 ΗΜΕΡΑ — [τύπος προπόνησης]
09:00 💪 [άσκηση]: [σετ × επαναλήψεις]
Διάρκεια: ~[X] λεπτά
📅 ΗΜΕΡΑ — Ανάπαυση 😴
Στο τέλος: "${DISCLAIMER}" και "Θέλεις να αλλάξω κάτι;"`;
    }

    return `${BASE_PROMPT}

${userCtx}

Δώσε πρακτική καθοδήγηση με βάση τα παραπάνω. Εστίασε σε επόμενο βήμα και σύντομες προτάσεις.`;
  }

  function detectTaskType(text) {
    if (text.includes("Εβδομαδιαίο πρόγραμμα διατροφής") || text.includes("πλάνο διατροφής")) return "meal";
    if (text.includes("Εβδομαδιαίο πρόγραμμα γυμναστικής") || text.includes("πλάνο γυμναστικής")) return "workout";
    return "general";
  }

  function buildMessages(taskType, chatMessage) {
    const history = messages.map(msg => ({ role: msg.role, content: msg.text }));
    if (chatMessage) history.push({ role: "user", content: chatMessage });
    return { systemPrompt: buildSystemPrompt(taskType), messages: history };
  }

  async function sendMessage(messageText) {
    const text = (messageText || input).trim();
    if (!text && hasLoaded) return;
    if (loading) return;
    setLoading(true);
    if (text) { setMessages(prev => [...prev, { role: "user", text }]); setInput(""); }

    const isInitial = !text && !hasLoaded;
    let effectiveMessage;

    if (isInitial) {
      effectiveMessage = `Κοίτα τα δεδομένα μου και δώσε μου: 1) τι να φάω για την υπόλοιπη μέρα 2) αν πρέπει να γυμναστώ 3) ένα πράγμα που κάνω λάθος 4) μια ερώτηση για να με γνωρίσεις καλύτερα`;
    } else if (text === "Εβδομαδιαίο πρόγραμμα διατροφής") {
      effectiveMessage = "Φτιάξε μου εβδομαδιαίο πρόγραμμα διατροφής.";
    } else if (text === "Εβδομαδιαίο πρόγραμμα γυμναστικής") {
      effectiveMessage = "Φτιάξε μου εβδομαδιαίο πρόγραμμα γυμναστικής.";
    } else {
      effectiveMessage = text;
    }

    const taskType = isInitial ? "general" : detectTaskType(effectiveMessage);
    const { systemPrompt, messages: msgs } = buildMessages(taskType, effectiveMessage);

    try {
      const response = await fetch("/.netlify/functions/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, messages: msgs })
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

  return (
    <div className="card">
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>🤖 AI Coach</h2>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Διατροφολόγος & Personal Trainer</div>
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
          <button onClick={() => inputRef.current?.focus()} type="button"
            style={{ padding: "12px 14px", flexShrink: 0, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>🎤</button>
          <button className="btn btn-dark" onClick={() => sendMessage(null)} type="button"
            disabled={loading || !input.trim()}
            style={{ padding: "12px 16px", flexShrink: 0, opacity: loading || !input.trim() ? 0.4 : 1 }}>↑</button>
        </div>
      )}
    </div>
  );
}