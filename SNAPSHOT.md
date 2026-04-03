# SNAPSHOT — 2026-04-02T20:02:23.376Z

## package.json
```
{
  "name": "fueltrack",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "snapshot": "node generateSnapshot.cjs"
  },
  "dependencies": {
    "@zxing/library": "^0.21.3",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "vite": "^8.0.1"
  }
}

```

## vite.config.js
```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

```

## netlify.toml
```
[build]
  functions = "netlify/functions"
  
```

## index.html
```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>fueltrack</title>
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="FuelTrack" />

    <link rel="manifest" href="/manifest.json" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

## src\App.jsx
```
import { useEffect, useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import EditEntryModal from "./components/EditEntryModal";
import WelcomeScreen from "./components/WelcomeScreen";
import SummaryTab from "./components/tabs/SummaryTab";
import FoodTab from "./components/tabs/FoodTab";
import ExerciseTab from "./components/tabs/ExerciseTab";
import ProfileTab from "./components/tabs/ProfileTab";
import foodsData from "./data/foods.json";
import { EXERCISE_LIBRARY, MEALS, APP_TABS } from "./data/constants";
import {
  getTodayKey, normalizeDayLog, normalizeFood,
  createFoodEntry, round1, shiftDate, entryBasePer100g
} from "./utils/helpers";
import {
  calculateBMR, calculateTDEE, calculateDailyDeficit,
  calculateTargetCalories, calculateProteinTarget, calculateMacroTargets
} from "./utils/calorieLogic";
import { loadJSON, loadValue, saveJSON, saveValue } from "./utils/storage";
import { getInitialTheme, applyTheme } from "./utils/theme";

export default function App() {
  const [theme, setTheme] = useState(() => getInitialTheme());
  const [selectedDate, setSelectedDate] = useState(getTodayKey());

  const [age, setAge] = useState(() => loadValue("ft_age", ""));
  const [gender, setGender] = useState(() => loadValue("ft_gender", "male"));
  const [height, setHeight] = useState(() => loadValue("ft_height", ""));
  const [weight, setWeight] = useState(() => loadValue("ft_weight", ""));
  const [activity, setActivity] = useState(() => loadValue("ft_activity", "1.4"));
  const [goalType, setGoalType] = useState(() => loadValue("ft_goalType", "lose"));
  const [mode, setMode] = useState(() => loadValue("ft_mode", "balanced"));
  const [targetWeightLoss, setTargetWeightLoss] = useState(() => loadValue("ft_targetWeightLoss", ""));
  const [weeks, setWeeks] = useState(() => loadValue("ft_weeks", ""));
  const [favoriteFoodsText, setFavoriteFoodsText] = useState(() => loadValue("ft_favFoodsText", ""));
  const [favoriteExercisesText, setFavoriteExercisesText] = useState(() => loadValue("ft_favExercisesText", ""));

  const [foods, setFoods] = useState(() => {
    const saved = loadJSON("ft_foods", []);
    const customOnly = saved.filter((f) => f.source !== "local");
    return [...foodsData, ...customOnly];
  });
  const [customFoods, setCustomFoods] = useState(() => loadJSON("ft_customFoods", []));
  const [dailyLogs, setDailyLogs] = useState(() => loadJSON("ft_dailyLogs", {}));
  const [recentFoods, setRecentFoods] = useState(() => loadJSON("ft_recentFoods", []));
  const [favoriteFoodKeys, setFavoriteFoodKeys] = useState(() => loadJSON("ft_favoriteFoodKeys", []));
  const [favoriteExerciseKeys, setFavoriteExerciseKeys] = useState(() => loadJSON("ft_favoriteExerciseKeys", []));
  const [weightLog, setWeightLog] = useState(() => loadJSON("ft_weightLog", []));

  const [editingEntry, setEditingEntry] = useState(null);
  const [editEntryGrams, setEditEntryGrams] = useState("100");
  const [editEntryMeal, setEditEntryMeal] = useState("Πρωινό");

  const [exerciseMinutes, setExerciseMinutes] = useState(() =>
    EXERCISE_LIBRARY.reduce((acc, item) => { acc[item.name] = ""; return acc; }, {})
  );
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseMinutes, setCustomExerciseMinutes] = useState("");
  const [customExerciseRate, setCustomExerciseRate] = useState("");

  const [hasSeenWelcome, setHasSeenWelcome] = useState(() =>
    loadValue("ft_hasSeenWelcome", "false") === "true"
  );

  useEffect(() => { applyTheme(theme); }, [theme]);
  function toggleTheme() { setTheme((prev) => (prev === "dark" ? "light" : "dark")); }

  const profileComplete = useMemo(() => {
    return (
      String(age).trim() !== "" && String(gender).trim() !== "" &&
      String(height).trim() !== "" && String(weight).trim() !== "" &&
      String(activity).trim() !== "" && String(goalType).trim() !== "" &&
      String(mode).trim() !== ""
    );
  }, [age, gender, height, weight, activity, goalType, mode]);

  const [activeTab, setActiveTab] = useState(() => {
    const savedAge = loadValue("ft_age", "");
    const savedHeight = loadValue("ft_height", "");
    const savedWeight = loadValue("ft_weight", "");
    const savedActivity = loadValue("ft_activity", "1.4");
    const savedGoalType = loadValue("ft_goalType", "lose");
    const savedMode = loadValue("ft_mode", "balanced");
    const savedHasSeenWelcome = loadValue("ft_hasSeenWelcome", "false") === "true";
    const savedTab = loadValue("ft_activeTab", "summary");

    const savedProfileComplete =
      String(savedAge).trim() !== "" && String(loadValue("ft_gender", "male")).trim() !== "" &&
      String(savedHeight).trim() !== "" && String(savedWeight).trim() !== "" &&
      String(savedActivity).trim() !== "" && String(savedGoalType).trim() !== "" &&
      String(savedMode).trim() !== "";

    if (!savedHasSeenWelcome) return "welcome";
    if (!savedProfileComplete) return "profile";
    if (!["summary", "food", "exercise", "profile"].includes(savedTab)) return "summary";
    return savedTab;
  });

  useEffect(() => { setSelectedDate(getTodayKey()); }, []);

  useEffect(() => saveValue("ft_age", age), [age]);
  useEffect(() => saveValue("ft_gender", gender), [gender]);
  useEffect(() => saveValue("ft_height", height), [height]);
  useEffect(() => saveValue("ft_weight", weight), [weight]);
  useEffect(() => saveValue("ft_activity", activity), [activity]);
  useEffect(() => saveValue("ft_goalType", goalType), [goalType]);
  useEffect(() => saveValue("ft_mode", mode), [mode]);
  useEffect(() => saveValue("ft_targetWeightLoss", targetWeightLoss), [targetWeightLoss]);
  useEffect(() => saveValue("ft_weeks", weeks), [weeks]);
  useEffect(() => saveValue("ft_favFoodsText", favoriteFoodsText), [favoriteFoodsText]);
  useEffect(() => saveValue("ft_favExercisesText", favoriteExercisesText), [favoriteExercisesText]);
  useEffect(() => saveJSON("ft_foods", foods), [foods]);
  useEffect(() => saveJSON("ft_customFoods", customFoods), [customFoods]);
  useEffect(() => saveJSON("ft_dailyLogs", dailyLogs), [dailyLogs]);
  useEffect(() => saveJSON("ft_recentFoods", recentFoods), [recentFoods]);
  useEffect(() => saveJSON("ft_favoriteFoodKeys", favoriteFoodKeys), [favoriteFoodKeys]);
  useEffect(() => saveJSON("ft_favoriteExerciseKeys", favoriteExerciseKeys), [favoriteExerciseKeys]);
  useEffect(() => saveJSON("ft_weightLog", weightLog), [weightLog]);
  useEffect(() => saveValue("ft_hasSeenWelcome", hasSeenWelcome ? "true" : "false"), [hasSeenWelcome]);

  useEffect(() => {
    if (!hasSeenWelcome && activeTab !== "welcome") { setActiveTab("welcome"); return; }
    if (hasSeenWelcome && !profileComplete && activeTab !== "profile") { setActiveTab("profile"); return; }
    if (hasSeenWelcome && profileComplete) { saveValue("ft_activeTab", activeTab); }
  }, [activeTab, hasSeenWelcome, profileComplete]);

  const currentDayLog = normalizeDayLog(dailyLogs[selectedDate]);
  const entries = currentDayLog.entries;
  const exercises = currentDayLog.exercises;

  function updateCurrentDay(updater) {
    setDailyLogs((prev) => {
      const current = normalizeDayLog(prev[selectedDate]);
      const nextDay = normalizeDayLog(updater(current));
      return { ...prev, [selectedDate]: nextDay };
    });
  }

  function deleteEntry(id) {
    updateCurrentDay((current) => ({
      ...current,
      entries: current.entries.filter((item) => item.id !== id)
    }));
  }

  function openEditEntry(entry) {
    setEditingEntry(entry);
    setEditEntryGrams(String(entry.grams || 100));
    setEditEntryMeal(entry.mealType || "Πρωινό");
  }

  function closeEditEntry() {
    setEditingEntry(null);
    setEditEntryGrams("100");
    setEditEntryMeal("Πρωινό");
  }

  function saveEditedEntry() {
    if (!editingEntry) return;
    const grams = Math.max(Number(editEntryGrams) || 100, 1);
    const meal = editEntryMeal || "Πρωινό";
    const base = entryBasePer100g(editingEntry);
    const factor = grams / 100;
    const updated = {
      ...editingEntry, grams, mealType: meal,
      calories: Math.round(base.caloriesPer100g * factor),
      protein: round1(base.proteinPer100g * factor),
      carbs: round1(base.carbsPer100g * factor),
      fat: round1(base.fatPer100g * factor),
      baseCaloriesPer100g: base.caloriesPer100g,
      baseProteinPer100g: base.proteinPer100g,
      baseCarbsPer100g: base.carbsPer100g,
      baseFatPer100g: base.fatPer100g
    };
    updateCurrentDay((current) => ({
      ...current,
      entries: current.entries.map((item) => (item.id === editingEntry.id ? updated : item))
    }));
    closeEditEntry();
  }

  function addExerciseByMinutes(exercise, minutesValue) {
    const minutes = Math.max(Number(minutesValue) || 0, 1);
    const newExercise = {
      id: Date.now() + Math.random(),
      name: `${exercise.name} ${minutes} λεπτά`,
      minutes, caloriesPerMinute: exercise.caloriesPerMinute,
      calories: Math.round(exercise.caloriesPerMinute * minutes)
    };
    updateCurrentDay((current) => ({ ...current, exercises: [newExercise, ...current.exercises] }));
    setExerciseMinutes((prev) => ({ ...prev, [exercise.name]: "" }));
  }

  function addCustomExercise() {
    const minutes = Math.max(Number(customExerciseMinutes) || 0, 1);
    const rate = Math.max(Number(customExerciseRate) || 0, 0.1);
    if (!customExerciseName.trim()) return;
    const newExercise = {
      id: Date.now() + Math.random(),
      name: `${customExerciseName.trim()} ${minutes} λεπτά`,
      minutes, caloriesPerMinute: rate,
      calories: Math.round(rate * minutes)
    };
    updateCurrentDay((current) => ({ ...current, exercises: [newExercise, ...current.exercises] }));
    setCustomExerciseName(""); setCustomExerciseMinutes(""); setCustomExerciseRate("");
  }

  function deleteExercise(id) {
    updateCurrentDay((current) => ({
      ...current,
      exercises: current.exercises.filter((item) => item.id !== id)
    }));
  }

  function saveRecentFood(food, gramsValue, meal) {
    const normalized = normalizeFood(food);
    setRecentFoods((prev) => {
      const filtered = prev.filter(
        (item) => !(
          item.food.name.toLowerCase() === normalized.name.toLowerCase() &&
          (item.food.brand || "").toLowerCase() === (normalized.brand || "").toLowerCase()
        )
      );
      return [
        {
          key: `${normalized.name}-${normalized.brand || ""}`.toLowerCase(),
          food: normalized,
          grams: Math.max(Number(gramsValue) || 100, 1),
          mealType: meal || "Πρωινό",
          lastUsedAt: Date.now()
        },
        ...filtered
      ].slice(0, 12);
    });
  }

  function quickAddRecent(item) {
    const entry = createFoodEntry(item.food, item.grams, item.mealType);
    updateCurrentDay((current) => ({ ...current, entries: [entry, ...current.entries] }));
    saveRecentFood(item.food, item.grams, item.mealType);
  }

  function quickAddFavorite(food) {
    const entry = createFoodEntry(food, 100, "Σνακ");
    updateCurrentDay((current) => ({ ...current, entries: [entry, ...current.entries] }));
    saveRecentFood(food, 100, "Σνακ");
  }

  function toggleFavorite(food) {
    const key = `${food.name.toLowerCase()}|${(food.brand || "").toLowerCase()}`;
    setFavoriteFoodKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [key, ...prev]
    );
  }

  function isFavorite(food) {
    const key = `${food.name.toLowerCase()}|${(food.brand || "").toLowerCase()}`;
    return favoriteFoodKeys.includes(key);
  }

  function toggleFavoriteExercise(exercise) {
    const key = exercise.name.toLowerCase();
    setFavoriteExerciseKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [key, ...prev]
    );
  }

  function isFavoriteExercise(exercise) {
    return favoriteExerciseKeys.includes(exercise.name.toLowerCase());
  }

  function addWeight({ date, weight: w }) {
    setWeightLog((prev) => {
      const filtered = prev.filter((entry) => entry.date !== date);
      return [...filtered, { date, weight: w }];
    });
  }

  function deleteWeight(date) {
    setWeightLog((prev) => prev.filter((entry) => entry.date !== date));
  }

  function startOnboarding() { setHasSeenWelcome(true); setActiveTab("profile"); }
  function goToSummaryAfterProfile() { if (!profileComplete) return; setActiveTab("summary"); }

  const bmr = useMemo(() => calculateBMR({ age, gender, height, weight }), [age, gender, height, weight]);
  const tdee = useMemo(() => calculateTDEE({ bmr, activity }), [bmr, activity]);
  const dailyDeficit = useMemo(() => calculateDailyDeficit({ kilos: targetWeightLoss, weeks }), [targetWeightLoss, weeks]);
  const targetCalories = useMemo(() => calculateTargetCalories({ goalType, tdee, targetWeightChange: targetWeightLoss, weeks }), [goalType, tdee, targetWeightLoss, weeks]);
  const proteinTarget = useMemo(() => calculateProteinTarget({ weight, goalType, modeKey: mode }), [weight, goalType, mode]);
  const macroTargets = useMemo(() => calculateMacroTargets({ targetCalories, proteinTarget, modeKey: mode }), [targetCalories, proteinTarget, mode]);

  const totalCalories = entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const totalProtein = round1(entries.reduce((sum, item) => sum + Number(item.protein || 0), 0));
  const totalCarbs = round1(entries.reduce((sum, item) => sum + Number(item.carbs || 0), 0));
  const totalFat = round1(entries.reduce((sum, item) => sum + Number(item.fat || 0), 0));
  const exerciseValue = exercises.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const remainingCalories = targetCalories - totalCalories + exerciseValue;
  const progress = targetCalories ? Math.min((totalCalories / targetCalories) * 100, 100) : 0;

  const groupedEntries = useMemo(() => {
    return MEALS.reduce((acc, meal) => {
      const items = entries.filter((item) => item.mealType === meal);
      acc[meal] = {
        items,
        totalCalories: items.reduce((sum, item) => sum + Number(item.calories || 0), 0),
        totalProtein: round1(items.reduce((sum, item) => sum + Number(item.protein || 0), 0)),
        totalCarbs: round1(items.reduce((sum, item) => sum + Number(item.carbs || 0), 0)),
        totalFat: round1(items.reduce((sum, item) => sum + Number(item.fat || 0), 0))
      };
      return acc;
    }, {});
  }, [entries]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = shiftDate(selectedDate, -index);
      const log = normalizeDayLog(dailyLogs[date]);
      const eaten = log.entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
      const ex = log.exercises.reduce((sum, item) => sum + Number(item.calories || 0), 0);
      const remaining = targetCalories - eaten + ex;
      return { date, eaten, exercise: ex, remaining };
    });
  }, [selectedDate, dailyLogs, targetCalories]);

  const isToday = selectedDate === getTodayKey();

  const favoriteFoods = useMemo(() => {
    return foods.filter((food) => isFavorite(food)).slice(0, 8);
  }, [foods, favoriteFoodKeys]);

  const favoriteExercises = useMemo(() => {
    return EXERCISE_LIBRARY.filter((e) => isFavoriteExercise(e));
  }, [favoriteExerciseKeys]);

  const summaryProps = {
    selectedDate, setSelectedDate, isToday,
    targetCalories, totalCalories, exerciseValue,
    remainingCalories, progress, goalType,
    proteinTarget, totalProtein, totalCarbs, totalFat,
    last7Days, mode, macroTargets, foods,
    dailyLogs, weightLog,
    onAddWeight: addWeight,
    onDeleteWeight: deleteWeight,
    favoriteFoods,
    favoriteFoodsText,
    favoriteExercisesText,
    favoriteExercises
  };

  const foodProps = {
    foods, customFoods,
    onAddCustomFood: (food) => setCustomFoods((prev) => [normalizeFood({ ...food, id: `custom-${Date.now()}`, source: "custom" }), ...prev]),
    onDeleteCustomFood: (id) => setCustomFoods((prev) => prev.filter((f) => f.id !== id)),
    recentFoods, favoriteFoods,
    isFavorite, toggleFavorite,
    saveRecentFood, updateCurrentDay,
    quickAddRecent, quickAddFavorite,
    entries, groupedEntries, deleteEntry, openEditEntry
  };

  const exerciseProps = {
    exercises, exerciseValue, exerciseMinutes,
    setExerciseMinutes, customExerciseName,
    setCustomExerciseName, customExerciseMinutes,
    setCustomExerciseMinutes, customExerciseRate,
    setCustomExerciseRate, addExerciseByMinutes,
    addCustomExercise, deleteExercise,
    selectedDate, updateCurrentDay,
    favoriteExerciseKeys,
    toggleFavoriteExercise,
    isFavoriteExercise
  };

  const profileProps = {
    age, setAge, gender, setGender,
    height, setHeight, weight, setWeight,
    activity, setActivity, goalType, setGoalType,
    mode, setMode, targetWeightLoss, setTargetWeightLoss,
    weeks, setWeeks, tdee, targetCalories,
    dailyDeficit, proteinTarget, profileComplete,
    onContinue: goToSummaryAfterProfile
  };

  const showWelcome = !hasSeenWelcome;
  const showProfile = hasSeenWelcome && !profileComplete;
  const appReady = hasSeenWelcome && profileComplete;

  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="app-header">
          <div className="app-header-left">
            <h1>FuelTrack</h1>
            {showProfile && <p>Ξεκίνα συμπληρώνοντας το προφίλ σου</p>}
          </div>
          <button className="theme-toggle-btn" onClick={toggleTheme} type="button">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {showWelcome && <WelcomeScreen onStart={startOnboarding} />}
        {showProfile && <ProfileTab {...profileProps} />}

        {appReady && activeTab === "summary" && <SummaryTab {...summaryProps} />}
        {appReady && activeTab === "food" && <FoodTab {...foodProps} />}
        {appReady && activeTab === "exercise" && <ExerciseTab {...exerciseProps} />}
        {appReady && activeTab === "profile" && <ProfileTab {...profileProps} />}

        <div style={{ height: 110 }} />
      </div>

      {appReady && (
        <BottomNav tabs={APP_TABS} activeTab={activeTab} onChange={(tab) => setActiveTab(tab)} />
      )}

      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          grams={editEntryGrams}
          setGrams={setEditEntryGrams}
          meal={editEntryMeal}
          setMeal={setEditEntryMeal}
          onClose={closeEditEntry}
          onSave={saveEditedEntry}
        />
      )}
    </div>
  );
}
```

## src\components\AiCoach.jsx
```
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
```

## src\components\BarcodeScanner.jsx
```
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        reader.reset();
        onResult(result.getText());
      }
    }).catch(() => {
      setError("Δεν επιτράπηκε η πρόσβαση στην κάμερα.");
    });

    return () => {
      reader.reset();
    };
  }, []);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.9)",
      zIndex: 300,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 20
    }}>
      <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>
        📷 Σκανάρισμα Barcode
      </div>

      {error ? (
        <div style={{ color: "#fca5a5", textAlign: "center", fontSize: 14 }}>
          {error}
        </div>
      ) : (
        <>
          <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
            <video
              ref={videoRef}
              style={{ width: "100%", borderRadius: 16 }}
              muted
              playsInline
            />
            <div style={{
              position: "absolute",
              inset: 0,
              border: "3px solid #22c55e",
              borderRadius: 16,
              pointerEvents: "none"
            }} />
            <div style={{
              position: "absolute",
              top: "50%",
              left: "10%",
              right: "10%",
              height: 3,
              background: "#22c55e",
              transform: "translateY(-50%)",
              opacity: 0.8
            }} />
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
            Στόχευσε το barcode του προϊόντος
          </div>
        </>
      )}

      <button
        className="btn btn-light"
        onClick={onClose}
        type="button"
        style={{ marginTop: 8 }}
      >
        Κλείσιμο
      </button>
    </div>
  );
}
```

## src\components\BottomNav.jsx
```
export default function BottomNav({ tabs, activeTab, onChange }) {
  return (
    <div className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={activeTab === tab.key ? "active" : ""}
          onClick={() => onChange(tab.key)}
        >
          <div className="nav-icon">{tab.icon}</div>
          <div>{tab.label}</div>
        </button>
      ))}
    </div>
  );
}
```

## src\components\EditEntryModal.jsx
```
import { MEALS } from "../data/constants";
import { entryBasePer100g, formatNumber, round1 } from "../utils/helpers";

export default function EditEntryModal({
  entry,
  grams,
  setGrams,
  meal,
  setMeal,
  onClose,
  onSave
}) {
  const base = entryBasePer100g(entry);
  const safeGrams = Math.max(Number(grams) || 100, 1);
  const factor = safeGrams / 100;

  const preview = {
    calories: Math.round(base.caloriesPer100g * factor),
    protein: round1(base.proteinPer100g * factor),
    carbs: round1(base.carbsPer100g * factor),
    fat: round1(base.fatPer100g * factor)
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>Επεξεργασία entry</h3>

        <div className="muted" style={{ marginBottom: 12 }}>
          {entry.name}
          {entry.brand ? ` · ${entry.brand}` : ""}
        </div>

        <div className="grid-2">
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Γραμμάρια
            </div>
            <input
              className="input"
              type="number"
              min="1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>

          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Γεύμα
            </div>
            <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {MEALS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <div className="soft-box">
            <div className="muted">Θερμίδες</div>
            <div>{formatNumber(preview.calories)}</div>
          </div>
          <div className="soft-box">
            <div className="muted">Protein</div>
            <div>{formatNumber(preview.protein)}g</div>
          </div>
          <div className="soft-box">
            <div className="muted">Carbs</div>
            <div>{formatNumber(preview.carbs)}g</div>
          </div>
          <div className="soft-box">
            <div className="muted">Fat</div>
            <div>{formatNumber(preview.fat)}g</div>
          </div>
        </div>

        <div className="action-row" style={{ marginTop: 14 }}>
          <button className="btn btn-light" onClick={onClose}>
            Άκυρο
          </button>
          <button className="btn btn-dark" onClick={onSave}>
            Αποθήκευση
          </button>
        </div>
      </div>
    </div>
  );
}
```

## src\components\FabButton.jsx
```
export default function FabButton({ onClick }) {
  return (
    <button className="fab-btn" onClick={onClick}>
      +
    </button>
  );
}
```

## src\components\FoodPhotoAnalyzer.jsx
```
import { useRef, useState } from "react";

export default function FoodPhotoAnalyzer({ onFoodFound, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  async function handleImage(file) {
    if (!file) return;

    setError("");
    setResult(null);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Convert to base64
    const base64 = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/food-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type || "image/jpeg"
        })
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err) {
      setError("Δεν ήταν δυνατή η ανάλυση. Δοκίμασε ξανά.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) handleImage(file);
  }

  function handleConfirm() {
    if (!result) return;
    onFoodFound({
      id: `photo-${Date.now()}`,
      source: "local",
      sourceLabel: "📸 Photo",
      name: result.name,
      brand: "",
      caloriesPer100g: Number(result.caloriesPer100g || 0),
      proteinPer100g: Number(result.proteinPer100g || 0),
      carbsPer100g: Number(result.carbsPer100g || 0),
      fatPer100g: Number(result.fatPer100g || 0),
      estimatedGrams: Number(result.estimatedGrams || 100)
    });
  }

  function getConfidenceColor(confidence) {
    if (confidence === "high") return "#166534";
    if (confidence === "medium") return "#92400e";
    return "#b91c1c";
  }

  function getConfidenceLabel(confidence) {
    if (confidence === "high") return "✅ Υψηλή βεβαιότητα";
    if (confidence === "medium") return "⚡ Μέτρια βεβαιότητα";
    return "⚠️ Χαμηλή βεβαιότητα — έλεγξε τις τιμές";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 20,
          padding: 20,
          width: "100%",
          maxWidth: 400,
          boxShadow: "var(--shadow-modal)",
          maxHeight: "90vh",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          📸 Ανάλυση φαγητού
        </div>

        {/* Upload area */}
        {!preview && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed var(--border-color)",
              borderRadius: 14,
              padding: 30,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 12
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Επέλεξε φωτογραφία</div>
            <div className="muted" style={{ fontSize: 13 }}>
              ή τράβηξε από την κάμερα
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: 12 }}>
            <img
              src={preview}
              alt="preview"
              style={{ width: "100%", borderRadius: 12, maxHeight: 200, objectFit: "cover" }}
            />
            {!loading && (
              <button
                className="btn btn-light"
                onClick={() => { setPreview(null); setResult(null); }}
                type="button"
                style={{ marginTop: 8, width: "100%", fontSize: 13 }}
              >
                Άλλη φωτογραφία
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🤔</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Αναλύω το φαγητό...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {result.name}
            </div>
            {result.description && (
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                {result.description}
              </div>
            )}

            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: getConfidenceColor(result.confidence),
              marginBottom: 10
            }}>
              {getConfidenceLabel(result.confidence)}
            </div>

            <div style={{
              background: "var(--bg-soft)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              fontSize: 13
            }}>
              <div>
                <span className="muted">Θερμίδες/100g: </span>
                <strong>{result.caloriesPer100g} kcal</strong>
              </div>
              <div>
                <span className="muted">Πρωτεΐνη: </span>
                <strong>{result.proteinPer100g}g</strong>
              </div>
              <div>
                <span className="muted">Υδατ.: </span>
                <strong>{result.carbsPer100g}g</strong>
              </div>
              <div>
                <span className="muted">Λίπος: </span>
                <strong>{result.fatPer100g}g</strong>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <span className="muted">Εκτιμ. ποσότητα: </span>
                <strong>{result.estimatedGrams}g</strong>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {result && !loading && (
            <button
              className="btn btn-dark"
              onClick={handleConfirm}
              type="button"
              style={{ flex: 1 }}
            >
              Προσθήκη
            </button>
          )}
          {!preview && !loading && (
            <button
              className="btn btn-dark"
              onClick={() => fileRef.current?.click()}
              type="button"
              style={{ flex: 1 }}
            >
              📷 Επέλεξε φωτογραφία
            </button>
          )}
          <button
            className="btn btn-light"
            onClick={onClose}
            type="button"
          >
            Άκυρο
          </button>
        </div>
      </div>
    </div>
  );
}
```

## src\components\GoogleFitButton.jsx
```
import { useEffect, useState } from "react";
import { formatNumber } from "../utils/helpers";

export default function GoogleFitButton({ selectedDate, onAddExercise }) {
  const [token, setToken] = useState(() => localStorage.getItem("ft_gfit_token") || "");
  const [fitData, setFitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fitToken = params.get("fit_token");
    const fitRefresh = params.get("fit_refresh");
    const fitError = params.get("fit_error");

    if (fitToken) {
      localStorage.setItem("ft_gfit_token", fitToken);
      if (fitRefresh) localStorage.setItem("ft_gfit_refresh", fitRefresh);
      setToken(fitToken);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (fitError) {
      setError("Σφάλμα σύνδεσης με Google Fit.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (token && selectedDate) fetchFitData();
  }, [token, selectedDate]);

  async function fetchFitData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/.netlify/functions/google-fit-data?token=${encodeURIComponent(token)}&date=${selectedDate}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFitData(data);
    } catch {
      setError("Δεν ήταν δυνατή η φόρτωση δεδομένων.");
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    window.location.href = "/.netlify/functions/google-fit-auth";
  }

  function handleDisconnect() {
    localStorage.removeItem("ft_gfit_token");
    localStorage.removeItem("ft_gfit_refresh");
    setToken("");
    setFitData(null);
  }

  function handleAddToLog() {
    if (!fitData || !fitData.calories) return;
    onAddExercise({
      id: Date.now() + Math.random(),
      name: `Google Fit — ${fitData.steps ? fitData.steps.toLocaleString("el-GR") + " βήματα" : ""} ${fitData.distanceKm ? fitData.distanceKm + " km" : ""}`.trim(),
      minutes: 0,
      caloriesPerMinute: 0,
      calories: fitData.calories
    });
  }

  if (!token) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          className="btn btn-dark"
          onClick={handleConnect}
          type="button"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <span style={{ fontSize: 18 }}>🏃</span> Σύνδεση με Google Fit
        </button>
        <div className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: "center" }}>
          Διαβάζει βήματα, απόσταση και θερμίδες αυτόματα
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, background: "var(--bg-soft)", borderRadius: 12, padding: 14, border: "1px solid var(--border-soft)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>🏃 Google Fit</span>
        <button className="btn btn-light" onClick={handleDisconnect} type="button" style={{ fontSize: 12, padding: "4px 10px" }}>
          Αποσύνδεση
        </button>
      </div>

      {loading && <div className="muted" style={{ fontSize: 13 }}>Φόρτωση δεδομένων...</div>}
      {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}

      {fitData && !loading && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{formatNumber(fitData.steps)}</div>
              <div className="muted" style={{ fontSize: 12 }}>βήματα</div>
            </div>
            <div style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{fitData.distanceKm}</div>
              <div className="muted" style={{ fontSize: 12 }}>km</div>
            </div>
            <div style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{formatNumber(fitData.calories)}</div>
              <div className="muted" style={{ fontSize: 12 }}>kcal</div>
            </div>
          </div>

          {fitData.calories > 0 && (
            <button className="btn btn-dark" onClick={handleAddToLog} type="button" style={{ width: "100%", fontSize: 13 }}>
              + Προσθήκη στο log ({formatNumber(fitData.calories)} kcal)
            </button>
          )}

          <button className="btn btn-light" onClick={fetchFitData} type="button" style={{ width: "100%", marginTop: 8, fontSize: 12 }}>
            🔄 Ανανέωση
          </button>
        </>
      )}
    </div>
  );
}
```

## src\components\tabs\ExerciseTab.jsx
```
import { useMemo, useState } from "react";
import { EXERCISE_LIBRARY } from "../../data/constants";
import { formatNumber, stripDiacritics } from "../../utils/helpers";
import GoogleFitButton from "../GoogleFitButton";

const CATEGORIES = ["Όλα", "Cardio", "Strength", "Flexibility"];

export default function ExerciseTab({
  exercises, exerciseValue, exerciseMinutes, setExerciseMinutes,
  customExerciseName, setCustomExerciseName,
  customExerciseMinutes, setCustomExerciseMinutes,
  customExerciseRate, setCustomExerciseRate,
  addExerciseByMinutes, addCustomExercise, deleteExercise,
  selectedDate, updateCurrentDay,
  favoriteExerciseKeys, toggleFavoriteExercise, isFavoriteExercise
}) {
  const [activeCategory, setActiveCategory] = useState("Όλα");
  const [selectedExerciseName, setSelectedExerciseName] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState("30");

  const filteredExercises = useMemo(() => {
    if (activeCategory === "Όλα") return EXERCISE_LIBRARY;
    return EXERCISE_LIBRARY.filter((e) => e.category === activeCategory);
  }, [activeCategory]);

  const selectedExercise = EXERCISE_LIBRARY.find((e) => e.name === selectedExerciseName) || null;

  const favoriteExercises = useMemo(() => {
    return EXERCISE_LIBRARY.filter((e) => isFavoriteExercise?.(e));
  }, [favoriteExerciseKeys]);

  function handleAddExercise() {
    if (!selectedExercise) return;
    addExerciseByMinutes(selectedExercise, selectedMinutes);
    setSelectedExerciseName("");
    setSelectedMinutes("30");
  }

  function handleAddFromFit(exercise) {
    updateCurrentDay((current) => ({
      ...current,
      exercises: [exercise, ...current.exercises]
    }));
  }

  return (
    <>
      {/* ΑΣΚΗΣΗ ΗΜΕΡΑΣ */}
      <div className="day-card">
        <div className="day-card-total">
          <h2 style={{ color: "white", margin: 0, fontSize: 16 }}>Άσκηση ημέρας</h2>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#86efac" }}>+{formatNumber(exerciseValue)} kcal</span>
        </div>
        {exercises.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Δεν έχεις βάλει άσκηση ακόμα.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {exercises.map((item) => (
              <div key={item.id} className="day-card-entry">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="day-card-entry-title">{item.name}</span>
                  <span className="day-card-entry-meta">
                    {item.minutes > 0 ? `${item.minutes} λεπτά · ` : ""}+{formatNumber(item.calories)} kcal
                  </span>
                </div>
                <button className="day-card-btn" onClick={() => deleteExercise(item.id)} type="button">✕</button>
              </div>
            ))}
          </div>
        )}
        <GoogleFitButton selectedDate={selectedDate} onAddExercise={handleAddFromFit} />
      </div>

      {/* ΠΡΟΣΘΗΚΗ ΑΣΚΗΣΗΣ */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Προσθήκη άσκησης</h2>

        {/* Φίλτρα κατηγορίας */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => { setActiveCategory(cat); setSelectedExerciseName(""); }} type="button"
              style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${activeCategory === cat ? "var(--color-accent)" : "var(--border-color)"}`, background: activeCategory === cat ? "var(--color-accent)" : "var(--bg-soft)", color: activeCategory === cat ? "var(--bg-card)" : "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Dropdown + Star */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <select
            className="input"
            value={selectedExerciseName}
            onChange={(e) => setSelectedExerciseName(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">— Επίλεξε άσκηση —</option>
            {filteredExercises.map((e) => (
              <option key={e.name} value={e.name}>
                {e.icon} {e.name} · {e.caloriesPerMinute} kcal/λεπτό
              </option>
            ))}
          </select>
          {selectedExercise && (
            <button
              onClick={() => toggleFavoriteExercise?.(selectedExercise)}
              type="button"
              title={isFavoriteExercise?.(selectedExercise) ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
              style={{ padding: "10px 12px", background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, cursor: "pointer", fontSize: 18, flexShrink: 0, color: isFavoriteExercise?.(selectedExercise) ? "#d97706" : "var(--text-muted)" }}>
              {isFavoriteExercise?.(selectedExercise) ? "⭐" : "☆"}
            </button>
          )}
        </div>

        {/* Λεπτά + Preview + Add */}
        {selectedExercise && (
          <div style={{ background: "var(--bg-soft)", borderRadius: 14, padding: 14, marginBottom: 10, border: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              {selectedExercise.icon} {selectedExercise.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <button onClick={() => setSelectedMinutes((prev) => String(Math.max(5, Number(prev) - 5)))} type="button"
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>−</button>
              <input className="input" type="number" value={selectedMinutes} onChange={(e) => setSelectedMinutes(e.target.value)}
                style={{ width: 70, textAlign: "center", padding: "6px 8px" }} />
              <button onClick={() => setSelectedMinutes((prev) => String(Number(prev) + 5))} type="button"
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-card)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>+</button>
              <span className="muted" style={{ fontSize: 13 }}>λεπτά</span>
            </div>
            <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 13 }}>
              <span className="muted">Θερμίδες: </span>
              <strong>{formatNumber(Math.round(selectedExercise.caloriesPerMinute * (Number(selectedMinutes) || 0)))} kcal</strong>
              <span className="muted" style={{ marginLeft: 8 }}>· {selectedExercise.caloriesPerMinute} kcal/λεπτό</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-dark" onClick={handleAddExercise} type="button" style={{ flex: 1 }}>Προσθήκη</button>
              <button className="btn btn-light" onClick={() => setSelectedExerciseName("")} type="button">Άκυρο</button>
            </div>
          </div>
        )}
      </div>

      {/* ΑΓΑΠΗΜΕΝΕΣ ΑΣΚΗΣΕΙΣ */}
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>⭐ Αγαπημένες ασκήσεις</h2>
        {favoriteExercises.length === 0 ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "14px 16px", border: "1px dashed var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Δεν έχεις αγαπημένες ασκήσεις ακόμα</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Επίλεξε μια άσκηση από το dropdown και πάτα ☆ για να την προσθέσεις. Ο AI Coach θα προτείνει ασκήσεις από τα αγαπημένα σου!
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {favoriteExercises.map((exercise) => (
              <div key={exercise.name}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
                <button onClick={() => toggleFavoriteExercise?.(exercise)} type="button"
                  style={{ padding: "10px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0, color: "#d97706" }}>⭐</button>
                <button onClick={() => setSelectedExerciseName(exercise.name)} type="button"
                  style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px 8px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 16, marginRight: 6 }}>{exercise.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{exercise.name}</span>
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>{exercise.caloriesPerMinute} kcal/λεπτό</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CUSTOM ΑΣΚΗΣΗ */}
      <div className="card">
        <h2>Custom άσκηση</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" placeholder="Όνομα άσκησης" value={customExerciseName} onChange={(e) => setCustomExerciseName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Λεπτά" inputMode="numeric" value={customExerciseMinutes} onChange={(e) => setCustomExerciseMinutes(e.target.value)} />
            <input className="input" placeholder="kcal/λεπτό" inputMode="decimal" value={customExerciseRate} onChange={(e) => setCustomExerciseRate(e.target.value)} />
          </div>
          <button className="btn btn-dark" onClick={addCustomExercise} type="button">Προσθήκη</button>
        </div>
      </div>
    </>
  );
}
```

## src\components\tabs\FoodTab.jsx
```
import { useMemo, useState } from "react";
import { MEALS } from "../../data/constants";
import { createFoodEntry, formatNumber, normalizeFood, stripDiacritics } from "../../utils/helpers";
import useFoodSearch from "../../hooks/useFoodSearch";
import BarcodeScanner from "../BarcodeScanner";
import FoodPhotoAnalyzer from "../FoodPhotoAnalyzer";

function getFoodSearchScore(food, query) {
  const q = stripDiacritics(String(query || "")).toLowerCase().trim();
  if (!q) return 0;
  const name = stripDiacritics(String(food.name || "")).toLowerCase();
  const brand = stripDiacritics(String(food.brand || "")).toLowerCase();
  const combined = `${name} ${brand}`.trim();
  let score = 0;
  if (name === q) score += 120;
  if (combined === q) score += 110;
  if (name.startsWith(q)) score += 80;
  if (brand.startsWith(q)) score += 35;
  if (name.includes(q)) score += 45;
  if (combined.includes(q)) score += 20;
  if (food.source === "local") score += 25;
  if (food.source === "usda") score += 10;
  if (food.source === "off") score += 8;
  const protein = Number(food.proteinPer100g || 0);
  const calories = Number(food.caloriesPer100g || 0);
  if (protein > 0) score += Math.min(protein, 30) * 0.1;
  if (calories > 0 && calories < 700) score += 2;
  return score;
}

const FILTERS = [
  { key: "all", label: "Όλα" },
  { key: "high_protein", label: "💪 High Protein", check: (f) => Number(f.proteinPer100g || 0) >= 15 },
  { key: "low_carb", label: "🥑 Low Carb", check: (f) => Number(f.carbsPer100g || 0) <= 15 },
  { key: "low_cal", label: "🥗 Low Cal", check: (f) => Number(f.caloriesPer100g || 0) <= 200 },
  { key: "keto", label: "⚡ Keto", check: (f) => Number(f.carbsPer100g || 0) <= 8 },
];

function FoodAddModal({ food, onAdd, onClose }) {
  const hasPotions = Array.isArray(food.portions) && food.portions.length > 0;
  const [mode, setMode] = useState(hasPotions ? "portion" : "grams");
  const [selectedPortion, setSelectedPortion] = useState(0);
  const [portionQty, setPortionQty] = useState("1");
  const [grams, setGrams] = useState(String(food.estimatedGrams || 100));
  const [meal, setMeal] = useState("Πρωινό");

  const effectiveGrams = useMemo(() => {
    if (mode === "portion" && hasPotions) {
      const portion = food.portions[selectedPortion];
      const qty = Math.max(parseFloat(portionQty) || 1, 0.5);
      return Math.round(portion.grams * qty);
    }
    return Math.max(Number(grams) || 100, 1);
  }, [mode, selectedPortion, portionQty, grams, food.portions, hasPotions]);

  const calories = Math.round((food.caloriesPer100g || 0) * effectiveGrams / 100);
  const protein = Math.round((food.proteinPer100g || 0) * effectiveGrams / 100 * 10) / 10;
  const carbs = Math.round((food.carbsPer100g || 0) * effectiveGrams / 100 * 10) / 10;
  const fat = Math.round((food.fatPer100g || 0) * effectiveGrams / 100 * 10) / 10;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--bg-card)", borderRadius: 20, padding: 20, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-modal)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{food.name}</div>
        {food.brand && <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{food.brand}</div>}

        {hasPotions && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button onClick={() => setMode("portion")} type="button"
              style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mode === "portion" ? "var(--color-accent)" : "var(--bg-soft)", color: mode === "portion" ? "var(--bg-card)" : "var(--text-muted)" }}>
              🥣 Μερίδα
            </button>
            <button onClick={() => setMode("grams")} type="button"
              style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mode === "grams" ? "var(--color-accent)" : "var(--bg-soft)", color: mode === "grams" ? "var(--bg-card)" : "var(--text-muted)" }}>
              ⚖️ Γραμμάρια
            </button>
          </div>
        )}

        {mode === "portion" && hasPotions && (
          <div style={{ marginBottom: 14 }}>
            <div className="profile-label" style={{ marginBottom: 6 }}>Μερίδα</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {food.portions.map((portion, i) => (
                <button key={i} onClick={() => setSelectedPortion(i)} type="button"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 13, border: `2px solid ${selectedPortion === i ? "var(--color-accent)" : "var(--border-color)"}`, background: selectedPortion === i ? "var(--bg-soft)" : "var(--bg-card)", color: "var(--text-primary)" }}>
                  <span>{portion.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{portion.grams}g</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="profile-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Ποσότητα:</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setPortionQty((prev) => String(Math.max(0.5, parseFloat(prev) - 0.5)))} type="button"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>−</button>
                <input className="input" type="number" step="0.5" min="0.5" value={portionQty} onChange={(e) => setPortionQty(e.target.value)} style={{ width: 60, textAlign: "center", padding: "6px 8px" }} />
                <button onClick={() => setPortionQty((prev) => String(parseFloat(prev) + 0.5))} type="button"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>+</button>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>= {effectiveGrams}g</span>
            </div>
          </div>
        )}

        {mode === "grams" && (
          <div style={{ marginBottom: 14 }}>
            <div className="profile-label" style={{ marginBottom: 6 }}>Γραμμάρια</div>
            <input className="input" type="number" value={grams} onChange={(e) => setGrams(e.target.value)} inputMode="numeric" autoFocus={!hasPotions} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div className="profile-label" style={{ marginBottom: 6 }}>Γεύμα</div>
          <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
            {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{formatNumber(calories)}</div>
              <div className="muted" style={{ fontSize: 11 }}>kcal</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{formatNumber(protein)}g</div>
              <div className="muted" style={{ fontSize: 11 }}>Protein</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{formatNumber(carbs)}g</div>
              <div className="muted" style={{ fontSize: 11 }}>Carbs</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{formatNumber(fat)}g</div>
              <div className="muted" style={{ fontSize: 11 }}>Fat</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-dark" onClick={() => onAdd(food, effectiveGrams, meal)} type="button" style={{ flex: 1 }}>Προσθήκη</button>
          <button className="btn btn-light" onClick={onClose} type="button">Άκυρο</button>
        </div>
      </div>
    </div>
  );
}

export default function FoodTab({
  foods, customFoods, onAddCustomFood, onDeleteCustomFood,
  recentFoods, favoriteFoods, isFavorite, toggleFavorite,
  saveRecentFood, updateCurrentDay, quickAddRecent, quickAddFavorite,
  entries, groupedEntries, deleteEntry, openEditEntry
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedFood, setSelectedFood] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoAnalyzer, setShowPhotoAnalyzer] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFat, setNewFat] = useState("");

  const { results: databaseResults, loading: databaseLoading } = useFoodSearch(query);

  const filteredFoods = useMemo(() => {
    if (!query.trim()) return foods;
    const q = stripDiacritics(query.toLowerCase().trim());
    return foods.filter((food) => {
      const haystack = stripDiacritics(`${food.name} ${food.brand || ""}`).toLowerCase();
      return haystack.includes(q);
    });
  }, [foods, query]);

  const normalizedDatabaseResults = useMemo(() => {
    return (Array.isArray(databaseResults) ? databaseResults : []).map((food) =>
      normalizeFood({
        id: food.id, source: food.source || "database", sourceLabel: food.sourceLabel || "Database",
        name: food.name, brand: food.brand || "",
        caloriesPer100g: Number(food.caloriesPer100g ?? food.calories) || 0,
        proteinPer100g: Number(food.proteinPer100g ?? food.protein) || 0,
        carbsPer100g: Number(food.carbsPer100g ?? food.carbs) || 0,
        fatPer100g: Number(food.fatPer100g ?? food.fat) || 0
      })
    );
  }, [databaseResults]);

  const visibleFoods = useMemo(() => {
    const localFoods = filteredFoods.map((food) =>
      normalizeFood({ ...food, source: food.source || "local", sourceLabel: food.sourceLabel || "Local" })
    );
    const merged = [...localFoods, ...normalizedDatabaseResults];
    const seen = new Set();
    const deduped = merged.filter((food) => {
      const key = `${String(food.name || "").trim().toLowerCase()}|${String(food.brand || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const filter = FILTERS.find((f) => f.key === activeFilter);
    const afterFilter = filter?.check ? deduped.filter(filter.check) : deduped;
    if (!query.trim()) return afterFilter;
    return [...afterFilter].sort((a, b) => getFoodSearchScore(b, query) - getFoodSearchScore(a, query));
  }, [filteredFoods, normalizedDatabaseResults, query, activeFilter]);

  const topSearchResults = useMemo(() => visibleFoods.slice(0, 8), [visibleFoods]);
  const showAutocomplete = query.trim().length >= 2;

  function handleFoodSelect(food) { setSelectedFood(food); setQuery(""); }

  function handleAdd(food, gramsValue, meal) {
    const entry = createFoodEntry(food, gramsValue, meal);
    updateCurrentDay((current) => ({ ...current, entries: [entry, ...current.entries] }));
    saveRecentFood(food, gramsValue, meal);
    setSelectedFood(null);
  }

  function handleAddCustomFood() {
    if (!newName.trim() || !newCalories) return;
    onAddCustomFood({
      name: newName.trim(),
      caloriesPer100g: Number(newCalories) || 0,
      proteinPer100g: Number(newProtein) || 0,
      carbsPer100g: Number(newCarbs) || 0,
      fatPer100g: Number(newFat) || 0
    });
    setNewName(""); setNewCalories(""); setNewProtein(""); setNewCarbs(""); setNewFat("");
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  async function handleBarcodeResult(code) {
    setShowScanner(false); setBarcodeLoading(true); setBarcodeError("");
    try {
      const res = await fetch(`/.netlify/functions/barcode-search?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!data.found) { setBarcodeError(`Δεν βρέθηκε προϊόν για barcode: ${code}`); return; }
      setSelectedFood(normalizeFood(data));
    } catch { setBarcodeError("Σφάλμα κατά την αναζήτηση barcode."); }
    finally { setBarcodeLoading(false); }
  }

  function getSourceBadge(food) {
    if (food.source === "local") return "";
    if (food.source === "usda") return "USDA";
    if (food.source === "off") return "OpenFood";
    if (food.source === "fatsecret") return "FatSecret";
    if (food.sourceLabel && food.sourceLabel !== "Local") return food.sourceLabel;
    return "";
  }

  const totalFoodCalories = entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);

  return (
    <>
      {showScanner && <BarcodeScanner onResult={handleBarcodeResult} onClose={() => setShowScanner(false)} />}
      {showPhotoAnalyzer && (
        <FoodPhotoAnalyzer
          onFoodFound={(food) => { setSelectedFood(food); setShowPhotoAnalyzer(false); }}
          onClose={() => setShowPhotoAnalyzer(false)}
        />
      )}
      {selectedFood && (
        <FoodAddModal food={selectedFood} onAdd={handleAdd} onClose={() => setSelectedFood(null)} />
      )}

      {/* ΦΑΓΗΤΟ ΗΜΕΡΑΣ */}
      <div className="day-card">
        <div className="day-card-total">
          <h2 style={{ color: "white", margin: 0, fontSize: 16 }}>Φαγητό ημέρας</h2>
          <span style={{ fontWeight: 800, fontSize: 18, color: "white" }}>{formatNumber(totalFoodCalories)} kcal</span>
        </div>
        {entries.length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Δεν έχεις βάλει φαγητό ακόμα.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {MEALS.map((meal) => {
              const group = groupedEntries[meal];
              if (!group || group.items.length === 0) return null;
              return (
                <div key={meal}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 2px" }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{meal}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{formatNumber(group.totalCalories)} kcal</span>
                  </div>
                  {group.items.map((item) => (
                    <div key={item.id} className="day-card-entry">
                      <button onClick={() => openEditEntry(item)} type="button" style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
                        <span className="day-card-entry-title">{item.name}</span>
                        <span className="day-card-entry-meta">{item.grams}g · {formatNumber(item.calories)} kcal · P{formatNumber(item.protein)}</span>
                      </button>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button className="day-card-btn" onClick={() => openEditEntry(item)} type="button">✏️</button>
                        <button className="day-card-btn" onClick={() => deleteEntry(item.id)} type="button">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ΠΡΟΣΘΗΚΗ ΦΑΓΗΤΟΥ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Προσθήκη φαγητού</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-dark" onClick={() => setShowPhotoAnalyzer(true)} type="button" style={{ fontSize: 13, padding: "8px 12px" }}>📸 Photo</button>
            <button className="btn btn-dark" onClick={() => { setShowScanner(true); setBarcodeError(""); }} type="button" style={{ fontSize: 13, padding: "8px 12px" }}>🔲 Barcode</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} type="button"
              style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${activeFilter === f.key ? "var(--color-accent)" : "var(--border-color)"}`, background: activeFilter === f.key ? "var(--color-accent)" : "var(--bg-soft)", color: activeFilter === f.key ? "var(--bg-card)" : "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {f.label}
            </button>
          ))}
        </div>

        {barcodeLoading && <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>🔍 Αναζήτηση barcode...</div>}
        {barcodeError && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{barcodeError}</div>}

        <input className="input" placeholder="Γράψε φαγητό..." value={query} onChange={(e) => setQuery(e.target.value)} />

        {showAutocomplete && (
          <div style={{ marginTop: 6, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {databaseLoading && <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>Αναζήτηση...</div>}
            {!databaseLoading && topSearchResults.length === 0 && (
              <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>Δεν βρέθηκαν αποτελέσματα.</div>
            )}
            {!databaseLoading && topSearchResults.map((food) => (
              <div key={`auto-${food.source || "local"}-${food.id}`}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                {/* Κουμπί αγαπημένου */}
                <button
                  onClick={() => toggleFavorite(food)}
                  type="button"
                  title={isFavorite(food) ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
                  style={{ padding: "10px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0, color: isFavorite(food) ? "#d97706" : "var(--text-muted)" }}>
                  {isFavorite(food) ? "⭐" : "☆"}
                </button>
                {/* Κουμπί επιλογής */}
                <button onClick={() => handleFoodSelect(food)} type="button"
                  style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px 8px 0", background: "none", border: "none", cursor: "pointer", gap: 8, flexWrap: "wrap", textAlign: "left" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                      {food.name}{food.brand ? ` · ${food.brand}` : ""}
                    </span>
                    {getSourceBadge(food) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(food)}</span>}
                    {food.portions?.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--color-green)", fontWeight: 700 }}>🥣</span>}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΑΓΑΠΗΜΕΝΑ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>⭐ Αγαπημένα</h2>
          {favoriteFoods.length > 0 && (
            <span className="muted" style={{ fontSize: 12 }}>{favoriteFoods.length} φαγητά</span>
          )}
        </div>

        {favoriteFoods.length === 0 ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "14px 16px", border: "1px dashed var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Δεν έχεις αγαπημένα ακόμα</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Ψάξε ένα φαγητό παραπάνω και πάτα ☆ για να το προσθέσεις. Ο AI Coach θα χρησιμοποιεί τα αγαπημένα σου για πιο στοχευμένες προτάσεις!
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {favoriteFoods.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
                <button
                  onClick={() => toggleFavorite(food)}
                  type="button"
                  title="Αφαίρεση από αγαπημένα"
                  style={{ padding: "10px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0, color: "#d97706" }}>
                  ⭐
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{food.name}</span>
                  {getSourceBadge(food) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(food)}</span>}
                  <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}</span>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 8 }}>
                  <button className="btn btn-light" onClick={() => handleFoodSelect(food)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                  <button className="btn btn-dark" onClick={() => quickAddFavorite(food)} type="button" style={{ padding: "4px 10px", fontSize: 12 }}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΠΡΟΣΦΑΤΑ */}
      {recentFoods.length > 0 && (
        <div className="card">
          <h2>Πρόσφατα</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentFoods.slice(0, 6).map((item) => {
              const cal = createFoodEntry(item.food, item.grams, item.mealType);
              return (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
                  <button
                    onClick={() => toggleFavorite(item.food)}
                    type="button"
                    title={isFavorite(item.food) ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
                    style={{ padding: "10px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0, color: isFavorite(item.food) ? "#d97706" : "var(--text-muted)" }}>
                    {isFavorite(item.food) ? "⭐" : "☆"}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{item.food.name}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{item.grams}g · {item.mealType} · {formatNumber(cal.calories)} kcal</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 8 }}>
                    <button className="btn btn-light" onClick={() => handleFoodSelect(item.food)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                    <button className="btn btn-dark" onClick={() => quickAddRecent(item)} type="button" style={{ padding: "4px 10px", fontSize: 12 }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CUSTOM ΦΑΓΗΤΟ */}
      <div className="card">
        <h2>Custom φαγητό</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" placeholder="Όνομα" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="kcal/100g" inputMode="numeric" value={newCalories} onChange={(e) => setNewCalories(e.target.value)} />
            <input className="input" placeholder="Protein" inputMode="decimal" value={newProtein} onChange={(e) => setNewProtein(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Carbs" inputMode="decimal" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value)} />
            <input className="input" placeholder="Fat" inputMode="decimal" value={newFat} onChange={(e) => setNewFat(e.target.value)} />
          </div>
          <button className="btn btn-dark" onClick={handleAddCustomFood} type="button">
            {savedFeedback ? "✅ Αποθηκεύτηκε!" : "Αποθήκευση"}
          </button>
        </div>

        {customFoods.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--text-muted)" }}>Τα custom φαγητά μου</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {customFoods.map((food) => (
                <div key={food.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{food.name}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{formatNumber(food.caloriesPer100g)} kcal · P{formatNumber(food.proteinPer100g)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-dark" onClick={() => handleFoodSelect(food)} type="button" style={{ padding: "4px 10px", fontSize: 12 }}>+</button>
                    <button className="btn btn-light" onClick={() => onDeleteCustomFood(food.id)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

## src\components\tabs\ProfileTab.jsx
```
import { useState, useEffect } from "react";
import { calculateAppliedDailyDeficit } from "../../utils/calorieLogic";
import { formatNumber } from "../../utils/helpers";

function GoalWarning({ goalType, kilosPerWeek, rawDeficit, isCapped }) {
  if (goalType !== "lose" || kilosPerWeek <= 0) return null;

  let color = "#166534", bg = "#dcfce7", border = "#86efac", icon = "✅", message = "";

  if (kilosPerWeek > 1.5) {
    color = "#b91c1c"; bg = "#fef2f2"; border = "#fecaca"; icon = "⚠️";
    message = `Ο στόχος των ${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα είναι μη ρεαλιστικός. Δοκίμασε περισσότερες εβδομάδες ή μικρότερο στόχο κιλών. Το ασφαλές όριο είναι 0.5-1 kg/εβδομάδα.`;
  } else if (kilosPerWeek > 1) {
    color = "#92400e"; bg = "#fffbeb"; border = "#fde68a"; icon = "⚡";
    message = `Ο ρυθμός ${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα είναι επιθετικός. Είναι εφικτός αλλά απαιτεί αυστηρή τήρηση.${isCapped ? " Το έλλειμμα έχει περιοριστεί στις 1000 kcal/ημέρα για ασφάλεια." : ""}`;
  } else {
    message = `Ο ρυθμός ${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα είναι ρεαλιστικός και υγιεινός.${isCapped ? " Το έλλειμμα έχει περιοριστεί στις 1000 kcal/ημέρα." : ""}`;
  }

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ color, fontSize: 13, lineHeight: 1.5 }}>{message}</div>
    </div>
  );
}

export default function ProfileTab({
  age, setAge, gender, setGender,
  height, setHeight, weight, setWeight,
  activity, setActivity, goalType, setGoalType,
  mode, setMode, targetWeightLoss, setTargetWeightLoss,
  weeks, setWeeks, tdee, targetCalories,
  dailyDeficit, proteinTarget, profileComplete, onContinue
}) {
  const [localAge, setLocalAge] = useState(age);
  const [localHeight, setLocalHeight] = useState(height);
  const [localWeight, setLocalWeight] = useState(weight);
  const [localTargetWeightLoss, setLocalTargetWeightLoss] = useState(targetWeightLoss);
  const [localWeeks, setLocalWeeks] = useState(weeks);

  useEffect(() => { setLocalAge(age); }, [age]);
  useEffect(() => { setLocalHeight(height); }, [height]);
  useEffect(() => { setLocalWeight(weight); }, [weight]);
  useEffect(() => { setLocalTargetWeightLoss(targetWeightLoss); }, [targetWeightLoss]);
  useEffect(() => { setLocalWeeks(weeks); }, [weeks]);

  const showGoalFields = goalType === "lose" || goalType === "gain";

  function getGoalLabel() {
    if (goalType === "lose") return "Lose weight";
    if (goalType === "gain") return "Muscle gain";
    if (goalType === "fitness") return "Fitness & Cardio";
    return "Maintain";
  }

  function getModeLabel() {
    if (mode === "low_carb") return "Low Carb";
    if (mode === "keto") return "Keto";
    if (mode === "fasting") return "Fasting 16:8";
    if (mode === "high_protein") return "High Protein";
    return "Balanced";
  }

  function getActivityLabel() {
    if (activity === "1.2") return "Καθιστική";
    if (activity === "1.4") return "Light";
    if (activity === "1.6") return "Moderate";
    if (activity === "1.8") return "High";
    return "-";
  }

  const rawDeficit = Number(dailyDeficit || 0);
  const appliedDeficit = calculateAppliedDailyDeficit(rawDeficit);
  const kilosNum = Number(targetWeightLoss || 0);
  const weeksNum = Number(weeks || 0);
  const kilosPerWeek = goalType === "lose" && kilosNum > 0 && weeksNum > 0 ? kilosNum / weeksNum : 0;
  const isCapped = goalType === "lose" && rawDeficit > 1000;

  return (
    <div className="card">
      <h2>Προφίλ & στόχος</h2>

      {!profileComplete && (
        <div className="soft-box profile-intro-box">
          <div className="profile-section-title">Συμπλήρωσε πρώτα το προφίλ σου</div>
          <div className="muted">Μόλις βάλεις τα βασικά στοιχεία σου, το app θα υπολογίσει σωστά τον ημερήσιο στόχο θερμίδων και πρωτεΐνης.</div>
        </div>
      )}

      <div className="soft-box profile-section-box">
        <div className="profile-section-title">Βασικά στοιχεία</div>
        <div className="grid-2 profile-grid-compact">
          <label className="profile-field">
            <div className="profile-label">Ηλικία</div>
            <input className="input" placeholder="Ηλικία" inputMode="numeric" value={localAge}
              onChange={(e) => setLocalAge(e.target.value)} onBlur={() => setAge(localAge)} />
          </label>
          <label className="profile-field">
            <div className="profile-label">Φύλο</div>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Άνδρας</option>
              <option value="female">Γυναίκα</option>
            </select>
          </label>
          <label className="profile-field">
            <div className="profile-label">Ύψος (cm)</div>
            <input className="input" placeholder="Ύψος (cm)" inputMode="numeric" value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => setHeight(localHeight)} />
          </label>
          <label className="profile-field">
            <div className="profile-label">Βάρος (kg)</div>
            <input className="input" placeholder="Βάρος (kg)" inputMode="decimal" value={localWeight}
              onChange={(e) => setLocalWeight(e.target.value)} onBlur={() => setWeight(localWeight)} />
          </label>
        </div>
      </div>

      <div className="soft-box profile-section-box">
        <div className="profile-section-title">Ρυθμίσεις στόχου</div>
        <div className="stack-10">
          <label className="profile-field">
            <div className="profile-label">Επίπεδο δραστηριότητας</div>
            <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
              <option value="1.2">Καθιστική</option>
              <option value="1.4">Light</option>
              <option value="1.6">Moderate</option>
              <option value="1.8">High</option>
            </select>
          </label>
          <label className="profile-field">
            <div className="profile-label">Στόχος</div>
            <select className="input" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Muscle gain</option>
              <option value="fitness">Fitness & Cardio</option>
            </select>
          </label>
          <label className="profile-field">
            <div className="profile-label">Τρόπος διατροφής</div>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="balanced">Balanced</option>
              <option value="low_carb">Low Carb</option>
              <option value="keto">Keto</option>
              <option value="fasting">Fasting 16:8</option>
              <option value="high_protein">High Protein</option>
            </select>
          </label>
        </div>
      </div>

      {showGoalFields && (
        <div className="soft-box profile-section-box">
          <div className="profile-section-title">Στοιχεία στόχου</div>
          <div className="grid-2 profile-grid-compact">
            <label className="profile-field">
              <div className="profile-label">{goalType === "lose" ? "Κιλά να χάσω" : "Κιλά να πάρω"}</div>
              <input className="input" placeholder={goalType === "lose" ? "Κιλά να χάσω" : "Κιλά να πάρω"}
                inputMode="decimal" value={localTargetWeightLoss}
                onChange={(e) => setLocalTargetWeightLoss(e.target.value)}
                onBlur={() => setTargetWeightLoss(localTargetWeightLoss)} />
            </label>
            <label className="profile-field">
              <div className="profile-label">Εβδομάδες</div>
              <input className="input" placeholder="Σε πόσες εβδομάδες" inputMode="numeric" value={localWeeks}
                onChange={(e) => setLocalWeeks(e.target.value)} onBlur={() => setWeeks(localWeeks)} />
            </label>
          </div>
        </div>
      )}

      <GoalWarning goalType={goalType} kilosPerWeek={kilosPerWeek} rawDeficit={rawDeficit} isCapped={isCapped} />

      <div className="soft-box profile-section-box profile-highlight-box">
        <div className="profile-section-title">Υπολογισμοί</div>
        <div className="profile-stat-row">
          <span>Maintenance / TDEE</span>
          <strong>{formatNumber(tdee)} kcal</strong>
        </div>
        <div className="profile-stat-row">
          <span>Ημερήσιος στόχος</span>
          <strong>{formatNumber(targetCalories)} kcal</strong>
        </div>
        {goalType === "lose" && appliedDeficit > 0 && (
          <div className="profile-stat-row">
            <span>Ημερήσιο έλλειμμα</span>
            <strong>{formatNumber(appliedDeficit)} kcal</strong>
          </div>
        )}
        {goalType === "gain" && (
          <div className="profile-stat-row">
            <span>Ημερήσιο πλεόνασμα</span>
            <strong>300 kcal</strong>
          </div>
        )}
        {goalType === "fitness" && (
          <div className="profile-stat-row">
            <span>Focus</span>
            <strong>Cardio & Aerobic</strong>
          </div>
        )}
        <div className="profile-stat-row profile-stat-row-last">
          <span>Στόχος πρωτεΐνης</span>
          <strong>{formatNumber(proteinTarget || 0)} g</strong>
        </div>
      </div>

      <div className="soft-box profile-section-box">
        <div className="profile-section-title">Σύνοψη</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Στόχος</span>
            <strong>{getGoalLabel()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Διατροφή</span>
            <strong>{getModeLabel()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Δραστηριότητα</span>
            <strong>{getActivityLabel()}</strong>
          </div>
          {goalType === "lose" && kilosPerWeek > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Ρυθμός</span>
              <strong>{formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα</strong>
            </div>
          )}
        </div>
      </div>

      <div className="action-row" style={{ marginTop: 16 }}>
        <button className="btn btn-dark" onClick={onContinue} disabled={!profileComplete}
          style={{ opacity: profileComplete ? 1 : 0.5, cursor: profileComplete ? "pointer" : "not-allowed" }}>
          Αποθήκευση & συνέχεια
        </button>
      </div>
    </div>
  );
}
```

## src\components\tabs\SummaryTab.jsx
```
import { useMemo, useRef, useState } from "react";
import { formatDisplayDate, formatNumber } from "../../utils/helpers";
import { calculateStreak, getStreakEmoji } from "../../utils/streak";
import AiCoach from "../AiCoach";

export default function SummaryTab({
  selectedDate, setSelectedDate, isToday,
  targetCalories, totalCalories, exerciseValue,
  remainingCalories, progress, goalType,
  last7Days, proteinTarget, totalProtein,
  totalCarbs, totalFat, mode, macroTargets,
  foods, dailyLogs, weightLog,
  onAddWeight, onDeleteWeight,
  favoriteFoods, favoriteFoodsText, favoriteExercisesText,
  favoriteExercises
}) {
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAllWeight, setShowAllWeight] = useState(false);
  const dateInputRef = useRef(null);

  const streak = useMemo(() => calculateStreak(dailyLogs, targetCalories), [dailyLogs, targetCalories]);

  const sortedWeightLog = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [weightLog]);

  const chartData = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [weightLog]);

  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : null;
  const minW = chartData.length ? Math.min(...chartData.map((d) => d.weight)) - 1 : 0;
  const maxW = chartData.length ? Math.max(...chartData.map((d) => d.weight)) + 1 : 1;
  const range = maxW - minW || 1;
  const chartH = 100;
  const chartW = 300;

  function handleAddWeight() {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) return;
    onAddWeight({ date: weightDate, weight: w });
    setWeightInput("");
  }

  function getGoalLabel() {
    if (goalType === "lose") return "Lose weight";
    if (goalType === "gain") return "Muscle gain";
    if (goalType === "fitness") return "Fitness & Cardio";
    return "Maintain";
  }

  function getModeLabel() {
    if (mode === "low_carb") return "Low Carb";
    if (mode === "keto") return "Keto";
    if (mode === "fasting") return "Fasting 16:8";
    if (mode === "high_protein") return "High Protein";
    return "Balanced";
  }

  function getRemainingColor() {
    if (remainingCalories > 100) return "#86efac";
    if (remainingCalories < -150) return "#fca5a5";
    return "#fde68a";
  }

  function getModeHint() {
    if (mode === "low_carb") return "Δώσε έμφαση σε πρωτεΐνη και χαμηλούς υδατάνθρακες.";
    if (mode === "keto") return "Κράτα τους υδατάνθρακες πολύ χαμηλά.";
    if (mode === "fasting") return "Έχει σημασία και το timing των γευμάτων.";
    if (mode === "high_protein") return "Δώσε έμφαση στην πρωτεΐνη.";
    return "Στόχευσε σε ισορροπημένη πρόσληψη θερμίδων.";
  }

  function getSuggestionReason(food) {
    const protein = Number(food.proteinPer100g || 0);
    const carbs = Number(food.carbsPer100g || 0);
    if (mode === "high_protein" && protein >= 18) return "Υψηλή πρωτεΐνη";
    if (mode === "low_carb" && carbs <= 12) return "Low carb";
    if (mode === "keto" && carbs <= 8) return "Keto friendly";
    if (mode === "fasting") return "Χορταστικό";
    return "Καλή επιλογή";
  }

  function getSuggestedFoods() {
    if (!Array.isArray(foods) || foods.length === 0) return [];
    const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);
    return foods
      .filter((food) => Number(food.caloriesPer100g || 0) > 0)
      .filter((food) => Number(food.caloriesPer100g || 0) <= Math.max(remainingCalories, 250) + 120)
      .filter((food) => {
        const carbs = Number(food.carbsPer100g || 0);
        if (mode === "keto") return carbs <= 8;
        if (mode === "low_carb") return carbs <= 15;
        return true;
      })
      .sort((a, b) => {
        const aProtein = Number(a.proteinPer100g || 0);
        const bProtein = Number(b.proteinPer100g || 0);
        const aCalories = Number(a.caloriesPer100g || 0);
        const bCalories = Number(b.caloriesPer100g || 0);
        const aCarbs = Number(a.carbsPer100g || 0);
        const bCarbs = Number(b.carbsPer100g || 0);
        let aScore = 0; let bScore = 0;
        if (remainingProtein > 15) { aScore += aProtein * 3; bScore += bProtein * 3; }
        else { aScore += aProtein * 1.5; bScore += bProtein * 1.5; }
        if (mode === "high_protein") { aScore += aProtein * 2; bScore += bProtein * 2; }
        if (mode === "low_carb") { aScore -= aCarbs * 2; bScore -= bCarbs * 2; }
        if (mode === "keto") { aScore -= aCarbs * 4; bScore -= bCarbs * 4; }
        aScore -= aCalories * 0.03; bScore -= bCalories * 0.03;
        return bScore - aScore;
      })
      .slice(0, 5);
  }

  const suggestions = getSuggestedFoods();
  const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);
  const proteinPercent = macroTargets?.proteinGrams ? Math.min((totalProtein / macroTargets.proteinGrams) * 100, 100) : 0;
  const carbsPercent = macroTargets?.carbsGrams ? Math.min((totalCarbs / macroTargets.carbsGrams) * 100, 100) : 0;
  const fatPercent = macroTargets?.fatGrams ? Math.min((totalFat / macroTargets.fatGrams) * 100, 100) : 0;

  return (
    <>
      {/* HERO CARD */}
      <div className="hero-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {formatDisplayDate(selectedDate)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>· Σήμερα</span>}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {!isToday && (
              <button className="btn btn-light" onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))} type="button" style={{ fontSize: 12, padding: "6px 10px" }}>Σήμερα</button>
            )}
            {/* Hidden date input triggered by calendar icon */}
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
            />
            <button
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
              type="button"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "7px 10px", cursor: "pointer", fontSize: 18, color: "white", lineHeight: 1 }}
              title="Επίλεξε ημερομηνία"
            >
              📅
            </button>
          </div>
        </div>

        {/* ΕΞΙΣΩΣΗ */}
        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <div className="hero-subtle" style={{ fontSize: 12, marginBottom: 8 }}>Υπόλοιπο ημέρας</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>

            <div className="hero-stat" style={{ padding: "10px 14px", minWidth: 100, textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: getRemainingColor() }}>
                {formatNumber(remainingCalories)}
              </div>
              <div className="hero-subtle" style={{ fontSize: 11, marginTop: 3 }}>kcal</div>
            </div>

            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>=</div>

            <div className="hero-stat" style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "8px 8px" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(targetCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 10, marginTop: 2 }}>Στόχος</div>
            </div>

            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, flexShrink: 0 }}>−</div>

            <div className="hero-stat" style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "8px 8px" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(totalCalories)}</div>
              <div className="hero-subtle" style={{ fontSize: 10, marginTop: 2 }}>Φαγητό</div>
            </div>

            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, flexShrink: 0 }}>+</div>

            <div className="hero-stat" style={{ flex: 1, minWidth: 60, textAlign: "center", padding: "8px 8px" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(exerciseValue)}</div>
              <div className="hero-subtle" style={{ fontSize: 10, marginTop: 2 }}>Άσκηση</div>
            </div>

          </div>
        </div>

        <div className="progress-outer">
          <div className="progress-inner" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <div className="hero-subtle" style={{ fontSize: 11 }}>{getGoalLabel()} · {getModeLabel()}</div>
          <div className="hero-subtle" style={{ fontSize: 11 }}>{formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal</div>
        </div>
      </div>

      {/* MACROS */}
      <div className="card">
        <h2>Macros</h2>
        <div className="macro-bars">
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Πρωτεΐνη</span>
              <span className="macro-bar-value">{formatNumber(totalProtein)}g / {formatNumber(macroTargets?.proteinGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-protein" style={{ width: `${proteinPercent}%` }} /></div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Υδατάνθρακες</span>
              <span className="macro-bar-value">{formatNumber(totalCarbs)}g / {formatNumber(macroTargets?.carbsGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-carbs" style={{ width: `${carbsPercent}%` }} /></div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Λίπος</span>
              <span className="macro-bar-value">{formatNumber(totalFat)}g / {formatNumber(macroTargets?.fatGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer"><div className="macro-bar-inner macro-bar-fat" style={{ width: `${fatPercent}%` }} /></div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-soft)", borderRadius: 12, border: "1px solid var(--border-soft)" }}>
          <div style={{ fontWeight: 700 }}>Streak {getStreakEmoji(streak)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 20 }}>{streak}</span>
            <span className="muted">μέρες</span>
          </div>
        </div>
      </div>

      {/* AI COACH */}
      <AiCoach
        last7Days={last7Days}
        dailyLogs={dailyLogs}
        targetCalories={targetCalories}
        proteinTarget={proteinTarget}
        mode={mode}
        goalType={goalType}
        streak={streak}
        weightLog={weightLog}
        favoriteFoods={favoriteFoods}
        totalCalories={totalCalories}
        totalProtein={totalProtein}
        exerciseValue={exerciseValue}
        remainingCalories={remainingCalories}
        favoriteFoodsText={favoriteFoodsText}
        favoriteExercisesText={favoriteExercisesText}
        favoriteExercises={favoriteExercises}
      />

      {/* WEIGHT TRACKING */}
      <div className="card">
        <h2>⚖️ Προσθήκη βάρους</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input className="input" type="number" step="0.1" placeholder="kg" inputMode="decimal" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} style={{ flex: 1 }} />
          <input className="input" type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-dark" onClick={handleAddWeight} type="button" style={{ flexShrink: 0, padding: "12px 16px" }}>+</button>
        </div>

        {chartData.length >= 2 && (
          <div style={{ marginBottom: 8, overflowX: "auto" }}>
            <svg viewBox={`0 0 ${chartW} ${chartH + 16}`} style={{ width: "100%", maxWidth: chartW }}>
              {chartData.map((point, i) => {
                const x = (i / (chartData.length - 1)) * (chartW - 20) + 10;
                const y = chartH - ((point.weight - minW) / range) * (chartH - 10) + 5;
                const next = chartData[i + 1];
                const nx = next ? ((i + 1) / (chartData.length - 1)) * (chartW - 20) + 10 : null;
                const ny = next ? chartH - ((next.weight - minW) / range) * (chartH - 10) + 5 : null;
                const showLabel = i === 0 || i === chartData.length - 1 || i % Math.ceil(chartData.length / 5) === 0;
                return (
                  <g key={point.date}>
                    {next && <line x1={x} y1={y} x2={nx} y2={ny} stroke="var(--color-accent, #111)" strokeWidth="1.5" />}
                    <circle cx={x} cy={y} r="3" fill="var(--color-accent, #111)" />
                    {showLabel && <text x={x} y={chartH + 14} textAnchor="middle" fontSize="7" fill="var(--text-muted, #888)">{point.date.slice(5)}</text>}
                  </g>
                );
              })}
            </svg>
            {diff !== null && (
              <div style={{ fontSize: 13 }}>
                <span className="muted">30 μέρες: </span>
                <strong style={{ color: diff <= 0 ? "green" : "red" }}>
                  {diff > 0 ? "+" : ""}{Math.round(diff * 10) / 10} kg
                </strong>
                {lastWeight && <span className="muted"> · Τώρα: {lastWeight} kg</span>}
              </div>
            )}
          </div>
        )}

        {sortedWeightLog.length > 0 && (
          <div>
            {(showAllWeight ? sortedWeightLog : sortedWeightLog.slice(0, 3)).map((entry) => (
              <div key={entry.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                <span className="muted">{formatDisplayDate(entry.date)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{entry.weight} kg</span>
                  <button className="btn btn-light" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => onDeleteWeight(entry.date)} type="button">✕</button>
                </div>
              </div>
            ))}
            {sortedWeightLog.length > 3 && (
              <button className="btn btn-light" style={{ marginTop: 8, width: "100%", fontSize: 12 }} onClick={() => setShowAllWeight(!showAllWeight)} type="button">
                {showAllWeight ? "Λιγότερα ▲" : `+${sortedWeightLog.length - 3} ακόμα ▼`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ΚΑΤΕΥΘΥΝΣΗ + ΠΡΟΤΑΣΕΙΣ */}
      <div className="card">
        <h2>Κατεύθυνση ημέρας</h2>
        <div className="soft-box" style={{ padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{getModeLabel()} · {getModeHint()}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 13 }}>
            <span><span className="muted">Kcal: </span><strong>{formatNumber(remainingCalories)}</strong></span>
            <span><span className="muted">Protein: </span><strong>{formatNumber(remainingProtein)}g</strong></span>
          </div>
        </div>

        <h2 style={{ marginTop: 16 }}>Τι να φας τώρα</h2>
        {suggestions.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Δεν βρέθηκαν προτάσεις.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {suggestions.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border-soft)", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{food.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)} · {getSuggestionReason(food)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ΙΣΤΟΡΙΚΟ 7 ΗΜΕΡΩΝ */}
      <div className="card">
        <h2>Τελευταίες 7 ημέρες</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {last7Days.map((day) => (
            <button key={day.date} onClick={() => setSelectedDate(day.date)} type="button"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: day.date === selectedDate ? "var(--color-accent)" : "var(--bg-soft)", color: day.date === selectedDate ? "var(--bg-card)" : "var(--text-primary)", borderRadius: 10, border: `1px solid ${day.date === selectedDate ? "var(--color-accent)" : "var(--border-soft)"}`, cursor: "pointer", textAlign: "left", flexWrap: "wrap", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{formatDisplayDate(day.date)}</span>
              <span style={{ fontSize: 12, opacity: day.date === selectedDate ? 0.85 : 1 }}
                className={day.date === selectedDate ? "" : day.remaining >= 0 ? "summary-history-remaining-positive" : "summary-history-remaining-negative"}>
                {formatNumber(day.eaten)} kcal · {day.remaining >= 0 ? "+" : ""}{formatNumber(day.remaining)} υπόλοιπο
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
```

## src\components\tabs\WeightTab.jsx
```
import { useMemo, useState } from "react";
import { formatDisplayDate, formatNumber } from "../../utils/helpers";

export default function WeightTab({ weightLog, onAddWeight, onDeleteWeight }) {
  const [inputWeight, setInputWeight] = useState("");
  const [inputDate, setInputDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const sortedLog = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [weightLog]);

  const chartData = useMemo(() => {
    return [...(weightLog || [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [weightLog]);

  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : null;

  function handleAdd() {
    const w = parseFloat(inputWeight);
    if (!w || w <= 0) return;
    onAddWeight({ date: inputDate, weight: w });
    setInputWeight("");
  }

  const minW = Math.min(...chartData.map((d) => d.weight)) - 1;
  const maxW = Math.max(...chartData.map((d) => d.weight)) + 1;
  const range = maxW - minW || 1;
  const chartH = 160;
  const chartW = 300;

  return (
    <>
      <div className="card">
        <h2>Καταγραφή βάρους</h2>

        <div className="soft-box">
          <div className="grid-2">
            <label className="profile-field">
              <div className="profile-label">Βάρος (kg)</div>
              <input
                className="input"
                type="number"
                step="0.1"
                placeholder="π.χ. 82.5"
                inputMode="decimal"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
              />
            </label>

            <label className="profile-field">
              <div className="profile-label">Ημερομηνία</div>
              <input
                className="input"
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
              />
            </label>
          </div>

          <div className="action-row" style={{ marginTop: 12 }}>
            <button className="btn btn-dark" onClick={handleAdd} type="button">
              Αποθήκευση
            </button>
          </div>
        </div>
      </div>

      {chartData.length >= 2 && (
        <div className="card">
          <h2>Πρόοδος βάρους</h2>

          <div className="soft-box" style={{ overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${chartW} ${chartH + 20}`}
              style={{ width: "100%", maxWidth: chartW }}
            >
              {chartData.map((point, i) => {
                const x = (i / (chartData.length - 1)) * (chartW - 20) + 10;
                const y =
                  chartH - ((point.weight - minW) / range) * (chartH - 20) + 10;
                const next = chartData[i + 1];
                const nx = next
                  ? ((i + 1) / (chartData.length - 1)) * (chartW - 20) + 10
                  : null;
                const ny = next
                  ? chartH - ((next.weight - minW) / range) * (chartH - 20) + 10
                  : null;

                return (
                  <g key={point.date}>
                    {next && (
                      <line
                        x1={x} y1={y} x2={nx} y2={ny}
                        stroke="var(--color-accent, #111)"
                        strokeWidth="2"
                      />
                    )}
                    <circle cx={x} cy={y} r="4" fill="var(--color-accent, #111)" />
                    <text
                      x={x} y={chartH + 18}
                      textAnchor="middle"
                      fontSize="8"
                      fill="var(--color-muted, #888)"
                    >
                      {point.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {diff !== null && (
            <div className="soft-box" style={{ marginTop: 10 }}>
              <span className="muted">Αλλαγή (30 μέρες): </span>
              <strong style={{ color: diff <= 0 ? "green" : "red" }}>
                {diff > 0 ? "+" : ""}{formatNumber(Math.round(diff * 10) / 10)} kg
              </strong>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2>Ιστορικό</h2>

        {sortedLog.length === 0 ? (
          <div className="soft-box">
            <div className="muted">Δεν έχεις καταγράψει βάρος ακόμα.</div>
          </div>
        ) : (
          <div className="stack-10">
            {sortedLog.map((entry) => (
              <div key={entry.date} className="food-entry-card">
                <div className="food-entry-main">
                  <div className="food-entry-title">{formatDisplayDate(entry.date)}</div>
                  <div className="muted">{entry.date}</div>
                </div>
                <div className="food-entry-actions">
                  <div style={{ fontWeight: 700 }}>{entry.weight} kg</div>
                  <button
                    className="btn btn-light"
                    onClick={() => onDeleteWeight(entry.date)}
                    type="button"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

## src\components\WelcomeScreen.jsx
```
export default function WelcomeScreen({ onStart }) {
  return (
    <div style={{ padding: "8px 0" }}>
      {/* HERO */}
      <div className="hero-card" style={{ marginBottom: 16, textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🥗💪</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "white", marginBottom: 8, lineHeight: 1.2 }}>
          Ο προσωπικός σου διατροφολόγος & γυμναστής
        </div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6 }}>
          Πες μου τον στόχο σου και εγώ αναλαμβάνω — τι να φας, τι άσκηση να κάνεις, πώς να φτάσεις εκεί που θέλεις.
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🎯</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Goal-first προσέγγιση</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Επιλέγεις στόχο — χάσιμο βάρους, μυϊκή μάζα ή διατήρηση — και το app προσαρμόζει αυτόματα θερμίδες, macros και προτάσεις.
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>AI Coach που σε ξέρει</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Ρώτα τον coach τι να φας τώρα, τι γυμναστική να κάνεις, ή ζήτα ολόκληρο meal plan για την ημέρα — βασισμένο στα γούστα σου.
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🇬🇷</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ελληνικά φαγητά & μερίδες</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Σουβλάκι, φέτα, χωριάτικη, τοστ — όχι cups και ounces. Βάλε "2 μεσαία αυγά" και υπολογίζουμε αυτόματα.
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Γρήγορο & απλό</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Instant search, portions με 1 tap, barcode scanner και photo analysis. Χωρίς περιττά clicks.
            </div>
          </div>
        </div>
      </div>

      {/* FORMULA */}
      <div className="card" style={{ margin: "0 0 16px", background: "var(--bg-soft)", textAlign: "center" }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Η λογική μας είναι απλή:</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Υπόλοιπο = Στόχος − Φαγητό + Άσκηση
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Όσο πιο πράσινο, τόσο καλύτερα πας.
        </div>
      </div>

      <button className="btn btn-dark" onClick={onStart} style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 800, borderRadius: 16 }}>
        Ξεκίνα →
      </button>

      <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
        Διαρκεί λιγότερο από 2 λεπτά
      </div>
    </div>
  );
}
```

## src\data\constants.js
```
export const MEALS = ["Πρωινό", "Μεσημεριανό", "Βραδινό", "Σνακ"];

export const APP_TABS = [
  { key: "summary", label: "Summary", icon: "📊" },
  { key: "food", label: "Food", icon: "🍔" },
  { key: "exercise", label: "Exercise", icon: "💪" },
  { key: "profile", label: "Profile", icon: "👤" }
];

export const EXERCISE_LIBRARY = [
  // Cardio
  { name: "Τρέξιμο", category: "Cardio", caloriesPerMinute: 10, icon: "🏃" },
  { name: "Περπάτημα", category: "Cardio", caloriesPerMinute: 4, icon: "🚶" },
  { name: "Ποδήλατο", category: "Cardio", caloriesPerMinute: 8, icon: "🚴" },
  { name: "Κολύμπι", category: "Cardio", caloriesPerMinute: 9, icon: "🏊" },
  { name: "Σκοινάκι", category: "Cardio", caloriesPerMinute: 12, icon: "⚡" },
  { name: "HIIT", category: "Cardio", caloriesPerMinute: 13, icon: "🔥" },
  { name: "Ελλειπτικό", category: "Cardio", caloriesPerMinute: 8, icon: "🏋️" },
  { name: "Κωπηλατική", category: "Cardio", caloriesPerMinute: 9, icon: "🚣" },
  { name: "Αερόβια γυμναστική", category: "Cardio", caloriesPerMinute: 7, icon: "💃" },
  { name: "Χορός", category: "Cardio", caloriesPerMinute: 6, icon: "🕺" },
  { name: "Ποδόσφαιρο", category: "Cardio", caloriesPerMinute: 9, icon: "⚽" },
  { name: "Μπάσκετ", category: "Cardio", caloriesPerMinute: 8, icon: "🏀" },
  { name: "Τένις", category: "Cardio", caloriesPerMinute: 8, icon: "🎾" },
  // Strength
  { name: "Βάρη", category: "Strength", caloriesPerMinute: 6, icon: "🏋️" },
  { name: "Push-ups", category: "Strength", caloriesPerMinute: 7, icon: "💪" },
  { name: "Squats", category: "Strength", caloriesPerMinute: 6, icon: "🦵" },
  { name: "Deadlift", category: "Strength", caloriesPerMinute: 7, icon: "💪" },
  { name: "Bench Press", category: "Strength", caloriesPerMinute: 6, icon: "🏋️" },
  { name: "Pull-ups", category: "Strength", caloriesPerMinute: 7, icon: "💪" },
  { name: "Plank", category: "Strength", caloriesPerMinute: 4, icon: "🧘" },
  { name: "Lunges", category: "Strength", caloriesPerMinute: 6, icon: "🦵" },
  // Flexibility & Mind
  { name: "Yoga", category: "Flexibility", caloriesPerMinute: 4, icon: "🧘" },
  { name: "Pilates", category: "Flexibility", caloriesPerMinute: 5, icon: "🧘" },
  { name: "Stretching", category: "Flexibility", caloriesPerMinute: 3, icon: "🤸" },
  // Sports
  { name: "Πεζοπορία", category: "Cardio", caloriesPerMinute: 6, icon: "🥾" },
  { name: "Πατίνι", category: "Cardio", caloriesPerMinute: 7, icon: "⛸️" },
  { name: "Βόλεϊ", category: "Cardio", caloriesPerMinute: 5, icon: "🏐" },
  { name: "Πινγκ-πονγκ", category: "Cardio", caloriesPerMinute: 5, icon: "🏓" },
];
```

## src\data\foods.json
```
[
  {
    "id": "local-tost",
    "source": "local",
    "name": "Τοστ",
    "brand": "",
    "aliases": ["τοστ", "toast", "tost", "ψωμί του τοστ"],
    "caloriesPer100g": 250,
    "proteinPer100g": 10,
    "carbsPer100g": 30,
    "fatPer100g": 10,
    "portions": [
      { "label": "1 τοστ μικρό", "grams": 80 },
      { "label": "1 τοστ κανονικό", "grams": 120 },
      { "label": "1 τοστ μεγάλο", "grams": 160 }
    ]
  },
  {
    "id": "local-psomi-tost",
    "source": "local",
    "name": "Ψωμί τοστ",
    "brand": "",
    "aliases": ["ψωμί τοστ", "ψωμι τοστ", "toast bread", "bread", "psomi tost"],
    "caloriesPer100g": 265,
    "proteinPer100g": 9,
    "carbsPer100g": 49,
    "fatPer100g": 4,
    "portions": [
      { "label": "1 φέτα λεπτή", "grams": 20 },
      { "label": "1 φέτα κανονική", "grams": 30 },
      { "label": "2 φέτες", "grams": 60 }
    ]
  },
  {
    "id": "local-avga",
    "source": "local",
    "name": "Αυγά",
    "brand": "",
    "aliases": ["αυγά", "αυγα", "αυγό", "αυγο", "egg", "eggs", "avga", "avgo"],
    "caloriesPer100g": 140,
    "proteinPer100g": 12,
    "carbsPer100g": 1,
    "fatPer100g": 10,
    "portions": [
      { "label": "1 μικρό αυγό", "grams": 45 },
      { "label": "1 μεσαίο αυγό", "grams": 55 },
      { "label": "1 μεγάλο αυγό", "grams": 65 },
      { "label": "2 μεσαία αυγά", "grams": 110 },
      { "label": "3 μεσαία αυγά", "grams": 165 }
    ]
  },
  {
    "id": "local-aspradia-avggon",
    "source": "local",
    "name": "Ασπράδια αυγών",
    "brand": "",
    "aliases": ["ασπράδια αυγών", "ασπραδια αυγων", "ασπράδια", "egg whites", "egg white", "aspradia"],
    "caloriesPer100g": 52,
    "proteinPer100g": 11,
    "carbsPer100g": 1,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "1 ασπράδι", "grams": 33 },
      { "label": "2 ασπράδια", "grams": 66 },
      { "label": "3 ασπράδια", "grams": 99 }
    ]
  },
  {
    "id": "local-kotopoulo",
    "source": "local",
    "name": "Κοτόπουλο",
    "brand": "",
    "aliases": ["κοτόπουλο", "κοτοπουλο", "chicken", "kotopoulo"],
    "caloriesPer100g": 239,
    "proteinPer100g": 27,
    "carbsPer100g": 0,
    "fatPer100g": 14,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-kotopoulo-stithos",
    "source": "local",
    "name": "Κοτόπουλο στήθος",
    "brand": "",
    "aliases": ["κοτόπουλο στήθος", "κοτοπουλο στηθος", "στήθος κοτόπουλο", "στήθος", "chicken breast"],
    "caloriesPer100g": 165,
    "proteinPer100g": 31,
    "carbsPer100g": 0,
    "fatPer100g": 3.6,
    "portions": [
      { "label": "1 μικρό στήθος", "grams": 120 },
      { "label": "1 μεσαίο στήθος", "grams": 160 },
      { "label": "1 μεγάλο στήθος", "grams": 220 }
    ]
  },
  {
    "id": "local-kotopoulo-mpos",
    "source": "local",
    "name": "Κοτόπουλο μπούτι",
    "brand": "",
    "aliases": ["κοτόπουλο μπούτι", "κοτοπουλο μπουτι", "μπούτι", "chicken thigh", "chicken leg"],
    "caloriesPer100g": 209,
    "proteinPer100g": 26,
    "carbsPer100g": 0,
    "fatPer100g": 11,
    "portions": [
      { "label": "1 μπούτι μικρό", "grams": 100 },
      { "label": "1 μπούτι μεσαίο", "grams": 140 },
      { "label": "1 μπούτι μεγάλο", "grams": 180 }
    ]
  },
  {
    "id": "local-galopoula",
    "source": "local",
    "name": "Γαλοπούλα",
    "brand": "",
    "aliases": ["γαλοπούλα", "γαλοπουλα", "turkey", "galopoula"],
    "caloriesPer100g": 135,
    "proteinPer100g": 29,
    "carbsPer100g": 0,
    "fatPer100g": 1.5,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-mosxari",
    "source": "local",
    "name": "Μοσχάρι",
    "brand": "",
    "aliases": ["μοσχάρι", "μοσχαρι", "beef", "mosxari"],
    "caloriesPer100g": 250,
    "proteinPer100g": 26,
    "carbsPer100g": 0,
    "fatPer100g": 15,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-mosxari-kimas",
    "source": "local",
    "name": "Κιμάς μοσχαρίσιος",
    "brand": "",
    "aliases": ["κιμάς", "κιμας", "ground beef", "minced beef", "kimas"],
    "caloriesPer100g": 254,
    "proteinPer100g": 17,
    "carbsPer100g": 0,
    "fatPer100g": 20,
    "portions": [
      { "label": "Μικρή μερίδα (100g)", "grams": 100 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 },
      { "label": "Μεγάλη μερίδα (200g)", "grams": 200 }
    ]
  },
  {
    "id": "local-xoirino",
    "source": "local",
    "name": "Χοιρινό",
    "brand": "",
    "aliases": ["χοιρινό", "χοιρινο", "pork", "xoirino"],
    "caloriesPer100g": 242,
    "proteinPer100g": 27,
    "carbsPer100g": 0,
    "fatPer100g": 14,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-brizola-xoirini",
    "source": "local",
    "name": "Μπριζόλα χοιρινή",
    "brand": "",
    "aliases": ["μπριζόλα χοιρινή", "μπριζολα χοιρινη", "μπριζόλα", "pork chop", "brizola"],
    "caloriesPer100g": 231,
    "proteinPer100g": 25,
    "carbsPer100g": 0,
    "fatPer100g": 14,
    "portions": [
      { "label": "1 μικρή μπριζόλα", "grams": 150 },
      { "label": "1 μεσαία μπριζόλα", "grams": 220 },
      { "label": "1 μεγάλη μπριζόλα", "grams": 300 }
    ]
  },
  {
    "id": "local-brizola-mosxarissia",
    "source": "local",
    "name": "Μπριζόλα μοσχαρίσια",
    "brand": "",
    "aliases": ["μπριζόλα μοσχαρίσια", "μπριζολα μοσχαρισια", "steak", "beef steak"],
    "caloriesPer100g": 271,
    "proteinPer100g": 26,
    "carbsPer100g": 0,
    "fatPer100g": 18,
    "portions": [
      { "label": "1 μικρή μπριζόλα", "grams": 150 },
      { "label": "1 μεσαία μπριζόλα", "grams": 220 },
      { "label": "1 μεγάλη μπριζόλα", "grams": 300 }
    ]
  },
  {
    "id": "local-mpifteki",
    "source": "local",
    "name": "Μπιφτέκι",
    "brand": "",
    "aliases": ["μπιφτέκι", "μπιφτεκι", "burger patty", "meatball", "mpifteki"],
    "caloriesPer100g": 220,
    "proteinPer100g": 15,
    "carbsPer100g": 8,
    "fatPer100g": 15,
    "portions": [
      { "label": "1 μικρό μπιφτέκι", "grams": 80 },
      { "label": "1 μεσαίο μπιφτέκι", "grams": 120 },
      { "label": "1 μεγάλο μπιφτέκι", "grams": 160 },
      { "label": "2 μεσαία μπιφτέκια", "grams": 240 }
    ]
  },
  {
    "id": "local-arni",
    "source": "local",
    "name": "Αρνί",
    "brand": "",
    "aliases": ["αρνί", "αρνι", "lamb", "arni"],
    "caloriesPer100g": 294,
    "proteinPer100g": 25,
    "carbsPer100g": 0,
    "fatPer100g": 21,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-tonos",
    "source": "local",
    "name": "Τόνος",
    "brand": "",
    "aliases": ["τόνος", "τονος", "tuna", "tonos"],
    "caloriesPer100g": 132,
    "proteinPer100g": 29,
    "carbsPer100g": 0,
    "fatPer100g": 1,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-tonos-kons",
    "source": "local",
    "name": "Τόνος κονσέρβα",
    "brand": "",
    "aliases": ["τόνος κονσέρβα", "τονος κονσερβα", "canned tuna", "tuna can"],
    "caloriesPer100g": 116,
    "proteinPer100g": 26,
    "carbsPer100g": 0,
    "fatPer100g": 1,
    "portions": [
      { "label": "½ κονσέρβα (80g)", "grams": 80 },
      { "label": "1 κονσέρβα (160g)", "grams": 160 }
    ]
  },
  {
    "id": "local-solomos",
    "source": "local",
    "name": "Σολομός",
    "brand": "",
    "aliases": ["σολομός", "σολομος", "salmon", "solomos"],
    "caloriesPer100g": 208,
    "proteinPer100g": 20,
    "carbsPer100g": 0,
    "fatPer100g": 13,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-sardeles",
    "source": "local",
    "name": "Σαρδέλες",
    "brand": "",
    "aliases": ["σαρδέλες", "σαρδελες", "sardines", "sardella"],
    "caloriesPer100g": 208,
    "proteinPer100g": 25,
    "carbsPer100g": 0,
    "fatPer100g": 11,
    "portions": [
      { "label": "2-3 σαρδέλες", "grams": 60 },
      { "label": "4-5 σαρδέλες", "grams": 100 },
      { "label": "1 κονσέρβα", "grams": 150 }
    ]
  },
  {
    "id": "local-garides",
    "source": "local",
    "name": "Γαρίδες",
    "brand": "",
    "aliases": ["γαρίδες", "γαριδες", "shrimp", "prawns", "garides"],
    "caloriesPer100g": 99,
    "proteinPer100g": 20,
    "carbsPer100g": 0,
    "fatPer100g": 1.7,
    "portions": [
      { "label": "Μικρή μερίδα (100g)", "grams": 100 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 },
      { "label": "Μεγάλη μερίδα (200g)", "grams": 200 }
    ]
  },
  {
    "id": "local-bakaliaro",
    "source": "local",
    "name": "Μπακαλιάρος",
    "brand": "",
    "aliases": ["μπακαλιάρος", "μπακαλιαρος", "cod", "bakaliaro"],
    "caloriesPer100g": 82,
    "proteinPer100g": 18,
    "carbsPer100g": 0,
    "fatPer100g": 0.7,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-banana",
    "source": "local",
    "name": "Μπανάνα",
    "brand": "",
    "aliases": ["μπανάνα", "μπανανα", "banana", "bananas", "mpanana"],
    "caloriesPer100g": 89,
    "proteinPer100g": 1.1,
    "carbsPer100g": 23,
    "fatPer100g": 0.3,
    "portions": [
      { "label": "1 μικρή μπανάνα", "grams": 80 },
      { "label": "1 μεσαία μπανάνα", "grams": 120 },
      { "label": "1 μεγάλη μπανάνα", "grams": 150 }
    ]
  },
  {
    "id": "local-milo",
    "source": "local",
    "name": "Μήλο",
    "brand": "",
    "aliases": ["μήλο", "μηλο", "apple", "milo"],
    "caloriesPer100g": 52,
    "proteinPer100g": 0.3,
    "carbsPer100g": 14,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "1 μικρό μήλο", "grams": 130 },
      { "label": "1 μεσαίο μήλο", "grams": 180 },
      { "label": "1 μεγάλο μήλο", "grams": 220 }
    ]
  },
  {
    "id": "local-portokali",
    "source": "local",
    "name": "Πορτοκάλι",
    "brand": "",
    "aliases": ["πορτοκάλι", "πορτοκαλι", "orange", "portokali"],
    "caloriesPer100g": 47,
    "proteinPer100g": 0.9,
    "carbsPer100g": 12,
    "fatPer100g": 0.1,
    "portions": [
      { "label": "1 μικρό πορτοκάλι", "grams": 130 },
      { "label": "1 μεσαίο πορτοκάλι", "grams": 180 },
      { "label": "1 μεγάλο πορτοκάλι", "grams": 220 }
    ]
  },
  {
    "id": "local-fraoula",
    "source": "local",
    "name": "Φράουλα",
    "brand": "",
    "aliases": ["φράουλα", "φραουλα", "strawberry", "strawberries", "fraoula"],
    "caloriesPer100g": 32,
    "proteinPer100g": 0.7,
    "carbsPer100g": 7.7,
    "fatPer100g": 0.3,
    "portions": [
      { "label": "Μικρή μερίδα (100g)", "grams": 100 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 },
      { "label": "Μεγάλη μερίδα (250g)", "grams": 250 }
    ]
  },
  {
    "id": "local-stafyli",
    "source": "local",
    "name": "Σταφύλι",
    "brand": "",
    "aliases": ["σταφύλι", "σταφυλι", "grapes", "stafyli"],
    "caloriesPer100g": 69,
    "proteinPer100g": 0.7,
    "carbsPer100g": 18,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "Μικρή μερίδα (100g)", "grams": 100 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 },
      { "label": "Μεγάλη μερίδα (200g)", "grams": 200 }
    ]
  },
  {
    "id": "local-karpouz",
    "source": "local",
    "name": "Καρπούζι",
    "brand": "",
    "aliases": ["καρπούζι", "καρπουζι", "watermelon", "karpouzi"],
    "caloriesPer100g": 30,
    "proteinPer100g": 0.6,
    "carbsPer100g": 7.6,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "1 φέτα μικρή", "grams": 200 },
      { "label": "1 φέτα μεσαία", "grams": 300 },
      { "label": "1 φέτα μεγάλη", "grams": 400 }
    ]
  },
  {
    "id": "local-peponi",
    "source": "local",
    "name": "Πεπόνι",
    "brand": "",
    "aliases": ["πεπόνι", "πεπονι", "melon", "peponi"],
    "caloriesPer100g": 34,
    "proteinPer100g": 0.8,
    "carbsPer100g": 8,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "1 φέτα μικρή", "grams": 150 },
      { "label": "1 φέτα μεσαία", "grams": 250 },
      { "label": "1 φέτα μεγάλη", "grams": 350 }
    ]
  },
  {
    "id": "local-rodakino",
    "source": "local",
    "name": "Ροδάκινο",
    "brand": "",
    "aliases": ["ροδάκινο", "ροδακινο", "peach", "rodakino"],
    "caloriesPer100g": 39,
    "proteinPer100g": 0.9,
    "carbsPer100g": 9.5,
    "fatPer100g": 0.3,
    "portions": [
      { "label": "1 μικρό ροδάκινο", "grams": 100 },
      { "label": "1 μεσαίο ροδάκινο", "grams": 150 },
      { "label": "1 μεγάλο ροδάκινο", "grams": 200 }
    ]
  },
  {
    "id": "local-avokanto",
    "source": "local",
    "name": "Αβοκάντο",
    "brand": "",
    "aliases": ["αβοκάντο", "αβοκαντο", "avocado", "avokanto"],
    "caloriesPer100g": 160,
    "proteinPer100g": 2,
    "carbsPer100g": 9,
    "fatPer100g": 15,
    "portions": [
      { "label": "½ αβοκάντο", "grams": 75 },
      { "label": "1 ολόκληρο αβοκάντο", "grams": 150 }
    ]
  },
  {
    "id": "local-ryzi",
    "source": "local",
    "name": "Ρύζι",
    "brand": "",
    "aliases": ["ρύζι", "ρυζι", "rice", "ryzi"],
    "caloriesPer100g": 130,
    "proteinPer100g": 2.7,
    "carbsPer100g": 28,
    "fatPer100g": 0.3,
    "portions": [
      { "label": "Μικρή μερίδα βραστό", "grams": 150 },
      { "label": "Κανονική μερίδα βραστό", "grams": 200 },
      { "label": "Μεγάλη μερίδα βραστό", "grams": 280 }
    ]
  },
  {
    "id": "local-makaronia",
    "source": "local",
    "name": "Μακαρόνια",
    "brand": "",
    "aliases": ["μακαρόνια", "μακαρονια", "pasta", "spaghetti", "makaronia"],
    "caloriesPer100g": 158,
    "proteinPer100g": 5.8,
    "carbsPer100g": 31,
    "fatPer100g": 0.9,
    "portions": [
      { "label": "Μικρή μερίδα βραστά", "grams": 150 },
      { "label": "Κανονική μερίδα βραστά", "grams": 220 },
      { "label": "Μεγάλη μερίδα βραστά", "grams": 300 }
    ]
  },
  {
    "id": "local-patata",
    "source": "local",
    "name": "Πατάτα",
    "brand": "",
    "aliases": ["πατάτα", "πατατα", "potato", "patata"],
    "caloriesPer100g": 87,
    "proteinPer100g": 1.9,
    "carbsPer100g": 20,
    "fatPer100g": 0.1,
    "portions": [
      { "label": "1 μικρή πατάτα", "grams": 100 },
      { "label": "1 μεσαία πατάτα", "grams": 150 },
      { "label": "1 μεγάλη πατάτα", "grams": 220 }
    ]
  },
  {
    "id": "local-patates-tiganites",
    "source": "local",
    "name": "Πατάτες τηγανητές",
    "brand": "",
    "aliases": ["πατάτες τηγανητές", "πατατες τηγανιτες", "french fries", "fries", "tiganites"],
    "caloriesPer100g": 312,
    "proteinPer100g": 3.4,
    "carbsPer100g": 41,
    "fatPer100g": 15,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-bromi",
    "source": "local",
    "name": "Βρώμη",
    "brand": "",
    "aliases": ["βρώμη", "βρωμη", "oats", "oatmeal", "bromi"],
    "caloriesPer100g": 389,
    "proteinPer100g": 17,
    "carbsPer100g": 66,
    "fatPer100g": 7,
    "portions": [
      { "label": "Μικρή μερίδα (40g)", "grams": 40 },
      { "label": "Κανονική μερίδα (60g)", "grams": 60 },
      { "label": "Μεγάλη μερίδα (80g)", "grams": 80 }
    ]
  },
  {
    "id": "local-psomi-olikiS",
    "source": "local",
    "name": "Ψωμί ολικής",
    "brand": "",
    "aliases": ["ψωμί ολικής", "ψωμι ολικης", "wholemeal bread", "whole wheat bread"],
    "caloriesPer100g": 247,
    "proteinPer100g": 13,
    "carbsPer100g": 41,
    "fatPer100g": 3.4,
    "portions": [
      { "label": "1 φέτα λεπτή", "grams": 25 },
      { "label": "1 φέτα κανονική", "grams": 35 },
      { "label": "2 φέτες", "grams": 70 }
    ]
  },
  {
    "id": "local-psomi-aspro",
    "source": "local",
    "name": "Ψωμί άσπρο",
    "brand": "",
    "aliases": ["ψωμί", "ψωμι", "ψωμί άσπρο", "white bread", "psomi"],
    "caloriesPer100g": 265,
    "proteinPer100g": 9,
    "carbsPer100g": 49,
    "fatPer100g": 3.2,
    "portions": [
      { "label": "1 φέτα λεπτή", "grams": 25 },
      { "label": "1 φέτα κανονική", "grams": 35 },
      { "label": "2 φέτες", "grams": 70 }
    ]
  },
  {
    "id": "local-paximadi",
    "source": "local",
    "name": "Παξιμάδι",
    "brand": "",
    "aliases": ["παξιμάδι", "παξιμαδι", "rusk", "cracker", "paximadi"],
    "caloriesPer100g": 390,
    "proteinPer100g": 12,
    "carbsPer100g": 75,
    "fatPer100g": 5,
    "portions": [
      { "label": "1 μικρό παξιμάδι", "grams": 25 },
      { "label": "1 μεγάλο παξιμάδι", "grams": 50 }
    ]
  },
  {
    "id": "local-giaourti",
    "source": "local",
    "name": "Γιαούρτι",
    "brand": "",
    "aliases": ["γιαούρτι", "γιαουρτι", "yogurt", "yoghurt", "giaourti"],
    "caloriesPer100g": 97,
    "proteinPer100g": 9,
    "carbsPer100g": 4,
    "fatPer100g": 5,
    "portions": [
      { "label": "Μικρό ποτηράκι (150g)", "grams": 150 },
      { "label": "Κανονικό ποτηράκι (200g)", "grams": 200 },
      { "label": "Μεγάλο ποτηράκι (250g)", "grams": 250 }
    ]
  },
  {
    "id": "local-straggisto-giaourti",
    "source": "local",
    "name": "Γιαούρτι στραγγιστό",
    "brand": "",
    "aliases": ["γιαούρτι στραγγιστό", "γιαουρτι στραγγιστο", "στραγγιστό γιαούρτι", "greek yogurt", "strained yogurt"],
    "caloriesPer100g": 120,
    "proteinPer100g": 10,
    "carbsPer100g": 4,
    "fatPer100g": 7,
    "portions": [
      { "label": "Μικρό ποτηράκι (150g)", "grams": 150 },
      { "label": "Κανονικό ποτηράκι (200g)", "grams": 200 },
      { "label": "Μεγάλο ποτηράκι (250g)", "grams": 250 }
    ]
  },
  {
    "id": "local-giaourti-0",
    "source": "local",
    "name": "Γιαούρτι 0%",
    "brand": "",
    "aliases": ["γιαούρτι 0%", "γιαουρτι 0", "fat free yogurt", "0% yogurt"],
    "caloriesPer100g": 56,
    "proteinPer100g": 10,
    "carbsPer100g": 4,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "Μικρό ποτηράκι (150g)", "grams": 150 },
      { "label": "Κανονικό ποτηράκι (200g)", "grams": 200 },
      { "label": "Μεγάλο ποτηράκι (250g)", "grams": 250 }
    ]
  },
  {
    "id": "local-cottage",
    "source": "local",
    "name": "Cottage cheese",
    "brand": "",
    "aliases": ["cottage", "cottage cheese", "κοτατζ", "τυρί cottage"],
    "caloriesPer100g": 98,
    "proteinPer100g": 11,
    "carbsPer100g": 3.4,
    "fatPer100g": 4.3,
    "portions": [
      { "label": "Μικρή μερίδα (100g)", "grams": 100 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 },
      { "label": "Μεγάλη μερίδα (200g)", "grams": 200 }
    ]
  },
  {
    "id": "local-feta",
    "source": "local",
    "name": "Φέτα",
    "brand": "",
    "aliases": ["φέτα", "φετα", "feta", "φέτα τυρί", "feta cheese"],
    "caloriesPer100g": 264,
    "proteinPer100g": 14,
    "carbsPer100g": 4,
    "fatPer100g": 21,
    "portions": [
      { "label": "Μικρή μερίδα (30g)", "grams": 30 },
      { "label": "Κανονική μερίδα (50g)", "grams": 50 },
      { "label": "Μεγάλη μερίδα (80g)", "grams": 80 }
    ]
  },
  {
    "id": "local-kaseri",
    "source": "local",
    "name": "Κασέρι",
    "brand": "",
    "aliases": ["κασέρι", "κασερι", "kaseri", "cheese"],
    "caloriesPer100g": 356,
    "proteinPer100g": 25,
    "carbsPer100g": 2,
    "fatPer100g": 27,
    "portions": [
      { "label": "1 φέτα λεπτή (20g)", "grams": 20 },
      { "label": "1 φέτα κανονική (30g)", "grams": 30 },
      { "label": "2 φέτες (60g)", "grams": 60 }
    ]
  },
  {
    "id": "local-graviera",
    "source": "local",
    "name": "Γραβιέρα",
    "brand": "",
    "aliases": ["γραβιέρα", "γραβιερα", "graviera", "greek gruyere"],
    "caloriesPer100g": 390,
    "proteinPer100g": 27,
    "carbsPer100g": 1,
    "fatPer100g": 31,
    "portions": [
      { "label": "1 φέτα λεπτή (20g)", "grams": 20 },
      { "label": "1 φέτα κανονική (30g)", "grams": 30 },
      { "label": "2 φέτες (60g)", "grams": 60 }
    ]
  },
  {
    "id": "local-galopoula-allantiko",
    "source": "local",
    "name": "Γαλοπούλα αλλαντικό",
    "brand": "",
    "aliases": ["γαλοπούλα αλλαντικό", "γαλοπουλα αλλαντικο", "turkey slices", "turkey ham"],
    "caloriesPer100g": 104,
    "proteinPer100g": 17,
    "carbsPer100g": 3,
    "fatPer100g": 2,
    "portions": [
      { "label": "1 φέτα (20g)", "grams": 20 },
      { "label": "2 φέτες (40g)", "grams": 40 },
      { "label": "3 φέτες (60g)", "grams": 60 }
    ]
  },
  {
    "id": "local-gala",
    "source": "local",
    "name": "Γάλα",
    "brand": "",
    "aliases": ["γάλα", "γαλα", "milk", "gala"],
    "caloriesPer100g": 61,
    "proteinPer100g": 3.2,
    "carbsPer100g": 4.8,
    "fatPer100g": 3.3,
    "portions": [
      { "label": "1 φλιτζάνι (200ml)", "grams": 200 },
      { "label": "1 ποτήρι (250ml)", "grams": 250 },
      { "label": "1 κούπα (350ml)", "grams": 350 }
    ]
  },
  {
    "id": "local-elaiolado",
    "source": "local",
    "name": "Ελαιόλαδο",
    "brand": "",
    "aliases": ["ελαιόλαδο", "ελαιολαδο", "olive oil", "elaiolado"],
    "caloriesPer100g": 884,
    "proteinPer100g": 0,
    "carbsPer100g": 0,
    "fatPer100g": 100,
    "portions": [
      { "label": "1 κουταλάκι (5ml)", "grams": 5 },
      { "label": "1 κουταλιά σούπας (15ml)", "grams": 14 },
      { "label": "2 κουταλιές (30ml)", "grams": 28 }
    ]
  },
  {
    "id": "local-meli",
    "source": "local",
    "name": "Μέλι",
    "brand": "",
    "aliases": ["μέλι", "μελι", "honey", "meli"],
    "caloriesPer100g": 304,
    "proteinPer100g": 0.3,
    "carbsPer100g": 82,
    "fatPer100g": 0,
    "portions": [
      { "label": "1 κουταλάκι (7g)", "grams": 7 },
      { "label": "1 κουταλιά σούπας (21g)", "grams": 21 }
    ]
  },
  {
    "id": "local-kafes",
    "source": "local",
    "name": "Καφές",
    "brand": "",
    "aliases": ["καφές", "καφες", "coffee", "kafes"],
    "caloriesPer100g": 2,
    "proteinPer100g": 0.3,
    "carbsPer100g": 0,
    "fatPer100g": 0,
    "portions": [
      { "label": "1 εσπρέσο (30ml)", "grams": 30 },
      { "label": "1 φλιτζάνι φίλτρου (200ml)", "grams": 200 }
    ]
  },
  {
    "id": "local-fasolia",
    "source": "local",
    "name": "Φασόλια",
    "brand": "",
    "aliases": ["φασόλια", "φασολια", "beans", "white beans", "fasolia"],
    "caloriesPer100g": 127,
    "proteinPer100g": 9,
    "carbsPer100g": 22,
    "fatPer100g": 0.5,
    "portions": [
      { "label": "Μικρή μερίδα (150g)", "grams": 150 },
      { "label": "Κανονική μερίδα (250g)", "grams": 250 },
      { "label": "Μεγάλη μερίδα (350g)", "grams": 350 }
    ]
  },
  {
    "id": "local-fakes",
    "source": "local",
    "name": "Φακές",
    "brand": "",
    "aliases": ["φακές", "φακες", "lentils", "fakes"],
    "caloriesPer100g": 116,
    "proteinPer100g": 9,
    "carbsPer100g": 20,
    "fatPer100g": 0.4,
    "portions": [
      { "label": "Μικρή μερίδα (150g)", "grams": 150 },
      { "label": "Κανονική μερίδα (250g)", "grams": 250 },
      { "label": "Μεγάλη μερίδα (350g)", "grams": 350 }
    ]
  },
  {
    "id": "local-revithia",
    "source": "local",
    "name": "Ρεβίθια",
    "brand": "",
    "aliases": ["ρεβίθια", "ρεβιθια", "chickpeas", "revithia"],
    "caloriesPer100g": 164,
    "proteinPer100g": 9,
    "carbsPer100g": 27,
    "fatPer100g": 2.6,
    "portions": [
      { "label": "Μικρή μερίδα (100g)", "grams": 100 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 },
      { "label": "Μεγάλη μερίδα (200g)", "grams": 200 }
    ]
  },
  {
    "id": "local-ntomata",
    "source": "local",
    "name": "Ντομάτα",
    "brand": "",
    "aliases": ["ντομάτα", "ντοματα", "tomato", "ntomata"],
    "caloriesPer100g": 18,
    "proteinPer100g": 0.9,
    "carbsPer100g": 3.9,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "1 μικρή ντομάτα", "grams": 80 },
      { "label": "1 μεσαία ντομάτα", "grams": 130 },
      { "label": "1 μεγάλη ντομάτα", "grams": 180 }
    ]
  },
  {
    "id": "local-aggouria",
    "source": "local",
    "name": "Αγγούρι",
    "brand": "",
    "aliases": ["αγγούρι", "αγγουρι", "cucumber", "aggouria"],
    "caloriesPer100g": 15,
    "proteinPer100g": 0.7,
    "carbsPer100g": 3.6,
    "fatPer100g": 0.1,
    "portions": [
      { "label": "½ αγγούρι", "grams": 100 },
      { "label": "1 ολόκληρο αγγούρι", "grams": 200 }
    ]
  },
  {
    "id": "local-spanaki",
    "source": "local",
    "name": "Σπανάκι",
    "brand": "",
    "aliases": ["σπανάκι", "σπανακι", "spinach", "spanaki"],
    "caloriesPer100g": 23,
    "proteinPer100g": 2.9,
    "carbsPer100g": 3.6,
    "fatPer100g": 0.4,
    "portions": [
      { "label": "Μικρή μερίδα (80g)", "grams": 80 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 }
    ]
  },
  {
    "id": "local-kolokithi",
    "source": "local",
    "name": "Κολοκυθάκι",
    "brand": "",
    "aliases": ["κολοκυθάκι", "κολοκυθακι", "zucchini", "courgette", "kolokithi"],
    "caloriesPer100g": 17,
    "proteinPer100g": 1.2,
    "carbsPer100g": 3.1,
    "fatPer100g": 0.3,
    "portions": [
      { "label": "1 μικρό κολοκυθάκι", "grams": 100 },
      { "label": "1 μεγάλο κολοκυθάκι", "grams": 200 }
    ]
  },
  {
    "id": "local-horiatiki",
    "source": "local",
    "name": "Χωριάτικη σαλάτα",
    "brand": "",
    "aliases": ["χωριάτικη", "χωριατικη", "greek salad", "horiatiki"],
    "caloriesPer100g": 80,
    "proteinPer100g": 3,
    "carbsPer100g": 5,
    "fatPer100g": 6,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 150 },
      { "label": "Κανονική μερίδα", "grams": 250 },
      { "label": "Μεγάλη μερίδα", "grams": 350 }
    ]
  },
  {
    "id": "local-tzatziki",
    "source": "local",
    "name": "Τζατζίκι",
    "brand": "",
    "aliases": ["τζατζίκι", "τζατζικι", "tzatziki"],
    "caloriesPer100g": 72,
    "proteinPer100g": 4,
    "carbsPer100g": 4,
    "fatPer100g": 5,
    "portions": [
      { "label": "1 κουταλιά (30g)", "grams": 30 },
      { "label": "Μικρή μερίδα (80g)", "grams": 80 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 }
    ]
  },
  {
    "id": "local-hummus",
    "source": "local",
    "name": "Χούμους",
    "brand": "",
    "aliases": ["χούμους", "χουμους", "hummus", "houmous"],
    "caloriesPer100g": 177,
    "proteinPer100g": 8,
    "carbsPer100g": 14,
    "fatPer100g": 10,
    "portions": [
      { "label": "1 κουταλιά (30g)", "grams": 30 },
      { "label": "Μικρή μερίδα (80g)", "grams": 80 },
      { "label": "Κανονική μερίδα (150g)", "grams": 150 }
    ]
  },
  {
    "id": "local-mousaka",
    "source": "local",
    "name": "Μουσακάς",
    "brand": "",
    "aliases": ["μουσακάς", "μουσακας", "moussaka", "mousaka"],
    "caloriesPer100g": 160,
    "proteinPer100g": 8,
    "carbsPer100g": 10,
    "fatPer100g": 10,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 200 },
      { "label": "Κανονική μερίδα", "grams": 300 },
      { "label": "Μεγάλη μερίδα", "grams": 400 }
    ]
  },
  {
    "id": "local-pastitsio",
    "source": "local",
    "name": "Παστίτσιο",
    "brand": "",
    "aliases": ["παστίτσιο", "παστιτσιο", "pastitsio"],
    "caloriesPer100g": 185,
    "proteinPer100g": 9,
    "carbsPer100g": 18,
    "fatPer100g": 9,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 200 },
      { "label": "Κανονική μερίδα", "grams": 300 },
      { "label": "Μεγάλη μερίδα", "grams": 400 }
    ]
  },
  {
    "id": "local-spanakopita",
    "source": "local",
    "name": "Σπανακόπιτα",
    "brand": "",
    "aliases": ["σπανακόπιτα", "σπανακοπιτα", "spanakopita", "spinach pie"],
    "caloriesPer100g": 220,
    "proteinPer100g": 7,
    "carbsPer100g": 18,
    "fatPer100g": 13,
    "portions": [
      { "label": "1 μικρό κομμάτι", "grams": 80 },
      { "label": "1 κανονικό κομμάτι", "grams": 130 },
      { "label": "1 μεγάλο κομμάτι", "grams": 180 }
    ]
  },
  {
    "id": "local-tiropita",
    "source": "local",
    "name": "Τυρόπιτα",
    "brand": "",
    "aliases": ["τυρόπιτα", "τυροπιτα", "tiropita", "cheese pie"],
    "caloriesPer100g": 280,
    "proteinPer100g": 9,
    "carbsPer100g": 22,
    "fatPer100g": 18,
    "portions": [
      { "label": "1 μικρό κομμάτι", "grams": 80 },
      { "label": "1 κανονικό κομμάτι", "grams": 130 },
      { "label": "1 μεγάλο κομμάτι", "grams": 180 }
    ]
  },
  {
    "id": "local-souvlaki",
    "source": "local",
    "name": "Σουβλάκι",
    "brand": "",
    "aliases": ["σουβλάκι", "σουβλακι", "souvlaki", "kebab"],
    "caloriesPer100g": 195,
    "proteinPer100g": 18,
    "carbsPer100g": 5,
    "fatPer100g": 12,
    "portions": [
      { "label": "1 σουβλάκι", "grams": 80 },
      { "label": "2 σουβλάκια", "grams": 160 },
      { "label": "3 σουβλάκια", "grams": 240 }
    ]
  },
  {
    "id": "local-gyros",
    "source": "local",
    "name": "Γύρος",
    "brand": "",
    "aliases": ["γύρος", "γυρος", "gyros", "gyro"],
    "caloriesPer100g": 218,
    "proteinPer100g": 16,
    "carbsPer100g": 12,
    "fatPer100g": 12,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 100 },
      { "label": "Κανονική μερίδα", "grams": 150 },
      { "label": "Μεγάλη μερίδα", "grams": 200 }
    ]
  },
  {
    "id": "local-pita-gyros",
    "source": "local",
    "name": "Πίτα γύρος",
    "brand": "",
    "aliases": ["πίτα γύρος", "πιτα γυρος", "gyros pita", "souvlaki pita"],
    "caloriesPer100g": 230,
    "proteinPer100g": 13,
    "carbsPer100g": 22,
    "fatPer100g": 10,
    "portions": [
      { "label": "1 πίτα μικρή", "grams": 200 },
      { "label": "1 πίτα κανονική", "grams": 280 },
      { "label": "1 πίτα μεγάλη", "grams": 350 }
    ]
  },
  {
    "id": "local-fasolada",
    "source": "local",
    "name": "Φασολάδα",
    "brand": "",
    "aliases": ["φασολάδα", "φασολαδα", "fasolada", "bean soup"],
    "caloriesPer100g": 85,
    "proteinPer100g": 5,
    "carbsPer100g": 14,
    "fatPer100g": 1.5,
    "portions": [
      { "label": "Μικρή μερίδα (200ml)", "grams": 200 },
      { "label": "Κανονική μερίδα (300ml)", "grams": 300 },
      { "label": "Μεγάλη μερίδα (400ml)", "grams": 400 }
    ]
  },
  {
    "id": "local-fakes-soupa",
    "source": "local",
    "name": "Φακές σούπα",
    "brand": "",
    "aliases": ["φακές σούπα", "φακες σουπα", "lentil soup", "fakes soupa"],
    "caloriesPer100g": 90,
    "proteinPer100g": 6,
    "carbsPer100g": 14,
    "fatPer100g": 1.5,
    "portions": [
      { "label": "Μικρή μερίδα (200ml)", "grams": 200 },
      { "label": "Κανονική μερίδα (300ml)", "grams": 300 },
      { "label": "Μεγάλη μερίδα (400ml)", "grams": 400 }
    ]
  },
  {
    "id": "local-keftedes",
    "source": "local",
    "name": "Κεφτέδες",
    "brand": "",
    "aliases": ["κεφτέδες", "κεφτεδες", "meatballs", "keftedes"],
    "caloriesPer100g": 220,
    "proteinPer100g": 14,
    "carbsPer100g": 10,
    "fatPer100g": 14,
    "portions": [
      { "label": "2 κεφτέδες", "grams": 60 },
      { "label": "3 κεφτέδες", "grams": 90 },
      { "label": "5 κεφτέδες", "grams": 150 }
    ]
  },
  {
    "id": "local-stifado",
    "source": "local",
    "name": "Στιφάδο",
    "brand": "",
    "aliases": ["στιφάδο", "στιφαδο", "stifado", "beef stew"],
    "caloriesPer100g": 165,
    "proteinPer100g": 14,
    "carbsPer100g": 8,
    "fatPer100g": 9,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 200 },
      { "label": "Κανονική μερίδα", "grams": 300 },
      { "label": "Μεγάλη μερίδα", "grams": 400 }
    ]
  },
  {
    "id": "local-giouvetsi",
    "source": "local",
    "name": "Γιουβέτσι",
    "brand": "",
    "aliases": ["γιουβέτσι", "γιουβετσι", "giouvetsi", "orzo beef"],
    "caloriesPer100g": 150,
    "proteinPer100g": 10,
    "carbsPer100g": 16,
    "fatPer100g": 5,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 200 },
      { "label": "Κανονική μερίδα", "grams": 300 },
      { "label": "Μεγάλη μερίδα", "grams": 400 }
    ]
  },
  {
    "id": "local-gemista",
    "source": "local",
    "name": "Γεμιστά",
    "brand": "",
    "aliases": ["γεμιστά", "γεμιστα", "gemista", "stuffed tomatoes peppers"],
    "caloriesPer100g": 110,
    "proteinPer100g": 3,
    "carbsPer100g": 16,
    "fatPer100g": 4,
    "portions": [
      { "label": "1 ντομάτα ή πιπεριά", "grams": 180 },
      { "label": "2 τεμάχια", "grams": 360 }
    ]
  },
  {
    "id": "local-mpriami",
    "source": "local",
    "name": "Μπριάμ",
    "brand": "",
    "aliases": ["μπριάμ", "μπριαμ", "briami", "baked vegetables"],
    "caloriesPer100g": 80,
    "proteinPer100g": 2,
    "carbsPer100g": 10,
    "fatPer100g": 4,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 200 },
      { "label": "Κανονική μερίδα", "grams": 300 },
      { "label": "Μεγάλη μερίδα", "grams": 400 }
    ]
  },
  {
    "id": "local-gigantes",
    "source": "local",
    "name": "Γίγαντες",
    "brand": "",
    "aliases": ["γίγαντες", "γιγαντες", "gigantes", "giant beans", "butter beans"],
    "caloriesPer100g": 130,
    "proteinPer100g": 7,
    "carbsPer100g": 22,
    "fatPer100g": 2,
    "portions": [
      { "label": "Μικρή μερίδα", "grams": 150 },
      { "label": "Κανονική μερίδα", "grams": 250 },
      { "label": "Μεγάλη μερίδα", "grams": 350 }
    ]
  },
  {
    "id": "local-almonds",
    "source": "local",
    "name": "Αμύγδαλα",
    "brand": "",
    "aliases": ["αμύγδαλα", "αμυγδαλα", "almonds", "amygdala"],
    "caloriesPer100g": 579,
    "proteinPer100g": 21,
    "carbsPer100g": 22,
    "fatPer100g": 50,
    "portions": [
      { "label": "Μικρή χούφτα (20g)", "grams": 20 },
      { "label": "Κανονική χούφτα (30g)", "grams": 30 },
      { "label": "Μεγάλη χούφτα (40g)", "grams": 40 }
    ]
  },
  {
    "id": "local-karydia",
    "source": "local",
    "name": "Καρύδια",
    "brand": "",
    "aliases": ["καρύδια", "καρυδια", "walnuts", "karydia"],
    "caloriesPer100g": 654,
    "proteinPer100g": 15,
    "carbsPer100g": 14,
    "fatPer100g": 65,
    "portions": [
      { "label": "3-4 καρύδια (15g)", "grams": 15 },
      { "label": "6-8 καρύδια (30g)", "grams": 30 },
      { "label": "10+ καρύδια (45g)", "grams": 45 }
    ]
  },
  {
    "id": "local-fistikia",
    "source": "local",
    "name": "Φιστίκια",
    "brand": "",
    "aliases": ["φιστίκια", "φιστικια", "peanuts", "fistikia"],
    "caloriesPer100g": 567,
    "proteinPer100g": 26,
    "carbsPer100g": 16,
    "fatPer100g": 49,
    "portions": [
      { "label": "Μικρή χούφτα (20g)", "grams": 20 },
      { "label": "Κανονική χούφτα (30g)", "grams": 30 },
      { "label": "Μεγάλη χούφτα (50g)", "grams": 50 }
    ]
  },
  {
    "id": "local-whey",
    "source": "local",
    "name": "Whey protein",
    "brand": "",
    "aliases": ["whey", "whey protein", "πρωτεΐνη ορού γάλακτος", "proteini"],
    "caloriesPer100g": 370,
    "proteinPer100g": 75,
    "carbsPer100g": 10,
    "fatPer100g": 5,
    "portions": [
      { "label": "1 μέτρο (25g)", "grams": 25 },
      { "label": "1.5 μέτρα (37g)", "grams": 37 },
      { "label": "2 μέτρα (50g)", "grams": 50 }
    ]
  },
  {
    "id": "local-protein-bar",
    "source": "local",
    "name": "Protein bar",
    "brand": "",
    "aliases": ["protein bar", "μπάρα πρωτεΐνης", "mpara proteinis", "energy bar"],
    "caloriesPer100g": 380,
    "proteinPer100g": 30,
    "carbsPer100g": 40,
    "fatPer100g": 10,
    "portions": [
      { "label": "1 μπάρα (50g)", "grams": 50 },
      { "label": "1 μπάρα (60g)", "grams": 60 },
      { "label": "1 μπάρα (75g)", "grams": 75 }
    ]
  },
  {
    "id": "local-dark-choc",
    "source": "local",
    "name": "Σοκολάτα μαύρη",
    "brand": "",
    "aliases": ["σοκολάτα μαύρη", "σοκολατα μαυρη", "dark chocolate", "sokolata mavri"],
    "caloriesPer100g": 546,
    "proteinPer100g": 5,
    "carbsPer100g": 60,
    "fatPer100g": 31,
    "portions": [
      { "label": "1-2 κομμάτια (10g)", "grams": 10 },
      { "label": "3-4 κομμάτια (20g)", "grams": 20 },
      { "label": "½ σοκολάτα (50g)", "grams": 50 }
    ]
  },
  {
    "id": "local-chips",
    "source": "local",
    "name": "Πατατάκια",
    "brand": "",
    "aliases": ["πατατάκια", "πατατακια", "chips", "potato chips", "crisps"],
    "caloriesPer100g": 536,
    "proteinPer100g": 7,
    "carbsPer100g": 53,
    "fatPer100g": 35,
    "portions": [
      { "label": "Μικρό σακουλάκι (25g)", "grams": 25 },
      { "label": "Κανονικό σακουλάκι (40g)", "grams": 40 },
      { "label": "Μεγάλο σακουλάκι (80g)", "grams": 80 }
    ]
  },
  {
    "id": "local-pizza",
    "source": "local",
    "name": "Πίτσα",
    "brand": "",
    "aliases": ["πίτσα", "πιτσα", "pizza"],
    "caloriesPer100g": 266,
    "proteinPer100g": 11,
    "carbsPer100g": 33,
    "fatPer100g": 10,
    "portions": [
      { "label": "1 κομμάτι μικρό", "grams": 80 },
      { "label": "1 κομμάτι κανονικό", "grams": 120 },
      { "label": "2 κομμάτια", "grams": 240 }
    ]
  },
  {
    "id": "local-burger",
    "source": "local",
    "name": "Burger",
    "brand": "",
    "aliases": ["burger", "μπέργκερ", "mpergker", "hamburger"],
    "caloriesPer100g": 295,
    "proteinPer100g": 17,
    "carbsPer100g": 24,
    "fatPer100g": 14,
    "portions": [
      { "label": "1 μικρό burger", "grams": 150 },
      { "label": "1 κανονικό burger", "grams": 200 },
      { "label": "1 μεγάλο burger", "grams": 280 }
    ]
  },
  {
    "id": "local-orange-juice",
    "source": "local",
    "name": "Χυμός πορτοκάλι",
    "brand": "",
    "aliases": ["χυμός πορτοκάλι", "χυμος πορτοκαλι", "orange juice", "xymos portokali"],
    "caloriesPer100g": 45,
    "proteinPer100g": 0.7,
    "carbsPer100g": 10,
    "fatPer100g": 0.2,
    "portions": [
      { "label": "1 ποτήρι μικρό (150ml)", "grams": 150 },
      { "label": "1 ποτήρι κανονικό (200ml)", "grams": 200 },
      { "label": "1 ποτήρι μεγάλο (300ml)", "grams": 300 }
    ]
  },
  {
    "id": "local-tahini",
    "source": "local",
    "name": "Ταχίνι",
    "brand": "",
    "aliases": ["ταχίνι", "ταχινι", "tahini", "sesame paste"],
    "caloriesPer100g": 595,
    "proteinPer100g": 17,
    "carbsPer100g": 21,
    "fatPer100g": 54,
    "portions": [
      { "label": "1 κουταλάκι (10g)", "grams": 10 },
      { "label": "1 κουταλιά σούπας (30g)", "grams": 30 },
      { "label": "2 κουταλιές (60g)", "grams": 60 }
    ]
  },
  {
    "id": "local-omelet",
    "source": "local",
    "name": "Ομελέτα",
    "brand": "",
    "aliases": ["ομελέτα", "ομελετα", "omelette", "omelet"],
    "caloriesPer100g": 154,
    "proteinPer100g": 10,
    "carbsPer100g": 1.5,
    "fatPer100g": 12,
    "portions": [
      { "label": "Μικρή ομελέτα (2 αυγά)", "grams": 110 },
      { "label": "Κανονική ομελέτα (3 αυγά)", "grams": 165 },
      { "label": "Μεγάλη ομελέτα (4 αυγά)", "grams": 220 }
    ]
  },
  {
    "id": "local-tiganito-agg",
    "source": "local",
    "name": "Αυγό τηγανητό",
    "brand": "",
    "aliases": ["αυγό τηγανητό", "αυγο τηγανιτο", "fried egg", "tiganito avgo"],
    "caloriesPer100g": 196,
    "proteinPer100g": 14,
    "carbsPer100g": 1,
    "fatPer100g": 15,
    "portions": [
      { "label": "1 αυγό τηγανητό", "grams": 55 },
      { "label": "2 αυγά τηγανητά", "grams": 110 }
    ]
  },
  {
    "id": "local-koulouri",
    "source": "local",
    "name": "Κουλούρι",
    "brand": "",
    "aliases": ["κουλούρι", "κουλουρι", "koulouri", "sesame bread ring"],
    "caloriesPer100g": 290,
    "proteinPer100g": 9,
    "carbsPer100g": 56,
    "fatPer100g": 3.5,
    "portions": [
      { "label": "1 μικρό κουλούρι", "grams": 60 },
      { "label": "1 κανονικό κουλούρι", "grams": 90 },
      { "label": "1 μεγάλο κουλούρι", "grams": 120 }
    ]
  },
  {
    "id": "local-croissant",
    "source": "local",
    "name": "Κρουασάν",
    "brand": "",
    "aliases": ["κρουασάν", "κρουασαν", "croissant"],
    "caloriesPer100g": 406,
    "proteinPer100g": 8,
    "carbsPer100g": 46,
    "fatPer100g": 21,
    "portions": [
      { "label": "1 μικρό κρουασάν", "grams": 45 },
      { "label": "1 κανονικό κρουασάν", "grams": 65 },
      { "label": "1 μεγάλο κρουασάν", "grams": 90 }
    ]
  },
  {
    "id": "local-granola",
    "source": "local",
    "name": "Granola",
    "brand": "",
    "aliases": ["granola", "γκρανόλα", "muesli", "μούσλι"],
    "caloriesPer100g": 471,
    "proteinPer100g": 10,
    "carbsPer100g": 64,
    "fatPer100g": 20,
    "portions": [
      { "label": "Μικρή μερίδα (30g)", "grams": 30 },
      { "label": "Κανονική μερίδα (50g)", "grams": 50 },
      { "label": "Μεγάλη μερίδα (80g)", "grams": 80 }
    ]
  },
  {
    "id": "local-manouri",
    "source": "local",
    "name": "Μανούρι",
    "brand": "",
    "aliases": ["μανούρι", "μανουρι", "manouri"],
    "caloriesPer100g": 290,
    "proteinPer100g": 14,
    "carbsPer100g": 2,
    "fatPer100g": 25,
    "portions": [
      { "label": "Μικρή μερίδα (40g)", "grams": 40 },
      { "label": "Κανονική μερίδα (80g)", "grams": 80 }
    ]
  },
  {
    "id": "local-anthotiro",
    "source": "local",
    "name": "Ανθότυρο",
    "brand": "",
    "aliases": ["ανθότυρο", "ανθοτυρο", "anthotiro"],
    "caloriesPer100g": 174,
    "proteinPer100g": 12,
    "carbsPer100g": 4,
    "fatPer100g": 12,
    "portions": [
      { "label": "Μικρή μερίδα (40g)", "grams": 40 },
      { "label": "Κανονική μερίδα (80g)", "grams": 80 }
    ]
  },
  {
    "id": "local-dakos",
    "source": "local",
    "name": "Ντάκος",
    "brand": "",
    "aliases": ["ντάκος", "ντακος", "dakos", "cretan rusk salad"],
    "caloriesPer100g": 180,
    "proteinPer100g": 6,
    "carbsPer100g": 25,
    "fatPer100g": 7,
    "portions": [
      { "label": "1 μικρός ντάκος", "grams": 100 },
      { "label": "1 κανονικός ντάκος", "grams": 150 },
      { "label": "1 μεγάλος ντάκος", "grams": 200 }
    ]
  },
  {
    "id": "local-saganaki",
    "source": "local",
    "name": "Σαγανάκι",
    "brand": "",
    "aliases": ["σαγανάκι", "σαγανακι", "saganaki", "fried cheese"],
    "caloriesPer100g": 320,
    "proteinPer100g": 18,
    "carbsPer100g": 8,
    "fatPer100g": 25,
    "portions": [
      { "label": "Μικρή μερίδα (60g)", "grams": 60 },
      { "label": "Κανονική μερίδα (100g)", "grams": 100 }
    ]
  },
  {
    "id": "local-halvas",
    "source": "local",
    "name": "Χαλβάς",
    "brand": "",
    "aliases": ["χαλβάς", "χαλβας", "halva", "halvas"],
    "caloriesPer100g": 469,
    "proteinPer100g": 11,
    "carbsPer100g": 55,
    "fatPer100g": 25,
    "portions": [
      { "label": "1 μικρή φέτα (40g)", "grams": 40 },
      { "label": "1 κανονική φέτα (70g)", "grams": 70 }
    ]
  },
  {
    "id": "local-baklava",
    "source": "local",
    "name": "Μπακλαβάς",
    "brand": "",
    "aliases": ["μπακλαβάς", "μπακλαβας", "baklava"],
    "caloriesPer100g": 428,
    "proteinPer100g": 6,
    "carbsPer100g": 50,
    "fatPer100g": 24,
    "portions": [
      { "label": "1 κομμάτι μικρό (40g)", "grams": 40 },
      { "label": "1 κομμάτι κανονικό (70g)", "grams": 70 }
    ]
  },
  {
    "id": "local-loukoumades",
    "source": "local",
    "name": "Λουκουμάδες",
    "brand": "",
    "aliases": ["λουκουμάδες", "λουκουμαδες", "loukoumades"],
    "caloriesPer100g": 310,
    "proteinPer100g": 5,
    "carbsPer100g": 40,
    "fatPer100g": 15,
    "portions": [
      { "label": "5 λουκουμάδες", "grams": 75 },
      { "label": "10 λουκουμάδες", "grams": 150 }
    ]
  }
]
```

## src\data\modes.js
```
export const MODES = {
  balanced: {
    key: "balanced",
    label: "Balanced",
    description: "Ισορροπημένη καθημερινή διατροφή",
    carbsPercent: 40,
    proteinPercent: 30,
    fatPercent: 30,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["balanced", "everyday", "quick-meal"],
    allowedTags: []
  },

  low_carb: {
    key: "low_carb",
    label: "Low Carb",
    description: "Χαμηλότεροι υδατάνθρακες, έμφαση σε πρωτεΐνη και λίπος",
    carbsPercent: 20,
    proteinPercent: 35,
    fatPercent: 45,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["low-carb", "high-protein", "quick-meal"],
    allowedTags: ["low-carb"]
  },

  keto: {
    key: "keto",
    label: "Keto",
    description: "Πολύ χαμηλοί υδατάνθρακες και υψηλότερο λίπος",
    carbsPercent: 8,
    proteinPercent: 27,
    fatPercent: 65,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["keto", "low-carb", "high-fat"],
    allowedTags: ["keto"]
  },

  fasting: {
    key: "fasting",
    label: "Fasting 16:8",
    description: "Περιορισμός ώρας φαγητού μέσα σε eating window",
    carbsPercent: 35,
    proteinPercent: 30,
    fatPercent: 35,
    fastingHours: 16,
    eatingWindowHours: 8,
    priorityTags: ["high-protein", "satiating", "quick-meal"],
    allowedTags: []
  },

  high_protein: {
    key: "high_protein",
    label: "High Protein",
    description: "Έμφαση στην πρωτεΐνη για fitness ή muscle gain",
    carbsPercent: 30,
    proteinPercent: 40,
    fatPercent: 30,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["high-protein", "lean", "quick-meal"],
    allowedTags: ["high-protein"]
  }
};

export const MODE_OPTIONS = Object.values(MODES);
```

## src\hooks\useFoodSearch.js
```
import { useEffect, useState } from "react";

function removeAccents(str) {
  return str
    .replace(/ά/g, "α").replace(/έ/g, "ε").replace(/ή/g, "η")
    .replace(/ί/g, "ι").replace(/ό/g, "ο").replace(/ύ/g, "υ")
    .replace(/ώ/g, "ω").replace(/ϊ/g, "ι").replace(/ϋ/g, "υ")
    .replace(/ΐ/g, "ι").replace(/ΰ/g, "υ").replace(/Ά/g, "Α")
    .replace(/Έ/g, "Ε").replace(/Ή/g, "Η").replace(/Ί/g, "Ι")
    .replace(/Ό/g, "Ο").replace(/Ύ/g, "Υ").replace(/Ώ/g, "Ω");
}

function addAccents(str) {
  // Δοκιμάζει κοινές λέξεις χωρίς τόνο και επιστρέφει με τόνο
  const map = {
    "φετα": "φέτα",
    "γιαουρτι": "γιαούρτι",
    "κοτοπουλο": "κοτόπουλο",
    "ψωμι": "ψωμί",
    "τυρι": "τυρί",
    "γαλα": "γάλα",
    "αυγα": "αυγά",
    "ελαιολαδο": "ελαιόλαδο",
    "μελι": "μέλι",
    "ζαχαρη": "ζάχαρη",
    "αλατι": "αλάτι",
    "ρυζι": "ρύζι",
    "μακαρονια": "μακαρόνια",
    "πατατες": "πατάτες",
    "ντοματες": "ντομάτες",
    "κρεμμυδι": "κρεμμύδι",
    "σκορδο": "σκόρδο",
    "λαδι": "λάδι",
    "βουτυρο": "βούτυρο",
    "μοσχαρι": "μοσχάρι",
    "αρνι": "αρνί",
    "χοιρινο": "χοιρινό",
    "ψαρι": "ψάρι",
    "σολομος": "σολομός",
    "τονος": "τόνος",
    "σαρδελες": "σαρδέλες",
    "καφες": "καφές",
    "τσαι": "τσάι",
    "χυμος": "χυμός",
    "μπιρα": "μπύρα",
    "κρασι": "κρασί",
    "νερο": "νερό",
  };
  return map[str.toLowerCase()] || str;
}

export default function useFoodSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const qNoAccents = removeAccents(q);
        const qWithAccents = addAccents(qNoAccents);

        // Στέλνουμε και τις δύο εκδοχές παράλληλα
        const queries = new Set([q, qNoAccents, qWithAccents]);
        
        const allResults = await Promise.all(
          [...queries].map((searchQ) =>
            fetch(`/.netlify/functions/food-search?q=${encodeURIComponent(searchQ)}`)
              .then((res) => res.ok ? res.json() : [])
              .catch(() => [])
          )
        );

        if (cancelled) return;

        // Merge και deduplicate
        const seen = new Set();
        const merged = allResults.flat().filter((food) => {
          const key = `${String(food.name || "").trim().toLowerCase()}|${String(food.brand || "").trim().toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setResults(merged);
      } catch (err) {
        console.error("Food search error:", err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return { results, loading };
}
```

## src\index.css
```
:root {
  font-family: Arial, sans-serif;
  color: #111827;
  background: #f6f8fb;

  --bg-body: #f6f8fb;
  --bg-card: #ffffff;
  --bg-soft: #f8fafc;
  --bg-nav: rgba(255, 255, 255, 0.96);
  --bg-input: #ffffff;
  --bg-btn-light: #f3f4f6;
  --bg-modal: #ffffff;
  --bg-hero-from: #1f2937;
  --bg-hero-to: #374151;

  --border-color: #e5e7eb;
  --border-soft: #eef2f7;

  --text-primary: #111827;
  --text-muted: #6b7280;
  --text-nav: #6b7280;
  --text-nav-active: #111827;

  --color-accent: #111827;
  --color-green: #22c55e;
  --color-water: #4a9eff;

  --shadow-card: 0 8px 24px rgba(15, 23, 42, 0.06);
  --shadow-hero: 0 10px 30px rgba(0, 0, 0, 0.16);
  --shadow-fab: 0 12px 28px rgba(15, 23, 42, 0.28);
  --shadow-modal: 0 20px 40px rgba(0, 0, 0, 0.24);
}

[data-theme="dark"] {
  color: #f1f5f9;
  background: #0f172a;

  --bg-body: #0f172a;
  --bg-card: #1e293b;
  --bg-soft: #1a2744;
  --bg-nav: rgba(15, 23, 42, 0.96);
  --bg-input: #1e293b;
  --bg-btn-light: #334155;
  --bg-modal: #1e293b;
  --bg-hero-from: #1f2937;
  --bg-hero-to: #374151;

  --border-color: #334155;
  --border-soft: #1e293b;

  --text-primary: #f1f5f9;
  --text-muted: #94a3b8;
  --text-nav: #94a3b8;
  --text-nav-active: #f1f5f9;

  --color-accent: #f1f5f9;
  --color-green: #22c55e;
  --color-water: #4a9eff;

  --shadow-card: 0 8px 24px rgba(0, 0, 0, 0.3);
  --shadow-hero: 0 10px 30px rgba(0, 0, 0, 0.4);
  --shadow-fab: 0 12px 28px rgba(0, 0, 0, 0.5);
  --shadow-modal: 0 20px 40px rgba(0, 0, 0, 0.5);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg-body);
  color: var(--text-primary);
  transition: background 0.2s, color 0.2s;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
}

.app-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 12px;
}

.app-header {
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.app-header h1 {
  margin: 0;
  font-size: 30px;
}

.app-header p {
  margin: 0;
  color: var(--text-muted);
}

.app-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.theme-toggle-btn {
  border: 1px solid var(--border-color);
  background: var(--bg-btn-light);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.card {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-soft);
}

.card h2 {
  margin-top: 0;
  color: var(--text-primary);
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}

.stack-10 > * + * {
  margin-top: 10px;
}

.input {
  width: 100%;
  padding: 13px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-primary);
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  font-weight: 700;
}

.btn-dark {
  background: var(--color-accent);
  color: var(--bg-card);
}

.btn-light {
  background: var(--bg-btn-light);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-danger {
  background: #b91c1c;
  color: white;
}

.btn-edit {
  background: #0f766e;
  color: white;
}

.muted {
  color: var(--text-muted);
  font-size: 13px;
}

.badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  padding: 5px 8px;
}

.badge-local {
  color: #166534;
  background: #dcfce7;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.wrap {
  flex-wrap: wrap;
}

.soft-box {
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  padding: 14px;
}

.hero-card {
  background: linear-gradient(135deg, var(--bg-hero-from) 0%, var(--bg-hero-to) 100%);
  color: white;
  border-radius: 22px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-hero);
}

.hero-subtle {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.hero-big {
  font-size: 30px;
  font-weight: 700;
  line-height: 1.1;
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.hero-stat {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px;
}

.progress-outer {
  margin-top: 10px;
  width: 100%;
  height: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: var(--color-green);
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* Day card — για Food/Exercise ημέρας */
.day-card {
  background: linear-gradient(135deg, var(--bg-hero-from) 0%, var(--bg-hero-to) 100%);
  color: white;
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-hero);
}

.day-card h2 {
  color: white;
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
}

.day-card .muted {
  color: rgba(255, 255, 255, 0.7);
}

.day-card-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  margin-bottom: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  gap: 8px;
}

.day-card-entry-title {
  font-weight: 700;
  font-size: 13px;
  color: white;
}

.day-card-entry-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 6px;
}

.day-card-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  font-weight: 700;
}

.day-card-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.day-card-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

/* Macro progress bars */
.macro-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.macro-bar-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.macro-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.macro-bar-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.macro-bar-value {
  font-size: 12px;
  color: var(--text-muted);
}

.macro-bar-outer {
  width: 100%;
  height: 10px;
  background: var(--border-soft);
  border-radius: 999px;
  overflow: hidden;
}

.macro-bar-inner {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.macro-bar-protein { background: #3b82f6; }
.macro-bar-carbs { background: #f59e0b; }
.macro-bar-fat { background: #ef4444; }

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 4px;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--bg-nav);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--border-color);
  z-index: 100;
}

.bottom-nav button {
  flex: 1;
  border: none;
  background: transparent;
  border-radius: 14px;
  padding: 8px 4px;
  cursor: pointer;
  color: var(--text-nav);
  font-size: 11px;
  font-weight: 700;
}

.bottom-nav button.active {
  color: var(--text-nav-active);
  background: var(--bg-btn-light);
}

.bottom-nav .nav-icon {
  font-size: 20px;
  line-height: 1;
}

.fab-btn {
  position: fixed;
  right: 18px;
  bottom: 86px;
  width: 60px;
  height: 60px;
  border-radius: 999px;
  border: none;
  background: var(--color-accent);
  color: var(--bg-card);
  font-size: 34px;
  cursor: pointer;
  z-index: 110;
  box-shadow: var(--shadow-fab);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
}

.modal-sheet {
  width: 100%;
  max-width: 760px;
  background: var(--bg-modal);
  border-radius: 22px;
  padding: 16px;
  box-shadow: var(--shadow-modal);
}

.modal-sheet h3 {
  margin-top: 0;
  color: var(--text-primary);
}

.history-row {
  width: 100%;
  text-align: left;
  background: var(--bg-card);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.action-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 12px;
  font-weight: 700;
}

/* Exercise tab */
.exercise-summary-box { margin-top: 10px; }
.exercise-summary-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.exercise-summary-kcal { font-weight: 700; color: #166534; }
.exercise-day-list { display: flex; flex-direction: column; gap: 10px; }
.exercise-entry-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}
.exercise-entry-main { min-width: 0; flex: 1; }
.exercise-entry-title { font-weight: 700; }
.exercise-entry-meta { margin-top: 6px; line-height: 1.45; }
.exercise-entry-actions { display: flex; gap: 8px; flex-shrink: 0; }
.exercise-library-list { display: flex; flex-direction: column; gap: 10px; }
.exercise-library-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.exercise-library-main { flex: 1; min-width: 0; }
.exercise-library-title { font-weight: 700; }
.exercise-library-controls {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.exercise-inline-field { display: flex; align-items: center; gap: 8px; min-width: 0; }
.exercise-inline-label { font-size: 13px; color: var(--text-muted); white-space: nowrap; }
.exercise-compact-input { width: 88px; min-width: 88px; margin: 0; padding: 11px 12px; text-align: center; }
.exercise-add-btn { white-space: nowrap; }
.exercise-field-box .input { margin: 0; }

/* Food tab */
.food-meal-group { padding: 12px; }
.food-meal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.food-day-list { display: flex; flex-direction: column; gap: 8px; }
.food-entry-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 10px;
}
.food-entry-main {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
}
.food-entry-title { font-weight: 700; }
.food-entry-meta { margin-top: 4px; line-height: 1.45; }
.food-entry-actions { display: flex; gap: 8px; flex-shrink: 0; }
.food-search-wrap { position: relative; }
.food-autocomplete-panel {
  margin-top: 8px;
  margin-bottom: 12px;
  background: var(--bg-soft);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 8px;
}
.food-autocomplete-state { padding: 8px 6px; }
.food-autocomplete-item {
  width: 100%;
  border: none;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
}
.food-autocomplete-item + .food-autocomplete-item { margin-top: 8px; }
.food-results-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.food-result-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  padding: 8px;
}
.food-result-main {
  flex: 1;
  min-width: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
}
.food-result-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.food-result-name { font-weight: 700; }
.food-result-meta { margin-top: 4px; line-height: 1.45; }
.food-fav-icon-btn {
  width: 38px;
  min-width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}
.food-fav-icon-btn.is-active {
  color: #d97706;
  border-color: #fcd34d;
  background: #fffbeb;
}
.food-selected-box { margin-top: 12px; }
.food-selected-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.food-selected-title { font-weight: 700; }
.food-selected-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.food-inline-field { display: flex; flex-direction: column; gap: 6px; }
.food-preview-box { margin-top: 10px; margin-bottom: 10px; background: var(--bg-card); }
.food-custom-box { margin-top: 12px; }
.food-compact-list { display: flex; flex-direction: column; gap: 8px; }
.food-compact-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--bg-soft);
}
.food-compact-main { flex: 1; min-width: 0; }
.food-compact-title { font-weight: 700; }
.food-compact-meta { margin-top: 4px; line-height: 1.4; }
.food-compact-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* Summary tab */
.summary-date-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
}
.summary-date-title { font-size: 20px; font-weight: 700; }
.summary-date-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.summary-date-input { width: 160px; margin-bottom: 0; }
.summary-remaining-block { margin-top: 18px; }
.summary-remaining-positive { color: #86efac; }
.summary-remaining-negative { color: #fca5a5; }
.summary-remaining-neutral { color: #fde68a; }
.summary-remaining-formula { margin-top: 8px; }
.summary-hero-grid { margin-top: 16px; }
.summary-hero-grid-2, .summary-hero-grid-3 { margin-top: 12px; }
.summary-progress-text { margin-top: 8px; }
.summary-section-title { font-weight: 700; margin-bottom: 8px; }
.summary-mode-hint { margin-bottom: 10px; }
.summary-suggestions-list { display: flex; flex-direction: column; gap: 10px; }
.summary-suggestion-card {
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  padding: 14px;
}
.summary-suggestion-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.summary-suggestion-title { font-weight: 700; }
.summary-suggestion-meta { margin-bottom: 8px; line-height: 1.45; }
.summary-history-list { display: flex; flex-direction: column; gap: 8px; }
.summary-history-row { margin-bottom: 0; }
.summary-history-row-active { border: 2px solid var(--color-accent); }
.summary-history-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}
.summary-history-title { font-weight: 700; }
.summary-history-stats { text-align: right; }
.summary-history-remaining-positive { color: #166534; font-weight: 700; }
.summary-history-remaining-negative { color: #b91c1c; font-weight: 700; }

/* Profile tab */
.profile-intro-box { margin-bottom: 12px; }
.profile-section-box { margin-bottom: 14px; }
.profile-section-title { font-weight: 700; margin-bottom: 10px; font-size: 15px; }
.profile-grid-compact { gap: 8px; }
.profile-field { display: block; }
.profile-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.profile-highlight-box { background: var(--bg-soft); border: 1px solid var(--border-color); }
.profile-stat-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.profile-stat-row-last { margin-bottom: 0; }
.profile-warning-box { margin-bottom: 14px; background: #fffbeb; border: 1px solid #fde68a; }
.profile-danger-box { margin-bottom: 14px; background: #fef2f2; border: 1px solid #fecaca; }
.profile-warning-title { font-weight: 700; margin-bottom: 6px; }

@media (max-width: 560px) {
  .app-container { padding: 10px; }
  .card { padding: 14px; border-radius: 18px; }
  .hero-big { font-size: 26px; }
  .action-row { flex-wrap: wrap; }
  .action-row .btn { flex: 1 1 0; }
  .exercise-entry-card { flex-direction: column; align-items: stretch; }
  .exercise-entry-actions { width: 100%; }
  .exercise-entry-actions .btn { width: 100%; }
  .exercise-library-item { flex-direction: column; align-items: stretch; }
  .exercise-library-controls { width: 100%; justify-content: stretch; align-items: stretch; flex-direction: row; }
  .exercise-inline-field { flex: 1; min-width: 0; }
  .exercise-compact-input { width: 100%; min-width: 0; }
  .exercise-add-btn { flex: 1; }
  .food-entry-card { flex-direction: column; align-items: stretch; }
  .food-entry-actions { width: 100%; }
  .food-entry-actions .btn { flex: 1; }
  .food-selected-controls { grid-template-columns: 1fr; }
  .food-result-card { align-items: stretch; }
  .food-fav-icon-btn { width: 38px; min-width: 38px; height: 38px; align-self: center; }
  .food-compact-card { flex-direction: column; align-items: stretch; }
  .food-compact-actions { width: 100%; }
  .food-compact-actions .btn { flex: 1; }
  .summary-date-controls { width: 100%; }
  .summary-date-controls .btn { flex: 1; }
  .summary-date-input { width: 100%; }
  .summary-history-main { flex-direction: column; align-items: flex-start; }
  .summary-history-stats { width: 100%; text-align: left; }
  .profile-section-title { font-size: 14px; }
  .profile-stat-row { flex-direction: column; align-items: flex-start; gap: 2px; }
  .input { padding: 11px; }
}
```

## src\main.jsx
```
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## src\utils\calorieLogic.js
```
import { MODES } from "../data/modes";

export function calculateBMR({ age, gender, height, weight }) {
  const a = Number(age);
  const h = Number(height);
  const w = Number(weight);

  if (!a || !h || !w) return 0;

  if (gender === "female") {
    return Math.round(10 * w + 6.25 * h - 5 * a - 161);
  }

  return Math.round(10 * w + 6.25 * h - 5 * a + 5);
}

export function calculateTDEE({ bmr, activity }) {
  return Math.round(Number(bmr || 0) * Number(activity || 1.2));
}

export function calculateDailyDeficit({ kilos, weeks }) {
  const kg = Number(kilos);
  const w = Number(weeks);

  if (!kg || !w) return 0;

  const total = kg * 7700;
  const days = w * 7;

  return Math.round(total / days);
}

export function calculateAppliedDailyDeficit(rawDeficit) {
  const deficit = Number(rawDeficit || 0);
  if (!deficit) return 0;
  return Math.min(Math.max(deficit, 150), 1000);
}

export function calculateTargetCalories({
  goalType,
  tdee,
  targetWeightChange,
  weeks
}) {
  const base = Number(tdee || 0);

  if (!base) return 0;

  if (goalType === "maintain") return base;
  if (goalType === "fitness") return base; // TDEE — focus σε cardio, όχι έλλειμμα
  if (goalType === "gain") return Math.round(base + 300);

  if (goalType === "lose") {
    const rawDeficit = calculateDailyDeficit({
      kilos: targetWeightChange,
      weeks
    });

    const appliedDeficit = calculateAppliedDailyDeficit(rawDeficit);

    return Math.max(Math.round(base - appliedDeficit), 1200);
  }

  return base;
}

export function calculateProteinTarget({ weight, goalType, modeKey }) {
  const w = Number(weight || 0);
  if (!w) return 0;

  if (modeKey === "high_protein") return Math.round(w * 2.2);
  if (goalType === "gain") return Math.round(w * 2.0);
  if (goalType === "lose") return Math.round(w * 1.8);
  if (goalType === "fitness") return Math.round(w * 1.6); // moderate protein, cardio focus

  return Math.round(w * 1.6);
}

export function calculateMacroTargets({
  targetCalories,
  proteinTarget,
  modeKey = "balanced"
}) {
  const mode = MODES[modeKey] || MODES.balanced;
  const calories = Number(targetCalories || 0);

  if (!calories) {
    return {
      carbsGrams: 0,
      proteinGrams: proteinTarget || 0,
      fatGrams: 0
    };
  }

  const proteinCalories = proteinTarget * 4;
  const remaining = Math.max(calories - proteinCalories, 0);

  const carbsCalories =
    remaining * (mode.carbsPercent / (mode.carbsPercent + mode.fatPercent));
  const fatCalories =
    remaining * (mode.fatPercent / (mode.carbsPercent + mode.fatPercent));

  return {
    carbsGrams: Math.round(carbsCalories / 4),
    proteinGrams: Math.round(proteinCalories / 4),
    fatGrams: Math.round(fatCalories / 9)
  };
}
```

## src\utils\helpers.js
```
export function getTodayKey() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDate(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("el-GR", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString("el-GR");
}

export function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export function normalizeDayLog(log) {
  if (!log) {
    return { entries: [], exercises: [] };
  }

  return {
    entries: Array.isArray(log.entries) ? log.entries : [],
    exercises: Array.isArray(log.exercises) ? log.exercises : []
  };
}

export function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeSearchText(value) {
  return stripDiacritics(String(value || "").toLowerCase())
    .replace(/[\/_,;:+()[\]{}|'"`~.!?@#$%^&*=<>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toCompactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function transliterateGreekToLatin(value) {
  let text = stripDiacritics(String(value || "").toLowerCase());

  const digraphs = [
    [/ου/g, "ou"],
    [/αι/g, "ai"],
    [/ει/g, "ei"],
    [/οι/g, "oi"],
    [/υι/g, "yi"],
    [/αυ/g, "av"],
    [/ευ/g, "ev"],
    [/ηυ/g, "iv"],
    [/γκ/g, "gk"],
    [/γγ/g, "ng"],
    [/μπ/g, "b"],
    [/ντ/g, "nt"],
    [/τσ/g, "ts"],
    [/τζ/g, "tz"]
  ];

  digraphs.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  const map = {
    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "x",
    ψ: "ps",
    ω: "o"
  };

  return text
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

export function simplifyLatinGreeklish(value) {
  return normalizeSearchText(value)
    .replace(/ou/g, "u")
    .replace(/ei/g, "i")
    .replace(/oi/g, "i")
    .replace(/ai/g, "e")
    .replace(/yi/g, "i")
    .replace(/th/g, "8")
    .replace(/ch/g, "x")
    .replace(/gk/g, "g")
    .replace(/mp/g, "b")
    .replace(/nt/g, "d")
    .replace(/tz/g, "z")
    .replace(/ts/g, "s")
    .replace(/y/g, "i");
}

export function buildSearchVariants(value) {
  const original = normalizeSearchText(value);
  const compact = toCompactSearchText(value);
  const latin = normalizeSearchText(transliterateGreekToLatin(value));
  const latinCompact = toCompactSearchText(transliterateGreekToLatin(value));
  const simplifiedLatin = simplifyLatinGreeklish(transliterateGreekToLatin(value));
  const simplifiedOriginal = simplifyLatinGreeklish(value);

  return Array.from(
    new Set(
      [
        original,
        compact,
        latin,
        latinCompact,
        simplifiedLatin,
        simplifiedOriginal,
        toCompactSearchText(simplifiedLatin),
        toCompactSearchText(simplifiedOriginal)
      ].filter(Boolean)
    )
  );
}

export function getFoodAliases(food) {
  return Array.isArray(food?.aliases)
    ? food.aliases.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export function getFoodSearchTexts(food) {
  const name = String(food?.name || "");
  const brand = String(food?.brand || "");
  const aliases = getFoodAliases(food);

  const rawValues = [name, brand, ...aliases].filter(Boolean);
  const expanded = rawValues.flatMap((item) => buildSearchVariants(item));

  return Array.from(new Set(expanded.filter(Boolean)));
}

export function getFoodIdentityKey(food) {
  const normalizedName = normalizeSearchText(food?.name || "");
  const normalizedBrand = normalizeSearchText(food?.brand || "");
  return `${normalizedName}|${normalizedBrand}`;
}

export function normalizeFood(food) {
  return {
    id: food.id || `food-${Date.now()}`,
    source: food.source || "local",
    sourceLabel: food.sourceLabel || "",
    name: food.name || "Unknown food",
    brand: food.brand || "",
    aliases: getFoodAliases(food),
    caloriesPer100g: Number(food.caloriesPer100g || 0),
    proteinPer100g: Number(food.proteinPer100g || 0),
    carbsPer100g: Number(food.carbsPer100g || 0),
    fatPer100g: Number(food.fatPer100g || 0),
    portions: Array.isArray(food.portions) ? food.portions : []
  };
}

export function createFoodEntry(food, gramsValue, meal) {
  const normalized = normalizeFood(food);
  const grams = Math.max(Number(gramsValue) || 100, 1);
  const factor = grams / 100;

  return {
    id: Date.now() + Math.random(),
    foodId: normalized.id,
    source: normalized.source,
    name: normalized.name,
    brand: normalized.brand,
    mealType: meal || "Πρωινό",
    grams,
    calories: Math.round(normalized.caloriesPer100g * factor),
    protein: round1(normalized.proteinPer100g * factor),
    carbs: round1(normalized.carbsPer100g * factor),
    fat: round1(normalized.fatPer100g * factor),
    baseCaloriesPer100g: normalized.caloriesPer100g,
    baseProteinPer100g: normalized.proteinPer100g,
    baseCarbsPer100g: normalized.carbsPer100g,
    baseFatPer100g: normalized.fatPer100g
  };
}

export function calculateBmr({ age, height, weight, gender }) {
  const a = Number(age);
  const h = Number(height);
  const w = Number(weight);

  if (!a || !h || !w) return 0;

  if (gender === "male") {
    return Math.round(10 * w + 6.25 * h - 5 * a + 5);
  }

  return Math.round(10 * w + 6.25 * h - 5 * a - 161);
}

export function calculateDailyDeficit({ goalType, targetWeightLoss, weeks }) {
  if (goalType !== "lose") return 0;

  const kg = Number(targetWeightLoss) || 0;
  const wks = Number(weeks) || 0;

  if (kg <= 0 || wks <= 0) return 300;

  const deficit = (kg * 7700) / (wks * 7);

  return Math.max(150, Math.min(Math.round(deficit), 1000));
}

export function calculateTargetCalories({ tdee, goalType, dailyDeficit }) {
  const safeTdee = Number(tdee) || 0;
  if (!safeTdee) return 0;

  switch (goalType) {
    case "maintain":
      return Math.round(safeTdee);

    case "lose":
      return Math.max(1200, Math.round(safeTdee - (Number(dailyDeficit) || 0)));

    case "gain":
      return Math.round(safeTdee + 300);

    default:
      return Math.round(safeTdee);
  }
}

export function calculateProteinTarget({ goalType, weight }) {
  const weightKg = Number(weight) || 0;
  if (!weightKg) return 0;

  switch (goalType) {
    case "lose":
      return Math.round(weightKg * 1.8);

    case "gain":
      return Math.round(weightKg * 2.0);

    case "maintain":
    default:
      return Math.round(weightKg * 1.4);
  }
}

export function entryBasePer100g(entry) {
  const grams = Math.max(Number(entry?.grams) || 100, 1);

  if (
    entry?.baseCaloriesPer100g !== undefined &&
    entry?.baseProteinPer100g !== undefined &&
    entry?.baseCarbsPer100g !== undefined &&
    entry?.baseFatPer100g !== undefined
  ) {
    return {
      caloriesPer100g: Number(entry.baseCaloriesPer100g || 0),
      proteinPer100g: Number(entry.baseProteinPer100g || 0),
      carbsPer100g: Number(entry.baseCarbsPer100g || 0),
      fatPer100g: Number(entry.baseFatPer100g || 0)
    };
  }

  return {
    caloriesPer100g: (Number(entry?.calories || 0) / grams) * 100,
    proteinPer100g: (Number(entry?.protein || 0) / grams) * 100,
    carbsPer100g: (Number(entry?.carbs || 0) / grams) * 100,
    fatPer100g: (Number(entry?.fat || 0) / grams) * 100
  };
}
```

## src\utils\storage.js
```
export function loadValue(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch {
    return fallback;
  }
}

export function saveValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}
```

## src\utils\streak.js
```
import { normalizeDayLog } from "./helpers";

export function calculateStreak(dailyLogs, targetCalories) {
  if (!targetCalories || targetCalories <= 0) return 0;

  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);

    const log = normalizeDayLog(dailyLogs[key]);
    const eaten = log.entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
    const exercise = log.exercises.reduce((sum, item) => sum + Number(item.calories || 0), 0);

    if (i === 0 && eaten === 0) continue;

    const net = eaten - exercise;
    const withinGoal = eaten > 0 && net <= targetCalories + 100;

    if (withinGoal) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function getStreakEmoji(streak) {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 7) return "🔥";
  if (streak >= 3) return "⚡";
  if (streak >= 1) return "✅";
  return "💤";
}

export function getStreakMessage(streak) {
  if (streak >= 30) return "Απίστευτο! 30+ μέρες στο στόχο!";
  if (streak >= 14) return "Εξαιρετικό! 2 εβδομάδες συνέχεια!";
  if (streak >= 7) return "Τέλεια εβδομάδα! Συνέχισε!";
  if (streak >= 3) return "Καλή πορεία! Κράτα το!";
  if (streak >= 1) return "Ξεκίνησες! Συνέχισε αύριο!";
  return "Ξεκίνα σήμερα για να χτίσεις streak!";
}
```

## src\utils\suggestions.js
```
export function getSuggestedFoods({
  foods,
  modeKey,
  remainingCalories,
  remainingProtein
}) {
  if (!Array.isArray(foods) || foods.length === 0) return [];

  return foods
    .filter((food) => Number(food.caloriesPer100g || 0) > 0)
    .filter((food) => Number(food.caloriesPer100g || 0) <= Math.max(remainingCalories, 250) + 120)
    .filter((food) => {
      const carbs = Number(food.carbsPer100g || 0);
      if (modeKey === "keto") return carbs <= 8;
      if (modeKey === "low_carb") return carbs <= 15;
      return true;
    })
    .sort((a, b) => {
      const aProtein = Number(a.proteinPer100g || 0);
      const bProtein = Number(b.proteinPer100g || 0);
      const aCalories = Number(a.caloriesPer100g || 0);
      const bCalories = Number(b.caloriesPer100g || 0);
      const aCarbs = Number(a.carbsPer100g || 0);
      const bCarbs = Number(b.carbsPer100g || 0);

      let aScore = 0;
      let bScore = 0;

      if (remainingProtein > 15) {
        aScore += aProtein * 3;
        bScore += bProtein * 3;
      } else {
        aScore += aProtein * 1.5;
        bScore += bProtein * 1.5;
      }

      if (modeKey === "high_protein") {
        aScore += aProtein * 2;
        bScore += bProtein * 2;
      }

      if (modeKey === "low_carb") {
        aScore -= aCarbs * 2;
        bScore -= bCarbs * 2;
      }

      if (modeKey === "keto") {
        aScore -= aCarbs * 4;
        bScore -= bCarbs * 4;
      }

      aScore -= aCalories * 0.03;
      bScore -= bCalories * 0.03;

      return bScore - aScore;
    })
    .slice(0, 5);
}
```

## src\utils\theme.js
```
export function getInitialTheme() {
  try {
    const saved = localStorage.getItem("ft_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("ft_theme", theme);
  } catch {
    // ignore
  }
}
```

## netlify\functions\ai-coach.js
```
export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { weekData, todayData, profile, favoriteFoods, chatMessage } = body;

    if (!profile) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing data" }) };
    }

    const goalLabel = profile.goalType === "lose" ? "Απώλεια βάρους" :
      profile.goalType === "gain" ? "Μυϊκή ανάπτυξη" : "Διατήρηση";

    const systemPrompt = `Είσαι ο προσωπικός διατροφολόγος και γυμναστής του χρήστη στο app FuelTrack. Μιλάς στα Ελληνικά, είσαι φιλικός, άμεσος και πρακτικός. Δίνεις πάντα συγκεκριμένες, actionable συμβουλές — ποτέ γενικόλογα.

ΠΡΟΦΙΛ ΧΡΗΣΤΗ:
- Στόχος: ${goalLabel}
- Τρόπος διατροφής: ${profile.mode}
- Ημερήσιος στόχος: ${profile.targetCalories} kcal
- Στόχος πρωτεΐνης: ${profile.proteinTarget}g
- Streak: ${profile.streak} συνεχόμενες μέρες
${profile.lastWeight ? `- Τελευταίο βάρος: ${profile.lastWeight} kg` : ""}

ΓΟΥΣΤΑ ΧΡΗΣΤΗ:
- Αγαπημένα φαγητά: ${profile.favoriteFoodsText || "Δεν έχει δηλώσει"}
- Αγαπημένες ασκήσεις: ${profile.favoriteExercisesText || "Δεν έχει δηλώσει"}
- Αγαπημένα από το app: ${(favoriteFoods || []).length > 0 ? (favoriteFoods || []).map(f => f.name).join(", ") : "Κανένα ακόμα"}

ΣΗΜΕΡΑ:
- Έφαγε: ${todayData?.eaten || 0} kcal από ${profile.targetCalories} kcal
- Πρωτεΐνη: ${todayData?.protein || 0}g από ${profile.proteinTarget}g
- Άσκηση: ${todayData?.exercise || 0} kcal
- Υπόλοιπο: ${todayData?.remaining || profile.targetCalories} kcal
  (Υπόλοιπο = Στόχος − Φαγητό + Άσκηση)

ΕΒΔΟΜΑΔΑ:
${(weekData || []).map((d, i) => `Μέρα ${i + 1}: ${d.eaten} kcal, πρωτεΐνη ${d.protein}g, άσκηση ${d.exercise} kcal`).join("\n")}

ΚΑΝΟΝΕΣ:
- ΠΑΝΤΑ πρότεινε φαγητά από τα γούστα του χρήστη αν υπάρχουν
- ΠΑΝΤΑ πρότεινε ασκήσεις από τα αγαπημένα του αν υπάρχουν
- Όταν ζητάει meal plan, δώσε συγκεκριμένο πρόγραμμα για ολόκληρη την ημέρα (πρωινό, μεσημεριανό, βραδινό, σνακ) με θερμίδες
- Όταν ζητάει training plan, δώσε συγκεκριμένο πρόγραμμα με τύπο, διάρκεια, ένταση
- Να είσαι σύντομος αλλά πλήρης — χρησιμοποίησε bullet points
- Χρησιμοποίησε emojis με μέτρο`;

    const userMessage = chatMessage ||
      `Κοίτα τα δεδομένα μου και πες μου:
1. Τι να φάω για την υπόλοιπη μέρα (από τα αγαπημένα μου)
2. Αν πρέπει να γυμναστώ σήμερα και τι ακριβώς
3. Ένα πράγμα που κάνω λάθος αυτή την εβδομάδα`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    const text = data.content?.[0]?.text || "Δεν ήταν δυνατή η ανάλυση.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advice: text })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}
```

## netlify\functions\barcode-search.js
```
export async function handler(event) {
  try {
    const barcode = event.queryStringParameters?.code?.trim();

    if (!barcode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing barcode" })
      };
    }

    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (!response.ok) {
      throw new Error(`OFF error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return {
        statusCode: 200,
        body: JSON.stringify({ found: false })
      };
    }

    const p = data.product;
    const n = p.nutriments || {};

    const food = {
      found: true,
      id: `off-${barcode}`,
      source: "off",
      sourceLabel: "OpenFood",
      name: p.product_name_el || p.product_name || "Unknown",
      brand: p.brands || "",
      caloriesPer100g: Number(n["energy-kcal_100g"] || 0),
      proteinPer100g: Number(n.proteins_100g || 0),
      carbsPer100g: Number(n.carbohydrates_100g || 0),
      fatPer100g: Number(n.fat_100g || 0),
      image: p.image_front_small_url || ""
    };

    return {
      statusCode: 200,
      body: JSON.stringify(food)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}
```

## netlify\functions\fatsecret-token.js
```
let cachedToken = null;
let tokenExpiry = 0;

export async function getFatSecretToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  const res = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: "grant_type=client_credentials&scope=basic"
  });

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}
```

## netlify\functions\food-photo.js
```
export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { imageBase64, mediaType } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing image" })
      };
    }

    const prompt = `Κοίτα αυτή τη φωτογραφία φαγητού και αναλύσε το περιεχόμενό της.

Απάντησε ΜΟΝΟ με ένα JSON object στην παρακάτω μορφή, χωρίς κανένα άλλο κείμενο:
{
  "name": "Όνομα φαγητού στα ελληνικά",
  "description": "Σύντομη περιγραφή",
  "estimatedGrams": 150,
  "caloriesPer100g": 250,
  "proteinPer100g": 15,
  "carbsPer100g": 30,
  "fatPer100g": 8,
  "confidence": "high/medium/low"
}

Αν δεν μπορείς να αναγνωρίσεις το φαγητό, βάλε confidence: "low" και εκτίμησε με βάση αυτό που βλέπεις.
Όλες οι τιμές είναι ανά 100g εκτός από το estimatedGrams που είναι η εκτιμώμενη ποσότητα στη φωτογραφία.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: imageBase64
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON από την απάντηση
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}
```

## netlify\functions\food-search.js
```
import { getFatSecretToken } from "./fatsecret-token.js";

function removeAccents(str) {
  return str
    .replace(/ά/g, "α").replace(/έ/g, "ε").replace(/ή/g, "η")
    .replace(/ί/g, "ι").replace(/ό/g, "ο").replace(/ύ/g, "υ")
    .replace(/ώ/g, "ω").replace(/ϊ/g, "ι").replace(/ϋ/g, "υ")
    .replace(/ΐ/g, "ι").replace(/ΰ/g, "υ").replace(/Ά/g, "Α")
    .replace(/Έ/g, "Ε").replace(/Ή/g, "Η").replace(/Ί/g, "Ι")
    .replace(/Ό/g, "Ο").replace(/Ύ/g, "Υ").replace(/Ώ/g, "Ω");
}

export async function handler(event) {
  try {
    const query = event.queryStringParameters?.q?.trim();

    if (!query || query.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const API_KEY = process.env.USDA_API_KEY;
    const queryNoAccents = removeAccents(query);

    // USDA
    const usdaPromise = fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${API_KEY}`
    ).then((res) => res.json()).catch(() => null);

    // OFF Greek
    const offGrPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&lc=el&cc=gr`
    ).then((res) => res.json()).catch(() => null);

    // OFF Greek no accents
    const offGrNoAccentsPromise = queryNoAccents !== query
      ? fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(queryNoAccents)}&search_simple=1&action=process&json=1&page_size=15&lc=el&cc=gr`
        ).then((res) => res.json()).catch(() => null)
      : Promise.resolve(null);

    // OFF World
    const offWorldPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
    ).then((res) => res.json()).catch(() => null);

    // FatSecret
    const fatSecretPromise = (async () => {
      try {
        const token = await getFatSecretToken();
        const res = await fetch(
          `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(query)}&format=json&max_results=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return await res.json();
      } catch { return null; }
    })();

    // Περιμένουμε USDA πρώτα
    const usdaData = await usdaPromise;

    function getNutrientValue(food, possibleNames) {
      const match = (food.foodNutrients || []).find((n) =>
        possibleNames.includes(n.nutrientName)
      );
      return Number(match?.value) || 0;
    }

    const usdaFoods = (usdaData?.foods || []).map((food) => ({
      id: `usda-${food.fdcId}`,
      source: "usda",
      sourceLabel: "USDA",
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "",
      caloriesPer100g: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
      proteinPer100g: getNutrientValue(food, ["Protein"]),
      carbsPer100g: getNutrientValue(food, ["Carbohydrate, by difference"]),
      fatPer100g: getNutrientValue(food, ["Total lipid (fat)"]),
    }));

    // OFF + FatSecret με timeout
    let offFoods = [];
    let fatSecretFoods = [];

    try {
      const [offGrData, offGrNoAccentsData, offWorldData, fatSecretData] = await Promise.all([
        Promise.race([offGrPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([offGrNoAccentsPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([offWorldPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([fatSecretPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
      ]);

      const parseOFF = (data, label) => {
        if (!data?.products) return [];
        return data.products
          .filter((p) => p.product_name && Number(p.nutriments?.["energy-kcal_100g"] || 0) > 0)
          .map((p) => ({
            id: `off-${p.code}`,
            source: "off",
            sourceLabel: label,
            name: p.product_name_el || p.product_name || "Unknown",
            brand: p.brands || "",
            caloriesPer100g: Number(p.nutriments?.["energy-kcal_100g"] || 0),
            proteinPer100g: Number(p.nutriments?.proteins_100g || 0),
            carbsPer100g: Number(p.nutriments?.carbohydrates_100g || 0),
            fatPer100g: Number(p.nutriments?.fat_100g || 0),
          }));
      };

      offFoods = [
        ...parseOFF(offGrData, "🇬🇷 Greek"),
        ...parseOFF(offGrNoAccentsData, "🇬🇷 Greek"),
        ...parseOFF(offWorldData, "OpenFood")
      ];

      // Parse FatSecret
      if (fatSecretData?.foods?.food) {
        const foods = Array.isArray(fatSecretData.foods.food)
          ? fatSecretData.foods.food
          : [fatSecretData.foods.food];

        fatSecretFoods = foods
          .filter((f) => f.food_name)
          .map((f) => {
            const desc = f.food_description || "";
            const calMatch = desc.match(/Calories:\s*([\d.]+)kcal/i);
            const fatMatch = desc.match(/Fat:\s*([\d.]+)g/i);
            const carbMatch = desc.match(/Carbs:\s*([\d.]+)g/i);
            const protMatch = desc.match(/Protein:\s*([\d.]+)g/i);

            return {
              id: `fs-${f.food_id}`,
              source: "fatsecret",
              sourceLabel: "FatSecret",
              name: f.food_name,
              brand: f.brand_name || "",
              caloriesPer100g: Number(calMatch?.[1] || 0),
              proteinPer100g: Number(protMatch?.[1] || 0),
              carbsPer100g: Number(carbMatch?.[1] || 0),
              fatPer100g: Number(fatMatch?.[1] || 0),
            };
          })
          .filter((f) => f.caloriesPer100g > 0);
      }
    } catch { /* ignore */ }

    // Deduplicate — FatSecret πρώτο για ελληνικά
    const seen = new Set();
    const allFoods = [...fatSecretFoods, ...offFoods, ...usdaFoods].filter((f) => {
      const key = `${String(f.name || "").trim().toLowerCase()}|${String(f.brand || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      statusCode: 200,
      body: JSON.stringify(allFoods),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
}
```

## netlify\functions\google-fit-auth.js
```
export async function handler() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = "https://fueltrack-marios.netlify.app/.netlify/functions/google-fit-callback";

  const scope = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.location.read"
  ].join(" ");

  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;

  return {
    statusCode: 302,
    headers: { Location: url }
  };
}
```

## netlify\functions\google-fit-callback.js
```
export async function handler(event) {
  const code = event.queryStringParameters?.code;
  const redirectUri = "https://fueltrack-marios.netlify.app/.netlify/functions/google-fit-callback";

  if (!code) {
    return {
      statusCode: 302,
      headers: { Location: "https://fueltrack-marios.netlify.app/?fit_error=no_code" }
    };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token || "";

    return {
      statusCode: 302,
      headers: {
        Location: `https://fueltrack-marios.netlify.app/?fit_token=${encodeURIComponent(accessToken)}&fit_refresh=${encodeURIComponent(refreshToken)}`
      }
    };
  } catch (err) {
    return {
      statusCode: 302,
      headers: { Location: `https://fueltrack-marios.netlify.app/?fit_error=${encodeURIComponent(err.message)}` }
    };
  }
}
```

## netlify\functions\google-fit-data.js
```
export async function handler(event) {
  const accessToken = event.queryStringParameters?.token;
  const date = event.queryStringParameters?.date || new Date().toISOString().slice(0, 10);

  if (!accessToken) {
    return { statusCode: 401, body: JSON.stringify({ error: "No token" }) };
  }

  try {
    const [year, month, day] = date.split("-").map(Number);
    const startMs = new Date(year, month - 1, day, 0, 0, 0).getTime();
    const endMs = new Date(year, month - 1, day, 23, 59, 59).getTime();

    const body = {
      aggregateBy: [
        { dataTypeName: "com.google.step_count.delta" },
        { dataTypeName: "com.google.distance.delta" },
        { dataTypeName: "com.google.calories.expended" }
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startMs,
      endTimeMillis: endMs
    };

    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    let steps = 0;
    let distanceMeters = 0;
    let calories = 0;

    for (const bucket of data.bucket || []) {
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          for (const val of point.value || []) {
            if (dataset.dataSourceId.includes("step_count")) steps += val.intVal || 0;
            if (dataset.dataSourceId.includes("distance")) distanceMeters += val.fpVal || 0;
            if (dataset.dataSourceId.includes("calories")) calories += val.fpVal || 0;
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: Math.round(steps),
        distanceKm: Math.round(distanceMeters / 10) / 100,
        calories: Math.round(calories)
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
```

