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
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const text = last.text;
    const hasMealPlan = text.includes("Σύνολο:") && text.includes("🌅") && text.includes("🌞") && text.includes("🌙");
    const hasTrainingPlan = !hasMealPlan && text.includes("📅") && (
      text.includes("σετ ×") || (text.includes("λεπτά") && text.includes("💪"))
    );
    if (hasMealPlan) {
      onSavePlan?.({ type: "meal", content: text, date: new Date().toLocaleDateString("el-GR") });
    } else if (hasTrainingPlan) {
      onSavePlan?.({ type: "training", content: text, date: new Date().toLocaleDateString("el-GR") });
    }
  }, [messages]);

  function buildSystemPrompt() {
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

    const emptyDays = (last7Days || []).filter(d => d.eaten === 0);

    const weekSummary = (last7Days || []).map((d) => {
      const log = dailyLogs?.[d.date] || { entries: [], exercises: [] };
      const entries = Array.isArray(log.entries) ? log.entries : [];
      const protein = Math.round(entries.reduce((s, item) => s + Number(item.protein || 0), 0));
      const exNames = Array.isArray(log.exercises) && log.exercises.length > 0
        ? log.exercises.map(e => e.name).join(", ") : "—";
      return `  ${d.date}: ${d.eaten === 0 ? "⚠️ Χωρίς καταγραφή" : d.eaten + " kcal"}, πρωτεΐνη ${protein}g [${exNames}]`;
    }).join("\n");

    const favFoodsList = (favoriteFoods || []).slice(0, 8).map(f => f.name).join(", ");
    const favExList = (favoriteExercises || []).map(e => e.name).join(", ");

    return `Είσαι έμπειρος διατροφολόγος και personal trainer. Μιλάς ΠΑΝΤΑ στα Ελληνικά, ΠΑΝΤΑ στον ΕΝΙΚΟ. Είσαι φιλικός, πρακτικός και δίνεις ρεαλιστικές, ελκυστικές προτάσεις.

ΣΗΜΕΡΑ: ${todayName} ${todayDate}

━━━ ΣΤΟΙΧΕΙΑ ΧΡΗΣΤΗ ━━━
Ηλικία: ${age || "—"} | Φύλο: ${gender === "male" ? "Άνδρας" : "Γυναίκα"}
Ύψος: ${height || "—"} cm | Βάρος: ${currentWeight || "—"} kg${bmi ? ` | BMI: ${bmi}` : ""}
${weightTrend ? `Τάση βάρους: ${weightTrend} kg` : ""}
Στόχος: ${goalLabel} | Διατροφή: ${currentMode.label}
ΗΜΕΡΗΣΙΟΣ ΣΤΟΧΟΣ ΘΕΡΜΙΔΩΝ: ${targetCalories} kcal — ΑΥΤΟΣ ΕΙΝΑΙ Ο ΣΤΟΧΟΣ ΣΟΥ
Πρωτεΐνη: ${proteinTarget}g/μέρα
Streak: ${streak} μέρες

━━━ ΓΟΥΣΤΑ ΧΡΗΣΤΗ ━━━
Αγαπημένα φαγητά: ${favFoodsList || favoriteFoodsText || "Δεν έχει δηλώσει"}
Αγαπημένες ασκήσεις: ${favExList || favoriteExercisesText || "Δεν έχει δηλώσει"}

━━━ ΣΗΜΕΡΑ ━━━
Έφαγε: ${totalCalories || 0}/${targetCalories} kcal
Πρωτεΐνη: ${Math.round(totalProtein || 0)}/${proteinTarget}g
Άσκηση: ${exerciseValue || 0} kcal
Υπόλοιπο: ${remainingCalories || targetCalories} kcal

━━━ ΕΒΔΟΜΑΔΑ ━━━
${weekSummary || "Δεν υπάρχουν δεδομένα"}
${emptyDays.length > 0 ? `\n⚠️ Μέρες χωρίς καταγραφή: ${emptyDays.length}` : ""}

━━━ ΚΑΝΟΝΕΣ ΔΙΑΤΡΟΦΗΣ (${currentMode.label}) ━━━
${currentMode.aiRule}

━━━ ΟΔΗΓΙΕΣ ━━━

1. ΕΝΙΚΟΣ παντά. ΠΟΤΕ πληθυντικός.

2. ΑΔΕΙΑ ΜΕΡΕΣ: Αν υπάρχουν μέρες χωρίς καταγραφή, αναφέρσε το φιλικά — η καταγραφή είναι το πιο σημαντικό εργαλείο για επιτυχία.

3. ΓΕΥΜΑΤΑ — ΛΟΓΙΚΗ ΕΠΙΛΟΓΗ:
   🌅 ΠΡΩΙΝΟ (07:00-09:00): αυγά, γιαούρτι με φρούτα, βρώμη, τοστ, smoothie. ΠΟΤΕ κρέας ή ψάρι.
   🍎 ΣΝΑΚ (11:00 και 16:30): φρούτο, ξηροί καρποί, γιαούρτι, protein bar, rice cake. ΠΟΤΕ κρέας/ψάρι.
   🌞 ΜΕΣΗΜΕΡΙΑΝΟ (13:00-14:30): κοτόπουλο, ψάρι, κρέας + λαχανικά + υδατάνθρακας. Κύριο γεύμα.
   🌙 ΒΡΑΔΙΝΟ (19:00-21:00): ελαφρύτερο — ψάρι, σαλάτα, αυγά, τυρί, λαχανικά.
   Ποικιλία κάθε μέρα. Εύκολα, νόστιμα, προσβάσιμα γεύματα.

4. ΣΥΜΒΑΤΟΤΗΤΑ ΔΙΑΙΤΑΣ: Αν ο χρήστης αναφέρει τρόφιμο που ΔΕΝ ταιριάζει με ${currentMode.label}, πες το ΑΜΕΣΩΣ και φιλικά.
   Παράδειγμα — Carnivore + ζυμαρικά: "Τα ζυμαρικά δεν ταιριάζουν με Carnivore — έχουν πολλούς υδατάνθρακες. Μπορώ να σου προτείνω κάτι παρόμοιο;"
   Παράδειγμα — Keto + ρύζι: "Το ρύζι έχει πολλούς υδατάνθρακες για Keto. Δοκίμασε κουνουπίδι ρύζι!"
   ΜΗΝ προτείνεις ποτέ ακατάλληλα τρόφιμα για τη δίαιτα.

5. FORMAT ΕΒΔΟΜΑΔΙΑΙΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ΔΙΑΤΡΟΦΗΣ:
   ΚΡΙΤΙΚΟ: ΜΟΝΟ φαγητό — χωρίς ασκήσεις, χωρίς γυμναστική.

   ⚠️ ΚΡΙΤΙΚΟ — ΘΕΡΜΙΔΕΣ: Κάθε μέρα ΠΡΕΠΕΙ να έχει ΑΚΡΙΒΩΣ ${targetCalories} kcal.
   Πριν γράψεις κάθε μέρα, άθροισε: Πρωινό + Σνακ + Μεσημεριανό + Σνακ + Βραδινό = ${targetCalories} kcal.
   Αν δεν βγαίνει ${targetCalories} kcal, αύξησε τις ποσότητες μέχρι να βγει.
   ΠΟΤΕ μη δώσεις μέρα με λιγότερες από ${targetCalories - 50} ή περισσότερες από ${targetCalories + 50} kcal.
   Αν ο στόχος είναι ${targetCalories} kcal και το πρωινό έχει 400 kcal, το μεσημεριανό πρέπει να έχει ~600-700 kcal, το βραδινό ~400-500 kcal και τα σνακ ~150-200 kcal το καθένα.

📅 ΔΕΥΤΕΡΑ
07:30 🌅 Πρωινό — [γεύμα + ποσότητα] ([X] kcal)
11:00 🍎 Σνακ — [σνακ] ([X] kcal)
13:30 🌞 Μεσημεριανό — [γεύμα + ποσότητα] ([X] kcal)
16:30 🍎 Σνακ — [σνακ] ([X] kcal)
20:00 🌙 Βραδινό — [γεύμα + ποσότητα] ([X] kcal)
Σύνολο: [X] kcal
─────────────────

   Όλες οι μέρες Δευτέρα-Κυριακή (η Κυριακή πιο ελεύθερη).
   Χωρίς αστερίσκους. Πρόγραμμα ΠΛΗΡΕΣ με τη μια.
   Αν θέλει αλλαγές → ΟΛΟΚΑΙΝΟΥΡΓΙΟ πρόγραμμα.
   ΣΤΟ ΤΕΛΟΣ:
⚠️ Γενική πρόταση — δεν αντικαθιστά ειδικό. Συμβουλέψου γιατρό αν έχεις παθήσεις ή αλλεργίες.
   Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"

6. FORMAT ΕΒΔΟΜΑΔΙΑΙΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ΓΥΜΝΑΣΤΙΚΗΣ:
   ΚΡΙΤΙΚΟ: ΜΟΝΟ ασκήσεις — χωρίς φαγητό, χωρίς διατροφικές συμβουλές.

📅 ΔΕΥΤΕΡΑ — [τύπος προπόνησης]
09:00 💪 [Άσκηση]: [σετ × επαναλήψεις]
09:20 💪 [Άσκηση]: [σετ × επαναλήψεις]
Διάρκεια: ~[X] λεπτά

📅 ΤΡΙΤΗ — Ανάπαυση 😴
Ελαφρύ περπάτημα 20-30 λεπτά αν θέλεις.

   Όλες οι μέρες Δευτέρα-Κυριακή. 2 rest days τουλάχιστον.
   Βάσει αγαπημένων ασκήσεων αν έχει δηλώσει.
   ΣΤΟ ΤΕΛΟΣ:
⚠️ Αν έχεις τραυματισμούς ή παθήσεις, συμβουλέψου γιατρό. Ξεκίνα με χαμηλή ένταση.
   Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"

7. ΝΕΟ ΠΡΟΓΡΑΜΜΑ: Αν έχει ήδη αποθηκευμένο, ρώτα: "Έχεις ήδη αποθηκευμένο πρόγραμμα. Θέλεις να το αντικαταστήσω ή να κάνω παραλλαγή;"

8. INTERACTIVE: Ρώτα τι αρέσει, τι δεν θέλει. Προσάρμοσε.

9. ΠΟΤΕ μην κόβεις απάντηση στη μέση.`;
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
      ? `...`
      : text === "Εβδομαδιαίο πρόγραμμα διατροφής"
        ? `Δώσε μου εβδομαδιαίο πρόγραμμα διατροφής 7 ημερών. ΥΠΕΝΘΥΜΙΣΗ: ο ημερήσιος στόχος είναι ΑΚΡΙΒΩΣ ${targetCalories} kcal. Κάθε μέρα ΠΡΕΠΕΙ να έχει ${targetCalories} kcal — όχι 800, όχι 1200, ΑΚΡΙΒΩΣ ${targetCalories} kcal.`
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