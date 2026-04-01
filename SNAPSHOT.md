# FuelTrack Snapshot


## FILE: src/App.jsx
```javascript
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
  getTodayKey,
  normalizeDayLog,
  normalizeFood,
  createFoodEntry,
  round1,
  shiftDate,
  entryBasePer100g
} from "./utils/helpers";
import {
  calculateBMR,
  calculateTDEE,
  calculateDailyDeficit,
  calculateTargetCalories,
  calculateProteinTarget,
  calculateMacroTargets
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
  const [goalType, setGoalType] = useState(() => {
    const saved = loadValue("ft_goalType", "lose");
    return saved === "fitness" ? "maintain" : saved;
  });
  const [mode, setMode] = useState(() => loadValue("ft_mode", "balanced"));
  const [targetWeightLoss, setTargetWeightLoss] = useState(() =>
    loadValue("ft_targetWeightLoss", "")
  );
  const [weeks, setWeeks] = useState(() => loadValue("ft_weeks", ""));

  const [foods, setFoods] = useState(() => loadJSON("ft_foods", foodsData));
  const [dailyLogs, setDailyLogs] = useState(() => loadJSON("ft_dailyLogs", {}));
  const [recentFoods, setRecentFoods] = useState(() => loadJSON("ft_recentFoods", []));
  const [favoriteFoodKeys, setFavoriteFoodKeys] = useState(() =>
    loadJSON("ft_favoriteFoodKeys", [])
  );
  const [weightLog, setWeightLog] = useState(() => loadJSON("ft_weightLog", []));

  const [editingEntry, setEditingEntry] = useState(null);
  const [editEntryGrams, setEditEntryGrams] = useState("100");
  const [editEntryMeal, setEditEntryMeal] = useState("Πρωινό");

  const [exerciseMinutes, setExerciseMinutes] = useState(() =>
    EXERCISE_LIBRARY.reduce((acc, item) => {
      acc[item.name] = "";
      return acc;
    }, {})
  );

  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseMinutes, setCustomExerciseMinutes] = useState("");
  const [customExerciseRate, setCustomExerciseRate] = useState("");

  const [hasSeenWelcome, setHasSeenWelcome] = useState(() =>
    loadValue("ft_hasSeenWelcome", "false") === "true"
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  const profileComplete = useMemo(() => {
    return (
      String(age).trim() !== "" &&
      String(gender).trim() !== "" &&
      String(height).trim() !== "" &&
      String(weight).trim() !== "" &&
      String(activity).trim() !== "" &&
      String(goalType).trim() !== "" &&
      String(mode).trim() !== ""
    );
  }, [age, gender, height, weight, activity, goalType, mode]);

  const [activeTab, setActiveTab] = useState(() => {
    const savedAge = loadValue("ft_age", "");
    const savedGender = loadValue("ft_gender", "male");
    const savedHeight = loadValue("ft_height", "");
    const savedWeight = loadValue("ft_weight", "");
    const savedActivity = loadValue("ft_activity", "1.4");
    const rawSavedGoalType = loadValue("ft_goalType", "lose");
    const savedGoalType = rawSavedGoalType === "fitness" ? "maintain" : rawSavedGoalType;
    const savedMode = loadValue("ft_mode", "balanced");
    const savedHasSeenWelcome = loadValue("ft_hasSeenWelcome", "false") === "true";
    const savedTab = loadValue("ft_activeTab", "summary");

    const savedProfileComplete =
      String(savedAge).trim() !== "" &&
      String(savedGender).trim() !== "" &&
      String(savedHeight).trim() !== "" &&
      String(savedWeight).trim() !== "" &&
      String(savedActivity).trim() !== "" &&
      String(savedGoalType).trim() !== "" &&
      String(savedMode).trim() !== "";

    if (!savedHasSeenWelcome) return "welcome";
    if (!savedProfileComplete) return "profile";
    if (!["summary", "food", "exercise", "profile"].includes(savedTab)) return "summary";
    return savedTab;
  });

  useEffect(() => { setSelectedDate(getTodayKey()); }, []);

  useEffect(() => {
    if (goalType === "fitness") setGoalType("maintain");
  }, [goalType]);

  useEffect(() => saveValue("ft_age", age), [age]);
  useEffect(() => saveValue("ft_gender", gender), [gender]);
  useEffect(() => saveValue("ft_height", height), [height]);
  useEffect(() => saveValue("ft_weight", weight), [weight]);
  useEffect(() => saveValue("ft_activity", activity), [activity]);
  useEffect(() => saveValue("ft_goalType", goalType === "fitness" ? "maintain" : goalType), [goalType]);
  useEffect(() => saveValue("ft_mode", mode), [mode]);
  useEffect(() => saveValue("ft_targetWeightLoss", targetWeightLoss), [targetWeightLoss]);
  useEffect(() => saveValue("ft_weeks", weeks), [weeks]);
  useEffect(() => saveJSON("ft_foods", foods), [foods]);
  useEffect(() => saveJSON("ft_dailyLogs", dailyLogs), [dailyLogs]);
  useEffect(() => saveJSON("ft_recentFoods", recentFoods), [recentFoods]);
  useEffect(() => saveJSON("ft_favoriteFoodKeys", favoriteFoodKeys), [favoriteFoodKeys]);
  useEffect(() => saveJSON("ft_weightLog", weightLog), [weightLog]);
  useEffect(() => saveValue("ft_hasSeenWelcome", hasSeenWelcome ? "true" : "false"), [hasSeenWelcome]);

  useEffect(() => {
    if (!hasSeenWelcome && activeTab !== "welcome") {
      setActiveTab("welcome");
      return;
    }
    if (hasSeenWelcome && !profileComplete && activeTab !== "profile") {
      setActiveTab("profile");
      return;
    }
    if (hasSeenWelcome && profileComplete) {
      saveValue("ft_activeTab", activeTab);
    }
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
      ...editingEntry,
      grams,
      mealType: meal,
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
      minutes,
      caloriesPerMinute: exercise.caloriesPerMinute,
      calories: Math.round(exercise.caloriesPerMinute * minutes)
    };
    updateCurrentDay((current) => ({
      ...current,
      exercises: [newExercise, ...current.exercises]
    }));
    setExerciseMinutes((prev) => ({ ...prev, [exercise.name]: "" }));
  }

  function addCustomExercise() {
    const minutes = Math.max(Number(customExerciseMinutes) || 0, 1);
    const rate = Math.max(Number(customExerciseRate) || 0, 0.1);
    if (!customExerciseName.trim()) return;
    const newExercise = {
      id: Date.now() + Math.random(),
      name: `${customExerciseName.trim()} ${minutes} λεπτά`,
      minutes,
      caloriesPerMinute: rate,
      calories: Math.round(rate * minutes)
    };
    updateCurrentDay((current) => ({
      ...current,
      exercises: [newExercise, ...current.exercises]
    }));
    setCustomExerciseName("");
    setCustomExerciseMinutes("");
    setCustomExerciseRate("");
  }

  function deleteExercise(id) {
    updateCurrentDay((current) => ({
      ...current,
      exercises: current.exercises.filter((item) => item.id !== id)
    }));
  }

  function addCustomFood(newFood) {
    setFoods((prev) => [normalizeFood(newFood), ...prev]);
  }

  function saveRecentFood(food, gramsValue, meal) {
    const normalized = normalizeFood(food);
    setRecentFoods((prev) => {
      const filtered = prev.filter(
        (item) =>
          !(
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
    updateCurrentDay((current) => ({
      ...current,
      entries: [entry, ...current.entries]
    }));
    saveRecentFood(item.food, item.grams, item.mealType);
  }

  function quickAddFavorite(food) {
    const entry = createFoodEntry(food, 100, "Σνακ");
    updateCurrentDay((current) => ({
      ...current,
      entries: [entry, ...current.entries]
    }));
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

  function addWeight({ date, weight: w }) {
    setWeightLog((prev) => {
      const filtered = prev.filter((entry) => entry.date !== date);
      return [...filtered, { date, weight: w }];
    });
  }

  function deleteWeight(date) {
    setWeightLog((prev) => prev.filter((entry) => entry.date !== date));
  }

  function startOnboarding() {
    setHasSeenWelcome(true);
    setActiveTab("profile");
  }

  function goToSummaryAfterProfile() {
    if (!profileComplete) return;
    setActiveTab("summary");
  }

  const bmr = useMemo(
    () => calculateBMR({ age, gender, height, weight }),
    [age, gender, height, weight]
  );
  const tdee = useMemo(() => calculateTDEE({ bmr, activity }), [bmr, activity]);
  const dailyDeficit = useMemo(
    () => calculateDailyDeficit({ kilos: targetWeightLoss, weeks }),
    [targetWeightLoss, weeks]
  );
  const targetCalories = useMemo(
    () => calculateTargetCalories({ goalType, tdee, targetWeightChange: targetWeightLoss, weeks }),
    [goalType, tdee, targetWeightLoss, weeks]
  );
  const proteinTarget = useMemo(
    () => calculateProteinTarget({ weight, goalType, modeKey: mode }),
    [weight, goalType, mode]
  );
  const macroTargets = useMemo(
    () => calculateMacroTargets({ targetCalories, proteinTarget, modeKey: mode }),
    [targetCalories, proteinTarget, mode]
  );

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

  const summaryProps = {
    selectedDate, setSelectedDate, isToday,
    targetCalories, totalCalories, exerciseValue,
    remainingCalories, progress, goalType,
    proteinTarget, totalProtein, totalCarbs, totalFat,
    last7Days, mode, macroTargets, foods,
    dailyLogs, weightLog,
    onAddWeight: addWeight,
    onDeleteWeight: deleteWeight
  };

  const foodProps = {
    foods, recentFoods, favoriteFoods,
    isFavorite, toggleFavorite, addCustomFood,
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
    addCustomExercise, deleteExercise
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
            {showWelcome && <p>Welcome</p>}
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
        <BottomNav
          tabs={APP_TABS}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />
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

## FILE: src/components/BottomNav.jsx
```javascript
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

## FILE: src/components/EditEntryModal.jsx
```javascript
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

## FILE: src/components/WelcomeScreen.jsx
```javascript
export default function WelcomeScreen({ onStart }) {
  return (
    <div className="card">
      <div className="soft-box" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          Welcome to FuelTrack
        </div>
        <div className="muted" style={{ lineHeight: 1.6 }}>
          Ρύθμισε πρώτα το προφίλ σου για να υπολογιστούν σωστά οι θερμίδες,
          η πρωτεΐνη και η καθημερινή σου πρόοδος.
        </div>
      </div>

      <div className="stack-10">
        <div className="soft-box">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Τι θα κάνεις εδώ</div>
          <div className="muted">• Θα βάλεις τα βασικά στοιχεία σου</div>
          <div className="muted">• Θα επιλέξεις τον στόχο σου</div>
          <div className="muted">• Θα παρακολουθείς φαγητό, άσκηση και macros</div>
        </div>
      </div>

      <div className="action-row" style={{ marginTop: 18 }}>
        <button className="btn btn-dark" onClick={onStart}>
          Ξεκίνα το προφίλ σου
        </button>
      </div>
    </div>
  );
}
```

## FILE: src/components/tabs/SummaryTab.jsx
```javascript
import { useMemo, useState } from "react";
import { formatDisplayDate, formatNumber } from "../../utils/helpers";
import { calculateStreak, getStreakEmoji, getStreakMessage } from "../../utils/streak";
import AiCoach from "../AiCoach";

export default function SummaryTab({
  selectedDate,
  setSelectedDate,
  isToday,
  targetCalories,
  totalCalories,
  exerciseValue,
  remainingCalories,
  progress,
  goalType,
  last7Days,
  proteinTarget,
  totalProtein,
  totalCarbs,
  totalFat,
  mode,
  macroTargets,
  foods,
  dailyLogs,
  weightLog,
  onAddWeight,
  onDeleteWeight
}) {
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [showAllWeight, setShowAllWeight] = useState(false);

  const streak = useMemo(
    () => calculateStreak(dailyLogs, targetCalories),
    [dailyLogs, targetCalories]
  );

  const sortedWeightLog = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [weightLog]);

  const chartData = useMemo(() => {
    return [...(weightLog || [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
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
    return "Maintain";
  }

  function getModeLabel() {
    if (mode === "low_carb") return "Low Carb";
    if (mode === "keto") return "Keto";
    if (mode === "fasting") return "Fasting 16:8";
    if (mode === "high_protein") return "High Protein";
    return "Balanced";
  }

  function getRemainingClassName() {
    if (remainingCalories > 100) return "summary-remaining-positive";
    if (remainingCalories < -150) return "summary-remaining-negative";
    return "summary-remaining-neutral";
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

        let aScore = 0;
        let bScore = 0;

        if (remainingProtein > 15) { aScore += aProtein * 3; bScore += bProtein * 3; }
        else { aScore += aProtein * 1.5; bScore += bProtein * 1.5; }

        if (mode === "high_protein") { aScore += aProtein * 2; bScore += bProtein * 2; }
        if (mode === "low_carb") { aScore -= aCarbs * 2; bScore -= bCarbs * 2; }
        if (mode === "keto") { aScore -= aCarbs * 4; bScore -= bCarbs * 4; }

        aScore -= aCalories * 0.03;
        bScore -= bCalories * 0.03;

        return bScore - aScore;
      })
      .slice(0, 5);
  }

  const suggestions = getSuggestedFoods();
  const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);

  const proteinPercent = macroTargets?.proteinGrams
    ? Math.min((totalProtein / macroTargets.proteinGrams) * 100, 100) : 0;
  const carbsPercent = macroTargets?.carbsGrams
    ? Math.min((totalCarbs / macroTargets.carbsGrams) * 100, 100) : 0;
  const fatPercent = macroTargets?.fatGrams
    ? Math.min((totalFat / macroTargets.fatGrams) * 100, 100) : 0;

  return (
    <>
      {/* HERO CARD — compact */}
      <div className="hero-card">
        {/* Ημερομηνία + controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {formatDisplayDate(selectedDate)}
            {isToday && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>· Σήμερα</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!isToday && (
              <button
                className="btn btn-light"
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                type="button"
                style={{ fontSize: 12, padding: "6px 10px" }}
              >
                Σήμερα
              </button>
            )}
            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: 140, padding: "6px 8px", fontSize: 12 }}
            />
          </div>
        </div>

        {/* Υπόλοιπο — κεντρικό */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <div className="hero-subtle" style={{ fontSize: 12 }}>Υπόλοιπο ημέρας</div>
          <div className={`hero-big ${getRemainingClassName()}`} style={{ fontSize: 36, fontWeight: 800 }}>
            {formatNumber(remainingCalories)} kcal
          </div>
        </div>

        {/* Εξίσωση */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <div className="hero-stat" style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
            <div className="hero-subtle" style={{ fontSize: 11 }}>Στόχος</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(targetCalories)}</div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>−</div>
          <div className="hero-stat" style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
            <div className="hero-subtle" style={{ fontSize: 11 }}>Φαγητό</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(totalCalories)}</div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>+</div>
          <div className="hero-stat" style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
            <div className="hero-subtle" style={{ fontSize: 11 }}>Άσκηση</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNumber(exerciseValue)}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-outer">
          <div className="progress-inner" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <div className="hero-subtle" style={{ fontSize: 11 }}>
            {getGoalLabel()} · {getModeLabel()}
          </div>
          <div className="hero-subtle" style={{ fontSize: 11 }}>
            {formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal
          </div>
        </div>
      </div>

      {/* MACRO PROGRESS BARS */}
      <div className="card">
        <h2>Macros</h2>
        <div className="macro-bars">
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Πρωτεΐνη</span>
              <span className="macro-bar-value">{formatNumber(totalProtein)}g / {formatNumber(macroTargets?.proteinGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner macro-bar-protein" style={{ width: `${proteinPercent}%` }} />
            </div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Υδατάνθρακες</span>
              <span className="macro-bar-value">{formatNumber(totalCarbs)}g / {formatNumber(macroTargets?.carbsGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner macro-bar-carbs" style={{ width: `${carbsPercent}%` }} />
            </div>
          </div>
          <div className="macro-bar-row">
            <div className="macro-bar-label">
              <span className="macro-bar-title">Λίπος</span>
              <span className="macro-bar-value">{formatNumber(totalFat)}g / {formatNumber(macroTargets?.fatGrams || 0)}g</span>
            </div>
            <div className="macro-bar-outer">
              <div className="macro-bar-inner macro-bar-fat" style={{ width: `${fatPercent}%` }} />
            </div>
          </div>
        </div>

        {/* STREAK inline */}
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
      />

      {/* WEIGHT TRACKING */}
      <div className="card">
        <h2>⚖️ Βάρος</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <label className="profile-field" style={{ flex: 1 }}>
            <div className="profile-label">kg</div>
            <input
              className="input"
              type="number"
              step="0.1"
              placeholder="π.χ. 82.5"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
            />
          </label>
          <label className="profile-field" style={{ flex: 1 }}>
            <div className="profile-label">Ημερομηνία</div>
            <input
              className="input"
              type="date"
              value={weightDate}
              onChange={(e) => setWeightDate(e.target.value)}
            />
          </label>
          <button className="btn btn-dark" onClick={handleAddWeight} type="button" style={{ marginBottom: 1 }}>
            +
          </button>
        </div>

        {chartData.length >= 2 && (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
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
                    {next && (
                      <line x1={x} y1={y} x2={nx} y2={ny} stroke="var(--color-accent, #111)" strokeWidth="1.5" />
                    )}
                    <circle cx={x} cy={y} r="3" fill="var(--color-accent, #111)" />
                    {showLabel && (
                      <text x={x} y={chartH + 14} textAnchor="middle" fontSize="7" fill="var(--text-muted, #888)">
                        {point.date.slice(5)}
                      </text>
                    )}
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
          <div style={{ marginTop: 8 }}>
            {(showAllWeight ? sortedWeightLog : sortedWeightLog.slice(0, 3)).map((entry) => (
              <div key={entry.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-soft)", fontSize: 13 }}>
                <span className="muted">{formatDisplayDate(entry.date)}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{entry.weight} kg</span>
                  <button className="btn btn-light" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => onDeleteWeight(entry.date)} type="button">✕</button>
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
            <button
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              type="button"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: day.date === selectedDate ? "var(--color-accent)" : "var(--bg-soft)",
                color: day.date === selectedDate ? "var(--bg-card)" : "var(--text-primary)",
                borderRadius: 10,
                border: `1px solid ${day.date === selectedDate ? "var(--color-accent)" : "var(--border-soft)"}`,
                cursor: "pointer",
                textAlign: "left",
                flexWrap: "wrap",
                gap: 6
              }}
            >
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

## FILE: src/components/tabs/FoodTab.jsx
```javascript
import { useMemo, useState } from "react";
import { MEALS } from "../../data/constants";
import { createFoodEntry, formatNumber, normalizeFood } from "../../utils/helpers";
import useFoodSearch from "../../hooks/useFoodSearch";
import BarcodeScanner from "../BarcodeScanner";
import FoodPhotoAnalyzer from "../FoodPhotoAnalyzer";

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().trim();
}

function getFoodSearchScore(food, query) {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const name = normalizeSearchText(food.name);
  const brand = normalizeSearchText(food.brand);
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
  const [grams, setGrams] = useState(String(food.estimatedGrams || 100));
  const [meal, setMeal] = useState("Πρωινό");

  const preview = createFoodEntry(food, grams, meal);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
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
          boxShadow: "var(--shadow-modal)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
          {food.name}
        </div>
        {food.brand && (
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            {food.brand}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <label style={{ flex: 1 }}>
            <div className="profile-label">Γραμμάρια</div>
            <input
              className="input"
              type="number"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              inputMode="numeric"
              autoFocus
            />
          </label>
          <label style={{ flex: 1 }}>
            <div className="profile-label">Γεύμα</div>
            <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>

        <div style={{
          background: "var(--bg-soft)",
          borderRadius: 10,
          padding: "8px 12px",
          marginBottom: 14,
          fontSize: 13
        }}>
          <span className="muted">Preview: </span>
          <strong>{formatNumber(preview.calories)} kcal</strong>
          <span className="muted"> · P{formatNumber(preview.protein)} · C{formatNumber(preview.carbs)} · F{formatNumber(preview.fat)}</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-dark" onClick={() => onAdd(food, grams, meal)} type="button" style={{ flex: 1 }}>
            Προσθήκη
          </button>
          <button className="btn btn-light" onClick={onClose} type="button">
            Άκυρο
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FoodTab({
  foods,
  recentFoods,
  favoriteFoods,
  isFavorite,
  toggleFavorite,
  addCustomFood,
  saveRecentFood,
  updateCurrentDay,
  quickAddRecent,
  quickAddFavorite,
  entries,
  groupedEntries,
  deleteEntry,
  openEditEntry
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedFood, setSelectedFood] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoAnalyzer, setShowPhotoAnalyzer] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState("");

  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFat, setNewFat] = useState("");

  const { results: databaseResults, loading: databaseLoading } = useFoodSearch(query);

  const filteredFoods = useMemo(() => {
    if (!query.trim()) return foods;
    const q = query.toLowerCase().trim();
    return foods.filter((food) =>
      `${food.name} ${food.brand || ""}`.toLowerCase().includes(q)
    );
  }, [foods, query]);

  const normalizedDatabaseResults = useMemo(() => {
    return (Array.isArray(databaseResults) ? databaseResults : []).map((food) =>
      normalizeFood({
        id: food.id,
        source: food.source || "database",
        sourceLabel: food.sourceLabel || "Database",
        name: food.name,
        brand: food.brand || "",
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

  function handleFoodSelect(food) {
    setSelectedFood(food);
    setQuery("");
  }

  function handleAdd(food, grams, meal) {
    const entry = createFoodEntry(food, grams, meal);
    updateCurrentDay((current) => ({
      ...current,
      entries: [entry, ...current.entries]
    }));
    saveRecentFood(food, grams, meal);
    setSelectedFood(null);
  }

  function handleAddCustomFood() {
    if (!newName.trim() || !newCalories) return;
    addCustomFood(normalizeFood({
      id: `local-${Date.now()}`,
      source: "local",
      sourceLabel: "Local",
      name: newName.trim(),
      caloriesPer100g: Number(newCalories) || 0,
      proteinPer100g: Number(newProtein) || 0,
      carbsPer100g: Number(newCarbs) || 0,
      fatPer100g: Number(newFat) || 0
    }));
    setNewName(""); setNewCalories(""); setNewProtein(""); setNewCarbs(""); setNewFat("");
  }

  async function handleBarcodeResult(code) {
    setShowScanner(false);
    setBarcodeLoading(true);
    setBarcodeError("");

    try {
      const res = await fetch(`/.netlify/functions/barcode-search?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!data.found) {
        setBarcodeError(`Δεν βρέθηκε προϊόν για barcode: ${code}`);
        return;
      }

      setSelectedFood(normalizeFood(data));
    } catch {
      setBarcodeError("Σφάλμα κατά την αναζήτηση barcode.");
    } finally {
      setBarcodeLoading(false);
    }
  }

  function getSourceBadge(food) {
    if (food.source === "local") return "";
    if (food.source === "usda") return "USDA";
    if (food.source === "off") return "OpenFood";
    if (food.sourceLabel && food.sourceLabel !== "Local") return food.sourceLabel;
    return "";
  }

  return (
    <>
      {showScanner && (
        <BarcodeScanner
          onResult={handleBarcodeResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showPhotoAnalyzer && (
        <FoodPhotoAnalyzer
          onFoodFound={(food) => {
            setSelectedFood(food);
            setShowPhotoAnalyzer(false);
          }}
          onClose={() => setShowPhotoAnalyzer(false)}
        />
      )}

      {selectedFood && (
        <FoodAddModal
          food={selectedFood}
          onAdd={handleAdd}
          onClose={() => setSelectedFood(null)}
        />
      )}

      {/* ΦΑΓΗΤΟ ΗΜΕΡΑΣ */}
      <div className="card">
        <h2>Φαγητό ημέρας</h2>
        {entries.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Δεν έχεις βάλει φαγητό.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {MEALS.map((meal) => {
              const group = groupedEntries[meal];
              if (!group || group.items.length === 0) return null;
              return (
                <div key={meal}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{meal}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{formatNumber(group.totalCalories)} kcal</span>
                  </div>
                  {group.items.map((item) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--bg-soft)", borderRadius: 8, marginBottom: 4, border: "1px solid var(--border-soft)", gap: 8 }}>
                      <button
                        onClick={() => openEditEntry(item)}
                        type="button"
                        style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{item.name}</span>
                        <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                          {item.grams}g · {formatNumber(item.calories)} kcal · P{formatNumber(item.protein)}
                        </span>
                      </button>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button className="btn btn-light" onClick={() => openEditEntry(item)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                        <button className="btn btn-light" onClick={() => deleteEntry(item.id)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ΑΝΑΖΗΤΗΣΗ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Αναζήτηση φαγητού</h2>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-dark"
              onClick={() => setShowPhotoAnalyzer(true)}
              type="button"
              style={{ fontSize: 13, padding: "8px 12px" }}
            >
              📸
            </button>
            <button
              className="btn btn-dark"
              onClick={() => { setShowScanner(true); setBarcodeError(""); }}
              type="button"
              style={{ fontSize: 13, padding: "8px 12px" }}
            >
              📷 Barcode
            </button>
          </div>
        </div>

        {/* ΦΙΛΤΡΑ */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              type="button"
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: `1px solid ${activeFilter === f.key ? "var(--color-accent)" : "var(--border-color)"}`,
                background: activeFilter === f.key ? "var(--color-accent)" : "var(--bg-soft)",
                color: activeFilter === f.key ? "var(--bg-card)" : "var(--text-primary)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {barcodeLoading && (
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>🔍 Αναζήτηση barcode...</div>
        )}
        {barcodeError && (
          <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{barcodeError}</div>
        )}

        <input
          className="input"
          placeholder="Γράψε φαγητό..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {showAutocomplete && (
          <div style={{ marginTop: 6, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {databaseLoading && <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>Αναζήτηση...</div>}
            {!databaseLoading && topSearchResults.length === 0 && (
              <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>Δεν βρέθηκαν αποτελέσματα.</div>
            )}
            {!databaseLoading && topSearchResults.map((food) => (
              <button
                key={`auto-${food.source || "local"}-${food.id}`}
                onClick={() => handleFoodSelect(food)}
                type="button"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border-color)", cursor: "pointer", gap: 8, flexWrap: "wrap" }}
              >
                <div style={{ textAlign: "left" }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                    {food.name}{food.brand ? ` · ${food.brand}` : ""}
                  </span>
                  {getSourceBadge(food) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(food)}</span>}
                </div>
                <span className="muted" style={{ fontSize: 12 }}>
                  {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}
                </span>
              </button>
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
                <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{item.food.name}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                      {item.grams}g · {item.mealType} · {formatNumber(cal.calories)} kcal
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-light" onClick={() => handleFoodSelect(item.food)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                    <button className="btn btn-dark" onClick={() => quickAddRecent(item)} type="button" style={{ padding: "4px 10px", fontSize: 12 }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ΑΓΑΠΗΜΕΝΑ */}
      {favoriteFoods.length > 0 && (
        <div className="card">
          <h2>Αγαπημένα</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {favoriteFoods.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{food.name}</span>
                  {getSourceBadge(food) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(food)}</span>}
                  <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-light" onClick={() => handleFoodSelect(food)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                  <button className="btn btn-dark" onClick={() => quickAddFavorite(food)} type="button" style={{ padding: "4px 10px", fontSize: 12 }}>+100g</button>
                </div>
              </div>
            ))}
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
          <button className="btn btn-dark" onClick={handleAddCustomFood} type="button">Αποθήκευση</button>
        </div>
      </div>
    </>
  );
}
```

## FILE: src/components/tabs/ExerciseTab.jsx
```javascript
import { EXERCISE_LIBRARY } from "../../data/constants";
import { formatNumber } from "../../utils/helpers";

export default function ExerciseTab({
  exercises,
  exerciseValue,
  exerciseMinutes,
  setExerciseMinutes,
  customExerciseName,
  setCustomExerciseName,
  customExerciseMinutes,
  setCustomExerciseMinutes,
  customExerciseRate,
  setCustomExerciseRate,
  addExerciseByMinutes,
  addCustomExercise,
  deleteExercise
}) {
  return (
    <>
      <div className="card">
        <h2>Άσκηση ημέρας</h2>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span className="muted">Σύνολο σήμερα</span>
          <span style={{ fontWeight: 800, color: "#166534" }}>+{formatNumber(exerciseValue)} kcal</span>
        </div>

        {exercises.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>Δεν έχεις βάλει άσκηση.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {exercises.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border-soft)", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {item.minutes} λεπτά · +{formatNumber(item.calories)} kcal
                  </div>
                </div>
                <button
                  className="btn btn-light"
                  onClick={() => deleteExercise(item.id)}
                  type="button"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Προσθήκη άσκησης</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {EXERCISE_LIBRARY.map((exercise) => (
            <div key={exercise.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-soft)", borderRadius: 10, border: "1px solid var(--border-soft)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{exercise.name}</span>
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{formatNumber(exercise.caloriesPerMinute)} kcal/λεπτό</span>
              </div>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="λεπτά"
                value={exerciseMinutes[exercise.name] || ""}
                onChange={(e) =>
                  setExerciseMinutes((prev) => ({ ...prev, [exercise.name]: e.target.value }))
                }
                style={{ width: 70, padding: "6px 8px", fontSize: 13, textAlign: "center" }}
              />
              <button
                className="btn btn-dark"
                onClick={() => addExerciseByMinutes(exercise, exerciseMinutes[exercise.name])}
                type="button"
                style={{ padding: "6px 12px", fontSize: 13 }}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Custom άσκηση</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="input"
            placeholder="Όνομα άσκησης"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="Λεπτά"
              inputMode="numeric"
              value={customExerciseMinutes}
              onChange={(e) => setCustomExerciseMinutes(e.target.value)}
            />
            <input
              className="input"
              placeholder="kcal/λεπτό"
              inputMode="decimal"
              value={customExerciseRate}
              onChange={(e) => setCustomExerciseRate(e.target.value)}
            />
          </div>
          <button className="btn btn-dark" onClick={addCustomExercise} type="button">
            Προσθήκη
          </button>
        </div>
      </div>
    </>
  );
}
```

## FILE: src/components/tabs/ProfileTab.jsx
```javascript
import { calculateAppliedDailyDeficit } from "../../utils/calorieLogic";
import { formatNumber } from "../../utils/helpers";

function GoalWarning({ goalType, kilosPerWeek, rawDeficit, isCapped }) {
  if (goalType !== "lose" || kilosPerWeek <= 0) return null;

  let color = "#166534";
  let bg = "#dcfce7";
  let border = "#86efac";
  let icon = "✅";
  let message = "";

  if (kilosPerWeek > 1.5) {
    color = "#b91c1c";
    bg = "#fef2f2";
    border = "#fecaca";
    icon = "⚠️";
    message = `Ο στόχος των ${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα είναι μη ρεαλιστικός. Δοκίμασε περισσότερες εβδομάδες ή μικρότερο στόχο κιλών. Το ασφαλές όριο είναι 0.5-1 kg/εβδομάδα.`;
  } else if (kilosPerWeek > 1) {
    color = "#92400e";
    bg = "#fffbeb";
    border = "#fde68a";
    icon = "⚡";
    message = `Ο ρυθμός ${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα είναι επιθετικός. Είναι εφικτός αλλά απαιτεί αυστηρή τήρηση.${isCapped ? " Το έλλειμμα έχει περιοριστεί στις 1000 kcal/ημέρα για ασφάλεια." : ""}`;
  } else {
    message = `Ο ρυθμός ${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα είναι ρεαλιστικός και υγιεινός. Συνέχισε έτσι!${isCapped ? " Το έλλειμμα έχει περιοριστεί στις 1000 kcal/ημέρα." : ""}`;
  }

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: "12px 14px",
      marginBottom: 14,
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ color, fontSize: 13, lineHeight: 1.5 }}>{message}</div>
    </div>
  );
}

export default function ProfileTab({
  age,
  setAge,
  gender,
  setGender,
  height,
  setHeight,
  weight,
  setWeight,
  activity,
  setActivity,
  goalType,
  setGoalType,
  mode,
  setMode,
  targetWeightLoss,
  setTargetWeightLoss,
  weeks,
  setWeeks,
  tdee,
  targetCalories,
  dailyDeficit,
  proteinTarget,
  profileComplete,
  onContinue
}) {
  const showGoalFields = goalType === "lose" || goalType === "gain";

  function getGoalLabel() {
    if (goalType === "lose") return "Lose weight";
    if (goalType === "gain") return "Muscle gain";
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
  const kilosPerWeek = goalType === "lose" && kilosNum > 0 && weeksNum > 0
    ? kilosNum / weeksNum : 0;
  const isCapped = goalType === "lose" && rawDeficit > 1000;

  return (
    <div className="card">
      <h2>Προφίλ & στόχος</h2>

      {!profileComplete && (
        <div className="soft-box profile-intro-box">
          <div className="profile-section-title">Συμπλήρωσε πρώτα το προφίλ σου</div>
          <div className="muted">
            Μόλις βάλεις τα βασικά στοιχεία σου, το app θα υπολογίσει σωστά
            τον ημερήσιο στόχο θερμίδων και πρωτεΐνης.
          </div>
        </div>
      )}

      {/* ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ */}
      <div className="soft-box profile-section-box">
        <div className="profile-section-title">Βασικά στοιχεία</div>
        <div className="grid-2 profile-grid-compact">
          <label className="profile-field">
            <div className="profile-label">Ηλικία</div>
            <input className="input" placeholder="Ηλικία" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
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
            <input className="input" placeholder="Ύψος (cm)" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
          <label className="profile-field">
            <div className="profile-label">Βάρος (kg)</div>
            <input className="input" placeholder="Βάρος (kg)" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
        </div>
      </div>

      {/* ΡΥΘΜΙΣΕΙΣ ΣΤΟΧΟΥ */}
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

      {/* ΣΤΟΙΧΕΙΑ ΣΤΟΧΟΥ */}
      {showGoalFields && (
        <div className="soft-box profile-section-box">
          <div className="profile-section-title">Στοιχεία στόχου</div>
          <div className="grid-2 profile-grid-compact">
            <label className="profile-field">
              <div className="profile-label">{goalType === "lose" ? "Κιλά να χάσω" : "Κιλά να πάρω"}</div>
              <input
                className="input"
                placeholder={goalType === "lose" ? "Κιλά να χάσω" : "Κιλά να πάρω"}
                inputMode="decimal"
                value={targetWeightLoss}
                onChange={(e) => setTargetWeightLoss(e.target.value)}
              />
            </label>
            <label className="profile-field">
              <div className="profile-label">Εβδομάδες</div>
              <input
                className="input"
                placeholder="Σε πόσες εβδομάδες"
                inputMode="numeric"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}

      {/* ΕΝΟΠΟΙΗΜΕΝΟ WARNING */}
      <GoalWarning
        goalType={goalType}
        kilosPerWeek={kilosPerWeek}
        rawDeficit={rawDeficit}
        isCapped={isCapped}
      />

      {/* ΥΠΟΛΟΓΙΣΜΟΙ */}
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
        <div className="profile-stat-row profile-stat-row-last">
          <span>Στόχος πρωτεΐνης</span>
          <strong>{formatNumber(proteinTarget || 0)} g</strong>
        </div>
      </div>

      {/* ΣΥΝΟΨΗ */}
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
        <button
          className="btn btn-dark"
          onClick={onContinue}
          disabled={!profileComplete}
          style={{ opacity: profileComplete ? 1 : 0.5, cursor: profileComplete ? "pointer" : "not-allowed" }}
        >
          Αποθήκευση & συνέχεια
        </button>
      </div>
    </div>
  );
}
```

## FILE: src/data/constants.js
```javascript
export const EXERCISE_LIBRARY = [
  { name: "Περπάτημα", caloriesPerMinute: 4 },
  { name: "Γρήγορο περπάτημα", caloriesPerMinute: 5.5 },
  { name: "Τρέξιμο", caloriesPerMinute: 11 },
  { name: "Βάρη", caloriesPerMinute: 4.5 },
  { name: "Ποδήλατο", caloriesPerMinute: 7 },
  { name: "Κολύμπι", caloriesPerMinute: 8.5 }
];

export const MEALS = ["Πρωινό", "Μεσημεριανό", "Βραδινό", "Σνακ"];

export const APP_TABS = [
  { key: "summary", icon: "🏠", label: "Summary" },
  { key: "food", icon: "🍔", label: "Food" },
  { key: "exercise", icon: "🏃", label: "Exercise" },
  { key: "profile", icon: "👤", label: "Profile" }
];
```

## FILE: src/data/modes.js
```javascript
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

## FILE: src/hooks/useFoodSearch.js
```javascript
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

## FILE: src/utils/calorieLogic.js
```javascript
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

## FILE: src/utils/helpers.js
```javascript
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
    fatPer100g: Number(food.fatPer100g || 0)
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

## FILE: src/utils/storage.js
```javascript
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

## FILE: src/utils/suggestions.js
```javascript
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

## FILE: netlify/functions/food-search.js
```javascript
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
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=15&api_key=${API_KEY}`
    ).then((res) => res.json()).catch(() => null);

    // OFF Greek - με τόνους
    const offGrPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&lc=el&cc=gr`
    ).then((res) => res.json()).catch(() => null);

    // OFF Greek - χωρίς τόνους
    const offGrNoAccentsPromise = queryNoAccents !== query
      ? fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(queryNoAccents)}&search_simple=1&action=process&json=1&page_size=20&lc=el&cc=gr`
        ).then((res) => res.json()).catch(() => null)
      : Promise.resolve(null);

    // OFF World
    const offWorldPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15`
    ).then((res) => res.json()).catch(() => null);

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

    // OFF με timeout 3000ms
    let offFoods = [];

    try {
      const [offGrData, offGrNoAccentsData, offWorldData] = await Promise.all([
        Promise.race([offGrPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([offGrNoAccentsPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
        Promise.race([offWorldPromise, new Promise((r) => setTimeout(() => r(null), 3000))]),
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

      const grFoods = parseOFF(offGrData, "🇬🇷 Greek");
      const grNoAccentFoods = parseOFF(offGrNoAccentsData, "🇬🇷 Greek");
      const worldFoods = parseOFF(offWorldData, "OpenFood");

      // Ελληνικά πρώτα
      offFoods = [...grFoods, ...grNoAccentFoods, ...worldFoods];

    } catch {
      // ignore
    }

    // Deduplicate όλα
    const seen = new Set();
    const allFoods = [...usdaFoods, ...offFoods].filter((f) => {
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
