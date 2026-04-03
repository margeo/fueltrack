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
  const bottomRef = useRef(null);

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const text = last.text;
    const hasMealPlan = text.includes("🌅") && text.includes("🌞") && text.includes("🌙") && text.includes("Σύνολο:");
    const hasTrainingPlan = (text.includes("💪") || text.includes("🏃")) && text.includes("📅") && !text.includes("Σύνολο:");
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

    const weekSummary = (last7Days || []).map((d, i) => {
      const log = dailyLogs?.[d.date] || { entries: [], exercises: [] };
      const entries = Array.isArray(log.entries) ? log.entries : [];
      const protein = Math.round(entries.reduce((s, item) => s + Number(item.protein || 0), 0));
      const exNames = Array.isArray(log.exercises) && log.exercises.length > 0
        ? log.exercises.map(e => e.name).join(", ") : "—";
      return `  ${d.date}: ${d.eaten === 0 ? "⚠️ Χωρίς καταγραφή" : d.eaten + " kcal"}, πρωτεΐνη ${protein}g [${exNames}]`;
    }).join("\n");

    const favFoodsList = (favoriteFoods || []).slice(0, 8)
      .map(f => f.name).join(", ");
    const favExList = (favoriteExercises || []).map(e => e.name).join(", ");

    return `Είσαι έμπειρος διατροφολόγος και personal trainer. Μιλάς ΠΑΝΤΑ στα Ελληνικά, ΠΑΝΤΑ στον ΕΝΙΚΟ. Είσαι φιλικός, πρακτικός και δίνεις ρεαλιστικές, ελκυστικές προτάσεις — σαν να μιλάς με πελάτη σου.

ΣΗΜΕΡΑ: ${todayName} ${todayDate}

━━━ ΣΤΟΙΧΕΙΑ ΧΡΗΣΤΗ ━━━
Ηλικία: ${age || "—"} | Φύλο: ${gender === "male" ? "Άνδρας" : "Γυναίκα"}
Ύψος: ${height || "—"} cm | Βάρος: ${currentWeight || "—"} kg${bmi ? ` | BMI: ${bmi}` : ""}
${weightTrend ? `Τάση βάρους: ${weightTrend} kg` : ""}
Στόχος: ${goalLabel} | Διατροφή: ${currentMode.label}
Θερμίδες: ${targetCalories} kcal/μέρα | Πρωτεΐνη: ${proteinTarget}g/μέρα
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

━━━ ΚΑΝΟΝΕΣ ΔΙΑΤΡΟΦΗΣ ━━━
${currentMode.aiRule}

━━━ ΟΔΗΓΙΕΣ ΣΥΜΠΕΡΙΦΟΡΑΣ ━━━

1. ΕΝΙΚΟΣ παντά.

2. ΑΔΕΙΑ ΜΕΡΕΣ: Αν υπάρχουν μέρες χωρίς καταγραφή, αναφέρσε το φιλικά — η καταγραφή είναι το πιο σημαντικό εργαλείο για επιτυχία.

3. ΓΝΩΣΗ ΔΙΑΤΡΟΦΗΣ: Χρησιμοποίησε τις γνώσεις σου ως διατροφολόγος — όχι τυχαία τρόφιμα. Σκέψου τι είναι ρεαλιστικό, νόστιμο και κατάλληλο.

4. ΑΓΑΠΗΜΕΝΑ: Λάβε υπόψη τα αγαπημένα φαγητά ΩΣ ΕΠΙΛΟΓΗ ΠΡΟΤΕΡΑΙΟΤΗΤΑΣ αλλά όχι αποκλειστικά. Αν κάποιο αγαπημένο δεν ταιριάζει στη δίαιτα, πρότεινε παρόμοιο κατάλληλο.

5. ΓΕΥΜΑΤΑ — ΛΟΓΙΚΗ ΕΠΙΛΟΓΗ:
   🌅 ΠΡΩΙΝΟ (07:00-09:00): Εύκολο, χορταστικό, ενεργειακό.
      Ιδανικά: αυγά (scrambled/βραστά/ομελέτα), γιαούρτι με φρούτα/μέλι, βρώμη με μπανάνα, τοστ με αβοκάντο, κρουασάν, smoothie, φρυγανιές με τυρί.
      ΠΟΤΕ: κρέας (αρνί, κοτόπουλο, ψάρι) ως κύριο πρωινό.

   🍎 ΣΝΑΚ (11:00 και 16:30): Μικρό, εύκολο, γρήγορο.
      Ιδανικά: φρούτο (μπανάνα, μήλο, πορτοκάλι), χούφτα ξηρούς καρπούς, γιαούρτι, protein bar, λίγη μαύρη σοκολάτα, rice cake.
      ΠΟΤΕ: ψάρι, κρέας, μαγειρευτά ως σνακ.

   🌞 ΜΕΣΗΜΕΡΙΑΝΟ (13:00-14:30): Κύριο γεύμα, πλήρες.
      Ιδανικά: κοτόπουλο/ψάρι/κρέας + λαχανικά + υδατάνθρακας (ρύζι/ζυμαρικά/πατάτα), σαλάτα, σούπα, ελληνικά φαγητά (κοτόπουλο σχάρας, σολομός, μοσχάρι).

   🌙 ΒΡΑΔΙΝΟ (19:00-21:00): Ελαφρύτερο από μεσημεριανό.
      Ιδανικά: ψάρι, σαλάτα με πρωτεΐνη, αυγά, τυρί, λαχανικά, σούπα.

6. ΡΕΑΛΙΣΜΟΣ: Τα γεύματα πρέπει να είναι:
   - Εύκολα να φτιαχτούν (όχι σύνθετες συνταγές)
   - Νόστιμα και ελκυστικά
   - Προσβάσιμα (υλικά που βρίσκεις εύκολα)
   - Ποικιλία κατά τη διάρκεια της εβδομάδας (μην επαναλαμβάνεις το ίδιο κάθε μέρα)

7. FORMAT ΕΒΔΟΜΑΔΙΑΙΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ΔΙΑΤΡΟΦΗΣ:

📅 ΔΕΥΤΕΡΑ
07:30 🌅 Πρωινό — [γεύμα] ([X] kcal)
11:00 🍎 Σνακ — [σνακ] ([X] kcal)
13:30 🌞 Μεσημεριανό — [γεύμα] ([X] kcal)
16:30 🍎 Σνακ — [σνακ] ([X] kcal)
20:00 🌙 Βραδινό — [γεύμα] ([X] kcal)
Σύνολο: [X] kcal
─────────────────

   ΚΑΝΟΝΕΣ FORMAT:
   - Όλες οι μέρες Δευτέρα-Κυριακή (η Κυριακή να έχει πιο χαλαρό/ελεύθερο πρόγραμμα)
   - Ποικιλία — διαφορετικά γεύματα κάθε μέρα
   - Θερμίδες ΑΚΡΙΒΩΣ ${targetCalories} kcal/μέρα
   - Μόνο kcal ανά γεύμα, χωρίς macros breakdown
   - Χωρίς αστερίσκους, χωρίς "-" bullets
   - Πρόγραμμα ΠΛΗΡΕΣ και ΣΩΣΤΟ με τη μια — χωρίς "διορθώσεις" μέσα
   - Αν ο χρήστης θέλει αλλαγές → ΟΛΟΚΑΙΝΟΥΡΓΙΟ πρόγραμμα
   - ΣΤΟ ΤΕΛΟΣ:

⚠️ Αυτό το πρόγραμμα είναι γενική πρόταση βασισμένη στα δεδομένα σου. Δεν αντικαθιστά τη γνώμη ειδικού διατροφολόγου. Αν έχεις αλλεργίες ή παθήσεις, συμβουλέψου ειδικό.

   Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"

8. FORMAT ΕΒΔΟΜΑΔΙΑΙΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ΓΥΜΝΑΣΤΙΚΗΣ:

📅 ΔΕΥΤΕΡΑ — [τύπος]
09:00 💪 [Άσκηση]: [σετ × επαναλήψεις]
Διάρκεια: ~[X] λεπτά

📅 ΤΡΙΤΗ — Ανάπαυση 😴
Ελαφρύ περπάτημα 20-30 λεπτά αν θέλεις.

   ΚΑΝΟΝΕΣ:
   - Όλες οι μέρες Δευτέρα-Κυριακή
   - 2 rest days τουλάχιστον (συνήθως Κυριακή + μία ακόμα)
   - Βάσει αγαπημένων ασκήσεων
   - ΣΤΟ ΤΕΛΟΣ:

⚠️ Αν έχεις τραυματισμούς ή παθήσεις, συμβουλέψου γιατρό πριν ξεκινήσεις. Ξεκίνα με χαμηλή ένταση.

   Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"

9. ΝΕΟ ΠΡΟΓΡΑΜΜΑ: Αν ο χρήστης έχει ήδη αποθηκευμένο πρόγραμμα και ζητάει νέο, ρώτα: "Έχεις ήδη αποθηκευμένο πρόγραμμα. Θέλεις να το αντικαταστήσω ή να κάνω παραλλαγή;"

10. INTERACTIVE: Ρώτα τι αρέσει, τι δεν θέλει. Προσάρμοσε. Πρότεινε εναλλακτικά.

11. ΠΟΤΕ μην κόβεις απάντηση στη μέση.`;
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
      ? `Κοίτα τα δεδομένα μου και:\n1. Πες μου τι να φάω για την υπόλοιπη μέρα (ρεαλιστικά και νόστιμα γεύματα για ${currentMode.label})\n2. Αν υπάρχουν άδειες μέρες χωρίς καταγραφή, επισήμανέ το φιλικά\n3. Αν πρέπει να γυμναστώ σήμερα και τι\n4. Ένα πράγμα που κάνω λάθος\n5. Ρώτα με κάτι για να με γνωρίσεις καλύτερα`
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
          <div ref={bottomRef} />
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
            style={{ padding: "12px 14px", flexShrink: 0, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            title="Φωνητική εισαγωγή — πάτα το 🎤 στο keyboard">🎤</button>
          <button className="btn btn-dark" onClick={() => sendMessage(null)} type="button"
            disabled={loading || !input.trim()}
            style={{ padding: "12px 16px", flexShrink: 0, opacity: loading || !input.trim() ? 0.4 : 1 }}>↑</button>
        </div>
      )}
    </div>
  );
}