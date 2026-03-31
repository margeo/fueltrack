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

export default function App() {
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

  useEffect(() => {
    setSelectedDate(getTodayKey());
  }, []);

  useEffect(() => {
    if (goalType === "fitness") {
      setGoalType("maintain");
    }
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
      return {
        ...prev,
        [selectedDate]: nextDay
      };
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

    setExerciseMinutes((prev) => ({
      ...prev,
      [exercise.name]: ""
    }));
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

  function startOnboarding() {
    setHasSeenWelcome(true);
    setActiveTab("profile");
  }

  function goToSummaryAfterProfile() {
    if (!profileComplete) return;
    setActiveTab("summary");
  }

  const bmr = useMemo(
    () =>
      calculateBMR({
        age,
        gender,
        height,
        weight
      }),
    [age, gender, height, weight]
  );

  const tdee = useMemo(
    () =>
      calculateTDEE({
        bmr,
        activity
      }),
    [bmr, activity]
  );

  const dailyDeficit = useMemo(
    () =>
      calculateDailyDeficit({
        kilos: targetWeightLoss,
        weeks
      }),
    [targetWeightLoss, weeks]
  );

  const targetCalories = useMemo(
    () =>
      calculateTargetCalories({
        goalType,
        tdee,
        targetWeightChange: targetWeightLoss,
        weeks
      }),
    [goalType, tdee, targetWeightLoss, weeks]
  );

  const proteinTarget = useMemo(
    () =>
      calculateProteinTarget({
        weight,
        goalType,
        modeKey: mode
      }),
    [weight, goalType, mode]
  );

  const macroTargets = useMemo(
    () =>
      calculateMacroTargets({
        targetCalories,
        proteinTarget,
        modeKey: mode
      }),
    [targetCalories, proteinTarget, mode]
  );

  const totalCalories = entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const totalProtein = round1(entries.reduce((sum, item) => sum + Number(item.protein || 0), 0));
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

      return {
        date,
        eaten,
        exercise: ex,
        remaining
      };
    });
  }, [selectedDate, dailyLogs, targetCalories]);

  const isToday = selectedDate === getTodayKey();

  const favoriteFoods = useMemo(() => {
    return foods.filter((food) => isFavorite(food)).slice(0, 8);
  }, [foods, favoriteFoodKeys]);

  const summaryProps = {
    selectedDate,
    setSelectedDate,
    isToday,
    targetCalories,
    totalCalories,
    exerciseValue,
    remainingCalories,
    progress,
    goalType,
    proteinTarget,
    totalProtein,
    last7Days,
    mode,
    macroTargets,
    foods
  };

  const foodProps = {
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
  };

  const exerciseProps = {
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
  };

  const profileProps = {
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
    onContinue: goToSummaryAfterProfile
  };

  const showWelcome = !hasSeenWelcome;
  const showProfile = hasSeenWelcome && !profileComplete;
  const appReady = hasSeenWelcome && profileComplete;

  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="app-header">
          <h1>FuelTrack</h1>
          {showWelcome && <p>Welcome</p>}
          {showProfile && <p>Ξεκίνα συμπληρώνοντας το προφίλ σου</p>}
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
import { formatDisplayDate, formatNumber } from "../../utils/helpers";

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
  mode,
  macroTargets,
  foods
}) {
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
    if (mode === "low_carb") {
      return "Σήμερα δώσε έμφαση σε πρωτεΐνη και πιο χαμηλούς υδατάνθρακες.";
    }

    if (mode === "keto") {
      return "Σήμερα κράτα πολύ χαμηλά τους υδατάνθρακες και προτίμησε πιο keto-friendly επιλογές.";
    }

    if (mode === "fasting") {
      return "Σήμερα ο τρόπος διατροφής σου είναι fasting, άρα έχει σημασία και το timing των γευμάτων.";
    }

    if (mode === "high_protein") {
      return "Σήμερα δώσε έμφαση στην πρωτεΐνη ώστε να πλησιάσεις τον στόχο σου.";
    }

    return "Σήμερα στόχευσε σε ισορροπημένη πρόσληψη θερμίδων και πρωτεΐνης.";
  }

  function getSuggestionReason(food) {
    const protein = Number(food.proteinPer100g || 0);
    const carbs = Number(food.carbsPer100g || 0);

    if (mode === "high_protein" && protein >= 18) {
      return "Καλή επιλογή για υψηλή πρωτεΐνη.";
    }

    if (mode === "low_carb" && carbs <= 12) {
      return "Ταιριάζει σε low carb λογική.";
    }

    if (mode === "keto" && carbs <= 8) {
      return "Πιο κοντά σε keto επιλογή.";
    }

    if (mode === "fasting") {
      return "Καλή επιλογή για πιο χορταστικό γεύμα όταν ανοίγει το eating window.";
    }

    return "Καλή πρακτική επιλογή για σήμερα.";
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

        if (remainingProtein > 15) {
          aScore += aProtein * 3;
          bScore += bProtein * 3;
        } else {
          aScore += aProtein * 1.5;
          bScore += bProtein * 1.5;
        }

        if (mode === "high_protein") {
          aScore += aProtein * 2;
          bScore += bProtein * 2;
        }

        if (mode === "low_carb") {
          aScore -= aCarbs * 2;
          bScore -= bCarbs * 2;
        }

        if (mode === "keto") {
          aScore -= aCarbs * 4;
          bScore -= bCarbs * 4;
        }

        aScore -= aCalories * 0.03;
        bScore -= bCalories * 0.03;

        return bScore - aScore;
      })
      .slice(0, 5);
  }

  const suggestions = getSuggestedFoods();
  const remainingProtein = Math.max((proteinTarget || 0) - (totalProtein || 0), 0);

  return (
    <>
      <div className="hero-card">
        <div className="summary-date-row">
          <div>
            <div className="hero-subtle">Επιλεγμένη ημέρα</div>
            <div className="summary-date-title">{formatDisplayDate(selectedDate)}</div>
            <div className="hero-subtle">{selectedDate}</div>
          </div>

          <div className="summary-date-controls">
            <button
              className="btn btn-light"
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              type="button"
            >
              {isToday ? "Σήμερα ✓" : "Σήμερα"}
            </button>

            <input
              className="input summary-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="summary-remaining-block">
          <div className="hero-subtle">Υπόλοιπο ημέρας</div>
          <div className={`hero-big ${getRemainingClassName()}`}>
            {formatNumber(remainingCalories)} kcal
          </div>

          <div className="hero-subtle summary-remaining-formula">
            Υπόλοιπο = Στόχος - Φαγητό + Άσκηση
          </div>
        </div>

        <div className="hero-grid summary-hero-grid">
          <div className="hero-stat">
            <div className="hero-subtle">Στόχος</div>
            <div>{formatNumber(targetCalories)} kcal</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Φαγητό</div>
            <div>{formatNumber(totalCalories)} kcal</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Άσκηση</div>
            <div>+{formatNumber(exerciseValue)} kcal</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Υπόλοιπο</div>
            <div>{formatNumber(remainingCalories)} kcal</div>
          </div>
        </div>

        <div className="hero-grid summary-hero-grid-2">
          <div className="hero-stat">
            <div className="hero-subtle">Στόχος</div>
            <div>{getGoalLabel()}</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Τρόπος διατροφής</div>
            <div>{getModeLabel()}</div>
          </div>
        </div>

        <div className="hero-grid summary-hero-grid-3">
          <div className="hero-stat">
            <div className="hero-subtle">Πρωτεΐνη</div>
            <div>
              {formatNumber(totalProtein || 0)} / {formatNumber(proteinTarget || 0)} g
            </div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Carbs στόχος</div>
            <div>{formatNumber(macroTargets?.carbsGrams || 0)} g</div>
          </div>

          <div className="hero-stat">
            <div className="hero-subtle">Fat στόχος</div>
            <div>{formatNumber(macroTargets?.fatGrams || 0)} g</div>
          </div>
        </div>

        <div className="progress-outer">
          <div className="progress-inner" style={{ width: `${progress}%` }} />
        </div>

        <div className="hero-subtle summary-progress-text">
          {formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal από το φαγητό
        </div>
      </div>

      <div className="card">
        <h2>Κατεύθυνση ημέρας</h2>

        <div className="soft-box">
          <div className="summary-section-title">
            Σήμερα δουλεύεις με {getModeLabel()}
          </div>

          <div className="muted summary-mode-hint">{getModeHint()}</div>

          <div className="stack-10">
            <div>
              <span className="muted">Θερμίδες που μένουν:</span>{" "}
              <strong>{formatNumber(remainingCalories)} kcal</strong>
            </div>

            <div>
              <span className="muted">Πρωτεΐνη που μένει:</span>{" "}
              <strong>{formatNumber(remainingProtein)} g</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Τι να φας τώρα</h2>

        {suggestions.length === 0 ? (
          <div className="soft-box">
            <div className="muted">
              Δεν βρέθηκαν προτάσεις για το τωρινό υπόλοιπο της ημέρας.
            </div>
          </div>
        ) : (
          <div className="summary-suggestions-list">
            {suggestions.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} className="summary-suggestion-card">
                <div className="summary-suggestion-top">
                  <div className="summary-suggestion-title">
                    {food.name}
                    {food.brand ? ` · ${food.brand}` : ""}
                  </div>
                  <div className="muted">
                    {formatNumber(food.caloriesPer100g || 0)} kcal / 100g
                  </div>
                </div>

                <div className="muted summary-suggestion-meta">
                  Πρωτεΐνη {formatNumber(food.proteinPer100g || 0)}g · Υδατ.{" "}
                  {formatNumber(food.carbsPer100g || 0)}g · Λίπος{" "}
                  {formatNumber(food.fatPer100g || 0)}g
                </div>

                <div className="muted">{getSuggestionReason(food)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Τελευταίες 7 ημέρες</h2>

        <div className="summary-history-list">
          {last7Days.map((day) => (
            <button
              key={day.date}
              className={`history-row summary-history-row ${
                day.date === selectedDate ? "summary-history-row-active" : ""
              }`}
              onClick={() => setSelectedDate(day.date)}
              type="button"
            >
              <div className="summary-history-main">
                <div>
                  <div className="summary-history-title">{formatDisplayDate(day.date)}</div>
                  <div className="muted">{day.date}</div>
                </div>

                <div className="summary-history-stats">
                  <div className="muted">
                    Φαγητό: {formatNumber(day.eaten)} kcal
                  </div>

                  <div className="muted">
                    Άσκηση: +{formatNumber(day.exercise)} kcal
                  </div>

                  <div
                    className={
                      day.remaining >= 0
                        ? "summary-history-remaining-positive"
                        : "summary-history-remaining-negative"
                    }
                  >
                    Υπόλοιπο: {formatNumber(day.remaining)} kcal
                  </div>
                </div>
              </div>
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

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
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
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodGrams, setFoodGrams] = useState("100");
  const [mealType, setMealType] = useState("Πρωινό");

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
      normalizeFood({
        ...food,
        source: food.source || "local",
        sourceLabel: food.sourceLabel || "Local"
      })
    );

    const merged = [...localFoods, ...normalizedDatabaseResults];
    const seen = new Set();

    const deduped = merged.filter((food) => {
      const key = `${String(food.name || "").trim().toLowerCase()}|${String(
        food.brand || ""
      )
        .trim()
        .toLowerCase()}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!query.trim()) {
      return deduped;
    }

    return [...deduped].sort((a, b) => {
      const aScore = getFoodSearchScore(a, query);
      const bScore = getFoodSearchScore(b, query);
      return bScore - aScore;
    });
  }, [filteredFoods, normalizedDatabaseResults, query]);

  const topSearchResults = useMemo(() => visibleFoods.slice(0, 8), [visibleFoods]);
  const preview = selectedFood ? createFoodEntry(selectedFood, foodGrams, mealType) : null;
  const showAutocomplete = query.trim().length >= 2;
  const showFullResultsList = query.trim().length === 0 || visibleFoods.length > 0;

  function resetSelection() {
    setSelectedFood(null);
    setFoodGrams("100");
    setMealType("Πρωινό");
  }

  function clearSearchAndSelection() {
    setQuery("");
    resetSelection();
  }

  function addSelectedFood() {
    if (!selectedFood) return;

    const entry = createFoodEntry(selectedFood, foodGrams, mealType);

    updateCurrentDay((current) => ({
      ...current,
      entries: [entry, ...current.entries]
    }));

    saveRecentFood(selectedFood, foodGrams, mealType);
    clearSearchAndSelection();
  }

  function handleAddCustomFood() {
    if (!newName.trim() || !newCalories) return;

    addCustomFood(
      normalizeFood({
        id: `local-${Date.now()}`,
        source: "local",
        sourceLabel: "Local",
        name: newName.trim(),
        caloriesPer100g: Number(newCalories) || 0,
        proteinPer100g: Number(newProtein) || 0,
        carbsPer100g: Number(newCarbs) || 0,
        fatPer100g: Number(newFat) || 0
      })
    );

    setNewName("");
    setNewCalories("");
    setNewProtein("");
    setNewCarbs("");
    setNewFat("");
  }

  function getSourceBadge(food) {
    if (food.source === "local") return "";
    if (food.source === "usda") return "USDA";
    if (food.source === "off") return "Open Food Facts";
    if (food.sourceLabel && food.sourceLabel !== "Local") return food.sourceLabel;
    if (food.source === "database") return "Database";
    return "";
  }

  return (
    <>
      <div className="card">
        <h2>Φαγητό ημέρας</h2>

        {entries.length === 0 ? (
          <div className="soft-box">
            <div className="muted">Δεν έχεις βάλει φαγητό.</div>
          </div>
        ) : (
          <div className="stack-10">
            {MEALS.map((meal) => {
              const group = groupedEntries[meal];
              if (!group || group.items.length === 0) return null;

              return (
                <div key={meal} className="soft-box food-meal-group">
                  <div className="food-meal-head">
                    <div style={{ fontWeight: 700 }}>{meal}</div>
                    <div className="muted">{formatNumber(group.totalCalories)} kcal</div>
                  </div>

                  <div className="food-day-list">
                    {group.items.map((item) => (
                      <div key={item.id} className="food-entry-card">
                        <button
                          className="food-entry-main"
                          onClick={() => openEditEntry(item)}
                          type="button"
                        >
                          <div className="food-entry-title">{item.name}</div>

                          <div className="muted food-entry-meta">
                            {item.grams}g · {formatNumber(item.calories || 0)} kcal
                            {item.protein !== undefined
                              ? ` · P ${formatNumber(item.protein || 0)}`
                              : ""}
                            {item.carbs !== undefined
                              ? ` · C ${formatNumber(item.carbs || 0)}`
                              : ""}
                            {item.fat !== undefined
                              ? ` · F ${formatNumber(item.fat || 0)}`
                              : ""}
                          </div>
                        </button>

                        <div className="food-entry-actions">
                          <button
                            className="btn btn-light"
                            onClick={() => openEditEntry(item)}
                            type="button"
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-light"
                            onClick={() => deleteEntry(item.id)}
                            type="button"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Αναζήτηση φαγητού</h2>

        <div className="food-search-wrap">
          <input
            className="input"
            placeholder="Γράψε φαγητό"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedFood(null);
            }}
          />

          {showAutocomplete && (
            <div className="food-autocomplete-panel">
              {databaseLoading && (
                <div className="muted food-autocomplete-state">Αναζήτηση...</div>
              )}

              {!databaseLoading && topSearchResults.length === 0 && (
                <div className="muted food-autocomplete-state">
                  Δεν βρέθηκαν αποτελέσματα.
                </div>
              )}

              {!databaseLoading &&
                topSearchResults.map((food) => (
                  <button
                    key={`auto-${food.source || "local"}-${food.id}`}
                    className="food-autocomplete-item"
                    onClick={() => setSelectedFood(food)}
                    type="button"
                  >
                    <div className="food-result-top">
                      <div className="food-result-name">
                        {food.name}
                        {food.brand ? ` · ${food.brand}` : ""}
                      </div>

                      {getSourceBadge(food) ? (
                        <span className="tag">{getSourceBadge(food)}</span>
                      ) : null}
                    </div>

                    <div className="muted food-result-meta">
                      {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                      {formatNumber(food.proteinPer100g || 0)} · C{" "}
                      {formatNumber(food.carbsPer100g || 0)} · F{" "}
                      {formatNumber(food.fatPer100g || 0)}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {selectedFood && (
          <div className="soft-box food-selected-box">
            <div className="food-selected-head">
              <div className="food-selected-title">
                {selectedFood.name}
                {selectedFood.brand ? ` · ${selectedFood.brand}` : ""}
              </div>

              {getSourceBadge(selectedFood) ? (
                <span className="tag">{getSourceBadge(selectedFood)}</span>
              ) : null}
            </div>

            <div className="food-selected-controls">
              <label className="food-inline-field">
                <span className="muted">Γραμμάρια</span>
                <input
                  className="input"
                  value={foodGrams}
                  onChange={(e) => setFoodGrams(e.target.value)}
                  placeholder="Γραμμάρια"
                  inputMode="numeric"
                />
              </label>

              <label className="food-inline-field">
                <span className="muted">Γεύμα</span>
                <select
                  className="input"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                >
                  {MEALS.map((meal) => (
                    <option key={meal} value={meal}>
                      {meal}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {preview && (
              <div className="soft-box food-preview-box">
                <div className="muted">
                  Preview: {formatNumber(preview.calories || 0)} kcal · P{" "}
                  {formatNumber(preview.protein || 0)} · C{" "}
                  {formatNumber(preview.carbs || 0)} · F{" "}
                  {formatNumber(preview.fat || 0)}
                </div>
              </div>
            )}

            <div className="action-row">
              <button className="btn btn-dark" onClick={addSelectedFood} type="button">
                Προσθήκη
              </button>

              <button
                className="btn btn-light"
                onClick={clearSearchAndSelection}
                type="button"
              >
                Καθαρισμός
              </button>
            </div>
          </div>
        )}

        {showFullResultsList && (
          <div className="food-results-list">
            {visibleFoods.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} className="food-result-card">
                <button
                  className="food-result-main"
                  onClick={() => setSelectedFood(food)}
                  type="button"
                >
                  <div className="food-result-top">
                    <div className="food-result-name">
                      {food.name}
                      {food.brand ? ` · ${food.brand}` : ""}
                    </div>

                    {getSourceBadge(food) ? (
                      <span className="tag">{getSourceBadge(food)}</span>
                    ) : null}
                  </div>

                  <div className="muted food-result-meta">
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                    {formatNumber(food.proteinPer100g || 0)} · C{" "}
                    {formatNumber(food.carbsPer100g || 0)} · F{" "}
                    {formatNumber(food.fatPer100g || 0)}
                  </div>
                </button>

                <button
                  className={`food-fav-icon-btn ${isFavorite(food) ? "is-active" : ""}`}
                  onClick={() => toggleFavorite(food)}
                  type="button"
                  aria-label={isFavorite(food) ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
                  title={isFavorite(food) ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
                >
                  {isFavorite(food) ? "★" : "☆"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="soft-box food-custom-box">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Custom φαγητό</div>

          <div className="stack-10">
            <input
              className="input"
              placeholder="Όνομα"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <div className="grid-2">
              <input
                className="input"
                placeholder="kcal / 100g"
                inputMode="numeric"
                value={newCalories}
                onChange={(e) => setNewCalories(e.target.value)}
              />

              <input
                className="input"
                placeholder="Protein / 100g"
                inputMode="decimal"
                value={newProtein}
                onChange={(e) => setNewProtein(e.target.value)}
              />

              <input
                className="input"
                placeholder="Carbs / 100g"
                inputMode="decimal"
                value={newCarbs}
                onChange={(e) => setNewCarbs(e.target.value)}
              />

              <input
                className="input"
                placeholder="Fat / 100g"
                inputMode="decimal"
                value={newFat}
                onChange={(e) => setNewFat(e.target.value)}
              />
            </div>

            <button className="btn btn-dark" onClick={handleAddCustomFood} type="button">
              Αποθήκευση food
            </button>
          </div>
        </div>
      </div>

      {recentFoods.length > 0 && (
        <div className="card">
          <h2>Πρόσφατα</h2>

          <div className="food-compact-list">
            {recentFoods.slice(0, 6).map((item) => {
              const recentPreview = createFoodEntry(item.food, item.grams, item.mealType);

              return (
                <div key={item.key} className="food-compact-card">
                  <div className="food-compact-main">
                    <div className="food-compact-title">{item.food.name}</div>
                    <div className="muted food-compact-meta">
                      {item.grams}g · {item.mealType} · {formatNumber(recentPreview.calories || 0)}{" "}
                      kcal
                    </div>
                  </div>

                  <div className="food-compact-actions">
                    <button
                      className="btn btn-light"
                      onClick={() => {
                        setSelectedFood(item.food);
                        setFoodGrams(String(item.grams || 100));
                        setMealType(item.mealType || "Πρωινό");
                      }}
                      type="button"
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-dark"
                      onClick={() => quickAddRecent(item)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {favoriteFoods.length > 0 && (
        <div className="card">
          <h2>Αγαπημένα</h2>

          <div className="food-compact-list">
            {favoriteFoods.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`} className="food-compact-card">
                <div className="food-compact-main">
                  <div className="food-result-top">
                    <div className="food-compact-title">{food.name}</div>
                    {getSourceBadge(food) ? <span className="tag">{getSourceBadge(food)}</span> : null}
                  </div>

                  <div className="muted food-compact-meta">
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{" "}
                    {formatNumber(food.proteinPer100g || 0)}
                  </div>
                </div>

                <div className="food-compact-actions">
                  <button
                    className="btn btn-light"
                    onClick={() => setSelectedFood(food)}
                    type="button"
                  >
                    Άνοιγμα
                  </button>

                  <button
                    className="btn btn-dark"
                    onClick={() => quickAddFavorite(food)}
                    type="button"
                  >
                    +100g
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

        <div className="soft-box exercise-summary-box">
          <div className="exercise-summary-head">
            <div style={{ fontWeight: 700 }}>Σύνοψη ημέρας</div>
            <div className="exercise-summary-kcal">
              +{formatNumber(exerciseValue)} kcal
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="muted">
              Δεν έχεις βάλει άσκηση για αυτή την ημέρα.
            </div>
          ) : (
            <div className="exercise-day-list">
              {exercises.map((item) => (
                <div key={item.id} className="exercise-entry-card">
                  <div className="exercise-entry-main">
                    <div className="exercise-entry-title">
                      {item.name}
                    </div>

                    <div className="muted exercise-entry-meta">
                      {item.minutes} λεπτά ·{" "}
                      {formatNumber(item.caloriesPerMinute)} kcal/λεπτό · +
                      {formatNumber(item.calories)} kcal
                    </div>
                  </div>

                  <div className="exercise-entry-actions">
                    <button
                      className="btn btn-light"
                      onClick={() => deleteExercise(item.id)}
                      type="button"
                    >
                      Διαγραφή
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Προσθήκη άσκησης με λεπτά</h2>

        <div className="muted" style={{ marginBottom: 12 }}>
          Βάζεις λεπτά και το app υπολογίζει αυτόματα τις θερμίδες.
        </div>

        <div className="exercise-library-list">
          {EXERCISE_LIBRARY.map((exercise) => (
            <div key={exercise.name} className="soft-box exercise-library-item">
              <div className="exercise-library-main">
                <div className="exercise-library-title">
                  {exercise.name}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {formatNumber(exercise.caloriesPerMinute)} kcal / λεπτό
                </div>
              </div>

              <div className="exercise-library-controls">
                <label className="exercise-inline-field">
                  <span className="exercise-inline-label">Λεπτά</span>
                  <input
                    className="input exercise-compact-input"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={exerciseMinutes[exercise.name] || ""}
                    onChange={(e) =>
                      setExerciseMinutes((prev) => ({
                        ...prev,
                        [exercise.name]: e.target.value
                      }))
                    }
                  />
                </label>

                <button
                  className="btn btn-dark exercise-add-btn"
                  onClick={() =>
                    addExerciseByMinutes(
                      exercise,
                      exerciseMinutes[exercise.name]
                    )
                  }
                  type="button"
                >
                  Προσθήκη
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Custom άσκηση</h2>

        <div className="stack-10">
          <input
            className="input"
            placeholder="Όνομα άσκησης"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
          />

          <div className="grid-2">
            <label className="soft-box exercise-field-box">
              <div className="muted" style={{ marginBottom: 6 }}>
                Λεπτά
              </div>
              <input
                className="input"
                placeholder="Λεπτά"
                inputMode="numeric"
                value={customExerciseMinutes}
                onChange={(e) => setCustomExerciseMinutes(e.target.value)}
              />
            </label>

            <label className="soft-box exercise-field-box">
              <div className="muted" style={{ marginBottom: 6 }}>
                kcal / λεπτό
              </div>
              <input
                className="input"
                placeholder="kcal / λεπτό"
                inputMode="decimal"
                value={customExerciseRate}
                onChange={(e) => setCustomExerciseRate(e.target.value)}
              />
            </label>
          </div>

          <button
            className="btn btn-dark"
            onClick={addCustomExercise}
            type="button"
          >
            Προσθήκη custom άσκησης
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
  const kilosPerWeek =
    goalType === "lose" && kilosNum > 0 && weeksNum > 0
      ? kilosNum / weeksNum
      : 0;

  const isCapped = goalType === "lose" && rawDeficit > 1000;
  const isAggressiveGoal = goalType === "lose" && kilosPerWeek > 1;
  const isVeryUnrealisticGoal = goalType === "lose" && kilosPerWeek > 1.5;

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

      <div className="soft-box profile-section-box">
        <div className="profile-section-title">Βασικά στοιχεία</div>

        <div className="grid-2 profile-grid-compact">
          <label className="profile-field">
            <div className="profile-label">Ηλικία</div>
            <input
              className="input"
              placeholder="Ηλικία"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </label>

          <label className="profile-field">
            <div className="profile-label">Φύλο</div>
            <select
              className="input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="male">Άνδρας</option>
              <option value="female">Γυναίκα</option>
            </select>
          </label>

          <label className="profile-field">
            <div className="profile-label">Ύψος (cm)</div>
            <input
              className="input"
              placeholder="Ύψος (cm)"
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </label>

          <label className="profile-field">
            <div className="profile-label">Βάρος (kg)</div>
            <input
              className="input"
              placeholder="Βάρος (kg)"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="soft-box profile-section-box">
        <div className="profile-section-title">Ρυθμίσεις στόχου</div>

        <div className="stack-10">
          <label className="profile-field">
            <div className="profile-label">Επίπεδο δραστηριότητας</div>
            <select
              className="input"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              <option value="1.2">Καθιστική</option>
              <option value="1.4">Light</option>
              <option value="1.6">Moderate</option>
              <option value="1.8">High</option>
            </select>
          </label>

          <label className="profile-field">
            <div className="profile-label">Στόχος</div>
            <select
              className="input"
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
            >
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Muscle gain</option>
            </select>
          </label>

          <label className="profile-field">
            <div className="profile-label">Τρόπος διατροφής</div>
            <select
              className="input"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
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
              <div className="profile-label">
                {goalType === "lose" ? "Κιλά να χάσω" : "Κιλά να πάρω"}
              </div>
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

        {goalType === "lose" && rawDeficit > 0 && (
          <div className="profile-stat-row">
            <span>Υπολογισμένο έλλειμμα</span>
            <strong>{formatNumber(rawDeficit)} kcal</strong>
          </div>
        )}

        {goalType === "lose" && appliedDeficit > 0 && (
          <div className="profile-stat-row">
            <span>Εφαρμοσμένο έλλειμμα</span>
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

      {isCapped && (
        <div className="soft-box profile-warning-box">
          <div className="profile-warning-title">Περιορισμός ελλείμματος</div>
          <div className="muted">
            Ο στόχος που έβαλες απαιτεί πολύ μεγάλο ημερήσιο έλλειμμα.
            Για γενική χρήση, το app περιορίζει το εφαρμοσμένο έλλειμμα
            στις <strong>1000 kcal/ημέρα</strong>.
          </div>
        </div>
      )}

      {isAggressiveGoal && (
        <div className="soft-box profile-warning-box">
          <div className="profile-warning-title">Πολύ επιθετικός στόχος</div>
          <div className="muted">
            Ο ρυθμός που έχεις βάλει είναι περίπου{" "}
            <strong>{formatNumber(kilosPerWeek)} κιλά/εβδομάδα</strong>.
            Αυτό θεωρείται αρκετά επιθετικό για γενική καθοδήγηση.
          </div>
        </div>
      )}

      {isVeryUnrealisticGoal && (
        <div className="soft-box profile-danger-box">
          <div className="profile-warning-title">Μη ρεαλιστικός στόχος</div>
          <div className="muted">
            Ο στόχος αυτός δεν φαίνεται ρεαλιστικός με ασφαλές ημερήσιο
            θερμιδικό έλλειμμα. Δοκίμασε περισσότερες εβδομάδες ή μικρότερο
            στόχο κιλών.
          </div>
        </div>
      )}

      <div className="soft-box profile-section-box">
        <div className="profile-section-title">Σύνοψη</div>

        <div className="stack-10">
          <div>
            <span className="muted">Τύπος στόχου:</span>{" "}
            <strong>{getGoalLabel()}</strong>
          </div>

          <div>
            <span className="muted">Τρόπος διατροφής:</span>{" "}
            <strong>{getModeLabel()}</strong>
          </div>

          <div>
            <span className="muted">Επίπεδο δραστηριότητας:</span>{" "}
            <strong>{getActivityLabel()}</strong>
          </div>

          {goalType === "lose" && (
            <div className="muted">
              Στόχος: να τρως κάτω από το Maintenance / TDEE σου με ελεγχόμενο
              ημερήσιο έλλειμμα θερμίδων.
            </div>
          )}

          {goalType === "maintain" && (
            <div className="muted">
              Στόχος: να διατηρείς περίπου το βάρος σου, με ημερήσιο στόχο
              κοντά στο Maintenance / TDEE σου.
            </div>
          )}

          {goalType === "gain" && (
            <div className="muted">
              Στόχος: να υποστηρίζεις μυϊκή ανάπτυξη με περίπου 300 kcal πάνω
              από το Maintenance / TDEE σου και αυξημένη πρωτεΐνη.
            </div>
          )}
        </div>
      </div>

      <div className="action-row" style={{ marginTop: 16 }}>
        <button
          className="btn btn-dark"
          onClick={onContinue}
          disabled={!profileComplete}
          style={{
            opacity: profileComplete ? 1 : 0.5,
            cursor: profileComplete ? "pointer" : "not-allowed"
          }}
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
        const res = await fetch(
          `/.netlify/functions/food-search?q=${encodeURIComponent(q)}`
        );

        if (!res.ok) {
          throw new Error(`Search failed: ${res.status}`);
        }

        const data = await res.json();

        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        if (!cancelled) {
          setResults(arr);
        }
      } catch (err) {
        console.error("Food search error:", err);

        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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

export function normalizeFood(food) {
  return {
    id: food.id || `food-${Date.now()}`,
    source: food.source || "local",
    name: food.name || "Unknown food",
    brand: food.brand || "",
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
import { getSuggestedFoods } from "../utils/suggestions";

export default function SuggestionsBox({
  foods,
  mode,
  remainingCalories,
  remainingProtein,
  onSelectFood
}) {
  const suggestions = getSuggestedFoods({
    foods,
    modeKey: mode,
    remainingCalories,
    remainingProtein
  });

  if (!suggestions.length) return null;

  return (
    <div className="card">
      <h2>Τι να φας τώρα</h2>

      <div className="stack-10">
        {suggestions.map((food) => (
          <button
            key={food.id}
            className="food-choice"
            onClick={() => onSelectFood(food)}
          >
            <div style={{ fontWeight: 700 }}>{food.name}</div>

            <div className="muted">
              {food.caloriesPer100g} kcal · P {food.proteinPer100g}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

## FILE: netlify/functions/food-search.js
```javascript
export async function handler(event) {
  try {
    const query = event.queryStringParameters?.q?.trim();

    if (!query || query.length < 2) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      };
    }

    const API_KEY = process.env.USDA_API_KEY;

    // 🔥 USDA (κύριο - γρήγορο)
    const usdaPromise = fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
        query
      )}&pageSize=10&api_key=${API_KEY}`
    ).then((res) => res.json());

    // 🔥 Open Food Facts (secondary - μπορεί να αργήσει)
    const offPromise = fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=10`
    )
      .then((res) => res.json())
      .catch(() => null); // αν fail → ignore

    // 👉 ΠΕΡΙΜΕΝΟΥΜΕ ΜΟΝΟ USDA
    const usdaData = await usdaPromise;

    function getNutrientValue(food, possibleNames) {
      const match = (food.foodNutrients || []).find((n) =>
        possibleNames.includes(n.nutrientName)
      );
      return Number(match?.value) || 0;
    }

    const usdaFoods = (usdaData.foods || []).map((food) => ({
      id: `usda-${food.fdcId}`,
      source: "usda",
      sourceLabel: "USDA",
      name: food.description || "Unknown food",
      brand: food.brandOwner || food.brandName || "USDA",
      caloriesPer100g: getNutrientValue(food, ["Energy", "Energy (kcal)"]),
      proteinPer100g: getNutrientValue(food, ["Protein"]),
      carbsPer100g: getNutrientValue(food, [
        "Carbohydrate, by difference",
      ]),
      fatPer100g: getNutrientValue(food, ["Total lipid (fat)"]),
    }));

    // 👉 Προσπαθούμε να πάρουμε OFF αλλά δεν περιμένουμε
    let offFoods = [];

    try {
      const offData = await Promise.race([
        offPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 800)), // timeout 800ms
      ]);

      if (offData?.products) {
        offFoods = offData.products.map((p) => ({
          id: `off-${p.code}`,
          source: "off",
          sourceLabel: "OpenFood",
          name: p.product_name || "Unknown",
          brand: p.brands || "",
          caloriesPer100g: Number(
            p.nutriments?.["energy-kcal_100g"] || 0
          ),
          proteinPer100g: Number(p.nutriments?.proteins_100g || 0),
          carbsPer100g: Number(p.nutriments?.carbohydrates_100g || 0),
          fatPer100g: Number(p.nutriments?.fat_100g || 0),
        }));
      }
    } catch {
      // ignore completely
    }

    // 🔥 ΕΝΩΝΟΥΜΕ
    const results = [...usdaFoods, ...offFoods];

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Unknown error",
      }),
    };
  }
}
```
