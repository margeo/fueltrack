// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "./supabaseClient";
import AuthScreen from "./components/AuthScreen";
import BottomNav from "./components/BottomNav";
import EditEntryModal from "./components/EditEntryModal";
import ErrorBoundary from "./components/ErrorBoundary";
import HelpModal from "./components/HelpModal";
import NativeStaleBuildBanner from "./components/NativeStaleBuildBanner";
import PlanChooser from "./components/PlanChooser";
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
import { fetchCloudState, saveCloudColumn, seedCloudState } from "./utils/cloudSync";

function PasswordResetModal({ onClose }) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setError(t("auth.passwordHint")); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) { setError(err.message); }
    else { setSuccess(true); setTimeout(onClose, 1500); }
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--bg-body, #f3f4f6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ maxWidth: 380, width: "100%", margin: 0, position: "relative" }}>
        <button type="button" onClick={onClose}
          style={{ position: "absolute", top: 10, right: 10, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ✕
        </button>
        <h2 style={{ marginBottom: 16 }}>{t("auth.newPassword")}</h2>
        {success ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 14px", color: "#166534", fontSize: 13 }}>
            {t("auth.passwordChanged")}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#b91c1c", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <input className="input" type={showPassword ? "text" : "password"} placeholder={t("auth.newPasswordPlaceholder")} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password"
                style={{ width: "100%", paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, color: "var(--text-muted)" }}>
                {showPassword ? "\uD83D\uDE48" : "\uD83D\uDC41\uFE0F"}
              </button>
            </div>
            <button className="btn btn-dark" type="submit" disabled={loading}
              style={{ width: "100%", padding: "14px", opacity: loading ? 0.6 : 1 }}>
              {loading ? "..." : t("auth.savePassword")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState("login");
  const [showPlanChooser, setShowPlanChooser] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [cloudHydrated, setCloudHydrated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordReset(true);
        return;
      }
      // Show plan chooser on first login (not seen before)
      if (session?.user && !localStorage.getItem("ft_plan_chosen")) {
        setShowPlanChooser(true);
      }
      if (session?.user) {
        supabase.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email
        }, { onConflict: "id" }).then(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const [theme, setTheme] = useState(() => getInitialTheme());
  const [showHelpModal, setShowHelpModal] = useState(false);
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

  // Food preferences
  const [foodCategories, setFoodCategories] = useState(() => loadJSON("ft_foodCategories", []));
  const [allergies, setAllergies] = useState(() => loadJSON("ft_allergies", []));
  const [cookingLevel, setCookingLevel] = useState(() => loadValue("ft_cookingLevel", ""));
  const [cookingTime, setCookingTime] = useState(() => loadValue("ft_cookingTime", ""));
  const [simpleMode, setSimpleMode] = useState(() => loadValue("ft_simple_meals", "false") === "true");
  const [mealsPerDay, setMealsPerDay] = useState(() => loadValue("ft_mealsPerDay", ""));
  const [snacksPerDay, setSnacksPerDay] = useState(() => loadValue("ft_snacksPerDay", ""));

  // Exercise preferences
  const [fitnessLevel, setFitnessLevel] = useState(() => loadValue("ft_fitnessLevel", ""));
  const [workoutLocation, setWorkoutLocation] = useState(() => loadValue("ft_workoutLocation", ""));
  const [equipment, setEquipment] = useState(() => loadJSON("ft_equipment", []));
  const [limitations, setLimitations] = useState(() => loadValue("ft_limitations", ""));
  const [workoutFrequency, setWorkoutFrequency] = useState(() => loadValue("ft_workoutFrequency", ""));
  const [sessionDuration, setSessionDuration] = useState(() => loadValue("ft_sessionDuration", ""));
  const [fitnessGoals, setFitnessGoals] = useState(() => loadJSON("ft_fitnessGoals", []));
  const [exerciseCategories, setExerciseCategories] = useState(() => loadJSON("ft_exerciseCategories", []));

  const [foods] = useState(() => {
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
  const [savedPlans, setSavedPlans] = useState(() => loadJSON("ft_savedPlans", []));
  const [recentExercises, setRecentExercises] = useState(() => loadJSON("ft_recentExercises", []));

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
  useEffect(() => saveJSON("ft_foods", foods), [foods]);
  useEffect(() => saveJSON("ft_customFoods", customFoods), [customFoods]);
  useEffect(() => saveJSON("ft_dailyLogs", dailyLogs), [dailyLogs]);
  useEffect(() => saveJSON("ft_recentFoods", recentFoods), [recentFoods]);
  useEffect(() => saveJSON("ft_favoriteFoodKeys", favoriteFoodKeys), [favoriteFoodKeys]);
  useEffect(() => saveJSON("ft_favoriteExerciseKeys", favoriteExerciseKeys), [favoriteExerciseKeys]);
  useEffect(() => saveJSON("ft_weightLog", weightLog), [weightLog]);
  useEffect(() => saveJSON("ft_savedPlans", savedPlans), [savedPlans]);
  useEffect(() => saveJSON("ft_recentExercises", recentExercises), [recentExercises]);
  useEffect(() => saveValue("ft_hasSeenWelcome", hasSeenWelcome ? "true" : "false"), [hasSeenWelcome]);
  useEffect(() => saveJSON("ft_foodCategories", foodCategories), [foodCategories]);
  useEffect(() => saveJSON("ft_allergies", allergies), [allergies]);
  useEffect(() => saveValue("ft_cookingLevel", cookingLevel), [cookingLevel]);
  useEffect(() => saveValue("ft_cookingTime", cookingTime), [cookingTime]);
  useEffect(() => saveValue("ft_simple_meals", simpleMode ? "true" : "false"), [simpleMode]);
  useEffect(() => saveValue("ft_mealsPerDay", mealsPerDay), [mealsPerDay]);
  useEffect(() => saveValue("ft_snacksPerDay", snacksPerDay), [snacksPerDay]);
  useEffect(() => saveValue("ft_fitnessLevel", fitnessLevel), [fitnessLevel]);
  useEffect(() => saveValue("ft_workoutLocation", workoutLocation), [workoutLocation]);
  useEffect(() => saveJSON("ft_equipment", equipment), [equipment]);
  useEffect(() => saveValue("ft_limitations", limitations), [limitations]);
  useEffect(() => saveValue("ft_workoutFrequency", workoutFrequency), [workoutFrequency]);
  useEffect(() => saveValue("ft_sessionDuration", sessionDuration), [sessionDuration]);
  useEffect(() => saveJSON("ft_fitnessGoals", fitnessGoals), [fitnessGoals]);
  useEffect(() => saveJSON("ft_exerciseCategories", exerciseCategories), [exerciseCategories]);

  // =========================================================================
  // CLOUD SYNC — Phase A2
  // On login we fetch the user_state row from Supabase. If it exists we
  // hydrate local state from it (cloud wins). If not, we seed the row from
  // the current localStorage state. After that, every state change is
  // debounced-written to the matching JSONB column.
  // =========================================================================

  useEffect(() => {
    if (!session?.user?.id) {
      setCloudHydrated(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const cloud = await fetchCloudState(session.user.id);
      if (cancelled) return;

      if (cloud) {
        // Cloud wins — override local state
        if (cloud.profile && typeof cloud.profile === "object") {
          const p = cloud.profile;
          if (p.age !== undefined) setAge(p.age);
          if (p.gender !== undefined) setGender(p.gender);
          if (p.height !== undefined) setHeight(p.height);
          if (p.weight !== undefined) setWeight(p.weight);
          if (p.activity !== undefined) setActivity(p.activity);
          if (p.goalType !== undefined) setGoalType(p.goalType);
          if (p.mode !== undefined) setMode(p.mode);
          if (p.targetWeightLoss !== undefined) setTargetWeightLoss(p.targetWeightLoss);
          if (p.weeks !== undefined) setWeeks(p.weeks);
        }
        if (cloud.food_prefs && typeof cloud.food_prefs === "object") {
          const f = cloud.food_prefs;
          if (Array.isArray(f.foodCategories)) setFoodCategories(f.foodCategories);
          if (Array.isArray(f.allergies)) setAllergies(f.allergies);
          if (f.cookingLevel !== undefined) setCookingLevel(f.cookingLevel);
          if (f.cookingTime !== undefined) setCookingTime(f.cookingTime);
          if (typeof f.simpleMode === "boolean") setSimpleMode(f.simpleMode);
          if (f.mealsPerDay !== undefined) setMealsPerDay(f.mealsPerDay);
          if (f.snacksPerDay !== undefined) setSnacksPerDay(f.snacksPerDay);
        }
        if (cloud.fitness_prefs && typeof cloud.fitness_prefs === "object") {
          const x = cloud.fitness_prefs;
          if (x.fitnessLevel !== undefined) setFitnessLevel(x.fitnessLevel);
          if (x.workoutLocation !== undefined) setWorkoutLocation(x.workoutLocation);
          if (Array.isArray(x.equipment)) setEquipment(x.equipment);
          if (x.limitations !== undefined) setLimitations(x.limitations);
          if (x.workoutFrequency !== undefined) setWorkoutFrequency(x.workoutFrequency);
          if (x.sessionDuration !== undefined) setSessionDuration(x.sessionDuration);
          if (Array.isArray(x.fitnessGoals)) setFitnessGoals(x.fitnessGoals);
          if (Array.isArray(x.exerciseCategories)) setExerciseCategories(x.exerciseCategories);
        }
        if (Array.isArray(cloud.custom_foods)) setCustomFoods(cloud.custom_foods);
        if (Array.isArray(cloud.favorite_food_keys)) setFavoriteFoodKeys(cloud.favorite_food_keys);
        if (Array.isArray(cloud.recent_foods)) setRecentFoods(cloud.recent_foods);
        if (Array.isArray(cloud.favorite_exercise_keys)) setFavoriteExerciseKeys(cloud.favorite_exercise_keys);
        if (Array.isArray(cloud.recent_exercises)) setRecentExercises(cloud.recent_exercises);
        if (cloud.daily_logs && typeof cloud.daily_logs === "object") setDailyLogs(cloud.daily_logs);
        if (Array.isArray(cloud.weight_log)) setWeightLog(cloud.weight_log);
        if (Array.isArray(cloud.saved_plans)) setSavedPlans(cloud.saved_plans);
      } else {
        // No row yet — seed from current local state
        seedCloudState(session.user.id, {
          profile: { age, gender, height, weight, activity, goalType, mode, targetWeightLoss, weeks },
          food_prefs: { foodCategories, allergies, cookingLevel, cookingTime, simpleMode, mealsPerDay, snacksPerDay },
          fitness_prefs: { fitnessLevel, workoutLocation, equipment, limitations, workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories },
          custom_foods: customFoods,
          favorite_food_keys: favoriteFoodKeys,
          recent_foods: recentFoods,
          favorite_exercise_keys: favoriteExerciseKeys,
          recent_exercises: recentExercises,
          daily_logs: dailyLogs,
          weight_log: weightLog,
          saved_plans: savedPlans
        });
      }

      if (!cancelled) setCloudHydrated(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Grouped saves — each fires when any of its fields change
  const uid = session?.user?.id;
  useEffect(() => {
    if (!cloudHydrated || !uid) return;
    saveCloudColumn(uid, "profile", { age, gender, height, weight, activity, goalType, mode, targetWeightLoss, weeks });
  }, [uid, cloudHydrated, age, gender, height, weight, activity, goalType, mode, targetWeightLoss, weeks]);

  useEffect(() => {
    if (!cloudHydrated || !uid) return;
    saveCloudColumn(uid, "food_prefs", { foodCategories, allergies, cookingLevel, cookingTime, simpleMode, mealsPerDay, snacksPerDay });
  }, [uid, cloudHydrated, foodCategories, allergies, cookingLevel, cookingTime, simpleMode, mealsPerDay, snacksPerDay]);

  useEffect(() => {
    if (!cloudHydrated || !uid) return;
    saveCloudColumn(uid, "fitness_prefs", { fitnessLevel, workoutLocation, equipment, limitations, workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories });
  }, [uid, cloudHydrated, fitnessLevel, workoutLocation, equipment, limitations, workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories]);

  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "custom_foods", customFoods); }, [uid, cloudHydrated, customFoods]);
  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "favorite_food_keys", favoriteFoodKeys); }, [uid, cloudHydrated, favoriteFoodKeys]);
  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "recent_foods", recentFoods); }, [uid, cloudHydrated, recentFoods]);
  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "favorite_exercise_keys", favoriteExerciseKeys); }, [uid, cloudHydrated, favoriteExerciseKeys]);
  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "recent_exercises", recentExercises); }, [uid, cloudHydrated, recentExercises]);
  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "daily_logs", dailyLogs); }, [uid, cloudHydrated, dailyLogs]);
  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "weight_log", weightLog); }, [uid, cloudHydrated, weightLog]);
  useEffect(() => { if (cloudHydrated && uid) saveCloudColumn(uid, "saved_plans", savedPlans); }, [uid, cloudHydrated, savedPlans]);

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

  function saveRecentExercise(exercise, minutes) {
    setRecentExercises((prev) => {
      const key = exercise.name.toLowerCase();
      const filtered = prev.filter((item) => item.key !== key);
      return [{ key, exercise, minutes, lastUsedAt: Date.now() }, ...filtered].slice(0, 8);
    });
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
    saveRecentExercise(exercise, minutes);
  }

  function addCustomExercise(opts = {}) {
    const minutes = Math.max(Number(customExerciseMinutes) || 0, 1);
    const rate = Math.max(Number(customExerciseRate) || 0, 0.1);
    const cleanName = customExerciseName.trim();
    if (!cleanName) return;
    const newExercise = {
      id: Date.now() + Math.random(),
      name: `${cleanName} ${minutes} λεπτά`,
      minutes, caloriesPerMinute: rate,
      calories: Math.round(rate * minutes)
    };
    updateCurrentDay((current) => ({ ...current, exercises: [newExercise, ...current.exercises] }));
    const baseExercise = { name: cleanName, caloriesPerMinute: rate, icon: "✏️", category: "Custom" };
    saveRecentExercise(baseExercise, minutes);
    if (opts.favorite) {
      const key = cleanName.toLowerCase();
      setFavoriteExerciseKeys((prev) => (prev.includes(key) ? prev : [key, ...prev]));
    }
    setCustomExerciseName(""); setCustomExerciseMinutes(""); setCustomExerciseRate("");
  }

  function deleteExercise(id) {
    updateCurrentDay((current) => ({
      ...current,
      exercises: current.exercises.filter((item) => item.id !== id)
    }));
  }

  function quickAddRecentExercise(item) {
    addExerciseByMinutes(item.exercise, item.minutes);
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

  function handleSavePlan(plan) {
    setSavedPlans((prev) => {
      const filtered = prev.filter((p) => p.type !== plan.type);
      return [...filtered, plan];
    });
  }

  function deletePlan(type) {
    setSavedPlans((prev) => prev.filter((p) => p.type !== type));
  }

  function startOnboarding() { setHasSeenWelcome(true); setActiveTab("profile"); window.scrollTo(0, 0); }
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
      const protein = log.entries.reduce((sum, item) => sum + Number(item.protein || 0), 0);
      const carbs = log.entries.reduce((sum, item) => sum + Number(item.carbs || 0), 0);
      const fat = log.entries.reduce((sum, item) => sum + Number(item.fat || 0), 0);
      const ex = log.exercises.reduce((sum, item) => sum + Number(item.calories || 0), 0);
      const exNames = log.exercises.map(e => e.name).filter(Boolean);
      const remaining = targetCalories - eaten + ex;
      return { date, eaten, protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat), exercise: ex, exerciseNames: exNames, remaining };
    });
  }, [selectedDate, dailyLogs, targetCalories]);

  const isToday = selectedDate === getTodayKey();

  const favoriteFoods = useMemo(() => {
    const pool = [...foods, ...customFoods];
    const seen = new Set();
    const unique = [];
    for (const food of pool) {
      const key = `${(food.name || "").toLowerCase()}|${(food.brand || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(food);
    }
    return unique.filter((food) => isFavorite(food)).slice(0, 8);
  }, [foods, customFoods, favoriteFoodKeys]);

  const favoriteExercises = useMemo(() => {
    const pool = [...EXERCISE_LIBRARY, ...recentExercises.map((r) => r.exercise).filter(Boolean)];
    const seen = new Set();
    const unique = [];
    for (const ex of pool) {
      const key = (ex.name || "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(ex);
    }
    return unique.filter((e) => isFavoriteExercise(e));
  }, [favoriteExerciseKeys, recentExercises]);

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
    favoriteExercises,
    age, weight, height, gender,
    savedPlans,
    onSavePlan: handleSavePlan,
    onDeletePlan: deletePlan,
    session,
    userName: session?.user?.user_metadata?.full_name,
    onShowAuth: () => { setAuthInitialMode("login"); setShowAuthModal(true); },
    onShowRegister: () => { setAuthInitialMode("register"); setShowAuthModal(true); },
    foodCategories, allergies, cookingLevel, cookingTime, simpleMode,
    mealsPerDay, snacksPerDay,
    fitnessLevel, workoutLocation, equipment, limitations,
    workoutFrequency, sessionDuration, fitnessGoals, exerciseCategories
  };

  const foodProps = {
    foods, customFoods,
    onAddCustomFood: (food, opts = {}) => {
      const normalized = normalizeFood({ ...food, id: `custom-${Date.now()}`, source: "custom" });
      setCustomFoods((prev) => [normalized, ...prev]);
      saveRecentFood(normalized, 100, "Σνακ");
      if (opts.favorite) {
        const key = `${normalized.name.toLowerCase()}|${(normalized.brand || "").toLowerCase()}`;
        setFavoriteFoodKeys((prev) => (prev.includes(key) ? prev : [key, ...prev]));
      }
    },
    onDeleteCustomFood: (id) => setCustomFoods((prev) => prev.filter((f) => f.id !== id)),
    recentFoods, favoriteFoods,
    isFavorite, toggleFavorite,
    saveRecentFood, updateCurrentDay,
    quickAddRecent, quickAddFavorite,
    entries, groupedEntries, deleteEntry, openEditEntry,
    session,
    onShowAuth: () => { setAuthInitialMode("login"); setShowAuthModal(true); },
    onShowRegister: () => { setAuthInitialMode("register"); setShowAuthModal(true); }
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
    isFavoriteExercise,
    recentExercises,
    quickAddRecentExercise
  };

  const profileProps = {
    age, setAge, gender, setGender,
    height, setHeight, weight, setWeight,
    activity, setActivity, goalType, setGoalType,
    mode, setMode, targetWeightLoss, setTargetWeightLoss,
    weeks, setWeeks, tdee, targetCalories,
    dailyDeficit, proteinTarget, profileComplete,
    onContinue: goToSummaryAfterProfile,
    session,
    userEmail: session?.user?.email,
    userName: session?.user?.user_metadata?.full_name,
    onShowAuth: () => { setAuthInitialMode("login"); setShowAuthModal(true); },
    onShowRegister: () => { setAuthInitialMode("register"); setShowAuthModal(true); },
    foodCategories, setFoodCategories, allergies, setAllergies,
    cookingLevel, setCookingLevel, cookingTime, setCookingTime, simpleMode, setSimpleMode,
    mealsPerDay, setMealsPerDay, snacksPerDay, setSnacksPerDay,
    fitnessLevel, setFitnessLevel, workoutLocation, setWorkoutLocation,
    equipment, setEquipment, limitations, setLimitations,
    workoutFrequency, setWorkoutFrequency, sessionDuration, setSessionDuration,
    fitnessGoals, setFitnessGoals, exerciseCategories, setExerciseCategories
  };

  const showWelcome = !hasSeenWelcome;
  const showProfile = hasSeenWelcome && !profileComplete;
  const appReady = hasSeenWelcome && profileComplete;

  return (
    <>
    <div className="app-shell">
      <div className="app-container">
        <div className="app-header" style={{ flexDirection: "column", alignItems: "stretch", gap: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}><img src="/icon-192.png" alt="" style={{ width: 28, height: 28, borderRadius: 6 }} />FuelTrack</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="theme-toggle-btn" onClick={() => i18n.changeLanguage(i18n.language === "el" ? "en" : "el")} type="button"
                style={{ fontSize: 13, fontWeight: 700, padding: "4px 8px", minWidth: 0 }}>
                {i18n.language === "el" ? "EL" : "EN"}
              </button>
              <button className="theme-toggle-btn" onClick={toggleTheme} type="button" style={{ fontSize: 13, padding: "4px 8px" }}>
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              <button className="theme-toggle-btn" onClick={() => setShowHelpModal(true)} type="button" aria-label={t("help.title")} style={{ fontSize: 13, padding: "4px 8px" }}>
                ℹ️
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>Plan → Track → Achieve!</div>
        </div>

        <NativeStaleBuildBanner />

        {showWelcome && <WelcomeScreen onStart={startOnboarding} />}
        {showProfile && <ProfileTab {...profileProps} />}

        {appReady && activeTab === "summary" && (
          <ErrorBoundary name={t("tabs.summary")} key="summary">
            <SummaryTab {...summaryProps} />
          </ErrorBoundary>
        )}
        {appReady && activeTab === "food" && (
          <ErrorBoundary name={t("tabs.food")} key="food">
            <FoodTab {...foodProps} />
          </ErrorBoundary>
        )}
        {appReady && activeTab === "exercise" && (
          <ErrorBoundary name={t("tabs.exercise")} key="exercise">
            <ExerciseTab {...exerciseProps} />
          </ErrorBoundary>
        )}
        {appReady && activeTab === "profile" && (
          <ErrorBoundary name={t("tabs.profile")} key="profile">
            <ProfileTab {...profileProps} />
          </ErrorBoundary>
        )}

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

    {showPlanChooser && (
      <PlanChooser onContinue={() => setShowPlanChooser(false)} />
    )}

    {showPasswordReset && (
      <PasswordResetModal onClose={() => setShowPasswordReset(false)} />
    )}

    {showAuthModal && (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}>
        <div style={{ position: "relative", maxHeight: "90vh", overflowY: "auto", borderRadius: 16, width: "100%", maxWidth: 400 }}>
          <AuthScreen onSuccess={() => setShowAuthModal(false)} initialMode={authInitialMode} isModal />
        </div>
      </div>
    )}

    {showHelpModal && (
      <HelpModal activeTab={showProfile ? "profile" : activeTab} onClose={() => setShowHelpModal(false)} />
    )}
    </>
  );
}