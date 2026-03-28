import { useEffect, useMemo, useState } from "react";
import BottomNav from "./components/BottomNav";
import FabButton from "./components/FabButton";
import QuickActionsModal from "./components/QuickActionsModal";
import EditEntryModal from "./components/EditEntryModal";
import SummaryTab from "./components/tabs/SummaryTab";
import FoodTab from "./components/tabs/FoodTab";
import ExerciseTab from "./components/tabs/ExerciseTab";
import DayTab from "./components/tabs/DayTab";
import ProfileTab from "./components/tabs/ProfileTab";
import { DEFAULT_FOODS, EXERCISE_LIBRARY, MEALS, APP_TABS } from "./data/constants";
import {
  getTodayKey,
  normalizeDayLog,
  normalizeFood,
  createFoodEntry,
  round1,
  shiftDate,
  calculateBmr,
  entryBasePer100g,
  calculateDailyDeficit,
  calculateTargetCalories,
  calculateProteinTarget
} from "./utils/helpers";
import { loadJSON, loadValue, saveJSON, saveValue } from "./utils/storage";

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() =>
    loadValue("ft_selectedDate", getTodayKey())
  );

  const [age, setAge] = useState(() => loadValue("ft_age", ""));
  const [gender, setGender] = useState(() => loadValue("ft_gender", "male"));
  const [height, setHeight] = useState(() => loadValue("ft_height", ""));
  const [weight, setWeight] = useState(() => loadValue("ft_weight", ""));
  const [activity, setActivity] = useState(() => loadValue("ft_activity", "1.4"));
  const [goalType, setGoalType] = useState(() => loadValue("ft_goalType", "maintain"));
  const [targetWeightLoss, setTargetWeightLoss] = useState(() =>
    loadValue("ft_targetWeightLoss", "")
  );
  const [weeks, setWeeks] = useState(() => loadValue("ft_weeks", ""));

  const [foods, setFoods] = useState(() => loadJSON("ft_foods", DEFAULT_FOODS));
  const [dailyLogs, setDailyLogs] = useState(() => loadJSON("ft_dailyLogs", {}));
  const [recentFoods, setRecentFoods] = useState(() => loadJSON("ft_recentFoods", []));
  const [favoriteFoodKeys, setFavoriteFoodKeys] = useState(() =>
    loadJSON("ft_favoriteFoodKeys", [])
  );

  const [showQuickActions, setShowQuickActions] = useState(false);

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

  const profileComplete = useMemo(() => {
    return (
      String(age).trim() !== "" &&
      String(gender).trim() !== "" &&
      String(height).trim() !== "" &&
      String(weight).trim() !== "" &&
      String(activity).trim() !== "" &&
      String(goalType).trim() !== ""
    );
  }, [age, gender, height, weight, activity, goalType]);

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = loadValue("ft_activeTab", "summary");
    const savedAge = loadValue("ft_age", "");
    const savedGender = loadValue("ft_gender", "male");
    const savedHeight = loadValue("ft_height", "");
    const savedWeight = loadValue("ft_weight", "");
    const savedActivity = loadValue("ft_activity", "1.4");
    const savedGoalType = loadValue("ft_goalType", "maintain");

    const savedProfileComplete =
      String(savedAge).trim() !== "" &&
      String(savedGender).trim() !== "" &&
      String(savedHeight).trim() !== "" &&
      String(savedWeight).trim() !== "" &&
      String(savedActivity).trim() !== "" &&
      String(savedGoalType).trim() !== "";

    return savedProfileComplete ? savedTab : "profile";
  });

  useEffect(() => {
    saveValue("ft_selectedDate", selectedDate);
  }, [selectedDate]);

  useEffect(() => saveValue("ft_age", age), [age]);
  useEffect(() => saveValue("ft_gender", gender), [gender]);
  useEffect(() => saveValue("ft_height", height), [height]);
  useEffect(() => saveValue("ft_weight", weight), [weight]);
  useEffect(() => saveValue("ft_activity", activity), [activity]);
  useEffect(() => saveValue("ft_goalType", goalType), [goalType]);
  useEffect(() => saveValue("ft_targetWeightLoss", targetWeightLoss), [targetWeightLoss]);
  useEffect(() => saveValue("ft_weeks", weeks), [weeks]);
  useEffect(() => saveJSON("ft_foods", foods), [foods]);
  useEffect(() => saveJSON("ft_dailyLogs", dailyLogs), [dailyLogs]);
  useEffect(() => saveJSON("ft_recentFoods", recentFoods), [recentFoods]);
  useEffect(() => saveJSON("ft_favoriteFoodKeys", favoriteFoodKeys), [favoriteFoodKeys]);

  useEffect(() => {
    if (!profileComplete && activeTab !== "profile") {
      setActiveTab("profile");
      return;
    }

    const tabToSave = profileComplete ? activeTab : "profile";
    saveValue("ft_activeTab", tabToSave);
  }, [activeTab, profileComplete]);

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

  function clearAll() {
    updateCurrentDay(() => ({
      entries: [],
      exercises: []
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

  function goToSummaryAfterProfile() {
    if (!profileComplete) return;
    setActiveTab("summary");
  }

  const bmr = useMemo(() => calculateBmr({ age, height, weight, gender }), [
    age,
    height,
    weight,
    gender
  ]);

  const tdee = useMemo(() => Math.round(bmr * Number(activity || 1.4)), [bmr, activity]);

  const dailyDeficit = useMemo(
    () => calculateDailyDeficit({ goalType, targetWeightLoss, weeks }),
    [goalType, targetWeightLoss, weeks]
  );

  const targetCalories = useMemo(
    () => calculateTargetCalories({ tdee, goalType, dailyDeficit }),
    [tdee, goalType, dailyDeficit]
  );

  const proteinTarget = useMemo(
    () => calculateProteinTarget({ goalType, weight }),
    [goalType, weight]
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
    last7Days
  };

  const foodProps = {
    foods,
    setFoods,
    recentFoods,
    favoriteFoods,
    isFavorite,
    toggleFavorite,
    addCustomFood,
    saveRecentFood,
    updateCurrentDay,
    quickAddRecent,
    quickAddFavorite
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

  const dayProps = {
    entries,
    groupedEntries,
    clearAll,
    deleteEntry,
    openEditEntry
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
    targetWeightLoss,
    setTargetWeightLoss,
    weeks,
    setWeeks,
    bmr,
    tdee,
    targetCalories,
    dailyDeficit,
    proteinTarget,
    profileComplete,
    onContinue: goToSummaryAfterProfile
  };

  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="app-header">
          <h1>FuelTrack</h1>
          <p>
            {!profileComplete
              ? "Ξεκίνα συμπληρώνοντας το προφίλ σου"
              : "Απλό, καθαρό working version"}
          </p>
        </div>

        {!profileComplete && activeTab !== "profile" && (
          <div className="card">
            <div className="muted">
              Συμπλήρωσε πρώτα το προφίλ σου για να υπολογιστούν σωστά οι στόχοι σου.
            </div>
          </div>
        )}

        {activeTab === "summary" && <SummaryTab {...summaryProps} />}
        {activeTab === "food" && <FoodTab {...foodProps} />}
        {activeTab === "exercise" && <ExerciseTab {...exerciseProps} />}
        {activeTab === "day" && <DayTab {...dayProps} />}
        {activeTab === "profile" && <ProfileTab {...profileProps} />}

        <div style={{ height: 110 }} />
      </div>

      {profileComplete && <FabButton onClick={() => setShowQuickActions(true)} />}

      <BottomNav
        tabs={APP_TABS}
        activeTab={activeTab}
        onChange={(tab) => {
          if (!profileComplete && tab !== "profile") {
            setActiveTab("profile");
            return;
          }
          setActiveTab(tab);
        }}
      />

      {showQuickActions && profileComplete && (
        <QuickActionsModal
          onClose={() => setShowQuickActions(false)}
          onOpenFood={() => {
            setActiveTab("food");
            setShowQuickActions(false);
          }}
          onOpenExercise={() => {
            setActiveTab("exercise");
            setShowQuickActions(false);
          }}
          onOpenDay={() => {
            setActiveTab("day");
            setShowQuickActions(false);
          }}
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