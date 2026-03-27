import { useEffect, useMemo, useState } from "react";

const DEFAULT_FOODS = [
  {
    id: "local-tost",
    source: "local",
    name: "Τοστ",
    caloriesPer100g: 250,
    proteinPer100g: 10,
    carbsPer100g: 30,
    fatPer100g: 10
  },
  {
    id: "local-avga",
    source: "local",
    name: "Αυγά",
    caloriesPer100g: 140,
    proteinPer100g: 12,
    carbsPer100g: 1,
    fatPer100g: 10
  },
  {
    id: "local-kotopoulo",
    source: "local",
    name: "Κοτόπουλο",
    caloriesPer100g: 300,
    proteinPer100g: 40,
    carbsPer100g: 0,
    fatPer100g: 15
  },
  {
    id: "local-banana",
    source: "local",
    name: "Μπανάνα",
    caloriesPer100g: 100,
    proteinPer100g: 1,
    carbsPer100g: 25,
    fatPer100g: 0
  },
  {
    id: "local-ryzi",
    source: "local",
    name: "Ρύζι",
    caloriesPer100g: 200,
    proteinPer100g: 4,
    carbsPer100g: 44,
    fatPer100g: 1
  },
  {
    id: "local-giaourti",
    source: "local",
    name: "Γιαούρτι",
    caloriesPer100g: 150,
    proteinPer100g: 15,
    carbsPer100g: 8,
    fatPer100g: 6
  }
];

const EXERCISE_LIBRARY = [
  { name: "Περπάτημα", caloriesPerMinute: 4 },
  { name: "Γρήγορο περπάτημα", caloriesPerMinute: 5.5 },
  { name: "Τρέξιμο", caloriesPerMinute: 11 },
  { name: "Βάρη", caloriesPerMinute: 4.5 },
  { name: "Ποδήλατο", caloriesPerMinute: 7 },
  { name: "Κολύμπι", caloriesPerMinute: 8.5 }
];

const MEALS = ["Πρωινό", "Μεσημεριανό", "Βραδινό", "Σνακ"];

function getStoredValue(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch {
    return fallback;
  }
}

function getStoredJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("el-GR");
}

function getTodayKey() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDate(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("el-GR", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function normalizeDayLog(log) {
  if (!log) {
    return { entries: [], exercises: [] };
  }

  return {
    entries: Array.isArray(log.entries) ? log.entries : [],
    exercises: Array.isArray(log.exercises) ? log.exercises : []
  };
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function normalizeFood(food) {
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

export default function App() {
  const [age, setAge] = useState(() => getStoredValue("ft_age", ""));
  const [gender, setGender] = useState(() => getStoredValue("ft_gender", "male"));
  const [height, setHeight] = useState(() => getStoredValue("ft_height", ""));
  const [weight, setWeight] = useState(() => getStoredValue("ft_weight", ""));
  const [activity, setActivity] = useState(() => getStoredValue("ft_activity", "1.4"));

  const [goalType, setGoalType] = useState(() => getStoredValue("ft_goalType", "maintain"));
  const [targetWeightLoss, setTargetWeightLoss] = useState(() =>
    getStoredValue("ft_targetWeightLoss", "")
  );
  const [weeks, setWeeks] = useState(() => getStoredValue("ft_weeks", ""));

  const [selectedDate, setSelectedDate] = useState(() =>
    getStoredValue("ft_selectedDate", getTodayKey())
  );

  const [foods, setFoods] = useState(() => getStoredJSON("ft_foods", DEFAULT_FOODS));
  const [dailyLogs, setDailyLogs] = useState(() => getStoredJSON("ft_dailyLogs", {}));

  const [query, setQuery] = useState("");
  const [foodGrams, setFoodGrams] = useState("100");
  const [mealType, setMealType] = useState("Πρωινό");

  const [apiFoods, setApiFoods] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFat, setNewFat] = useState("");

  const [exerciseMinutes, setExerciseMinutes] = useState(() =>
    EXERCISE_LIBRARY.reduce((acc, item) => {
      acc[item.name] = "";
      return acc;
    }, {})
  );

  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseMinutes, setCustomExerciseMinutes] = useState("");
  const [customExerciseRate, setCustomExerciseRate] = useState("");

  useEffect(() => localStorage.setItem("ft_age", age), [age]);
  useEffect(() => localStorage.setItem("ft_gender", gender), [gender]);
  useEffect(() => localStorage.setItem("ft_height", height), [height]);
  useEffect(() => localStorage.setItem("ft_weight", weight), [weight]);
  useEffect(() => localStorage.setItem("ft_activity", activity), [activity]);
  useEffect(() => localStorage.setItem("ft_goalType", goalType), [goalType]);
  useEffect(() => localStorage.setItem("ft_targetWeightLoss", targetWeightLoss), [targetWeightLoss]);
  useEffect(() => localStorage.setItem("ft_weeks", weeks), [weeks]);
  useEffect(() => localStorage.setItem("ft_selectedDate", selectedDate), [selectedDate]);
  useEffect(() => localStorage.setItem("ft_foods", JSON.stringify(foods)), [foods]);
  useEffect(() => localStorage.setItem("ft_dailyLogs", JSON.stringify(dailyLogs)), [dailyLogs]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setApiFoods([]);
      setApiLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setApiLoading(true);
        const res = await fetch(
          `/.netlify/functions/food-search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();

        if (Array.isArray(data.foods)) {
          setApiFoods(data.foods.map(normalizeFood));
        } else {
          setApiFoods([]);
        }
      } catch (err) {
        console.error("API error", err);
        setApiFoods([]);
      } finally {
        setApiLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

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

  const bmr = useMemo(() => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);

    if (!a || !h || !w) return 0;

    if (gender === "male") {
      return Math.round(10 * w + 6.25 * h - 5 * a + 5);
    }

    return Math.round(10 * w + 6.25 * h - 5 * a - 161);
  }, [age, height, weight, gender]);

  const tdee = useMemo(() => {
    return Math.round(bmr * Number(activity || 1.4));
  }, [bmr, activity]);

  const dailyDeficit = useMemo(() => {
    const kg = Number(targetWeightLoss);
    const wks = Number(weeks);

    if (goalType !== "lose") return 0;
    if (!kg || !wks || wks <= 0) return 0;

    return Math.round((kg * 7700) / (wks * 7));
  }, [goalType, targetWeightLoss, weeks]);

  const targetCalories = useMemo(() => {
    if (!tdee) return 0;
    if (goalType === "maintain") return tdee;
    return Math.max(tdee - dailyDeficit, 1200);
  }, [tdee, goalType, dailyDeficit]);

  const filteredFoods = useMemo(() => {
    const localFoods = foods.filter((food) =>
      food.name.toLowerCase().includes(query.toLowerCase())
    );

    const combined = [...localFoods, ...apiFoods];
    const seen = new Set();

    return combined.filter((food) => {
      const key = `${food.source}-${food.id}-${food.name}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [foods, query, apiFoods]);

  function createFoodEntry(food, gramsValue, meal) {
    const normalized = normalizeFood(food);
    const grams = Math.max(Number(gramsValue) || 100, 1);
    const factor = grams / 100;

    return {
      id: Date.now() + Math.random(),
      foodId: normalized.id,
      source: normalized.source,
      name: normalized.name,
      brand: normalized.brand,
      mealType: meal,
      grams,
      calories: Math.round(normalized.caloriesPer100g * factor),
      protein: round1(normalized.proteinPer100g * factor),
      carbs: round1(normalized.carbsPer100g * factor),
      fat: round1(normalized.fatPer100g * factor)
    };
  }

  function addFood(food) {
    const entry = createFoodEntry(food, foodGrams, mealType);

    updateCurrentDay((current) => ({
      ...current,
      entries: [entry, ...current.entries]
    }));

    setFoodGrams("100");
    setQuery("");
    setApiFoods([]);
  }

  function deleteEntry(id) {
    updateCurrentDay((current) => ({
      ...current,
      entries: current.entries.filter((item) => item.id !== id)
    }));
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

  function addCustomFood() {
    if (!newName.trim() || !newCalories) return;

    const food = {
      id: `local-${Date.now()}`,
      source: "local",
      name: newName.trim(),
      brand: "",
      caloriesPer100g: Number(newCalories) || 0,
      proteinPer100g: Number(newProtein) || 0,
      carbsPer100g: Number(newCarbs) || 0,
      fatPer100g: Number(newFat) || 0
    };

    setFoods((prev) => [food, ...prev]);

    setNewName("");
    setNewCalories("");
    setNewProtein("");
    setNewCarbs("");
    setNewFat("");
  }

  const totalCalories = entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);
  const totalProtein = entries.reduce((sum, item) => sum + Number(item.protein || 0), 0);
  const totalCarbs = entries.reduce((sum, item) => sum + Number(item.carbs || 0), 0);
  const totalFat = entries.reduce((sum, item) => sum + Number(item.fat || 0), 0);
  const exerciseValue = exercises.reduce((sum, item) => sum + Number(item.calories || 0), 0);

  const remainingCalories = targetCalories - totalCalories + exerciseValue;

  const progress = targetCalories
    ? Math.min((totalCalories / targetCalories) * 100, 100)
    : 0;

  const groupedEntries = useMemo(() => {
    return MEALS.reduce((acc, meal) => {
      const items = entries.filter((item) => item.mealType === meal);
      acc[meal] = {
        items,
        total: items.reduce((sum, item) => sum + Number(item.calories || 0), 0)
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

  return (
    <div style={page}>
      <div style={container}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={title}>FuelTrack</h1>
          <p style={subtitle}>Θερμίδες, άσκηση, φαγητό, γραμμάρια και αναζήτηση βάσης</p>
        </div>

        <div style={heroCard}>
          <div style={dateToolbar}>
            <button style={navBtn} onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))}>
              ←
            </button>

            <div style={{ flex: 1 }}>
              <div style={heroLabel}>Επιλεγμένη ημέρα</div>
              <div style={heroDate}>{formatDisplayDate(selectedDate)}</div>
              <div style={heroDateSmall}>{selectedDate}</div>
            </div>

            <button style={navBtn} onClick={() => setSelectedDate((prev) => shiftDate(prev, 1))}>
              →
            </button>
          </div>

          <div style={heroActions}>
            <button
              style={isToday ? todayBtnActive : todayBtn}
              onClick={() => setSelectedDate(getTodayKey())}
            >
              Σήμερα
            </button>

            <input
              style={dateInput}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div style={heroTop}>
            <div>
              <div style={heroLabel}>Υπόλοιπο ημέρας</div>
              <div
                style={{
                  ...heroValue,
                  color: remainingCalories >= 0 ? "#86efac" : "#fca5a5"
                }}
              >
                {formatNumber(remainingCalories)} kcal
              </div>
            </div>

            <div style={heroPill}>
              {goalType === "lose" ? "Cut" : "Maintain"}
            </div>
          </div>

          <div style={dashboardGrid}>
            <div style={statBoxDark}>
              <div style={statLabelDark}>Στόχος</div>
              <div style={statValueDark}>{formatNumber(targetCalories)}</div>
            </div>
            <div style={statBoxDark}>
              <div style={statLabelDark}>Έφαγες</div>
              <div style={statValueDark}>{formatNumber(totalCalories)}</div>
            </div>
            <div style={statBoxDark}>
              <div style={statLabelDark}>Άσκηση</div>
              <div style={statValueDark}>+{formatNumber(exerciseValue)}</div>
            </div>
            <div style={statBoxDark}>
              <div style={statLabelDark}>Entries</div>
              <div style={statValueDark}>{entries.length}</div>
            </div>
          </div>

          <div style={sectionLabelDark}>Πρόοδος θερμίδων</div>
          <div style={progressOuterDark}>
            <div style={{ ...progressInnerDark, width: `${progress}%` }} />
          </div>
          <div style={progressTextDark}>
            {formatNumber(totalCalories)} / {formatNumber(targetCalories)} kcal
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>Profile</h2>

          <div style={grid2}>
            <input
              style={input}
              placeholder="Ηλικία"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            <select style={input} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Άνδρας</option>
              <option value="female">Γυναίκα</option>
            </select>
          </div>

          <div style={grid2}>
            <input
              style={input}
              placeholder="Ύψος (cm)"
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
            <input
              style={input}
              placeholder="Βάρος (kg)"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div style={smallLabel}>Activity level</div>
          <select style={input} value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="1.2">Καθιστική</option>
            <option value="1.4">Light</option>
            <option value="1.6">Moderate</option>
            <option value="1.8">High</option>
          </select>

          <div style={smallLabel}>Στόχος</div>
          <select style={input} value={goalType} onChange={(e) => setGoalType(e.target.value)}>
            <option value="maintain">Συντήρηση</option>
            <option value="lose">Απώλεια βάρους</option>
          </select>

          {goalType === "lose" && (
            <div style={grid2}>
              <input
                style={input}
                placeholder="Κιλά να χάσω"
                inputMode="decimal"
                value={targetWeightLoss}
                onChange={(e) => setTargetWeightLoss(e.target.value)}
              />
              <input
                style={input}
                placeholder="Σε πόσες εβδομάδες"
                inputMode="numeric"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
              />
            </div>
          )}

          <div style={infoBox}>
            <div>BMR: <strong>{formatNumber(bmr)} kcal</strong></div>
            <div>Maintenance: <strong>{formatNumber(tdee)} kcal</strong></div>
            <div>Target: <strong>{formatNumber(targetCalories)} kcal</strong></div>
            {goalType === "lose" && dailyDeficit > 0 && (
              <div>Ημερήσιο deficit: <strong>{formatNumber(dailyDeficit)} kcal</strong></div>
            )}
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>Άσκηση με λεπτά</h2>
          <div style={helperText}>
            Δίνεις λεπτά και το app υπολογίζει μόνο του τις θερμίδες.
          </div>

          <div style={exerciseGrid}>
            {EXERCISE_LIBRARY.map((exercise) => (
              <div key={exercise.name} style={exercisePresetCard}>
                <div style={exercisePresetName}>{exercise.name}</div>
                <div style={exercisePresetCalories}>
                  {exercise.caloriesPerMinute} kcal / λεπτό
                </div>

                <div style={exercisePresetControls}>
                  <input
                    style={{ ...input, marginBottom: 0 }}
                    type="number"
                    min="1"
                    placeholder="Λεπτά"
                    value={exerciseMinutes[exercise.name] || ""}
                    onChange={(e) =>
                      setExerciseMinutes((prev) => ({
                        ...prev,
                        [exercise.name]: e.target.value
                      }))
                    }
                  />
                  <button
                    style={darkBtn}
                    onClick={() =>
                      addExerciseByMinutes(exercise, exerciseMinutes[exercise.name])
                    }
                  >
                    Προσθήκη
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={smallLabel}>Χειροκίνητη άσκηση με αναλογία</div>
            <input
              style={input}
              placeholder="Όνομα άσκησης"
              value={customExerciseName}
              onChange={(e) => setCustomExerciseName(e.target.value)}
            />
            <div style={grid2}>
              <input
                style={input}
                placeholder="Λεπτά"
                inputMode="numeric"
                value={customExerciseMinutes}
                onChange={(e) => setCustomExerciseMinutes(e.target.value)}
              />
              <input
                style={input}
                placeholder="kcal / λεπτό"
                inputMode="decimal"
                value={customExerciseRate}
                onChange={(e) => setCustomExerciseRate(e.target.value)}
              />
            </div>
            <button style={fullBtn} onClick={addCustomExercise}>
              Προσθήκη custom άσκησης
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={sectionTop}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>Ασκήσεις ημέρας</h3>
              <div style={mealBadge}>+{formatNumber(exerciseValue)} kcal</div>
            </div>

            {exercises.length === 0 ? (
              <div style={emptyState}>Δεν έχεις βάλει άσκηση για αυτή την ημέρα.</div>
            ) : (
              exercises.map((item) => (
                <div key={item.id} style={foodRow}>
                  <div style={{ flex: 1 }}>
                    <div style={foodName}>{item.name}</div>
                    <div style={muted}>
                      {item.minutes} λεπτά · {item.caloriesPerMinute} kcal/λεπτό · +{formatNumber(item.calories)} kcal
                    </div>
                  </div>

                  <button style={deleteBtn} onClick={() => deleteExercise(item.id)}>
                    Χ
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={card}>
          <h2 style={h2}>Macros ημέρας</h2>

          <div style={dashboardGrid}>
            <div style={statBox}>
              <div style={statLabel}>Protein</div>
              <div style={statValue}>{formatNumber(totalProtein)}g</div>
            </div>
            <div style={statBox}>
              <div style={statLabel}>Carbs</div>
              <div style={statValue}>{formatNumber(totalCarbs)}g</div>
            </div>
            <div style={statBox}>
              <div style={statLabel}>Fat</div>
              <div style={statValue}>{formatNumber(totalFat)}g</div>
            </div>
            <div style={statBox}>
              <div style={statLabel}>Calories</div>
              <div style={statValue}>{formatNumber(totalCalories)}</div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={sectionTop}>
            <h2 style={{ ...h2, marginBottom: 0 }}>Αναζήτηση φαγητού</h2>
            {query ? (
              <button
                style={ghostBtn}
                onClick={() => {
                  setQuery("");
                  setApiFoods([]);
                }}
              >
                Καθαρισμός
              </button>
            ) : null}
          </div>

          <input
            style={input}
            placeholder="Γράψε φαγητό"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div style={grid2}>
            <div>
              <div style={smallLabel}>Γραμμάρια</div>
              <input
                style={input}
                type="number"
                min="1"
                value={foodGrams}
                onChange={(e) => setFoodGrams(e.target.value)}
              />
            </div>

            <div>
              <div style={smallLabel}>Γεύμα</div>
              <select
                style={input}
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                {MEALS.map((meal) => (
                  <option key={meal}>{meal}</option>
                ))}
              </select>
            </div>
          </div>

          {apiLoading ? (
            <div style={helperText}>Αναζήτηση στη βάση...</div>
          ) : null}

          {filteredFoods.length === 0 ? (
            <div style={emptyState}>Δεν βρέθηκε φαγητό.</div>
          ) : (
            filteredFoods.map((food) => (
              <div key={`${food.source}-${food.id}`} style={foodRow}>
                <div style={{ flex: 1 }}>
                  <div style={foodName}>
                    {food.name}
                    {food.brand ? ` · ${food.brand}` : ""}
                  </div>
                  <div style={muted}>
                    {food.caloriesPer100g} kcal / 100g · P {food.proteinPer100g || 0} · C {food.carbsPer100g || 0} · F {food.fatPer100g || 0}
                  </div>
                </div>

                <button style={darkBtn} onClick={() => addFood(food)}>
                  Προσθήκη
                </button>
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h2 style={h2}>Νέο φαγητό</h2>

          <div style={helperText}>
            Βάλε macros ανά 100g.
          </div>

          <input
            style={input}
            placeholder="Όνομα"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <input
            style={input}
            placeholder="Θερμίδες / 100g"
            type="number"
            value={newCalories}
            onChange={(e) => setNewCalories(e.target.value)}
          />

          <div style={grid3}>
            <input
              style={input}
              placeholder="Protein / 100g"
              type="number"
              value={newProtein}
              onChange={(e) => setNewProtein(e.target.value)}
            />
            <input
              style={input}
              placeholder="Carbs / 100g"
              type="number"
              value={newCarbs}
              onChange={(e) => setNewCarbs(e.target.value)}
            />
            <input
              style={input}
              placeholder="Fat / 100g"
              type="number"
              value={newFat}
              onChange={(e) => setNewFat(e.target.value)}
            />
          </div>

          <button style={fullBtn} onClick={addCustomFood}>
            Προσθήκη φαγητού
          </button>
        </div>

        <div style={card}>
          <div style={sectionTop}>
            <h2 style={{ ...h2, marginBottom: 0 }}>Ημέρα</h2>
            <button style={clearBtn} onClick={clearAll}>
              Καθαρισμός ημέρας
            </button>
          </div>

          {entries.length === 0 ? (
            <div style={emptyState}>Δεν έχεις προσθέσει κάτι ακόμα για αυτή την ημέρα.</div>
          ) : (
            MEALS.map((meal) => (
              <div key={meal} style={{ marginBottom: 18 }}>
                <div style={mealHeader}>
                  <h3 style={mealTitle}>{meal}</h3>
                  <div style={mealBadge}>
                    {formatNumber(groupedEntries[meal].total)} kcal
                  </div>
                </div>

                {groupedEntries[meal].items.length === 0 ? (
                  <div style={muted}>—</div>
                ) : (
                  groupedEntries[meal].items.map((item) => (
                    <div key={item.id} style={foodRow}>
                      <div style={{ flex: 1 }}>
                        <div style={foodName}>
                          {item.name}
                          {item.brand ? ` · ${item.brand}` : ""}
                        </div>
                        <div style={muted}>
                          {item.grams}g · {item.calories} kcal · P {item.protein} · C {item.carbs} · F {item.fat}
                        </div>
                      </div>

                      <button style={deleteBtn} onClick={() => deleteEntry(item.id)}>
                        Χ
                      </button>
                    </div>
                  ))
                )}
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h2 style={h2}>Τελευταίες 7 ημέρες</h2>

          {last7Days.map((day) => (
            <button
              key={day.date}
              style={{
                ...historyRow,
                border: day.date === selectedDate ? "2px solid #111827" : "1px solid #e5e7eb"
              }}
              onClick={() => setSelectedDate(day.date)}
            >
              <div>
                <div style={historyDate}>{formatDisplayDate(day.date)}</div>
                <div style={muted}>{day.date}</div>
              </div>

              <div style={historyStats}>
                <div style={historyItem}>🍽 {formatNumber(day.eaten)}</div>
                <div style={historyItem}>🏃 +{formatNumber(day.exercise)}</div>
                <div
                  style={{
                    ...historyItem,
                    color: day.remaining >= 0 ? "#166534" : "#b91c1c",
                    fontWeight: 700
                  }}
                >
                  Υπόλ. {formatNumber(day.remaining)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
  padding: 16,
  fontFamily: "Arial, sans-serif"
};

const container = {
  maxWidth: 720,
  margin: "0 auto"
};

const title = {
  marginTop: 0,
  marginBottom: 8,
  fontSize: 30,
  color: "#111827"
};

const subtitle = {
  marginTop: 0,
  color: "#6b7280",
  marginBottom: 0,
  fontSize: 15
};

const heroCard = {
  background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
  borderRadius: 22,
  padding: 18,
  marginBottom: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.16)"
};

const dateToolbar = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 12
};

const navBtn = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  fontSize: 18,
  cursor: "pointer"
};

const heroActions = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 16
};

const todayBtn = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600
};

const todayBtnActive = {
  ...todayBtn,
  background: "white",
  color: "#111827"
};

const dateInput = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  fontSize: 14
};

const heroTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16
};

const heroLabel = {
  fontSize: 14,
  color: "rgba(255,255,255,0.7)",
  marginBottom: 6
};

const heroDate = {
  fontSize: 20,
  fontWeight: 700,
  color: "white"
};

const heroDateSmall = {
  fontSize: 13,
  color: "rgba(255,255,255,0.6)"
};

const heroValue = {
  fontSize: 30,
  fontWeight: "bold",
  lineHeight: 1.1
};

const heroPill = {
  background: "rgba(255,255,255,0.12)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  whiteSpace: "nowrap"
};

const card = {
  background: "white",
  borderRadius: 20,
  padding: 18,
  marginBottom: 16,
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)"
};

const h2 = {
  marginTop: 0,
  fontSize: 22,
  color: "#111827"
};

const input = {
  width: "100%",
  padding: 13,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  marginBottom: 10,
  fontSize: 16,
  background: "white"
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 10
};

const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 12
};

const statBox = {
  background: "#f8fafc",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #eef2f7"
};

const statBoxDark = {
  background: "rgba(255,255,255,0.08)",
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)"
};

const statLabel = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 6
};

const statLabelDark = {
  fontSize: 13,
  color: "rgba(255,255,255,0.7)",
  marginBottom: 6
};

const statValue = {
  fontSize: 22,
  fontWeight: "bold",
  color: "#111827"
};

const statValueDark = {
  fontSize: 22,
  fontWeight: "bold",
  color: "white"
};

const progressOuterDark = {
  width: "100%",
  height: 12,
  background: "rgba(255,255,255,0.15)",
  borderRadius: 999,
  overflow: "hidden"
};

const progressInnerDark = {
  height: "100%",
  background: "#22c55e",
  borderRadius: 999
};

const progressTextDark = {
  marginTop: 8,
  fontSize: 13,
  color: "rgba(255,255,255,0.75)"
};

const infoBox = {
  background: "#f8fafc",
  padding: 14,
  borderRadius: 14,
  marginTop: 8,
  lineHeight: 1.8,
  border: "1px solid #eef2f7"
};

const foodRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 0",
  borderBottom: "1px solid #edf2f7"
};

const foodName = {
  fontWeight: 600,
  color: "#111827"
};

const darkBtn = {
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontWeight: 600
};

const deleteBtn = {
  background: "#b91c1c",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "9px 11px",
  cursor: "pointer",
  fontWeight: 700
};

const fullBtn = {
  width: "100%",
  padding: 13,
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 700
};

const clearBtn = {
  padding: "10px 12px",
  background: "#7f1d1d",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
};

const ghostBtn = {
  padding: "9px 12px",
  background: "#f3f4f6",
  color: "#111827",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600
};

const muted = {
  color: "#6b7280",
  fontSize: 13
};

const smallLabel = {
  fontSize: 14,
  marginBottom: 6,
  color: "#374151"
};

const sectionLabelDark = {
  fontSize: 14,
  marginBottom: 8,
  color: "rgba(255,255,255,0.85)",
  fontWeight: 600
};

const helperText = {
  color: "#6b7280",
  fontSize: 14,
  marginBottom: 12
};

const emptyState = {
  color: "#6b7280",
  fontSize: 14,
  padding: "8px 0"
};

const sectionTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
  flexWrap: "wrap"
};

const mealHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 8
};

const mealTitle = {
  margin: 0,
  fontSize: 18,
  color: "#111827"
};

const mealBadge = {
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
  background: "#f3f4f6",
  padding: "6px 10px",
  borderRadius: 999
};

const historyRow = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  background: "white",
  borderRadius: 14,
  padding: 14,
  marginBottom: 10,
  cursor: "pointer"
};

const historyDate = {
  fontSize: 16,
  fontWeight: 700,
  color: "#111827",
  marginBottom: 4
};

const historyStats = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "flex-end"
};

const historyItem = {
  fontSize: 13,
  color: "#374151"
};

const exerciseGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10
};

const exercisePresetCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc"
};

const exercisePresetName = {
  fontWeight: 700,
  color: "#111827",
  marginBottom: 4,
  fontSize: 14
};

const exercisePresetCalories = {
  color: "#166534",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 10
};

const exercisePresetControls = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center"
};