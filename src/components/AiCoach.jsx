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

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_NAMES = { el: ["ΔΕΥΤΕΡΑ", "ΤΡΙΤΗ", "ΤΕΤΑΡΤΗ", "ΠΕΜΠΤΗ", "ΠΑΡΑΣΚΕΥΗ", "ΣΑΒΒΑΤΟ", "ΚΥΡΙΑΚΗ"], en: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] };
const MEAL_EMOJIS = { breakfast: "🌅", morning_snack: "🍎", afternoon_snack: "🍎", lunch: "🌞", dinner: "🌙" };
const MEAL_LABELS = {
  el: { breakfast: "Πρωινό", morning_snack: "Σνακ", afternoon_snack: "Σνακ", lunch: "Μεσημεριανό", dinner: "Βραδινό" },
  en: { breakfast: "Breakfast", morning_snack: "Snack", afternoon_snack: "Snack", lunch: "Lunch", dinner: "Dinner" }
};
const SLOT_ORDER = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"];

function renderMealPlanText(data, lang) {
  const labels = MEAL_LABELS[lang] || MEAL_LABELS.el;
  const days = DAY_NAMES[lang] || DAY_NAMES.el;
  const plan = data?.weekly_plan;
  if (!plan) return "";
  return DAY_KEYS.map((dayKey, di) => {
    const day = plan[dayKey];
    if (!day) return "";
    const slots = SLOT_ORDER.filter(s => day[s]);
    const meals = slots.map(s => {
      const m = day[s];
      return `${MEAL_EMOJIS[s] || "🍽️"} ${labels[s] || s} — ${m.description} (${m.calories}kcal)`;
    }).join("\n");
    const total = day.daily_total || slots.reduce((sum, s) => sum + (day[s]?.calories || 0), 0);
    return `📅 ${days[di]}\n${meals}\n${lang === "en" ? "Total" : "Σύνολο"}: ${total}kcal\n─────────────────`;
  }).join("\n\n") + `\n\n⚠️ ${lang === "en" ? "This information is for guidance only and does not replace a doctor, nutritionist, or trainer. Consult a specialist if you have conditions, allergies, or take medication." : "Οι πληροφορίες είναι ενημερωτικές και δεν υποκαθιστούν γιατρό, διατροφολόγο ή γυμναστή. Συμβουλέψου ειδικό αν έχεις νοσήματα, αλλεργίες ή λαμβάνεις φαρμακευτική αγωγή."}`;
}

function MealPlanView({ data, lang }) {
  const labels = MEAL_LABELS[lang] || MEAL_LABELS.el;
  const days = DAY_NAMES[lang] || DAY_NAMES.el;
  const plan = data?.weekly_plan;
  if (!plan) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {DAY_KEYS.map((dayKey, di) => {
        const day = plan[dayKey];
        if (!day) return null;
        const slots = SLOT_ORDER.filter(s => day[s]);
        return (
          <div key={dayKey}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📅 {days[di]}</div>
            {slots.map(s => {
              const m = day[s];
              return (
                <div key={s} style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {MEAL_EMOJIS[s] || "🍽️"} {labels[s] || s} — {m.description} ({m.calories}kcal)
                </div>
              );
            })}
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
              {lang === "en" ? "Total" : "Σύνολο"}: {day.daily_total || slots.reduce((sum, s) => sum + (day[s]?.calories || 0), 0)}kcal
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
  totalCalories, totalProtein, exerciseValue,
  remainingCalories,
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
        if (lastAssistantRef.current && chatRef.current) {
          chatRef.current.scrollTop = lastAssistantRef.current.offsetTop;
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
    const text = last.text;
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

    const mealStructure = [
      { slot: "breakfast", target_calories: breakfastCal },
      ...(nSnacks >= 1 ? [{ slot: "morning_snack", target_calories: snackCal }] : []),
      { slot: "lunch", target_calories: lunchCal },
      ...(nSnacks >= 2 ? [{ slot: "afternoon_snack", target_calories: snackCal }] : []),
      { slot: "dinner", target_calories: dinnerCal }
    ];
    const mealSlots = mealStructure.map(m => m.slot);

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
      meal_structure: mealStructure,
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

    const exampleDay = `{${mealStructure.map(m => `"${m.slot}":{"description":"...","calories":${m.target_calories},"protein":0}`).join(",")},"daily_total":${targetCalories}}`;
    const slotList = mealStructure.map(m => `${m.slot} (~${m.target_calories}kcal)`).join(", ");

    const systemPrompt = isEn
      ? `You are a JSON diet plan generator. Output ONLY valid JSON, no text.
RULES:
1. Each day is an OBJECT with these NAMED KEYS: ${mealSlots.join(", ")}, daily_total. ALL keys are MANDATORY.
2. Target calories per slot: ${slotList}.
3. Each slot: description (brief, with grams), calories, protein.
4. No leftovers. Every slot every day must be unique.
5. Brief descriptions (e.g. "Grilled chicken (200g), rice (150g), salad").
6. Respect allergies, preferences, diet_rules from input.
7. Food names in English.
EXAMPLE day:
${exampleDay}`
      : `Είσαι αλγόριθμος παραγωγής JSON διατροφής. Output ΜΟΝΟ JSON, κανένα κείμενο.
ΚΑΝΟΝΕΣ:
1. Κάθε μέρα είναι OBJECT με αυτά τα NAMED KEYS: ${mealSlots.join(", ")}, daily_total. ΟΛΑ τα keys είναι ΥΠΟΧΡΕΩΤΙΚΑ.
2. Στόχος θερμίδων ανά slot: ${slotList}.
3. Κάθε slot: description (σύντομο, με γραμμάρια), calories, protein.
4. Όχι leftovers. Κάθε slot κάθε μέρα μοναδικό.
5. Σύντομες περιγραφές (π.χ. "Ψητό κοτόπουλο (200γρ), ρύζι (150γρ), σαλάτα").
6. Σεβάσου αλλεργίες, προτιμήσεις, diet_rules από το input.
7. Ονόματα φαγητών στα Ελληνικά.
ΠΑΡΑΔΕΙΓΜΑ ημέρας:
${exampleDay}`;

    return { systemPrompt, userMessage: JSON.stringify(input), mealSlots };
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

    // NUTRITION TARGETS: meal_plan, eatnow, general
    const nutritionTargets = `\n${isEn ? "Calories" : "Θερμίδες"}:${targetCalories}kcal | ${isEn ? "Protein" : "Πρωτεΐνη"}:${proteinTarget}g/${isEn?"day":"μέρα"}`;

    // TODAY'S INTAKE: eatnow, general
    const todayIntake = `\n${isEn ? "Today" : "Σήμερα"}: ${totalCalories||0}/${targetCalories}kcal | P:${Math.round(totalProtein||0)}/${proteinTarget}g | ${isEn ? "Exercise" : "Άσκηση"}:${exerciseValue||0}kcal | ${isEn ? "Remaining" : "Υπόλοιπο"}:${remainingCalories||targetCalories}kcal`;

    // WEEK SUMMARY: general μόνο
    const weekBlock = `\n${isEn ? "Week" : "Εβδομάδα"}:\n${weekSummary||"—"}${emptyDays.length>0?`\n⚠️ ${emptyDays.length} ${isEn ? "days without logging" : "μέρες χωρίς καταγραφή"}`:""}`;

    // FOOD CONTEXT: meal_plan, eatnow, general (NOT training_plan)
    const foodContext = foodPrefsLine;

    // FITNESS CONTEXT: training_plan, general (NOT meal_plan, NOT eatnow)
    const fitnessContext = `${exercisePrefsLine}${favExList ? `\n${isEn ? "Favorite exercises" : "Αγαπημένες ασκήσεις"}:${favExList}` : ""}`;

    // MODE RULES: πάντα
    const modeBlock = `\n${currentMode.aiRule}`;

    // GENERAL
    const generalRules = isEn ? `
Base food suggestions on the user's food profile, preferences, and diet type. Base exercise suggestions on the fitness profile. If a food clearly conflicts with the diet type, mention it.` : `
Βάσισε τις προτάσεις φαγητού στο διατροφικό προφίλ και τον τρόπο διατροφής του χρήστη. Βάσισε τις προτάσεις άσκησης στο προφίλ γυμναστικής. Αν κάποιο φαγητό δεν ταιριάζει με τον τρόπο διατροφής, ανέφερέ το.`;

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
  return `${isEn ? "MANDATORY format — ALWAYS emojis, NEVER asterisks. Each meal MUST hit its calorie target:" : "ΥΠΟΧΡΕΩΤΙΚΟ format — ΠΑΝΤΑ emojis, ΠΟΤΕ αστερίσκοι. Κάθε γεύμα ΠΡΕΠΕΙ να πιάνει τον στόχο θερμίδων:"}

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
    const trainingPlanFormat = isEn ? `
Create a weekly training plan. Consider favorite exercises. 2+ rest days.
MANDATORY format — ALWAYS emojis:

📅 ${dayLabels.mon} — [workout type]
09:00 💪 [Exercise]: [sets × reps]
Duration: ~[X]min

📅 ${dayLabels.tue} — ${dayLabels.rest} 😴
(Monday to Sunday)
AT THE END copy-paste this disclaimer EXACTLY as-is, do NOT translate it:
${disclaimer}
${askChange}` : `
Δώσε εβδομαδιαίο πρόγραμμα γυμναστικής. Λάβε υπόψη αγαπημένες ασκήσεις. 2+ rest days.
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
    // eatnow: food prefs + today's intake, NO fitness/week
    if (taskType === "eatnow") return core + nutritionTargets + todayIntake + foodContext + modeBlock;
    // general: everything (analyze day, free questions) — food & exercise clearly separated
    return core + `\n--- ${isEn ? "NUTRITION" : "ΔΙΑΤΡΟΦΗ"} ---` + nutritionTargets + modeBlock + todayIntake + foodContext + `\n--- ${isEn ? "EXERCISE" : "ΑΣΚΗΣΗ"} ---` + fitnessContext + `\n--- ${isEn ? "HISTORY" : "ΙΣΤΟΡΙΚΟ"} ---` + weekBlock + generalRules;
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
    setChatExpanded(true);
    coachTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    incrementUsage();
    if (text) { setMessages(prev => [...prev, { role: "user", text }]); setInput(""); }

    const currentMode = MODES[mode] || MODES.balanced;
    const isInitial = !text && !hasLoaded;
    const isEatNow = text === t("aiCoach.q1");
    const isMealPlan = text === t("aiCoach.q2");
    const isTrainingPlan = text === t("aiCoach.q3");
    const taskType = isEatNow ? "eatnow" : isMealPlan ? "meal_plan" : isTrainingPlan ? "training_plan" : "general";

    const isEn = i18n.language === "en";
    let effectiveMessage;
    if (isInitial) {
      effectiveMessage = isEn
        ? `Look at my data:\n1. What to eat for the rest of the day (${currentMode.label} diet, ${targetCalories}kcal)\n2. Flag any empty days\n3. Should I exercise today\n4. One thing I'm doing wrong\n5. Ask me something`
        : `Κοίτα τα δεδομένα μου:\n1. Τι να φάω για την υπόλοιπη μέρα (διατροφή ${currentMode.label}, ${targetCalories}kcal)\n2. Αν υπάρχουν άδειες μέρες επισήμανέ το\n3. Αν πρέπει να γυμναστώ σήμερα\n4. Ένα πράγμα που κάνω λάθος\n5. Ρώτα με κάτι`;
    } else if (isEatNow) {
      const hour = new Date().getHours();
      const mealTime = isEn
        ? (hour < 10 ? "breakfast" : hour < 12 ? "morning snack" : hour < 15 ? "lunch" : hour < 18 ? "afternoon snack" : "dinner")
        : (hour < 10 ? "πρωινό" : hour < 12 ? "σνακ πρωί" : hour < 15 ? "μεσημεριανό" : hour < 18 ? "σνακ απόγευμα" : "βραδινό");
      const remProtein = Math.max(Math.round((proteinTarget || 0) - (totalProtein || 0)), 0);
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayLog = dailyLogs?.[todayKey] || { entries: [] };
      const todayEntries = Array.isArray(todayLog.entries) ? todayLog.entries : [];
      const eatenSoFar = todayEntries.length > 0
        ? todayEntries.map(e => e.name || e.food).join(", ")
        : (isEn ? "nothing yet" : "τίποτα ακόμα");
      effectiveMessage = isEn
        ? `It's ${hour}:00, next meal is ${mealTime}. Give 3 options based on my food profile and favorites.\nEaten today so far: ${eatenSoFar}\nRemaining: ${remainingCalories}kcal | Protein needed: ${remProtein}g | Diet: ${currentMode.label}\n\nFormat — EXACTLY like this (blank line between, NOTHING else before or after):\n\n[emoji] [Meal]\n[X]kcal • [X]g protein\n[One sentence why it fits]\n\n[emoji] [Meal 2]\n[X]kcal • [X]g protein\n[One sentence]\n\n[emoji] [Meal 3]\n[X]kcal • [X]g protein\n[One sentence]`
        : `Ώρα ${hour}:00, επόμενο γεύμα: ${mealTime}. Δώσε 3 επιλογές βασισμένες στο διατροφικό μου προφίλ και τα αγαπημένα μου.\nΈχω φάει σήμερα: ${eatenSoFar}\nΥπόλοιπο: ${remainingCalories}kcal | Πρωτεΐνη που χρειάζομαι: ${remProtein}g | Διατροφή: ${currentMode.label}\n\nFormat — ΑΚΡΙΒΩΣ έτσι (κενή γραμμή μεταξύ, ΤΙΠΟΤΑ άλλο πριν ή μετά):\n\n[emoji] [Γεύμα]\n[X]kcal • [X]g πρωτεΐνη\n[Μια πρόταση γιατί ταιριάζει]\n\n[emoji] [Γεύμα 2]\n[X]kcal • [X]g πρωτεΐνη\n[Μια πρόταση]\n\n[emoji] [Γεύμα 3]\n[X]kcal • [X]g πρωτεΐνη\n[Μια πρόταση]`;
    } else if (isMealPlan) {
      effectiveMessage = isEn
        ? `Create a weekly meal plan for 7 days (Monday-Sunday). Start immediately with the plan, do NOT ask questions first. Include ALL meals${Number(snacksPerDay) > 0 ? " AND snacks" : ""} as specified in the format. NEVER asterisks.`
        : `Δώσε εβδομαδιαίο πρόγραμμα διατροφής 7 ημερών (Δευτέρα-Κυριακή). Ξεκίνα ΑΜΕΣΑ με το πρόγραμμα, ΜΗΝ κάνεις ερωτήσεις πρώτα. Συμπερίλαβε ΟΛΑ τα γεύματα${Number(snacksPerDay) > 0 ? " ΚΑΙ τα σνακ" : ""} όπως ορίζονται στο format. ΠΟΤΕ αστερίσκοι.`;
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
        const { systemPrompt, userMessage, mealSlots } = buildMealPlanJSON();
        reqBody = {
          systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          ...(selectedModel && { model: selectedModel }),
          jsonMode: true,
          mealSlots
        };
      } else {
        reqBody = {
          systemPrompt: buildSystemPrompt(taskType),
          messages: buildMessages(effectiveMessage),
          ...(selectedModel && { model: selectedModel })
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

      if (isMealPlan) {
        let parsed = null;
        try { parsed = JSON.parse(data.advice); } catch { /* fallback to text */ }
        if (parsed?.weekly_plan) {
          const dateStr = new Date().toLocaleDateString(i18n.language === "en" ? "en-US" : "el-GR");
          // Convert JSON to text for saving
          const textVersion = renderMealPlanText(parsed, i18n.language);
          onSavePlan?.({ type: "meal", content: textVersion, date: dateStr });
          setMessages(prev => [...prev, { role: "assistant", mealPlanData: parsed, text: textVersion, msgType: "meal_plan_json", elapsed, usage: data.usage }]);
        } else {
          // Fallback: AI returned text instead of JSON
          setMessages(prev => [...prev, { role: "assistant", text: data.advice, elapsed, usage: data.usage }]);
        }
      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", text: data.advice, msgType: isEatNow ? "eatnow" : undefined, elapsed, usage: data.usage }
        ]);
      }
      setHasLoaded(true);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `❌ ${err.message || "Δεν ήταν δυνατή η σύνδεση."}`, error: true }]);
    } finally { setLoading(false); }
  }

  return (
    <div ref={coachTopRef}>
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
                <option value="grok">Grok 4.1 Fast — $0.20/$0.50</option>
              </select>
            )}
          </div>
        </div>
        {hasLoaded && messages.length > 0 && !loading && (
          <button type="button" onClick={() => setChatExpanded(prev => !prev)}
            style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>
            {chatExpanded ? "▲" : "▼"}
          </button>
        )}
      </div>

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
              ) : msg.msgType === "eatnow" ? (
                <div style={{ maxWidth: "95%", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-soft)", border: "1px solid var(--border-soft)", fontSize: 13, lineHeight: 1.7, width: "100%" }}>
                  <EatNowCards text={msg.text} />
                </div>
              ) : (
                <div style={{ maxWidth: "90%", padding: "10px 14px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.error ? "#fef2f2" : msg.role === "user" ? "var(--color-accent)" : "var(--bg-soft)", color: msg.role === "user" && !msg.error ? "var(--bg-card)" : "var(--text-primary)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", border: msg.error ? "1px solid #fecaca" : msg.role === "assistant" ? "1px solid var(--border-soft)" : "none" }}>
                  {msg.text}
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