// src/components/AiCoach.jsx
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MODES } from "../data/modes";
import { supabase } from "../supabaseClient";

const QUICK_QUESTION_KEYS = ["aiCoach.q1", "aiCoach.q2", "aiCoach.q3", "aiCoach.q4", "aiCoach.q5"];

function parseEatNowCards(text) {
  try {
    const blocks = text.trim().split(/\n\n+/).filter((b) => b.trim().length > 0);
    if (blocks.length < 2) return null;
    const cards = blocks.slice(0, 3).map((block) => {
      const lines = block.trim().split("\n").filter((l) => l.trim());
      if (lines.length < 2) return null;
      return { title: lines[0].trim(), stats: lines[1].trim(), desc: lines[2]?.trim() || "" };
    }).filter(Boolean);
    if (cards.length < 2) return null;
    return cards;
  } catch { return null; }
}

function EatNowCards({ text }) {
  const { t } = useTranslation();
  const cards = parseEatNowCards(text);
  if (!cards) return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text}</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2, fontWeight: 600 }}>🔥 {t("aiCoach.optionsNow")}</div>
      {cards.map((card, i) => (
        <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{card.title}</div>
          <div style={{ fontSize: 12, color: "var(--color-accent)", fontWeight: 700, marginBottom: card.desc ? 3 : 0 }}>{card.stats}</div>
          {card.desc && <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{card.desc}</div>}
        </div>
      ))}
    </div>
  );
}

export default function AiCoach({
  last7Days, dailyLogs, targetCalories, proteinTarget,
  mode, goalType, streak, weightLog, favoriteFoods,
  totalCalories, totalProtein, exerciseValue,
  remainingCalories, favoriteFoodsText, favoriteExercisesText,
  favoriteExercises, age, weight, height, gender,
  onSavePlan, session, onShowAuth, onShowRegister
}) {
  const { t } = useTranslation();
  const quickQuestions = QUICK_QUESTION_KEYS.map(key => t(key));
  const [messages, setMessages] = useState([]);
  const [isPaid, setIsPaid] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  const DAILY_LIMIT_FREE = 2;
  const MONTHLY_LIMIT_FREE = 10;
  const LIFETIME_LIMIT_FREE = 20;
  const DAILY_LIMIT_PAID = 30;
  const MONTHLY_LIMIT_PAID = 300;

  const [monthlyCount, setMonthlyCount] = useState(0);
  const [lifetimeCount, setLifetimeCount] = useState(0);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("ft_ai_usage") || "{}");
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    setDailyCount(stored.date === today ? (stored.count || 0) : 0);
    setMonthlyCount(stored.month === month ? (stored.monthCount || 0) : 0);
    setLifetimeCount(stored.lifetime || 0);

    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("is_paid")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setIsPaid(data?.is_paid === true);
      })
      .catch(() => {});
  }, [session]);

  function incrementUsage() {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const stored = JSON.parse(localStorage.getItem("ft_ai_usage") || "{}");
    const newDaily = dailyCount + 1;
    const newMonthly = (stored.month === month ? (stored.monthCount || 0) : 0) + 1;
    const newLifetime = (stored.lifetime || 0) + 1;
    setDailyCount(newDaily);
    setMonthlyCount(newMonthly);
    setLifetimeCount(newLifetime);
    localStorage.setItem("ft_ai_usage", JSON.stringify({ date: today, count: newDaily, month, monthCount: newMonthly, lifetime: newLifetime }));
  }

  const needsAccount = !session;
  const dailyLimit = isPaid ? DAILY_LIMIT_PAID : DAILY_LIMIT_FREE;
  const monthlyLimit = isPaid ? MONTHLY_LIMIT_PAID : MONTHLY_LIMIT_FREE;
  const monthlyLimitReached = monthlyCount >= monthlyLimit;
  const lifetimeLimitReached = !isPaid && lifetimeCount >= LIFETIME_LIMIT_FREE;
  const limitReached = needsAccount || dailyCount >= dailyLimit || monthlyLimitReached || lifetimeLimitReached;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const lastAssistantRef = useRef(null);

  const lastWeight = weightLog?.length
    ? [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight : null;

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
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && lastAssistantRef.current) {
      lastAssistantRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const el = chatRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
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
    if (hasMealPlan) onSavePlan?.({ type: "meal", content: text, date: new Date().toLocaleDateString("el-GR") });
    else if (hasTrainingPlan) onSavePlan?.({ type: "training", content: text, date: new Date().toLocaleDateString("el-GR") });
  }, [messages]);

  function buildSystemPrompt(taskType = "general") {
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
      return `  ${d.date}: ${d.eaten === 0 ? "⚠️ Χωρίς καταγραφή" : d.eaten + "kcal"} P:${protein}g [${exNames}]`;
    }).join("\n");

    const favFoodsList = (favoriteFoods || []).slice(0, 6).map(f => f.name).join(", ");
    const favExList = (favoriteExercises || []).map(e => e.name).join(", ");

    // BASE — στέλνεται σε κάθε request
    const base = `Διατροφολόγος & personal trainer. Ελληνικά, ενικός, φιλικός, πρακτικός.
ΣΗΜΕΡΑ: ${todayName} ${todayDate}
Ηλικία:${age||"—"} Φύλο:${gender==="male"?"Άνδρας":"Γυναίκα"} Ύψος:${height||"—"}cm Βάρος:${currentWeight||"—"}kg${bmi?` BMI:${bmi}`:""}${weightTrend?` Τάση:${weightTrend}kg`:""}
Στόχος:${goalLabel} | Mode:${currentMode.label} | Θερμίδες:${targetCalories}kcal | Πρωτεΐνη:${proteinTarget}g/μέρα | Streak:${streak}μέρες
Αγαπημένα:${favFoodsList||favoriteFoodsText||"—"} | Ασκήσεις:${favExList||favoriteExercisesText||"—"}
Σήμερα: ${totalCalories||0}/${targetCalories}kcal | P:${Math.round(totalProtein||0)}/${proteinTarget}g | Άσκηση:${exerciseValue||0}kcal | Υπόλοιπο:${remainingCalories||targetCalories}kcal
Εβδομάδα:\n${weekSummary||"—"}${emptyDays.length>0?`\n⚠️ ${emptyDays.length} μέρες χωρίς καταγραφή`:""}
Mode κανόνες (${currentMode.label}): ${currentMode.aiRule}`;

    // GENERAL — βασικές οδηγίες για chat/ανάλυση
    const generalRules = `
Κανόνες γευμάτων: 🌅Πρωινό=αυγά/γιαούρτι/βρώμη/τοστ (ποτέ κρέας) 🍎Σνακ=φρούτο/ξηροί καρποί 🌞Μεσημεριανό=κύριο γεύμα με πρωτεΐνη 🌙Βραδινό=ελαφρύ.
Αν τρόφιμο δεν ταιριάζει με ${currentMode.label} πες το αμέσως.`;

    // MEAL PLAN — μόνο για εβδομαδιαίο διατροφής
    const mealPlanFormat = `
Δώσε εβδομαδιαίο πρόγραμμα διατροφής. Στόχος ${targetCalories}kcal ±5%. Κατανομή: Πρωινό ${Math.round(targetCalories*0.25)}, Σνακx2 ${Math.round(targetCalories*0.1)}, Μεσημεριανό ${Math.round(targetCalories*0.35)}, Βραδινό ${Math.round(targetCalories*0.2)}kcal.
ΚΑΝΟΝΕΣ ΥΛΙΚΩΝ (μην τους αναφέρεις στην απάντηση):
- Πριν γράψεις το πρόγραμμα, επέλεξε μέγιστο 28 διαφορετικά υλικά συνολικά για όλη την εβδομάδα. Μην ξεπερνάς τα 30.
- Χρησιμοποίησε ΤΑ ΙΔΙΑ βασικά υλικά κάθε μέρα με διαφορετικούς συνδυασμούς — ΜΗΝ προσθέτεις νέα υλικά καθώς γράφεις.
- Το πρόγραμμα πρέπει να έχει ποικιλία, αλλά ελεγχόμενη και πρακτική για σούπερ μάρκετ.
- ΜΗΝ βάζεις το ίδιο ακριβώς μεσημεριανό ή το ίδιο ακριβώς βραδινό κάθε μέρα.
- ΜΗΝ ξοδεύεις την ποικιλία σε πάρα πολλά διαφορετικά λαχανικά ή συνοδευτικά.
- Η ποικιλία πρέπει να είναι μοιρασμένη ισορροπημένα σε κύριες πρωτεΐνες, συνοδευτικά και λαχανικά.
- Βάλε λίγες βασικές πρωτεΐνες που επαναλαμβάνονται λογικά μέσα στην εβδομάδα, λίγα βασικά συνοδευτικά και λίγα βασικά λαχανικά/φρούτα.
- ΜΗΝ αναφέρεις τα υλικά ή τον αριθμό τους στην απάντησή σου.
- ΠΡΙΝ δώσεις την τελική απάντηση, μέτρα τα μοναδικά υλικά της εβδομάδας και αν είναι πάνω από 25, αφαίρεσε ή συγχώνευσε υλικά μέχρι να γίνουν 25 ή λιγότερα.
- Θεώρησε παρόμοια υλικά ως ένα όπου γίνεται (π.χ. ντομάτα και ντοματίνια, ίδια κατηγορία ψαριού, ίδιο είδος ψωμιού/ρυζιού/γιαουρτιού) ώστε η λίστα σούπερ μάρκετ να μένει σύντομη και πρακτική.
- Γράψε σύντομη εισαγωγική πρόταση 1-2 γραμμών μόνο για τον στόχο, μετά ξεκίνα με 📅 ΔΕΥΤΕΡΑ.
ΥΠΟΧΡΕΩΤΙΚΟ format — ΠΑΝΤΑ emojis, ΠΟΤΕ αστερίσκοι:

📅 ΔΕΥΤΕΡΑ
07:30 🌅 Πρωινό — [γεύμα + ποσότητα] ([X]kcal)
11:00 🍎 Σνακ — [σνακ] ([X]kcal)
13:30 🌞 Μεσημεριανό — [γεύμα + ποσότητα] ([X]kcal)
16:30 🍎 Σνακ — [σνακ] ([X]kcal)
20:00 🌙 Βραδινό — [γεύμα + ποσότητα] ([X]kcal)
Σύνολο: [X]kcal
─────────────────
(Δευτέρα έως Κυριακή)
ΣΤΟ ΤΕΛΟΣ γράψε ΑΚΡΙΒΩΣ αυτό: ⚠️ Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή. Συμβουλέψου ειδικό αν έχεις νοσήματα, αλλεργίες ή λαμβάνεις φαρμακευτική αγωγή.
Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"`;

    // TRAINING PLAN — μόνο για εβδομαδιαίο γυμναστικής
    const trainingPlanFormat = `
Δώσε εβδομαδιαίο πρόγραμμα γυμναστικής. Λάβε υπόψη αγαπημένες ασκήσεις. 2+ rest days.
ΥΠΟΧΡΕΩΤΙΚΟ format — ΠΑΝΤΑ emojis:

📅 ΔΕΥΤΕΡΑ — [τύπος προπόνησης]
09:00 💪 [Άσκηση]: [σετ × επαναλήψεις]
Διάρκεια: ~[X]λεπτά

📅 ΤΡΙΤΗ — Ανάπαυση 😴
(Δευτέρα έως Κυριακή)
ΣΤΟ ΤΕΛΟΣ γράψε ΑΚΡΙΒΩΣ αυτό: ⚠️ Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή. Συμβουλέψου ειδικό αν έχεις νοσήματα, αλλεργίες ή λαμβάνεις φαρμακευτική αγωγή.
Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"`;

    if (taskType === "meal_plan") return base + mealPlanFormat;
    if (taskType === "training_plan") return base + trainingPlanFormat;
    if (taskType === "eatnow") return base; // format ήδη στο effectiveMessage
    return base + generalRules;
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
    if (limitReached) return;
    setLoading(true);
    incrementUsage();
    if (text) { setMessages(prev => [...prev, { role: "user", text }]); setInput(""); }

    const currentMode = MODES[mode] || MODES.balanced;
    const isInitial = !text && !hasLoaded;
    const isEatNow = text === t("aiCoach.q1");
    const isMealPlan = text === t("aiCoach.q2");
    const isTrainingPlan = text === t("aiCoach.q3");
    const taskType = isEatNow ? "eatnow" : isMealPlan ? "meal_plan" : isTrainingPlan ? "training_plan" : "general";

    let effectiveMessage;
    if (isInitial) {
      effectiveMessage = `Κοίτα τα δεδομένα μου:\n1. Τι να φάω για την υπόλοιπη μέρα (${currentMode.label}, ${targetCalories}kcal)\n2. Αν υπάρχουν άδειες μέρες επισήμανέ το\n3. Αν πρέπει να γυμναστώ σήμερα\n4. Ένα πράγμα που κάνω λάθος\n5. Ρώτα με κάτι`;
    } else if (isEatNow) {
      const hour = new Date().getHours();
      const mealTime = hour < 10 ? "πρωινό" : hour < 12 ? "σνακ πρωί" : hour < 15 ? "μεσημεριανό" : hour < 18 ? "σνακ απόγευμα" : "βραδινό";
      const remProtein = Math.max(Math.round((proteinTarget || 0) - (totalProtein || 0)), 0);
      effectiveMessage = `Δώσε 3 επιλογές για ${mealTime} ΤΩΡΑ.
Υπόλοιπο:${remainingCalories}kcal | Πρωτεΐνη:${remProtein}g | Mode:${currentMode.label}

Format — ΑΚΡΙΒΩΣ έτσι (κενή γραμμή μεταξύ, ΤΙΠΟΤΑ άλλο πριν ή μετά):

[emoji] [Γεύμα]
[X]kcal • [X]g πρωτεΐνη
[Μια πρόταση γιατί ταιριάζει]

[emoji] [Γεύμα 2]
[X]kcal • [X]g πρωτεΐνη
[Μια πρόταση]

[emoji] [Γεύμα 3]
[X]kcal • [X]g πρωτεΐνη
[Μια πρόταση]`;
    } else if (isMealPlan) {
      effectiveMessage = `Δώσε εβδομαδιαίο πρόγραμμα διατροφής 7 ημερών (Δευτέρα-Κυριακή). ΥΠΟΧΡΕΩΤΙΚΑ format με 📅 🌅 🍎 🌞 🌙. ΠΟΤΕ αστερίσκοι.`;
    } else if (isTrainingPlan) {
      effectiveMessage = `Δώσε εβδομαδιαίο πρόγραμμα γυμναστικής 7 ημερών (Δευτέρα-Κυριακή). ΥΠΟΧΡΕΩΤΙΚΑ format με 📅 💪 😴.`;
    } else {
      effectiveMessage = text;
    }

    try {
      const response = await fetch("/.netlify/functions/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(taskType),
          messages: buildMessages(effectiveMessage)
        })
      });
      if (!response.ok) throw new Error(`Σφάλμα σύνδεσης (${response.status})`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: data.advice, msgType: isEatNow ? "eatnow" : undefined }
      ]);
      setHasLoaded(true);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `❌ ${err.message || "Δεν ήταν δυνατή η σύνδεση."}`, error: true }]);
    } finally { setLoading(false); }
  }

  return (
    <div className="card">
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>🤖 {t("aiCoach.title")}</h2>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{t("aiCoach.subtitle")}</div>
      </div>

      {limitReached && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{needsAccount ? "🔒" : lifetimeLimitReached ? "🚀" : "⏳"}</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            {needsAccount ? t("aiCoach.needsAccountTitle") : lifetimeLimitReached ? t("aiCoach.lifetimeLimitTitle") : t("aiCoach.limitTitle")}
          </div>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {needsAccount
              ? t("aiCoach.needsAccountDesc")
              : lifetimeLimitReached
              ? t("aiCoach.lifetimeLimitDesc", { limit: LIFETIME_LIMIT_FREE })
              : monthlyLimitReached
              ? t("aiCoach.monthlyLimitDesc", { limit: monthlyLimit })
              : t("aiCoach.limitDesc", { limit: dailyLimit })}
          </div>
          {needsAccount && onShowAuth && (
            <div>
              <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px 16px", textAlign: "left", fontSize: 13, lineHeight: 1.8, margin: "16px 0" }}>
                <div>✅ {t("aiCoach.proFeature1")}</div>
                <div>✅ {t("aiCoach.proFeature2")}</div>
                <div>✅ {t("aiCoach.proFeature3")}</div>
                <div>✅ {t("aiCoach.proFeature4")}</div>
              </div>
              <div className="muted" style={{ fontSize: 11, marginBottom: 14 }}>{t("aiCoach.freeNote")}</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button className="btn btn-dark" onClick={onShowAuth} type="button"
                  style={{ padding: "12px 24px", fontSize: 14 }}>
                  {t("auth.loginBtn")}
                </button>
                <button className="btn btn-light" onClick={onShowRegister} type="button"
                  style={{ padding: "12px 24px", fontSize: 14 }}>
                  {t("auth.registerBtn")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!limitReached && !hasLoaded && !loading && messages.length === 0 && (
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{t("aiCoach.askAnything")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {quickQuestions.map((q) => (
              <button key={q} onClick={() => sendMessage(q)} type="button"
                style={{ padding: "7px 12px", borderRadius: 20, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {q}
              </button>
            ))}
          </div>
          <button className="btn btn-dark" onClick={() => sendMessage(null)} type="button" style={{ width: "100%" }}>
            📊 {t("aiCoach.analyzeDay")}
          </button>
        </div>
      )}

      {loading && messages.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
          <div className="muted" style={{ fontSize: 13 }}>{t("aiCoach.analyzing")}</div>
        </div>
      )}

      {messages.length > 0 && (
        <div ref={chatRef} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 500, overflowY: "auto", overflowX: "hidden", paddingRight: 4, scrollbarWidth: "thin", scrollbarColor: "var(--border-color) transparent" }}>
          {messages.map((msg, i) => (
            <div key={i} ref={msg.role === "assistant" && i === messages.length - 1 ? lastAssistantRef : null} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.msgType === "eatnow" ? (
                <div style={{ maxWidth: "95%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, lineHeight: 1.7, width: "100%" }}>
                  <EatNowCards text={msg.text} />
                </div>
              ) : (
                <div style={{ maxWidth: "90%", padding: "10px 14px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? "var(--color-accent)" : "var(--bg-soft)", color: msg.role === "user" ? "var(--bg-card)" : "var(--text-primary)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", border: msg.role === "assistant" ? "1px solid var(--border-soft)" : "none" }}>
                  {msg.text}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, color: "var(--text-muted)" }}>
                💭 {t("aiCoach.thinking")}
              </div>
            </div>
          )}
        </div>
      )}

      {hasLoaded && !loading && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {quickQuestions.map((q) => (
            <button key={q} onClick={() => sendMessage(q)} type="button"
              style={{ padding: "5px 10px", borderRadius: 20, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {!limitReached && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
            <input ref={inputRef} className="input" placeholder={t("aiCoach.placeholder")} value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading && input.trim()) sendMessage(null); }}
              style={{ flex: 1 }} disabled={loading} />
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