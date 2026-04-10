// src/components/AiCoach.jsx
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MODES } from "../data/modes";
import { supabase } from "../supabaseClient";

const QUICK_QUESTION_KEYS = ["aiCoach.q1", "aiCoach.q2", "aiCoach.q3", "aiCoach.q4", "aiCoach.q5"];

function formatAiText(text) {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, (m) => `<ul style="margin:4px 0;padding-left:18px">${m}</ul>`)
    .replace(/^(\d+)\.\s+(.+)$/gm, "<li>$2</li>")
    .replace(/(?:^<li>.*<\/li>\n?)+(?!<\/ul>)/gm, (m) => m.includes("<ul") ? m : `<ol style="margin:4px 0;padding-left:18px">${m}</ol>`);
}

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_NAMES = { el: ["ΔΕΥΤΕΡΑ", "ΤΡΙΤΗ", "ΤΕΤΑΡΤΗ", "ΠΕΜΠΤΗ", "ΠΑΡΑΣΚΕΥΗ", "ΣΑΒΒΑΤΟ", "ΚΥΡΙΑΚΗ"], en: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] };

const TRAINING_EXERCISE_SCHEMA = {
  type: "object",
  properties: { name: { type: "string" }, detail: { type: "string" } },
  required: ["name", "detail"],
  additionalProperties: false
};
const TRAINING_DAY_SCHEMA = {
  type: "object",
  properties: {
    workout_type: { type: "string" },
    exercises: { type: "array", items: TRAINING_EXERCISE_SCHEMA },
    duration_min: { type: "integer" }
  },
  required: ["workout_type", "exercises", "duration_min"],
  additionalProperties: false
};
const TRAINING_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "training_plan",
    strict: true,
    schema: {
      type: "object",
      properties: Object.fromEntries(DAY_KEYS.map(d => [d, TRAINING_DAY_SCHEMA])),
      required: DAY_KEYS,
      additionalProperties: false
    }
  }
};

const INSIGHT_ITEM_SCHEMA = {
  type: "object",
  properties: { emoji: { type: "string" }, text: { type: "string" } },
  required: ["emoji", "text"],
  additionalProperties: false
};
const WEEKLY_REVIEW_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "weekly_review",
    strict: true,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        score: { type: "integer" },
        highlights: { type: "array", items: INSIGHT_ITEM_SCHEMA },
        improvements: { type: "array", items: INSIGHT_ITEM_SCHEMA },
        tip: { type: "string" }
      },
      required: ["summary", "score", "highlights", "improvements", "tip"],
      additionalProperties: false
    }
  }
};

const ISSUE_SCHEMA = {
  type: "object",
  properties: { emoji: { type: "string" }, title: { type: "string" }, detail: { type: "string" }, fix: { type: "string" } },
  required: ["emoji", "title", "detail", "fix"],
  additionalProperties: false
};
const MISTAKES_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "mistakes_review",
    strict: true,
    schema: {
      type: "object",
      properties: {
        issues: { type: "array", items: ISSUE_SCHEMA },
        doing_right: { type: "array", items: INSIGHT_ITEM_SCHEMA },
        top_priority: { type: "string" }
      },
      required: ["issues", "doing_right", "top_priority"],
      additionalProperties: false
    }
  }
};

function WeeklyReviewView({ data, lang }) {
  if (!data) return null;
  const isEn = lang === "en";
  const score = typeof data.score === "number" ? data.score : null;
  const scoreColor = score >= 7 ? "#16a34a" : score >= 4 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {data.summary && <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{data.summary}</div>}
      {score !== null && (
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor }}>{score}/10</div>
        </div>
      )}
      {data.highlights?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{isEn ? "Doing well" : "Πάει καλά"}</div>
          {data.highlights.map((h, i) => <div key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>{h.emoji} {h.text}</div>)}
        </div>
      )}
      {data.improvements?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{isEn ? "To improve" : "Για βελτίωση"}</div>
          {data.improvements.map((h, i) => <div key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>{h.emoji} {h.text}</div>)}
        </div>
      )}
      {data.tip && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>
          💡 <strong>{isEn ? "Tip" : "Συμβουλή"}:</strong> {data.tip}
        </div>
      )}
    </div>
  );
}

function MistakesReviewView({ data, lang }) {
  if (!data) return null;
  const isEn = lang === "en";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {data.top_priority && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>
          🎯 <strong>{isEn ? "Top priority" : "Προτεραιότητα #1"}:</strong> {data.top_priority}
        </div>
      )}
      {data.issues?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{isEn ? "Issues" : "Προβλήματα"}</div>
          {data.issues.map((issue, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{issue.emoji} {issue.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{issue.detail}</div>
              <div style={{ fontSize: 12, color: "#16a34a", lineHeight: 1.5 }}>→ {issue.fix}</div>
            </div>
          ))}
        </div>
      )}
      {data.doing_right?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{isEn ? "Doing right" : "Κάνεις σωστά"}</div>
          {data.doing_right.map((h, i) => <div key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>{h.emoji} {h.text}</div>)}
        </div>
      )}
    </div>
  );
}

const CHAT_SECTION_SCHEMA = {
  type: "object",
  properties: { emoji: { type: "string" }, title: { type: "string" }, content: { type: "string" } },
  required: ["emoji", "title", "content"],
  additionalProperties: false
};
const CHAT_RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "chat_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        sections: { type: "array", items: CHAT_SECTION_SCHEMA },
        tip: { type: "string" }
      },
      required: ["sections", "tip"],
      additionalProperties: false
    }
  }
};

function ChatResponseView({ data, lang }) {
  if (!data?.sections?.length) return null;
  const isEn = lang === "en";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {data.sections.map((s, i) => (
        <div key={i}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.emoji} {s.title}</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)" }}>{s.content}</div>
        </div>
      ))}
      {data.tip && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "8px 12px", fontSize: 13, marginTop: 4 }}>
          💡 <strong>{isEn ? "Tip" : "Συμβουλή"}:</strong> {data.tip}
        </div>
      )}
    </div>
  );
}

const MACRO_INSIGHT_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "macro_analysis",
    strict: true,
    schema: {
      type: "object",
      properties: {
        protein_verdict: { type: "string" },
        carbs_verdict: { type: "string" },
        fat_verdict: { type: "string" },
        weekly_pattern: { type: "string" },
        tip: { type: "string" }
      },
      required: ["protein_verdict", "carbs_verdict", "fat_verdict", "weekly_pattern", "tip"],
      additionalProperties: false
    }
  }
};

function MacroBar({ label, current, target, color }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const remaining = Math.max(Math.round(target - current), 0);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
        <span>{label}</span>
        <span>{Math.round(current)}g / {Math.round(target)}g</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--border-soft)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: color, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
        {pct}% — {remaining > 0 ? `${remaining}g remaining` : "target reached"}
      </div>
    </div>
  );
}

function MacroAnalysisView({ macros, targets, aiInsight, lang }) {
  const isEn = lang === "en";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>🔬 {isEn ? "Macro Analysis" : "Ανάλυση Μακροθρεπτικών"}</div>
      <div>
        <MacroBar label={isEn ? "Protein" : "Πρωτεΐνη"} current={macros.protein} target={targets.protein} color="#3b82f6" />
        <MacroBar label={isEn ? "Carbs" : "Υδατάνθρακες"} current={macros.carbs} target={targets.carbs} color="#f59e0b" />
        <MacroBar label={isEn ? "Fat" : "Λίπος"} current={macros.fat} target={targets.fat} color="#ef4444" />
      </div>
      {aiInsight && (
        <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 8 }}>
          {aiInsight.protein_verdict && <div style={{ fontSize: 13, lineHeight: 1.7 }}>🥩 {aiInsight.protein_verdict}</div>}
          {aiInsight.carbs_verdict && <div style={{ fontSize: 13, lineHeight: 1.7 }}>🌾 {aiInsight.carbs_verdict}</div>}
          {aiInsight.fat_verdict && <div style={{ fontSize: 13, lineHeight: 1.7 }}>🫒 {aiInsight.fat_verdict}</div>}
          {aiInsight.weekly_pattern && <div style={{ fontSize: 13, lineHeight: 1.7, marginTop: 4 }}>📊 {aiInsight.weekly_pattern}</div>}
          {aiInsight.tip && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 10, padding: "8px 12px", fontSize: 13, marginTop: 6 }}>
              💡 <strong>{isEn ? "Tip" : "Συμβουλή"}:</strong> {aiInsight.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderTrainingPlanText(data, lang) {
  const days = DAY_NAMES[lang] || DAY_NAMES.el;
  const plan = data?.weekly_plan || data;
  if (!plan || typeof plan !== "object") return "";
  return DAY_KEYS.map((dayKey, di) => {
    const day = plan[dayKey];
    if (!day) return "";
    const isRest = day.duration_min === 0 || day.exercises?.length === 0;
    if (isRest) return `📅 ${days[di]} — ${day.workout_type} 😴`;
    const exercises = (day.exercises || []).map(e => `💪 ${e.name}: ${e.detail}`).join("\n");
    const dur = day.duration_min ? `\n⏱ ${lang === "en" ? "Duration" : "Διάρκεια"}: ~${day.duration_min}${lang === "en" ? "min" : "λεπτά"}` : "";
    return `📅 ${days[di]} — ${day.workout_type}\n${exercises}${dur}`;
  }).filter(Boolean).join("\n\n") + `\n\n⚠️ ${lang === "en" ? "This information is for guidance only and does not replace a doctor, nutritionist, or trainer." : "Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή."}`;
}

function TrainingPlanView({ data, lang }) {
  const days = DAY_NAMES[lang] || DAY_NAMES.el;
  const plan = data?.weekly_plan || data;
  if (!plan || typeof plan !== "object") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {DAY_KEYS.map((dayKey, di) => {
        const day = plan[dayKey];
        if (!day) return null;
        const isRest = day.duration_min === 0 || day.exercises?.length === 0;
        return (
          <div key={dayKey}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
              📅 {days[di]} — {day.workout_type} {isRest ? "😴" : ""}
            </div>
            {!isRest && (day.exercises || []).map((e, ei) => (
              <div key={ei} style={{ fontSize: 13, lineHeight: 1.7 }}>
                💪 <strong>{e.name}</strong>: {e.detail}
              </div>
            ))}
            {!isRest && day.duration_min > 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                ⏱ {lang === "en" ? "Duration" : "Διάρκεια"}: ~{day.duration_min}{lang === "en" ? "min" : "λεπτά"}
              </div>
            )}
            {di < 6 && <div style={{ borderBottom: "1px solid var(--border-soft)", margin: "6px 0" }} />}
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
        ⚠️ {lang === "en" ? "This information is for guidance only and does not replace a doctor, nutritionist, or trainer." : "Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή."}
      </div>
    </div>
  );
}
const SLOT_ORDER = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"];
const MEAL_METADATA = {
  breakfast: { label: { el: "Πρωινό", en: "Breakfast" }, emoji: "🌅" },
  morning_snack: { label: { el: "Σνακ", en: "Snack" }, emoji: "🍎" },
  lunch: { label: { el: "Μεσημεριανό", en: "Lunch" }, emoji: "🌞" },
  afternoon_snack: { label: { el: "Σνακ", en: "Snack" }, emoji: "🍎" },
  dinner: { label: { el: "Βραδινό", en: "Dinner" }, emoji: "🌙" }
};

function renderMealPlanText(data, lang) {
  const days = DAY_NAMES[lang] || DAY_NAMES.el;
  const plan = data?.weekly_plan || data;
  if (!plan || typeof plan !== "object") return "";
  return DAY_KEYS.map((dayKey, di) => {
    const day = plan[dayKey.toLowerCase()];
    if (!day) return "";
    const meals = SLOT_ORDER.filter(s => day[s]).map(s => {
      const m = day[s];
      const meta = MEAL_METADATA[s] || { label: { el: s, en: s }, emoji: "🍽️" };
      return `${meta.emoji} ${meta.label[lang] || s} — ${m.desc || m.description} (${m.kcal || m.calories}kcal)`;
    }).join("\n");
    const total = day.daily_total || SLOT_ORDER.reduce((sum, s) => sum + (day[s]?.kcal || day[s]?.calories || 0), 0);
    return `📅 ${days[di]}\n${meals}\n${lang === "en" ? "Total" : "Σύνολο"}: ${total}kcal\n─────────────────`;
  }).filter(Boolean).join("\n\n") + `\n\n⚠️ ${lang === "en" ? "This information is for guidance only and does not replace a doctor, nutritionist, or trainer. Consult a specialist if you have conditions, allergies, or take medication." : "Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή. Συμβουλέψου ειδικό αν έχεις νοσήματα, αλλεργίες ή λαμβάνεις φαρμακευτική αγωγή."}`;
}

function MealPlanView({ data, lang }) {
  const days = DAY_NAMES[lang] || DAY_NAMES.el;
  const plan = data?.weekly_plan || data;
  if (!plan || typeof plan !== "object") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {DAY_KEYS.map((dayKey, di) => {
        const day = plan[dayKey.toLowerCase()];
        if (!day) return null;
        return (
          <div key={dayKey}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📅 {days[di]}</div>
            {SLOT_ORDER.map(s => {
              const m = day[s];
              const meta = MEAL_METADATA[s] || { label: { el: s, en: s }, emoji: "🍽️" };
              if (!m) {
                if (["meal_1","meal_2","meal_3","meal_4"].includes(s) && di === 0) return <div key={s} style={{ fontSize: 12, color: "#b91c1c" }}>⚠️ {meta.label[lang]} — {lang === "en" ? "missing" : "λείπει"}</div>;
                return null;
              }
              return (
                <div key={s} style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {meta.emoji} <strong>{meta.label[lang] || s}</strong> — {m.desc || m.description} ({m.kcal || m.calories}kcal)
                </div>
              );
            })}
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
              {lang === "en" ? "Total" : "Σύνολο"}: {day.daily_total || SLOT_ORDER.reduce((sum, s) => sum + (day[s]?.kcal || day[s]?.calories || 0), 0)}kcal
            </div>
            {di < 6 && <div style={{ borderBottom: "1px solid var(--border-soft)", margin: "6px 0" }} />}
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
        ⚠️ {lang === "en" ? "This information is for guidance only and does not replace a doctor, nutritionist, or trainer." : "Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή."}
      </div>
    </div>
  );
}

export default function AiCoach({
  last7Days, dailyLogs, targetCalories, proteinTarget,
  mode, goalType, weightLog, favoriteFoods,
  totalCalories, totalProtein, totalCarbs, totalFat, exerciseValue,
  remainingCalories, macroTargets,
  favoriteExercises, age, weight, height, gender,
  onSavePlan, session, userName, onShowAuth, onShowRegister,
  foodCategories, allergies, cookingLevel, cookingTime, simpleMode,
  mealsPerDay, snacksPerDay,
  fitnessLevel, workoutLocation, equipment, limitations,
  workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories
}) {
  const { t, i18n } = useTranslation();
  const quickQuestions = QUICK_QUESTION_KEYS.map(key => t(key));
  const [messages, setMessages] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("ft_ai_model") || "");
  const [isPaid, setIsPaid] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  const DAILY_LIMIT_FREE = 5;
  const MONTHLY_LIMIT_FREE = 20;
  const LIFETIME_LIMIT_FREE = 20;
  const MONTHLY_LIMIT_PAID = 500;

  const [monthlyCount, setMonthlyCount] = useState(0);
  const [lifetimeCount, setLifetimeCount] = useState(0);

  useEffect(() => {
    const uid = session?.user?.id || "anon";
    const stored = JSON.parse(localStorage.getItem("ft_ai_usage_" + uid) || "{}");
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    setDailyCount(stored.date === today ? (stored.count || 0) : 0);
    setMonthlyCount(stored.month === month ? (stored.monthCount || 0) : 0);
    setLifetimeCount(stored.lifetime || 0);

    if (!session?.user?.id) return;
    supabase
      .from("profiles")
      .select("is_paid, is_demo")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setIsPaid(data?.is_paid === true);
        setIsDemo(data?.is_demo === true);
      })
      .catch(() => {});
    fetch("/.netlify/functions/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: "list-users" }),
    }).then(res => setIsAdmin(res.ok)).catch(() => {});
  }, [session]);

  function incrementUsage() {
    const uid = session?.user?.id || "anon";
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const stored = JSON.parse(localStorage.getItem("ft_ai_usage_" + uid) || "{}");
    const newDaily = dailyCount + 1;
    const newMonthly = (stored.month === month ? (stored.monthCount || 0) : 0) + 1;
    const newLifetime = (stored.lifetime || 0) + 1;
    setDailyCount(newDaily);
    setMonthlyCount(newMonthly);
    setLifetimeCount(newLifetime);
    localStorage.setItem("ft_ai_usage_" + uid, JSON.stringify({ date: today, count: newDaily, month, monthCount: newMonthly, lifetime: newLifetime }));
  }

  const needsAccount = !session;
  const unlimited = isDemo;
  const dailyLimitReached = !unlimited && (isPaid ? dailyCount >= MONTHLY_LIMIT_PAID : dailyCount >= DAILY_LIMIT_FREE);
  const monthlyLimitReached = !unlimited && (isPaid ? monthlyCount >= MONTHLY_LIMIT_PAID : monthlyCount >= MONTHLY_LIMIT_FREE);
  const lifetimeLimitReached = !unlimited && !isPaid && lifetimeCount >= LIFETIME_LIMIT_FREE;
  const paidLimitReached = isPaid && !unlimited && (dailyCount >= MONTHLY_LIMIT_PAID || monthlyCount >= MONTHLY_LIMIT_PAID);
  const limitReached = needsAccount || dailyLimitReached || monthlyLimitReached || lifetimeLimitReached;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(true);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const lastAssistantRef = useRef(null);
  const coachTopRef = useRef(null);

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
    if (last.role === "assistant") {
      setTimeout(() => {
        coachTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (chatRef.current) {
          // Scroll to the assistant response (last message), not the question
          const children = chatRef.current.children;
          const lastEl = children[children.length - 1];
          chatRef.current.scrollTop = lastEl ? lastEl.offsetTop : chatRef.current.scrollHeight;
        }
      }, 200);
    } else {
      const el = chatRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const text = last.text || "";
    if (!text) return;
    const hasMealPlan = (text.includes("Σύνολο:") || text.includes("Total:")) && text.includes("🌅") && text.includes("🌞") && text.includes("🌙");
    const hasTrainingPlan = !hasMealPlan && text.includes("📅") && (
      text.includes("σετ ×") || text.includes("sets ×") || text.includes("sets x") ||
      (text.includes("💪") && (text.includes("λεπτά") || text.includes("min") || text.includes("😴")))
    );
    const dateStr = new Date().toLocaleDateString(i18n.language === "en" ? "en-US" : "el-GR");
    if (hasMealPlan) onSavePlan?.({ type: "meal", content: text, date: dateStr });
    else if (hasTrainingPlan) onSavePlan?.({ type: "training", content: text, date: dateStr });
  }, [messages]);

  function buildMealPlanJSON() {
    const currentMode = MODES[mode] || MODES.balanced;
    const isEn = i18n.language === "en";
    const currentWeight = lastWeight || weight;
    const bmi = currentWeight && height ? Math.round((currentWeight / ((height / 100) ** 2)) * 10) / 10 : null;
    const nSnacks = Number(snacksPerDay) || 0;
    const snackCal = nSnacks > 0 ? Math.round(targetCalories * 0.10) : 0;
    const remainingForMeals = targetCalories - snackCal * nSnacks;
    const breakfastCal = Math.round(remainingForMeals * 0.25);
    const lunchCal = Math.round(remainingForMeals * 0.40);
    const dinnerCal = remainingForMeals - breakfastCal - lunchCal;

    const mealDefs = [
      { slot: "meal_1", role: "Breakfast", target_calories: breakfastCal },
      ...(nSnacks >= 1 ? [{ slot: "meal_2", role: "Morning Snack (~200-300kcal, light: yogurt/fruit/nuts)", target_calories: snackCal }] : []),
      { slot: nSnacks >= 1 ? "meal_3" : "meal_2", role: "Lunch", target_calories: lunchCal },
      ...(nSnacks >= 2 ? [{ slot: "meal_4", role: "Afternoon Snack (~200-300kcal, light: fruit/nuts)", target_calories: snackCal }] : []),
      { slot: nSnacks >= 2 ? "meal_5" : nSnacks >= 1 ? "meal_4" : "meal_3", role: "Dinner", target_calories: dinnerCal }
    ];
    const mealSlots = mealDefs.map(m => m.slot);

    const foodItemLabels = {
      chicken: isEn?"Chicken":"Κοτόπουλο", beef: isEn?"Beef":"Μοσχάρι", pork: isEn?"Pork":"Χοιρινό",
      fish: isEn?"Fish":"Ψάρι", turkey: isEn?"Turkey":"Γαλοπούλα", eggs: isEn?"Eggs":"Αυγά",
      legumes: isEn?"Legumes":"Όσπρια", tofu: isEn?"Tofu":"Τόφου",
      salads: isEn?"Salads":"Σαλάτες", cooked_veggies: isEn?"Cooked veggies":"Μαγειρεμένα λαχανικά", soups: isEn?"Soups":"Σούπες",
      rice: isEn?"Rice":"Ρύζι", pasta: isEn?"Pasta":"Ζυμαρικά", bread: isEn?"Bread":"Ψωμί",
      potatoes: isEn?"Potatoes":"Πατάτες", oats: isEn?"Oats":"Βρώμη",
      yogurt: isEn?"Yogurt":"Γιαούρτι", cheese: isEn?"Cheese":"Τυρί", milk: isEn?"Milk":"Γάλα",
      fruits: isEn?"Fruits":"Φρούτα", nuts_snack: isEn?"Nuts":"Ξηροί καρποί", smoothies: isEn?"Smoothies":"Smoothies"
    };
    const favFoodsList = (favoriteFoods || []).slice(0, 6).map(f => f.name);

    const input = {
      user: { name: userName || "", age: age || null, gender, weight_kg: currentWeight, height_cm: height, bmi },
      goal: goalType,
      nutrition: { calories_target: targetCalories, protein_target_g: proteinTarget, diet_type: currentMode.label, diet_rules: currentMode.aiRule },
      meal_structure: mealDefs,
      preferences: {
        preferred_foods: (foodCategories || []).map(f => foodItemLabels[f] || f),
        favorites: favFoodsList,
        allergies: allergies || [],
        cooking_level: cookingLevel || "",
        cooking_time: cookingTime || "",
        simple_groceries: simpleMode
      },
      language: isEn ? "English" : "Greek"
    };

    const slotRules = mealDefs.map(m => {
      const isSnack = m.role.includes("Snack");
      return `- "${m.slot}": ${isSnack ? "Light_Snack" : m.role} (~${m.target_calories}kcal)${isSnack ? " → ONLY yogurt, fruit, nuts, rice cakes. NO meat/pasta/rice." : ""}`;
    }).join("\n");
    const exampleMeals = mealDefs.map(m => `"${m.slot}":{"desc":"...","kcal":${m.target_calories}}`).join(",");

    const langNote = isEn ? "All desc fields in English." : "All desc fields MUST be in Greek.";
    const systemPrompt = `You are a JSON Diet Generator. You MUST return a JSON object with exactly 7 days.
Each day MUST contain EXACTLY ${mealSlots.length} meal slots: ${mealSlots.join(", ")}.

CONSTRAINTS:
1. meal_2: MUST be a light snack < 250kcal (yogurt, fruit, nuts only). NO meat/pasta.
2. meal_4: MANDATORY. Never omit meal_4.
3. Math: daily_total = ${mealSlots.join(" + ")}.
4. ${langNote}
5. Each slot: "desc" (brief, max 5 words, with grams), "kcal" (integer).
6. No leftovers. Unique meals each day. Respect input data.

Current Target: ${targetCalories}kcal total per day.

CALORIE TARGETS:
${slotRules}

EXAMPLE (monday):
{${exampleMeals},"daily_total":${targetCalories}}`;

    const snackSlots = mealDefs.filter(m => m.role.includes("Snack")).map(m => m.slot);
    return { systemPrompt, userMessage: JSON.stringify(input), mealSlots, snackSlots };
  }

  function buildTrainingPlanJSON() {
    const isEn = i18n.language === "en";
    const currentWeight = lastWeight || weight;
    const bmi = currentWeight && height ? Math.round((currentWeight / ((height / 100) ** 2)) * 10) / 10 : null;

    const equipLabels = {
      dumbbells: isEn?"Dumbbells":"Αλτήρες", bands: isEn?"Resistance bands":"Λάστιχα", full_gym: isEn?"Full gym":"Πλήρες γυμναστήριο",
      pull_up_bar: isEn?"Pull-up bar":"Μπάρα μονόζυγου", kettlebell: isEn?"Kettlebell":"Kettlebell", none: isEn?"No equipment":"Χωρίς εξοπλισμό"
    };

    const input = {
      user: { name: userName || "", age: age || null, gender, weight_kg: currentWeight, height_cm: height, bmi },
      goal: goalType,
      fitness: {
        level: fitnessLevel || "",
        location: workoutLocation || "",
        equipment: (equipment || []).map(e => equipLabels[e] || e),
        frequency: workoutFrequency || "",
        session_duration: sessionDuration || "",
        goals: fitnessGoals || [],
        exercise_categories: exerciseCategories || [],
        limitations: limitations || [],
        favorite_exercises: (favoriteExercises || []).slice(0, 6).map(e => typeof e === "string" ? e : e.name || e)
      },
      language: isEn ? "English" : "Greek"
    };

    const restDayRule = workoutFrequency
      ? (isEn ? `The user wants to train ${workoutFrequency}x per week. Schedule exactly ${workoutFrequency} workout days and ${7 - Number(workoutFrequency)} rest days.` : `Ο χρήστης θέλει να γυμνάζεται ${workoutFrequency}x την εβδομάδα. Βάλε ακριβώς ${workoutFrequency} μέρες προπόνησης και ${7 - Number(workoutFrequency)} μέρες ξεκούρασης.`)
      : (isEn ? "Choose an appropriate number of rest days based on the user's fitness level and goals." : "Επέλεξε κατάλληλο αριθμό ημερών ξεκούρασης βάσει του επιπέδου φυσικής κατάστασης και των στόχων του χρήστη.");

    const systemPrompt = `You are a JSON Training Plan Generator. Return a JSON object with exactly 7 days (monday-sunday).
Each day: "workout_type" (string), "exercises" (array of {name, detail}), "duration_min" (integer).
For rest days: workout_type="${isEn ? "Rest" : "Ξεκούραση"}", exercises=[], duration_min=0.

RULES:
1. ${restDayRule}
2. Each exercise "detail" should include sets × reps or duration (e.g. "3 sets × 12 reps" or "30 min").
3. Respect user's fitness level, equipment, location, and limitations.
4. Vary workout types across the week.
5. ${isEn ? "All text in English." : "All text MUST be in Greek."}
6. Never suggest exercises that could worsen user's limitations.`;

    return { systemPrompt, userMessage: JSON.stringify(input) };
  }

  function buildWeeklyReviewJSON() {
    const isEn = i18n.language === "en";
    const currentMode = MODES[mode] || MODES.balanced;
    const currentWeight = lastWeight || weight;

    const input = {
      user: { name: userName || "", age: age || null, gender, weight_kg: currentWeight, height_cm: height },
      goal: goalType,
      diet: { type: currentMode.label, calories_target: targetCalories, protein_target: proteinTarget },
      last_7_days: last7Days || [],
      weight_log: (weightLog || []).slice(-7),
      language: isEn ? "English" : "Greek"
    };

    const systemPrompt = `You are a fitness coach reviewing the user's weekly progress. Return a JSON object.
Fields: "summary" (1-2 sentences), "score" (1-10 integer), "highlights" (array of {emoji, text} — good things), "improvements" (array of {emoji, text} — areas to improve), "tip" (one actionable tip).

RULES:
1. Be encouraging but honest. Score based on consistency, calorie adherence, and activity.
2. 2-4 highlights and 2-4 improvements.
3. If there are days with zero or no food logging, ALWAYS mention it as an improvement — emphasize that consistent logging is crucial for progress.
4. ${isEn ? "All text in English." : "All text MUST be in Greek."}`;

    return { systemPrompt, userMessage: JSON.stringify(input) };
  }

  function buildMistakesJSON() {
    const isEn = i18n.language === "en";
    const currentMode = MODES[mode] || MODES.balanced;
    const currentWeight = lastWeight || weight;

    const input = {
      user: { name: userName || "", age: age || null, gender, weight_kg: currentWeight, height_cm: height },
      goal: goalType,
      diet: { type: currentMode.label, calories_target: targetCalories, protein_target: proteinTarget },
      last_7_days: last7Days || [],
      language: isEn ? "English" : "Greek"
    };

    const systemPrompt = `You are a strict but constructive fitness coach. Analyze the user's data and identify mistakes. Return a JSON object.
Fields: "issues" (array of {emoji, title, detail, fix}), "doing_right" (array of {emoji, text}), "top_priority" (the #1 most important thing to fix).

RULES:
1. Be specific — reference actual data (days, calories, patterns).
2. Each issue must have a concrete fix.
3. Also mention 1-3 things they're doing right.
4. If there are days with zero or no food logging, ALWAYS flag it as an issue — consistent logging is the #1 priority for progress.
5. ${isEn ? "All text in English." : "All text MUST be in Greek."}`;

    return { systemPrompt, userMessage: JSON.stringify(input) };
  }

  function buildMacroAnalysisJSON() {
    const isEn = i18n.language === "en";
    const currentMode = MODES[mode] || MODES.balanced;

    const input = {
      today: {
        protein_g: Math.round(totalProtein || 0),
        carbs_g: Math.round(totalCarbs || 0),
        fat_g: Math.round(totalFat || 0),
        calories: Math.round(totalCalories || 0)
      },
      targets: {
        protein_g: Math.round(macroTargets?.proteinGrams || proteinTarget || 0),
        carbs_g: Math.round(macroTargets?.carbsGrams || 0),
        fat_g: Math.round(macroTargets?.fatGrams || 0),
        calories: targetCalories
      },
      diet_type: currentMode.label,
      last_7_days: last7Days || [],
      language: isEn ? "English" : "Greek"
    };

    const systemPrompt = `You are a nutrition analyst. Analyze the user's macronutrient intake. Return a JSON object.
Fields: "protein_verdict" (1 sentence about protein), "carbs_verdict" (1 sentence about carbs), "fat_verdict" (1 sentence about fat), "weekly_pattern" (1 sentence about weekly trends), "tip" (one actionable tip to improve balance).

Be specific — reference actual numbers. Keep each field to 1 sentence.
${isEn ? "All text in English." : "All text MUST be in Greek."}`;

    return { systemPrompt, userMessage: JSON.stringify(input) };
  }

  function buildSystemPrompt(taskType = "general") {
    const currentMode = MODES[mode] || MODES.balanced;
    const lang = i18n.language;
    const isEn = lang === "en";
    const goalLabel = goalType === "lose" ? (isEn ? "Weight loss" : "Απώλεια βάρους") :
      goalType === "gain" ? (isEn ? "Muscle gain" : "Μυϊκή ανάπτυξη") :
      goalType === "fitness" ? "Fitness & Cardio" : (isEn ? "Maintenance" : "Διατήρηση");
    const currentWeight = lastWeight || weight;
    const bmi = currentWeight && height
      ? Math.round((currentWeight / ((height / 100) ** 2)) * 10) / 10 : null;

    const today = new Date();
    const dayNames = isEn
      ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      : ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
    const todayName = dayNames[today.getDay()];
    const todayDate = today.toLocaleDateString(isEn ? "en-US" : "el-GR");
    const emptyDays = (last7Days || []).filter(d => d.eaten === 0);

    const weekSummary = (last7Days || []).map((d) => {
      const log = dailyLogs?.[d.date] || { entries: [], exercises: [] };
      const entries = Array.isArray(log.entries) ? log.entries : [];
      const protein = Math.round(entries.reduce((s, item) => s + Number(item.protein || 0), 0));
      const exNames = Array.isArray(log.exercises) && log.exercises.length > 0
        ? log.exercises.map(e => e.name).join(", ") : "—";
      return `  ${d.date}: ${d.eaten === 0 ? (isEn ? "⚠️ No log" : "⚠️ Χωρίς καταγραφή") : d.eaten + "kcal"} P:${protein}g [${exNames}]`;
    }).join("\n");

    const favFoodsList = (favoriteFoods || []).slice(0, 6).map(f => f.name).join(", ");
    const favExList = (favoriteExercises || []).map(e => e.name).join(", ");

    const langInstruction = isEn
      ? `Nutritionist & personal trainer. ALWAYS respond in English. Friendly, practical. Use English day names (Monday, Tuesday...), English food names, English units.${userName ? ` The user's name is ${userName}, address them by name.` : ""}`
      : `Διατροφολόγος & personal trainer. ΠΑΝΤΑ απάντα στα Ελληνικά. Ενικός, φιλικός, πρακτικός. Χρησιμοποίησε ελληνικές ονομασίες ημερών, ελληνικά ονόματα φαγητών. Τα κεφαλαία ελληνικά ΧΩΡΙΣ τόνους (ΔΕΥΤΕΡΑ όχι ΔΕΥΤΈΡΑ). Ημέρες: ΔΕΥΤΕΡΑ, ΤΡΙΤΗ, ΤΕΤΑΡΤΗ, ΠΕΜΠΤΗ, ΠΑΡΑΣΚΕΥΗ, ΣΑΒΒΑΤΟ, ΚΥΡΙΑΚΗ.${userName ? ` Τον χρήστη τον λένε ${userName}, προσφώνησέ τον με το όνομά του.` : ""}`;

    // Preferences strings
    const foodItemLabels = {
      chicken: isEn?"Chicken":"Κοτόπουλο", beef: isEn?"Beef":"Μοσχάρι", pork: isEn?"Pork":"Χοιρινό",
      fish: isEn?"Fish":"Ψάρι", turkey: isEn?"Turkey":"Γαλοπούλα", eggs: isEn?"Eggs":"Αυγά",
      legumes: isEn?"Legumes":"Όσπρια", tofu: isEn?"Tofu":"Τόφου",
      salads: isEn?"Salads":"Σαλάτες", cooked_veggies: isEn?"Cooked veggies":"Μαγειρεμένα λαχανικά", soups: isEn?"Soups":"Σούπες",
      rice: isEn?"Rice":"Ρύζι", pasta: isEn?"Pasta":"Ζυμαρικά", bread: isEn?"Bread":"Ψωμί",
      potatoes: isEn?"Potatoes":"Πατάτες", oats: isEn?"Oats":"Βρώμη",
      yogurt: isEn?"Yogurt":"Γιαούρτι", cheese: isEn?"Cheese":"Τυρί", milk: isEn?"Milk":"Γάλα",
      fruits: isEn?"Fruits":"Φρούτα", nuts_snack: isEn?"Nuts":"Ξηροί καρποί", smoothies: isEn?"Smoothies":"Smoothies",
      grilled: isEn?"Grilled":"Ψητά", oven: isEn?"Oven":"Φούρνου", boiled: isEn?"Boiled":"Βραστά",
      fried: isEn?"Fried":"Τηγανητά", raw: isEn?"Raw":"Ωμά"
    };
    const allergyLabels = { dairy: isEn?"Dairy":"Γαλακτοκομικά", gluten: isEn?"Gluten":"Γλουτένη", nuts: isEn?"Nuts":"Ξηροί καρποί", eggs: isEn?"Eggs":"Αυγά", soy: isEn?"Soy":"Σόγια", shellfish: isEn?"Shellfish":"Οστρακοειδή", fish: isEn?"Fish":"Ψάρι" };
    const levelLabels = { beginner: isEn?"Beginner":"Αρχάριος", intermediate: isEn?"Intermediate":"Μέτριος", advanced: isEn?"Advanced":"Προχωρημένος" };
    const locationLabels = { home: isEn?"Home":"Σπίτι", gym: isEn?"Gym":"Γυμναστήριο", outdoor: isEn?"Outdoor":"Εξωτερικά" };
    const equipLabels = { none: isEn?"None":"Τίποτα", dumbbells: isEn?"Dumbbells":"Αλτήρες", bands: isEn?"Resistance bands":"Λάστιχα", full_gym: isEn?"Full gym":"Πλήρες gym", pull_up_bar: isEn?"Pull-up bar":"Μονόζυγο", kettlebell:"Kettlebell" };
    const cookLabels = { beginner: isEn?"Beginner — simple, quick recipes only":"Αρχάριος — μόνο απλές, γρήγορες συνταγές", intermediate: isEn?"Intermediate — knows basic techniques, moderate complexity":"Μέτριος — ξέρει βασικές τεχνικές, μέτρια πολυπλοκότητα", advanced: isEn?"Advanced — can handle complex recipes":"Προχωρημένος — μπορεί πολύπλοκες συνταγές" };
    const timeLabels = { quick: isEn?"~15min — quick simple meals":"~15 λεπτά — γρήγορα απλά γεύματα", normal: isEn?"~30min — moderate, not too simple or elaborate":"~30 λεπτά — μέτριας πολυπλοκότητας, ούτε πρόχειρα ούτε πολύπλοκα", elaborate: isEn?"60min+ — elaborate complex cooking":"60+ λεπτά — αναλυτικό, πολύπλοκο μαγείρεμα" };

    const foodCatStr = foodCategories?.length ? foodCategories.map(f => foodItemLabels[f] || f).join(", ") : "";
    const allergyStr = allergies?.length ? allergies.map(a => allergyLabels[a] || a).join(", ") : "";
    const cookStr = cookingLevel ? (cookLabels[cookingLevel] || cookingLevel) : "";
    const timeStr = cookingTime ? (timeLabels[cookingTime] || cookingTime) : "";
    const fitStr = fitnessLevel ? (levelLabels[fitnessLevel] || fitnessLevel) : "";
    const locStr = workoutLocation ? (locationLabels[workoutLocation] || workoutLocation) : "";
    const equipStr = equipment?.length ? equipment.map(e => equipLabels[e] || e).join(", ") : "";
    const limStr = limitations || "";
    const freqStr = workoutFrequency ? workoutFrequency + "x/" + (isEn ? "week" : "εβδομάδα") : "";
    const durStr = sessionDuration ? sessionDuration + (isEn ? "min" : "λ") : "";
    const goalLabelsMap = { strength: isEn?"Strength":"Δύναμη", endurance: isEn?"Endurance":"Αντοχή", flexibility: isEn?"Flexibility":"Ευλυγισία", weight_loss: isEn?"Weight loss":"Αδυνάτισμα", muscle: isEn?"Muscle gain":"Μυϊκή μάζα", general: isEn?"General fitness":"Γενική φυσική κατάσταση" };
    const fitGoalStr = fitnessGoals?.length ? fitnessGoals.map(g => goalLabelsMap[g] || g).join(", ") : "";
    const exCatStr = exerciseCategories?.length ? exerciseCategories.join(", ") : "";

    const mealStr = mealsPerDay ? (isEn ? `${mealsPerDay} meals/day` : `${mealsPerDay} γεύματα/μέρα`) + (snacksPerDay ? (isEn ? ` + ${snacksPerDay} snacks` : ` + ${snacksPerDay} σνακ`) : "") : "";

    const foodPrefsLine = (foodCatStr || favFoodsList || allergyStr || cookStr || timeStr || mealStr)
      ? `\n${isEn ? "FOOD PROFILE" : "ΔΙΑΤΡΟΦΙΚΟ ΠΡΟΦΙΛ"}:${foodCatStr ? `\n${isEn?"Prefers":"Προτιμάει"}: ${foodCatStr}` : ""}${favFoodsList ? `\n${isEn?"Favorites":"Αγαπημένα"}: ${favFoodsList}` : ""}${mealStr ? `\n${isEn?"Meals per day":"Γεύματα/μέρα"}: ${mealStr}` : ""}${cookStr ? `\n${isEn?"Cooking skill":"Μαγειρική ικανότητα"}: ${cookStr}` : ""}${timeStr ? `\n${isEn?"Cooking time":"Χρόνος μαγειρέματος"}: ${timeStr}` : ""}${allergyStr ? `\n${isEn?"⚠️ ALLERGIES — NEVER use":"⚠️ ΑΛΛΕΡΓΙΕΣ — ΠΟΤΕ μη χρησιμοποιήσεις"}: ${allergyStr}` : ""}${(foodCatStr || favFoodsList) ? `\n${isEn?"The plan should have variety, not be monotonous, based on the user's preferences and favorites but not limited to them — similar meals can also be included.":"Το πρόγραμμα πρέπει να έχει σχετική ποικιλία, να μην είναι μονότονο, να βασίζεται στις προτιμήσεις και τα αγαπημένα του χρήστη αλλά να μην περιορίζεται σε αυτά, μπορούν να επιλεχθούν και παρόμοια γεύματα."}` : ""}`
      : "";

    const exercisePrefsLine = (fitStr || locStr || equipStr || limStr || freqStr || durStr || fitGoalStr || exCatStr)
      ? `\n${isEn ? "FITNESS PROFILE" : "ΠΡΟΦΙΛ ΓΥΜΝΑΣΤΙΚΗΣ"}: ${fitStr ? (isEn?"Level":"Επίπεδο")+":"+fitStr : ""}${locStr ? " | "+(isEn?"Location":"Τοποθεσία")+":"+locStr : ""}${equipStr ? " | "+(isEn?"Equipment":"Εξοπλισμός")+":"+equipStr : ""}${freqStr ? " | "+(isEn?"Frequency":"Συχνότητα")+":"+freqStr : ""}${durStr ? " | "+(isEn?"Session":"Προπόνηση")+":"+durStr : ""}${fitGoalStr ? " | "+(isEn?"Goals":"Στόχοι")+":"+fitGoalStr : ""}${exCatStr ? " | "+(isEn?"Preferred exercises":"Αγαπημένες ασκήσεις")+":"+exCatStr : ""}${limStr ? "\n"+(isEn?"⚠️ IMPORTANT limitations: ":"⚠️ ΣΗΜΑΝΤΙΚΟΙ περιορισμοί: ")+limStr+(isEn?". Adapt all exercises accordingly. Never suggest exercises that could worsen these conditions.":". Προσάρμοσε όλες τις ασκήσεις ανάλογα. Ποτέ μη προτείνεις ασκήσεις που μπορεί να επιδεινώσουν αυτές τις καταστάσεις.") : ""}`
      : "";

    // === MODULAR BLOCKS — στέλνονται μόνο όπου χρειάζονται ===

    // CORE: πάντα (lang, date, body profile, goal, mode)
    const core = `${langInstruction}
${isEn ? "TODAY" : "ΣΗΜΕΡΑ"}: ${todayName} ${todayDate}
${isEn ? "Age" : "Ηλικία"}:${age||"—"} ${isEn ? "Sex" : "Φύλο"}:${gender==="male"?(isEn?"Male":"Άνδρας"):(isEn?"Female":"Γυναίκα")} ${isEn ? "Height" : "Ύψος"}:${height||"—"}cm ${isEn ? "Weight" : "Βάρος"}:${currentWeight||"—"}kg${bmi?` BMI:${bmi}`:""}${weightTrend?` ${isEn?"Trend":"Τάση"}:${weightTrend}kg`:""}
${isEn ? "Goal" : "Στόχος"}:${goalLabel}`;

    // NUTRITION TARGETS: meal_plan, general
    const nutritionTargets = `\n${isEn ? "Calories" : "Θερμίδες"}:${targetCalories}kcal | ${isEn ? "Protein" : "Πρωτεΐνη"}:${proteinTarget}g/${isEn?"day":"μέρα"}`;

    // TODAY'S INTAKE: general
    const todayIntake = `\n${isEn ? "Today" : "Σήμερα"}: ${totalCalories||0}/${targetCalories}kcal | P:${Math.round(totalProtein||0)}/${proteinTarget}g | ${isEn ? "Exercise" : "Άσκηση"}:${exerciseValue||0}kcal | ${isEn ? "Remaining" : "Υπόλοιπο"}:${remainingCalories||targetCalories}kcal`;

    // WEEK SUMMARY: general μόνο
    const weekBlock = `\n${isEn ? "Week" : "Εβδομάδα"}:\n${weekSummary||"—"}${emptyDays.length>0?`\n⚠️ ${emptyDays.length} ${isEn ? "days without logging" : "μέρες χωρίς καταγραφή"}`:""}`;

    // FOOD CONTEXT: meal_plan, general (NOT training_plan)
    const foodContext = foodPrefsLine;

    // FITNESS CONTEXT: training_plan, general (NOT meal_plan)
    const fitnessContext = `${exercisePrefsLine}${favExList ? `\n${isEn ? "Favorite exercises" : "Αγαπημένες ασκήσεις"}:${favExList}` : ""}`;

    // MODE RULES: πάντα
    const modeBlock = `\n${currentMode.aiRule}`;

    // GENERAL
    const generalRules = isEn ? `
Base food suggestions on the user's food profile, preferences, and diet type. Base exercise suggestions on the fitness profile. If a food clearly conflicts with the diet type, mention it.

FORMAT RULES:
- Answer ONLY the user's question. Do NOT add unrelated topics, weekly plans, macro analysis, or training suggestions unless specifically asked.
- Keep answers concise — bullet points, not paragraphs.
- Use 1-2 sections maximum. Only add more if the question genuinely requires it.` : `
Βάσισε τις προτάσεις φαγητού στο διατροφικό προφίλ και τον τρόπο διατροφής του χρήστη. Βάσισε τις προτάσεις άσκησης στο προφίλ γυμναστικής. Αν κάποιο φαγητό δεν ταιριάζει με τον τρόπο διατροφής, ανέφερέ το.

ΚΑΝΟΝΕΣ FORMAT:
- Απάντα ΜΟΝΟ στην ερώτηση του χρήστη. ΜΗΝ προσθέτεις άσχετα θέματα, εβδομαδιαία πλάνα, ανάλυση μακροθρεπτικών ή προτάσεις γυμναστικής εκτός αν ρωτηθεί συγκεκριμένα.
- Σύντομες απαντήσεις — bullet points, όχι παραγράφους.
- Χρησιμοποίησε 1-2 sections μέγιστο. Πρόσθεσε περισσότερα μόνο αν η ερώτηση το απαιτεί.`;

    // MEAL PLAN
    const simpleRules = simpleMode ? (isEn ? `
IMPORTANT — SIMPLE GROCERIES:
- Maximum 15-18 ingredients for the WHOLE week.
- Repeat meals: same breakfast 4-5 days, 2-3 rotating lunches, 2-3 rotating dinners.
- The user wants a short grocery list and easy organization.` : `
ΣΗΜΑΝΤΙΚΟ — ΛΙΓΑ ΨΩΝΙΑ:
- Μέγιστο 15-18 υλικά για ΟΛΗ την εβδομάδα.
- Επανάλαβε γεύματα: ίδιο πρωινό 4-5 μέρες, 2-3 μεσημεριανά που εναλλάσσονται, 2-3 βραδινά που εναλλάσσονται.
- Ο χρήστης θέλει μικρή λίστα σούπερ μάρκετ και εύκολη οργάνωση.`) : "";

    const dayLabels = isEn
      ? { mon: "MONDAY", tue: "TUESDAY", breakfast: "Breakfast", snack: "Snack", lunch: "Lunch", dinner: "Dinner", total: "Total", rest: "Rest" }
      : { mon: "ΔΕΥΤΕΡΑ", tue: "ΤΡΙΤΗ", breakfast: "Πρωινό", snack: "Σνακ", lunch: "Μεσημεριανό", dinner: "Βραδινό", total: "Σύνολο", rest: "Ανάπαυση" };

    const disclaimer = isEn
      ? "⚠️ This information is for guidance only and does not replace a doctor, nutritionist, or trainer. Consult a specialist if you have conditions, allergies, or take medication."
      : "⚠️ Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή. Συμβουλέψου ειδικό αν έχεις νοσήματα, αλλεργίες ή λαμβάνεις φαρμακευτική αγωγή.";
    const askChange = isEn ? `Then ask: "Want me to change anything?"` : `Μετά ρώτα: "Θέλεις να αλλάξω κάτι;"`;

    const ingredientRules = isEn ? `
INGREDIENT RULES (do not mention these in your answer):
- Before writing the plan, pick maximum ${simpleMode ? "18" : "28"} different ingredients for the whole week. Do not exceed ${simpleMode ? "18" : "30"}.
- The plan should have variety, but controlled and practical for grocery shopping.
- DO NOT use the exact same lunch or exact same dinner every day.
- Variety should be balanced across main proteins, sides, and vegetables.
- DO NOT mention the ingredients or their count in your answer.
- BEFORE giving the final answer, count the unique ingredients for the week and if more than ${simpleMode ? "18" : "25"}, remove or merge until ${simpleMode ? "18" : "25"} or fewer.
- Treat similar ingredients as one where possible (e.g. tomato and cherry tomatoes, same fish category, same bread/rice/yogurt type) to keep the grocery list short and practical.
- Write a short 1-2 line intro about the goal, then start with 📅 ${dayLabels.mon}.` : `
ΚΑΝΟΝΕΣ ΥΛΙΚΩΝ (μην τους αναφέρεις στην απάντηση):
- Πριν γράψεις το πρόγραμμα, επέλεξε μέγιστο ${simpleMode ? "18" : "28"} διαφορετικά υλικά συνολικά για όλη την εβδομάδα. Μην ξεπερνάς τα ${simpleMode ? "18" : "30"}.
- Το πρόγραμμα πρέπει να έχει ποικιλία, αλλά ελεγχόμενη και πρακτική για σούπερ μάρκετ.
- ΜΗΝ βάζεις το ίδιο ακριβώς μεσημεριανό ή το ίδιο ακριβώς βραδινό κάθε μέρα.
- Η ποικιλία πρέπει να είναι μοιρασμένη ισορροπημένα σε κύριες πρωτεΐνες, συνοδευτικά και λαχανικά.
- ΜΗΝ αναφέρεις τα υλικά ή τον αριθμό τους στην απάντησή σου.
- ΠΡΙΝ δώσεις την τελική απάντηση, μέτρα τα μοναδικά υλικά της εβδομάδας και αν είναι πάνω από ${simpleMode ? "18" : "25"}, αφαίρεσε ή συγχώνευσε υλικά μέχρι να γίνουν ${simpleMode ? "18" : "25"} ή λιγότερα.
- Θεώρησε παρόμοια υλικά ως ένα όπου γίνεται (π.χ. ντομάτα και ντοματίνια, ίδια κατηγορία ψαριού, ίδιο είδος ψωμιού/ρυζιού/γιαουρτιού) ώστε η λίστα σούπερ μάρκετ να μένει σύντομη και πρακτική.
- Γράψε σύντομη εισαγωγική πρόταση 1-2 γραμμών μόνο για τον στόχο, μετά ξεκίνα με 📅 ΔΕΥΤΕΡΑ.`;

    const mealPlanFormat = `
${isEn ? "Create a weekly meal plan. Every meal must be a fresh meal — NEVER suggest leftovers from a previous day." : "Δώσε εβδομαδιαίο πρόγραμμα διατροφής. Κάθε γεύμα πρέπει να είναι φρέσκο — ΠΟΤΕ μην προτείνεις υπολείμματα (leftovers) από προηγούμενη μέρα."}
⚠️ ${isEn ? `CALORIE TARGET: Each day must total ${targetCalories}kcal (±100). Do NOT retry or correct yourself — get it right the first time by planning portions carefully.` : `ΣΤΟΧΟΣ ΘΕΡΜΙΔΩΝ: Κάθε μέρα πρέπει να έχει σύνολο ${targetCalories}kcal (±100). ΜΗΝ ξαναδοκιμάσεις ή διορθώσεις τον εαυτό σου — κάνε το σωστά από την πρώτη φορά σχεδιάζοντας σωστά τις μερίδες.`}
${mealsPerDay ? (() => {
  const mealNames = isEn
    ? [`🌅 ${dayLabels.breakfast}`, `🌞 ${dayLabels.lunch}`, `🌙 ${dayLabels.dinner}`].slice(0, Number(mealsPerDay))
    : [`🌅 ${dayLabels.breakfast}`, `🌞 ${dayLabels.lunch}`, `🌙 ${dayLabels.dinner}`].slice(0, Number(mealsPerDay));
  const snackNames = Number(snacksPerDay) > 0
    ? Array(Number(snacksPerDay)).fill(`🍎 ${dayLabels.snack}`)
    : [];
  const allNames = [...mealNames, ...snackNames].join(", ");
  return isEn
    ? `Each day has EXACTLY: ${allNames}. NOTHING else — do NOT add or remove meals.`
    : `Κάθε μέρα έχει ΑΚΡΙΒΩΣ: ${allNames}. ΤΙΠΟΤΑ άλλο — ΜΗΝ προσθέσεις ούτε αφαιρέσεις γεύματα.`;
})() : ""}${simpleRules}${ingredientRules}
${(() => {
  const nMeals = Number(mealsPerDay) || 3;
  const nSnacks = Number(snacksPerDay) || 0;
  const snackCal = nSnacks > 0 ? Math.round(targetCalories * 0.10) : 0;
  const mealCal = Math.round((targetCalories - snackCal * nSnacks) / nMeals);
  const breakfastCal = Math.round(mealCal * 0.8);
  const lunchCal = Math.round(mealCal * 1.15);
  const dinnerCal = targetCalories - breakfastCal - lunchCal - snackCal * nSnacks;
  return `${isEn ? "MANDATORY format — ALWAYS emojis. Each meal MUST hit its calorie target:" : "ΥΠΟΧΡΕΩΤΙΚΟ format — ΠΑΝΤΑ emojis. Κάθε γεύμα ΠΡΕΠΕΙ να πιάνει τον στόχο θερμίδων:"}

📅 ${dayLabels.mon}
🌅 ${dayLabels.breakfast} — [${isEn ? "meal with portions in grams" : "γεύμα με μερίδες σε γραμμάρια"}] (~${breakfastCal}kcal)
${nSnacks >= 1 ? `🍎 ${dayLabels.snack} — [${isEn ? "snack with portions" : "σνακ με μερίδες"}] (~${snackCal}kcal)\n` : ""}🌞 ${dayLabels.lunch} — [${isEn ? "meal with portions in grams" : "γεύμα με μερίδες σε γραμμάρια"}] (~${lunchCal}kcal)
${nSnacks >= 2 ? `🍎 ${dayLabels.snack} — [${isEn ? "snack with portions" : "σνακ με μερίδες"}] (~${snackCal}kcal)\n` : ""}🌙 ${dayLabels.dinner} — [${isEn ? "meal with portions in grams" : "γεύμα με μερίδες σε γραμμάρια"}] (~${dinnerCal}kcal)
${dayLabels.total}: ${targetCalories}kcal`;
})()}
─────────────────

(${isEn ? "Repeat this format for each day Monday to Sunday, with ───────────────── between days." : "Επανάλαβε αυτό το format για κάθε μέρα Δευτέρα έως Κυριακή, με ───────────────── μεταξύ των ημερών."})
${isEn ? "AT THE END copy-paste this disclaimer EXACTLY as-is, do NOT translate it" : "ΣΤΟ ΤΕΛΟΣ αντέγραψε αυτό το disclaimer ΑΚΡΙΒΩΣ όπως είναι, ΜΗΝ το μεταφράσεις"}:
${disclaimer}
${askChange}`;

    // TRAINING PLAN
    const tpRestRule = workoutFrequency
      ? (isEn ? `Train ${workoutFrequency}x/week, ${7 - Number(workoutFrequency)} rest days.` : `Προπόνηση ${workoutFrequency}x/εβδομάδα, ${7 - Number(workoutFrequency)} μέρες ξεκούρασης.`)
      : (isEn ? "Choose rest days based on fitness level." : "Επέλεξε μέρες ξεκούρασης βάσει επιπέδου.");

    const trainingPlanFormat = isEn ? `
Create a weekly training plan. Consider favorite exercises. ${tpRestRule}
MANDATORY format — ALWAYS emojis:

📅 ${dayLabels.mon} — [workout type]
09:00 💪 [Exercise]: [sets × reps]
Duration: ~[X]min

📅 ${dayLabels.tue} — ${dayLabels.rest} 😴
(Monday to Sunday)
AT THE END copy-paste this disclaimer EXACTLY as-is, do NOT translate it:
${disclaimer}
${askChange}` : `
Δώσε εβδομαδιαίο πρόγραμμα γυμναστικής. Λάβε υπόψη αγαπημένες ασκήσεις. ${tpRestRule}
ΥΠΟΧΡΕΩΤΙΚΟ format — ΠΑΝΤΑ emojis:

📅 ΔΕΥΤΕΡΑ — [τύπος προπόνησης]
09:00 💪 [Άσκηση]: [σετ × επαναλήψεις]
Διάρκεια: ~[X]λεπτά

📅 ΤΡΙΤΗ — Ανάπαυση 😴
(Δευτέρα έως Κυριακή)
ΣΤΟ ΤΕΛΟΣ αντέγραψε αυτό το disclaimer ΑΚΡΙΒΩΣ όπως είναι, ΜΗΝ το μεταφράσεις:
${disclaimer}
${askChange}`;

    // meal_plan: food prefs + targets, NO fitness/week
    if (taskType === "meal_plan") return core + nutritionTargets + foodContext + modeBlock + mealPlanFormat;
    // training_plan: fitness prefs, NO food/targets/week/mode
    if (taskType === "training_plan") return core + fitnessContext + trainingPlanFormat;
    // initial auto-load: everything (weekly analysis)
    if (taskType === "initial") return core + `\n--- ${isEn ? "NUTRITION" : "ΔΙΑΤΡΟΦΗ"} ---` + nutritionTargets + modeBlock + todayIntake + foodContext + `\n--- ${isEn ? "EXERCISE" : "ΑΣΚΗΣΗ"} ---` + fitnessContext + `\n--- ${isEn ? "HISTORY" : "ΙΣΤΟΡΙΚΟ"} ---` + weekBlock + generalRules;
    // general chat: light context only — food/fitness profiles go to dedicated plan builders
    return core + nutritionTargets + modeBlock + todayIntake + generalRules;
  }

  function buildMessages(chatMessage) {
    // Skip auto-load, preset button clicks, and JSON-mode responses — they're not conversational context
    const history = messages.filter(msg => msg.text && !msg.isAutoLoad && !msg.isPreset && !msg.msgType).map(msg => ({ role: msg.role, content: msg.text }));
    if (chatMessage) history.push({ role: "user", content: chatMessage });
    return history;
  }

  async function sendMessage(messageText) {
    const text = (messageText || input).trim();
    if (!text && hasLoaded) return;
    if (loading) return;
    if (limitReached) return;
    setLoading(true);
    setChatExpanded(true);
    coachTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    incrementUsage();
    const currentMode = MODES[mode] || MODES.balanced;
    const isInitial = !text && !hasLoaded;
    const isMealPlan = text === t("aiCoach.q1");
    const isTrainingPlan = text === t("aiCoach.q2");
    const isWeeklyReview = text === t("aiCoach.q3");
    const isMistakes = text === t("aiCoach.q4");
    const isMacroAnalysis = text === t("aiCoach.q5");
    const isPreset = isMealPlan || isTrainingPlan || isWeeklyReview || isMistakes || isMacroAnalysis;

    if (text) { setMessages(prev => [...prev, { role: "user", text, ...(isPreset && { isPreset: true }) }]); setInput(""); }
    const taskType = isInitial ? "initial" : isMealPlan ? "meal_plan" : isTrainingPlan ? "training_plan" : isWeeklyReview ? "weekly_review" : isMistakes ? "mistakes" : isMacroAnalysis ? "macro_analysis" : "general";

    const isEn = i18n.language === "en";
    let effectiveMessage;
    if (isInitial) {
      effectiveMessage = isEn
        ? `Look at my data:\n1. What to eat for the rest of the day (${currentMode.label} diet, ${targetCalories}kcal)\n2. Flag any empty days\n3. Should I exercise today\n4. One thing I'm doing wrong\n5. Ask me something`
        : `Κοίτα τα δεδομένα μου:\n1. Τι να φάω για την υπόλοιπη μέρα (διατροφή ${currentMode.label}, ${targetCalories}kcal)\n2. Αν υπάρχουν άδειες μέρες επισήμανέ το\n3. Αν πρέπει να γυμναστώ σήμερα\n4. Ένα πράγμα που κάνω λάθος\n5. Ρώτα με κάτι`;
    } else if (isMealPlan) {
      effectiveMessage = isEn
        ? `Create a weekly meal plan for 7 days (Monday-Sunday). Start immediately with the plan, do NOT ask questions first. Include ALL meals${Number(snacksPerDay) > 0 ? " AND snacks" : ""} as specified in the format.`
        : `Δώσε εβδομαδιαίο πρόγραμμα διατροφής 7 ημερών (Δευτέρα-Κυριακή). Ξεκίνα ΑΜΕΣΑ με το πρόγραμμα, ΜΗΝ κάνεις ερωτήσεις πρώτα. Συμπερίλαβε ΟΛΑ τα γεύματα${Number(snacksPerDay) > 0 ? " ΚΑΙ τα σνακ" : ""} όπως ορίζονται στο format.`;
    } else if (isTrainingPlan) {
      effectiveMessage = isEn
        ? `Create a weekly training plan for 7 days (Monday-Sunday). Start immediately with the plan, do NOT ask questions first. MANDATORY format with 📅 💪 😴.`
        : `Δώσε εβδομαδιαίο πρόγραμμα γυμναστικής 7 ημερών (Δευτέρα-Κυριακή). Ξεκίνα ΑΜΕΣΑ με το πρόγραμμα, ΜΗΝ κάνεις ερωτήσεις πρώτα. ΥΠΟΧΡΕΩΤΙΚΑ format με 📅 💪 😴.`;
    } else {
      effectiveMessage = text;
    }

    try {
      const startTime = Date.now();
      let reqBody;
      if (isMealPlan) {
        const { userMessage } = buildMealPlanJSON();
        const isEn = i18n.language === "en";
        const inputData = JSON.parse(userMessage);
        const nSnacks = Number(snacksPerDay) || 0;
        const snackCal = nSnacks > 0 ? Math.round(targetCalories * 0.10) : 0;
        const mealsCal = targetCalories - snackCal * nSnacks;
        const breakfastCal = Math.round(mealsCal * 0.25);
        const lunchCal = Math.round(mealsCal * 0.40);
        const dinnerCal = mealsCal - breakfastCal - lunchCal;
        const mealsInput = {
          ...inputData,
          nutrition: { ...inputData.nutrition, calories_target: mealsCal },
          meal_structure: [
            { slot: "meal_1", role: "Breakfast", target_calories: breakfastCal },
            { slot: "meal_2", role: "Lunch", target_calories: lunchCal },
            { slot: "meal_3", role: "Dinner", target_calories: dinnerCal }
          ]
        };

        // Call 1: 3 main meals × 7 days
        const mealsPrompt = `You are a JSON Diet Generator. Return a JSON object with 7 days (monday-sunday).
Each day has EXACTLY 3 meals: meal_1 (Breakfast), meal_2 (Lunch), meal_3 (Dinner), and daily_total.
Each meal: "desc" (brief, with grams), "kcal" (integer).

CALORIE TARGETS (MANDATORY - each meal MUST match these):
- "meal_1": Breakfast (~${breakfastCal}kcal)
- "meal_2": Lunch (~${lunchCal}kcal)
- "meal_3": Dinner (~${dinnerCal}kcal)
- daily_total: ${mealsCal}

No leftovers. Unique meals each day. Respect input data.
${isEn ? "Food names in English." : "All desc fields MUST be in Greek."}`;

        const mealsReq = {
          systemPrompt: mealsPrompt,
          messages: [{ role: "user", content: JSON.stringify(mealsInput) }],
          ...(selectedModel && { model: selectedModel }),
          jsonMode: true,
          mealSlots: ["meal_1", "meal_2", "meal_3"],
          snackSlots: [],
          schemaDays: DAY_KEYS
        };

        // Call 2: snacks (only if user wants snacks)
        let snacksReq = null;
        const snackSlotNames = [];
        if (nSnacks > 0) {
          for (let i = 1; i <= nSnacks; i++) snackSlotNames.push(`snack_${i}`);
          const snackSlotRules = snackSlotNames.map((s, i) => `- "${s}": ${i === 0 ? "Morning" : "Afternoon"} Snack (~${snackCal}kcal)`).join("\n");
          const currentMode = MODES[mode] || MODES.balanced;
          const snacksPrompt = `You are a JSON Snack Generator. Return a JSON object with 7 keys (monday-sunday).
Each day has EXACTLY ${nSnacks} snack slot(s): ${snackSlotNames.join(", ")}.
Each slot: "desc" (brief, with grams), "kcal" (integer).

SNACK TARGETS:
${snackSlotRules}

Each snack MUST be ~${snackCal}kcal. Light in-between meal.
Follow the user's diet type strictly. Respect allergies and preferences.
${isEn ? "Food names in English." : "All desc fields MUST be in Greek."}`;

          snacksReq = {
            systemPrompt: snacksPrompt,
            messages: [{ role: "user", content: JSON.stringify({ preferences: inputData.preferences, nutrition: { snack_calories: snackCal, diet_type: currentMode.label, diet_rules: currentMode.aiRule }, language: inputData.language }) }],
            ...(selectedModel && { model: selectedModel }),
            jsonMode: true,
            mealSlots: snackSlotNames,
            snackSlots: [],
            schemaDays: DAY_KEYS
          };
        }

        // Execute in parallel
        const fetches = [
          fetch("/.netlify/functions/ai-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mealsReq) })
        ];
        if (snacksReq) fetches.push(fetch("/.netlify/functions/ai-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snacksReq) }));

        const responses = await Promise.all(fetches);
        if (responses.some(r => !r.ok)) throw new Error("Connection error");
        const results = await Promise.all(responses.map(r => r.json()));
        if (results.some(r => r.error)) throw new Error(results.find(r => r.error)?.error);

        const [mealsData, snacksData] = results;

        // Parse meals
        let meals = null;
        try { const raw = typeof mealsData.advice === "string" ? JSON.parse(mealsData.advice) : mealsData.advice; meals = raw?.weekly_plan || raw; } catch { /* */ }

        // Parse snacks
        let snacks = null;
        if (snacksData) {
          try {
            const raw = typeof snacksData.advice === "string" ? JSON.parse(snacksData.advice) : snacksData.advice;
            let result = raw?.weekly_plan || raw;
            snacks = result?.monday ? result : null;
          } catch { /* snack parse failed */ }
        }

        // Merge: meals + snacks → unified day structure
        const merged = {};
        DAY_KEYS.forEach(day => {
          const dm = meals?.[day];
          if (!dm) return;
          const sn = snacks?.[day];
          let snackTotal = 0;
          const snackEntries = {};
          if (sn) {
            if (sn.snack_1) { snackEntries.morning_snack = sn.snack_1; snackTotal += sn.snack_1.kcal || 0; }
            if (sn.snack_2) { snackEntries.afternoon_snack = sn.snack_2; snackTotal += sn.snack_2.kcal || 0; }
            // Fallback: if snack response is flat {desc, kcal} without snack_1/snack_2
            if (!sn.snack_1 && sn.desc) { snackEntries.morning_snack = sn; snackTotal += sn.kcal || 0; }
          }
          merged[day] = {
            breakfast: dm.meal_1,
            ...snackEntries,
            lunch: dm.meal_2,
            dinner: dm.meal_3,
            daily_total: (dm.meal_1?.kcal || 0) + snackTotal + (dm.meal_2?.kcal || 0) + (dm.meal_3?.kcal || 0)
          };
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const hasContent = merged.monday;

        if (hasContent) {
          const parsed = { weekly_plan: merged };
          const dateStr = new Date().toLocaleDateString(isEn ? "en-US" : "el-GR");
          const textVersion = renderMealPlanText(parsed, i18n.language);
          onSavePlan?.({ type: "meal", content: textVersion, date: dateStr });
          const totalIn = (mealsData.usage?.inputTokens || 0) + (snacksData?.usage?.inputTokens || 0);
          const totalOut = (mealsData.usage?.outputTokens || 0) + (snacksData?.usage?.outputTokens || 0);
          const totalCost = (mealsData.usage?.costUsd || 0) + (snacksData?.usage?.costUsd || 0);
          setMessages(prev => [...prev, { role: "assistant", mealPlanData: parsed, text: textVersion, msgType: "meal_plan_json", elapsed, usage: { inputTokens: totalIn, outputTokens: totalOut, costUsd: Math.round(totalCost * 10000) / 10000, model: mealsData.usage?.model || "" } }]);
        } else {
          const isEn2 = i18n.language === "en";
          setMessages(prev => [...prev, { role: "assistant", text: isEn2 ? "⚠️ The meal plan could not be generated. Please try again." : "⚠️ Το πρόγραμμα διατροφής δεν ολοκληρώθηκε. Δοκίμασε ξανά.", error: true, elapsed, usage: mealsData.usage }]);
        }
        setHasLoaded(true);
        return;
      } else if (isTrainingPlan) {
        // Training plan — JSON mode
        const { systemPrompt: tpPrompt, userMessage: tpInput } = buildTrainingPlanJSON();
        const tpReq = {
          systemPrompt: tpPrompt,
          messages: [{ role: "user", content: tpInput }],
          ...(selectedModel && { model: selectedModel }),
          jsonMode: true,
          customSchema: TRAINING_SCHEMA
        };
        const tpResponse = await fetch("/.netlify/functions/ai-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tpReq) });
        if (!tpResponse.ok) throw new Error(`Connection error (${tpResponse.status})`);
        const tpData = await tpResponse.json();
        if (tpData.error) throw new Error(tpData.error);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        let trainingPlan = null;
        try {
          const raw = typeof tpData.advice === "string" ? JSON.parse(tpData.advice) : tpData.advice;
          trainingPlan = raw?.weekly_plan || raw;
        } catch { /* parse failed */ }

        if (trainingPlan?.monday) {
          const parsed = { weekly_plan: trainingPlan };
          const dateStr = new Date().toLocaleDateString(isEn ? "en-US" : "el-GR");
          const textVersion = renderTrainingPlanText(parsed, i18n.language);
          onSavePlan?.({ type: "training", content: textVersion, date: dateStr });
          setMessages(prev => [...prev, { role: "assistant", trainingPlanData: parsed, text: textVersion, msgType: "training_plan_json", elapsed, usage: tpData.usage }]);
        } else {
          const isEn2 = i18n.language === "en";
          setMessages(prev => [...prev, { role: "assistant", text: isEn2 ? "⚠️ The training plan could not be generated. Please try again." : "⚠️ Το πρόγραμμα γυμναστικής δεν ολοκληρώθηκε. Δοκίμασε ξανά.", error: true, elapsed, usage: tpData.usage }]);
        }
        setHasLoaded(true);
        return;
      } else if (isWeeklyReview || isMistakes) {
        // Weekly review / Mistakes — JSON mode
        const { systemPrompt: rPrompt, userMessage: rInput } = isWeeklyReview ? buildWeeklyReviewJSON() : buildMistakesJSON();
        const rReq = {
          systemPrompt: rPrompt,
          messages: [{ role: "user", content: rInput }],
          ...(selectedModel && { model: selectedModel }),
          jsonMode: true,
          customSchema: isWeeklyReview ? WEEKLY_REVIEW_SCHEMA : MISTAKES_SCHEMA
        };
        const rResponse = await fetch("/.netlify/functions/ai-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rReq) });
        if (!rResponse.ok) throw new Error(`Connection error (${rResponse.status})`);
        const rData = await rResponse.json();
        if (rData.error) throw new Error(rData.error);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        let reviewData = null;
        try {
          const raw = typeof rData.advice === "string" ? JSON.parse(rData.advice) : rData.advice;
          // Unwrap if model added wrapper key
          if (raw && typeof raw === "object") {
            const keys = Object.keys(raw);
            if (keys.length === 1 && typeof raw[keys[0]] === "object" && !Array.isArray(raw[keys[0]])) {
              reviewData = raw[keys[0]];
            } else {
              reviewData = raw;
            }
          }
        } catch { /* parse failed */ }

        if (reviewData && typeof reviewData === "object" && Object.keys(reviewData).length > 0) {
          setMessages(prev => [...prev, { role: "assistant", reviewData, msgType: isWeeklyReview ? "weekly_review_json" : "mistakes_json", elapsed, usage: rData.usage }]);
        } else {
          const isEn2 = i18n.language === "en";
          setMessages(prev => [...prev, { role: "assistant", text: isEn2 ? "⚠️ Could not generate analysis. Please try again." : "⚠️ Δεν ήταν δυνατή η ανάλυση. Δοκίμασε ξανά.", error: true, elapsed, usage: rData.usage }]);
        }
        setHasLoaded(true);
        return;
      } else if (isMacroAnalysis) {
        // Macro analysis — widget + AI insight
        const { systemPrompt: maPrompt, userMessage: maInput } = buildMacroAnalysisJSON();
        const maReq = {
          systemPrompt: maPrompt,
          messages: [{ role: "user", content: maInput }],
          ...(selectedModel && { model: selectedModel }),
          jsonMode: true,
          customSchema: MACRO_INSIGHT_SCHEMA
        };
        const maResponse = await fetch("/.netlify/functions/ai-coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(maReq) });
        if (!maResponse.ok) throw new Error(`Connection error (${maResponse.status})`);
        const maData = await maResponse.json();
        if (maData.error) throw new Error(maData.error);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        let aiInsight = null;
        try {
          const raw = typeof maData.advice === "string" ? JSON.parse(maData.advice) : maData.advice;
          aiInsight = raw && typeof raw === "object" ? raw : null;
        } catch { /* parse failed */ }

        const macros = { protein: totalProtein || 0, carbs: totalCarbs || 0, fat: totalFat || 0 };
        const targets = { protein: macroTargets?.proteinGrams || proteinTarget || 0, carbs: macroTargets?.carbsGrams || 0, fat: macroTargets?.fatGrams || 0 };
        setMessages(prev => [...prev, { role: "assistant", macroData: { macros, targets, aiInsight }, msgType: "macro_analysis_json", elapsed, usage: maData.usage }]);
        setHasLoaded(true);
        return;
      } else {
        reqBody = {
          systemPrompt: buildSystemPrompt(taskType),
          messages: buildMessages(effectiveMessage),
          ...(selectedModel && { model: selectedModel }),
          ...(taskType === "general" && { jsonMode: true, customSchema: CHAT_RESPONSE_SCHEMA })
        };
      }
      const response = await fetch("/.netlify/functions/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      if (!response.ok) throw new Error(`Connection error (${response.status})`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (taskType === "general") {
        let chatData = null;
        try {
          const raw = typeof data.advice === "string" ? JSON.parse(data.advice) : data.advice;
          chatData = raw?.sections?.length ? raw : null;
        } catch { /* parse failed */ }

        if (chatData) {
          setMessages(prev => [...prev, { role: "assistant", chatData, msgType: "chat_json", elapsed, usage: data.usage }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: data.advice, elapsed, usage: data.usage }]);
        }
      } else if (taskType === "initial") {
        setMessages(prev => [...prev, { role: "assistant", text: data.advice, isAutoLoad: true, elapsed, usage: data.usage }]);
      }
      setHasLoaded(true);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `❌ ${err.message || "Δεν ήταν δυνατή η σύνδεση."}`, error: true }]);
    } finally { setLoading(false); }
  }

  return (
    <div ref={coachTopRef} style={{ scrollMarginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>🤖 {t("aiCoach.title")}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span className="muted" style={{ fontSize: 12 }}>{t("aiCoach.subtitle")}</span>
            {isAdmin && (
              <select value={selectedModel} onChange={(e) => { setSelectedModel(e.target.value); localStorage.setItem("ft_ai_model", e.target.value); }}
                style={{ fontSize: 10, padding: "2px 4px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-soft)", color: "var(--text-muted)", cursor: "pointer" }}>
                <option value="">Gemini 2.5 Flash Lite (default) — $0.10/$0.40</option>
                <option value="gemini-3.1">Gemini 3.1 Flash Lite (preview) — $0.10/$1.50</option>
                <option value="gemini-flash">Gemini 2.5 Flash — $0.30/$2.50</option>
                <option value="haiku">Claude Haiku 4.5 (Direct) — $1/$5</option>
                <option value="haiku-openrouter">Claude Haiku 4.5 (OpenRouter) — $1/$5</option>
                <option value="gpt4o-mini">GPT-4o Mini — $0.15/$0.60</option>
              </select>
            )}
          </div>
        </div>
      </div>
      {hasLoaded && messages.length > 0 && !loading && (
        <div style={{ textAlign: "right", marginBottom: 6 }}>
          <button type="button" onClick={() => setChatExpanded(prev => !prev)}
            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
            {chatExpanded ? "▲" : "▼"}
          </button>
        </div>
      )}

      {limitReached && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{needsAccount ? "🔒" : paidLimitReached ? "📊" : lifetimeLimitReached ? "🚀" : "⏳"}</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            {needsAccount ? t("aiCoach.needsAccountTitle")
              : paidLimitReached ? t("aiCoach.paidLimitTitle")
              : lifetimeLimitReached ? t("aiCoach.lifetimeLimitTitle")
              : t("aiCoach.limitTitle")}
          </div>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            {needsAccount
              ? t("aiCoach.needsAccountDesc")
              : paidLimitReached
              ? t("aiCoach.paidLimitDesc", { limit: MONTHLY_LIMIT_PAID })
              : lifetimeLimitReached
              ? t("aiCoach.lifetimeLimitDesc", { limit: LIFETIME_LIMIT_FREE })
              : monthlyLimitReached
              ? t("aiCoach.monthlyLimitDesc", { limit: MONTHLY_LIMIT_FREE })
              : t("aiCoach.limitDesc", { limit: DAILY_LIMIT_FREE })}
          </div>
          {paidLimitReached && (
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, margin: "16px 0" }}>
              {t("aiCoach.paidLimitExtra")}
            </div>
          )}
          {!needsAccount && !isPaid && (lifetimeLimitReached || monthlyLimitReached) && (
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, margin: "16px 0" }}>
              {t("aiCoach.upgradeHint")}
            </div>
          )}
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
          {(!foodCategories?.length || !fitnessLevel) && (
            <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>
              💡 <strong>{t("aiCoach.prefsHintTitle")}</strong>{"\n"}{t("aiCoach.prefsHintDesc")}
            </div>
          )}
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
        <div>
          <div ref={chatRef} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8, maxHeight: chatExpanded ? 500 : 150, overflowY: "auto", overflowX: "hidden", paddingRight: 4, scrollbarWidth: "thin", scrollbarColor: "var(--border-color) transparent", transition: "max-height 0.3s ease", position: "relative" }}>
            {messages.map((msg, i) => (
            <div key={i} ref={msg.role === "assistant" && i === messages.length - 1 ? lastAssistantRef : null} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              {msg.msgType === "meal_plan_json" && msg.mealPlanData ? (
                <div style={{ maxWidth: "95%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, lineHeight: 1.7, width: "100%" }}>
                  <MealPlanView data={msg.mealPlanData} lang={i18n.language} />
                  {isAdmin && msg.elapsed && !msg.error && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
                      ⏱ {msg.elapsed}s{msg.usage ? ` · in:${msg.usage.inputTokens} out:${msg.usage.outputTokens} · ${msg.usage.costUsd ? (msg.usage.costUsd * 100).toFixed(2) + "¢" : "—"}${msg.usage.model ? ` · ${msg.usage.model}` : ""}` : ""}
                    </div>
                  )}
                </div>
              ) : msg.msgType === "training_plan_json" && msg.trainingPlanData ? (
                <div style={{ maxWidth: "95%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, lineHeight: 1.7, width: "100%" }}>
                  <TrainingPlanView data={msg.trainingPlanData} lang={i18n.language} />
                  {isAdmin && msg.elapsed && !msg.error && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
                      ⏱ {msg.elapsed}s{msg.usage ? ` · in:${msg.usage.inputTokens} out:${msg.usage.outputTokens} · ${msg.usage.costUsd ? (msg.usage.costUsd * 100).toFixed(2) + "¢" : "—"}${msg.usage.model ? ` · ${msg.usage.model}` : ""}` : ""}
                    </div>
                  )}
                </div>
              ) : (msg.msgType === "weekly_review_json" || msg.msgType === "mistakes_json") && msg.reviewData ? (
                <div style={{ maxWidth: "95%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, lineHeight: 1.7, width: "100%" }}>
                  {msg.msgType === "weekly_review_json" ? <WeeklyReviewView data={msg.reviewData} lang={i18n.language} /> : <MistakesReviewView data={msg.reviewData} lang={i18n.language} />}
                  {isAdmin && msg.elapsed && !msg.error && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
                      ⏱ {msg.elapsed}s{msg.usage ? ` · in:${msg.usage.inputTokens} out:${msg.usage.outputTokens} · ${msg.usage.costUsd ? (msg.usage.costUsd * 100).toFixed(2) + "¢" : "—"}${msg.usage.model ? ` · ${msg.usage.model}` : ""}` : ""}
                    </div>
                  )}
                </div>
              ) : msg.msgType === "chat_json" && msg.chatData ? (
                <div style={{ maxWidth: "95%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, lineHeight: 1.7, width: "100%" }}>
                  <ChatResponseView data={msg.chatData} lang={i18n.language} />
                  {isAdmin && msg.elapsed && !msg.error && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
                      ⏱ {msg.elapsed}s{msg.usage ? ` · in:${msg.usage.inputTokens} out:${msg.usage.outputTokens} · ${msg.usage.costUsd ? (msg.usage.costUsd * 100).toFixed(2) + "¢" : "—"}${msg.usage.model ? ` · ${msg.usage.model}` : ""}` : ""}
                    </div>
                  )}
                </div>
              ) : msg.msgType === "macro_analysis_json" && msg.macroData ? (
                <div style={{ maxWidth: "95%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, lineHeight: 1.7, width: "100%" }}>
                  <MacroAnalysisView macros={msg.macroData.macros} targets={msg.macroData.targets} aiInsight={msg.macroData.aiInsight} lang={i18n.language} />
                  {isAdmin && msg.elapsed && !msg.error && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
                      ⏱ {msg.elapsed}s{msg.usage ? ` · in:${msg.usage.inputTokens} out:${msg.usage.outputTokens} · ${msg.usage.costUsd ? (msg.usage.costUsd * 100).toFixed(2) + "¢" : "—"}${msg.usage.model ? ` · ${msg.usage.model}` : ""}` : ""}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ maxWidth: "90%", padding: "10px 14px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.error ? "#fef2f2" : msg.role === "user" ? "var(--color-accent)" : "var(--bg-soft)", color: msg.role === "user" && !msg.error ? "var(--bg-card)" : "var(--text-primary)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", border: msg.error ? "1px solid #fecaca" : msg.role === "assistant" ? "1px solid var(--border-soft)" : "none" }}>
                  {msg.role === "assistant" && !msg.error ? <span style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: formatAiText(msg.text) }} /> : msg.text}
                  {isAdmin && msg.elapsed && !msg.error && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
                      ⏱ {msg.elapsed}s{msg.usage ? ` · in:${msg.usage.inputTokens} out:${msg.usage.outputTokens} · ${msg.usage.costUsd ? (msg.usage.costUsd * 100).toFixed(2) + "¢" : "—"}${msg.usage.model ? ` · ${msg.usage.model}` : ""}` : ""}
                    </div>
                  )}
                  {msg.error && (
                    <button type="button" onClick={() => setMessages(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ display: "block", marginTop: 6, padding: "4px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#b91c1c" }}>
                      ✕ {t("common.close")}
                    </button>
                  )}
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