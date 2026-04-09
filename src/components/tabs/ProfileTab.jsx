// src/components/tabs/ProfileTab.jsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { calculateAppliedDailyDeficit, calculateSuggestedExercise } from "../../utils/calorieLogic";
import { formatNumber } from "../../utils/helpers";
import { EXERCISE_LIBRARY } from "../../data/constants";

const ALLERGY_OPTIONS = ["dairy", "gluten", "nuts", "eggs", "soy", "shellfish", "fish"];
const COOKING_LEVELS = ["beginner", "intermediate", "advanced"];
const COOKING_TIMES = ["quick", "normal", "elaborate"];
const MEAL_STRUCTURES = ["3", "5", "2"];
const FOOD_CATEGORIES = [
  { key: "proteins", emoji: "🥩", items: ["chicken", "beef", "pork", "fish", "turkey", "eggs", "legumes", "tofu"] },
  { key: "veggies", emoji: "🥗", items: ["salads", "cooked_veggies", "soups"] },
  { key: "carbs", emoji: "🍚", items: ["rice", "pasta", "bread", "potatoes", "oats"] },
  { key: "dairy", emoji: "🧀", items: ["yogurt", "cheese", "milk"] },
  { key: "snacks", emoji: "🍎", items: ["fruits", "nuts_snack", "smoothies"] },
  { key: "cooking", emoji: "🔥", items: ["grilled", "oven", "boiled", "fried", "raw"] },
];
const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"];
const WORKOUT_LOCATIONS = ["home", "gym", "outdoor"];
const EQUIPMENT_OPTIONS = ["none", "dumbbells", "bands", "full_gym", "pull_up_bar", "kettlebell"];
const WORKOUT_FREQUENCIES = ["2", "3", "4", "5", "6"];
const SESSION_DURATIONS = ["15", "30", "45", "60"];
const FITNESS_GOALS = ["strength", "endurance", "flexibility", "weight_loss", "muscle", "general"];
import { MODE_GROUPS, MODES } from "../../data/modes";
import AdminPanel from "../AdminPanel";
import { supabase } from "../../supabaseClient";

// Unit conversion helpers
const kgToLbs = (kg) => (Number(kg) * 2.20462).toFixed(1);
const lbsToKg = (lbs) => (Number(lbs) / 2.20462).toFixed(1);
const cmToFeetInches = (cm) => {
  const totalInches = Number(cm) / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};
const feetInchesToCm = (feet, inches) => Math.round((Number(feet) * 12 + Number(inches)) * 2.54);

const MODE_GROUP_KEYS = {
  "🥗 Ισορροπημένες": "modeGroups.balanced",
  "🥩 High Protein": "modeGroups.highProtein",
  "🥑 Low Carb / Keto": "modeGroups.lowCarb",
  "⏱️ Fasting": "modeGroups.fasting",
  "🌱 Φυτικές": "modeGroups.plant"
};

function GoalWarning({ goalType, kilosPerWeek, rawDeficit }) {
  const { t } = useTranslation();
  if (goalType !== "lose" || kilosPerWeek <= 0) return null;
  const suggestedExercise = calculateSuggestedExercise(rawDeficit);
  const showExerciseTip = suggestedExercise > 0 && suggestedExercise <= 500;
  let color = "#166534", bg = "#dcfce7", border = "#86efac", icon = "✅", message = "";
  if (kilosPerWeek > 1.5) {
    color = "#b91c1c"; bg = "#fef2f2"; border = "#fecaca"; icon = "⚠️";
    message = t("profile.unrealisticGoal");
  } else if (kilosPerWeek > 1) {
    color = "#92400e"; bg = "#fffbeb"; border = "#fde68a"; icon = "⚡";
    message = t("profile.aggressiveGoal", { rate: formatNumber(Math.round(kilosPerWeek * 10) / 10) });
  } else {
    message = t("profile.realisticGoal");
  }

  // Dynamic exercise example based on calories
  const exerciseExample = suggestedExercise <= 150
    ? t("profile.exerciseExample.light")      // ~20-30 min walking
    : suggestedExercise <= 300
    ? t("profile.exerciseExample.moderate")    // ~30-40 min jogging
    : t("profile.exerciseExample.intense");    // ~40-50 min running

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <div style={{ color, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>{message}</div>
      </div>
      {showExerciseTip && (
        <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 10, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 15 }}>🏃</span>
          <div style={{ color: "#1e40af", fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>
            {t("profile.exerciseSuggestion", { calories: formatNumber(suggestedExercise), example: exerciseExample })}
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "var(--bg-soft)", borderRadius: 16, marginBottom: 12, border: "1px solid var(--border-soft)", overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
          {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{title}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 18, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
      </button>
      {open && <div style={{ padding: "0 16px 16px 16px" }}>{children}</div>}
    </div>
  );
}

export default function ProfileTab({
  age, setAge, gender, setGender,
  height, setHeight, weight, setWeight,
  activity, setActivity, goalType, setGoalType,
  mode, setMode, targetWeightLoss, setTargetWeightLoss,
  weeks, setWeeks, tdee, targetCalories,
  dailyDeficit, proteinTarget, profileComplete,
  userEmail, userName, onShowAuth, onShowRegister,
  foodCategories, setFoodCategories, allergies, setAllergies,
  cookingLevel, setCookingLevel, cookingTime, setCookingTime, simpleMode, setSimpleMode, mealStructure, setMealStructure,
  fitnessLevel, setFitnessLevel, workoutLocation, setWorkoutLocation,
  equipment, setEquipment, limitations, setLimitations,
  workoutFrequency, setWorkoutFrequency, sessionDuration, setSessionDuration,
  fitnessGoals, setFitnessGoals, exerciseCategories, setExerciseCategories
}) {
  const { t, i18n } = useTranslation();
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [units, setUnits] = useState(() => localStorage.getItem("ft_units") || "metric");
  const [expandedPrefs, setExpandedPrefs] = useState({});

  // Check admin status once
  useEffect(() => {
    if (!userEmail) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch("/.netlify/functions/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "list-users" }),
      }).then(res => setIsAdmin(res.ok)).catch(() => {});
    });
  }, [userEmail]);
  const isImperial = units === "imperial";

  const [localAge, setLocalAge] = useState(age);
  const [localWeight, setLocalWeight] = useState(() => isImperial && weight ? kgToLbs(weight) : weight);
  const [localFeet, setLocalFeet] = useState(() => height ? cmToFeetInches(height).feet : "");
  const [localInches, setLocalInches] = useState(() => height ? cmToFeetInches(height).inches : "");
  const [localHeight, setLocalHeight] = useState(height);
  const [localTargetWeightLoss, setLocalTargetWeightLoss] = useState(() => isImperial && targetWeightLoss ? kgToLbs(targetWeightLoss) : targetWeightLoss);
  const [localWeeks, setLocalWeeks] = useState(weeks);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef(null);

  useEffect(() => { setLocalAge(age); }, [age]);
  useEffect(() => {
    setLocalHeight(height);
    if (height) { const fi = cmToFeetInches(height); setLocalFeet(fi.feet); setLocalInches(fi.inches); }
  }, [height]);
  useEffect(() => { setLocalWeight(isImperial && weight ? kgToLbs(weight) : weight); }, [weight, isImperial]);
  useEffect(() => { setLocalTargetWeightLoss(isImperial && targetWeightLoss ? kgToLbs(targetWeightLoss) : targetWeightLoss); }, [targetWeightLoss, isImperial]);
  useEffect(() => { setLocalWeeks(weeks); }, [weeks]);

  function toggleUnits() {
    const next = isImperial ? "metric" : "imperial";
    setUnits(next);
    localStorage.setItem("ft_units", next);
    flashSaved();
  }

  function flashSaved() {
    setShowSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setShowSaved(false), 2000);
  }

  const showGoalFields = goalType === "lose" || goalType === "gain";
  const currentMode = MODES[mode] || MODES.balanced;

  function getActivityLabel() {
    if (activity === "1.2") return t("profile.sedentary");
    if (activity === "1.4") return t("profile.light");
    if (activity === "1.6") return t("profile.moderate");
    if (activity === "1.8") return t("profile.high");
    return "-";
  }

  function getGoalLabel() {
    if (goalType === "lose") return t("goals.loseShort");
    if (goalType === "gain") return t("goals.gainShort");
    if (goalType === "fitness") return t("goals.fitnessShort");
    return t("goals.maintainShort");
  }

  const rawDeficit = Number(dailyDeficit || 0);
  const appliedDeficit = calculateAppliedDailyDeficit(rawDeficit);
  const kilosNum = Number(targetWeightLoss || 0);
  const weeksNum = Number(weeks || 0);
  const kilosPerWeek = goalType === "lose" && kilosNum > 0 && weeksNum > 0 ? kilosNum / weeksNum : 0;
  const isCapped = goalType === "lose" && rawDeficit > 1000;

  const inputStyle = { padding: "10px 12px", fontSize: 13 };

  return (
    <>
      {/* ΤΑ ΒΑΣΙΚΑ — dark hero card */}
      <div className="day-card">
        <div className="day-card-total">
          <h2><span style={{ filter: "sepia(1) saturate(5) hue-rotate(10deg) brightness(1.1)" }}>👤</span> {t("profile.title")}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {showSaved && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-green)", transition: "opacity 0.3s" }}>
                ✓ {t("profile.saved")}
              </span>
            )}
            <button type="button" onClick={toggleUnits}
              className="btn btn-light" style={{ fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap" }}>
              {isImperial ? "lb/ft" : "kg/cm"}
            </button>
          </div>
        </div>

        {!profileComplete && (
          <div style={{ background: "var(--bg-input)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, border: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t("profile.fillProfile")}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("profile.fillProfileDesc")}</div>
          </div>
        )}

        <div className="grid-2 profile-grid-compact">
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{isImperial ? t("profile.weightLbs") : t("profile.weight")}</div>
            <input className="input" placeholder={isImperial ? "lbs" : "kg"} inputMode="decimal" value={localWeight}
              onChange={(e) => setLocalWeight(e.target.value)}
              onBlur={() => { const kg = isImperial ? lbsToKg(localWeight) : localWeight; setWeight(kg); flashSaved(); }}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{isImperial ? t("profile.heightFt") : t("profile.height")}</div>
            {isImperial ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input className="input" placeholder="ft" inputMode="numeric" value={localFeet}
                  onChange={(e) => setLocalFeet(e.target.value)}
                  onBlur={() => { setHeight(feetInchesToCm(localFeet, localInches)); flashSaved(); }}
                  style={{ ...inputStyle, flex: 1 }} />
                <span className="muted" style={{ fontSize: 11 }}>ft</span>
                <input className="input" placeholder="in" inputMode="numeric" value={localInches}
                  onChange={(e) => setLocalInches(e.target.value)}
                  onBlur={() => { setHeight(feetInchesToCm(localFeet, localInches)); flashSaved(); }}
                  style={{ ...inputStyle, flex: 1 }} />
                <span className="muted" style={{ fontSize: 11 }}>in</span>
              </div>
            ) : (
              <input className="input" placeholder="cm" inputMode="numeric" value={localHeight}
                onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => { setHeight(localHeight); flashSaved(); }}
                style={inputStyle} />
            )}
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.age")}</div>
            <input className="input" placeholder={t("profile.age")} inputMode="numeric" value={localAge}
              onChange={(e) => setLocalAge(e.target.value)} onBlur={() => { setAge(localAge); flashSaved(); }}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.gender")}</div>
            <select className="input" style={inputStyle} value={gender} onChange={(e) => { setGender(e.target.value); flashSaved(); }}>
              <option value="male">{t("profile.male")}</option>
              <option value="female">{t("profile.female")}</option>
            </select>
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.goal")}</div>
            <select className="input" style={inputStyle} value={goalType} onChange={(e) => { setGoalType(e.target.value); flashSaved(); }}>
              <option value="lose" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.loseShort")}</option>
              <option value="maintain" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.maintainShort")}</option>
              <option value="gain" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.gainShort")}</option>
              <option value="fitness" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.fitnessShort")}</option>
            </select>
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.activityLevel")}</div>
            <select className="input" style={inputStyle} value={activity} onChange={(e) => { setActivity(e.target.value); flashSaved(); }}>
              <option value="1.2">{t("profile.sedentary")}</option>
              <option value="1.4">{t("profile.light")}</option>
              <option value="1.6">{t("profile.moderate")}</option>
              <option value="1.8">{t("profile.high")}</option>
            </select>
          </label>
          <label className="profile-field" style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.dietMode")}</div>
            <select className="input" style={inputStyle} value={mode} onChange={(e) => { setMode(e.target.value); flashSaved(); }}>
              {MODE_GROUPS.map((group) => (
                <optgroup key={group.group} label={t(MODE_GROUP_KEYS[group.group])}>
                  {group.modes.map((modeKey) => {
                    const m = MODES[modeKey];
                    if (!m) return null;
                    return <option key={m.key} value={m.key}>{t("modeLabels." + m.key)}</option>;
                  })}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        {currentMode.description && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            {t("modeDescriptions." + mode, { defaultValue: "" }) || currentMode.description}
            {currentMode.fastingHours && (
              <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--text-primary)" }}>
                {t("profile.fasting", { fasting: currentMode.fastingHours, eating: currentMode.eatingWindowHours })}
              </span>
            )}
          </div>
        )}
        <div style={{ fontSize: 12, marginTop: 10, color: "var(--text-muted)" }}>
          {t("profile.autoAdjust")}
        </div>
      </div>

      {/* Ο ΣΤΟΧΟΣ ΣΟΥ */}
      {showGoalFields && (
        <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "14px", marginBottom: 12, border: "1px solid var(--border-soft)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{t("profile.yourGoal")}</div>
          <div className="grid-2 profile-grid-compact">
            <label className="profile-field">
              <div className="profile-label">{goalType === "lose" ? t("profile.wantToLose") : t("profile.wantToGain")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="input" inputMode="decimal" value={localTargetWeightLoss}
                  onChange={(e) => setLocalTargetWeightLoss(e.target.value)}
                  onBlur={() => { const kg = isImperial ? lbsToKg(localTargetWeightLoss) : localTargetWeightLoss; setTargetWeightLoss(kg); flashSaved(); }} />
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{isImperial ? "lbs" : t("common.kilos")}</span>
              </div>
            </label>
            <label className="profile-field">
              <div className="profile-label">{t("profile.inWeeks")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="input" inputMode="numeric" value={localWeeks}
                  onChange={(e) => setLocalWeeks(e.target.value)} onBlur={() => { setWeeks(localWeeks); flashSaved(); }} />
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{t("common.weeks")}</span>
              </div>
            </label>
          </div>
          <GoalWarning goalType={goalType} kilosPerWeek={kilosPerWeek} rawDeficit={rawDeficit} isCapped={isCapped} />
        </div>
      )}


      {/* ΑΝΑΛΥΣΗ */}
      <CollapsibleSection title={t("common.analysis")} icon="📊">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            [t("profile.maintenance"), `${formatNumber(tdee)} kcal`],
            [t("profile.dailyTarget"), `${formatNumber(targetCalories)} kcal`],
            ...(goalType === "lose" && appliedDeficit > 0 ? [[t("profile.dailyDeficit"), `${formatNumber(appliedDeficit)} kcal`]] : []),
            ...(goalType === "gain" ? [[t("profile.dailySurplus"), "300 kcal"]] : []),
            [t("profile.proteinTarget"), `${formatNumber(proteinTarget || 0)} g`],
            [t("profile.macroSplit"), `${currentMode.proteinPercent}P / ${currentMode.carbsPercent}C / ${currentMode.fatPercent}F %`],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-soft)" : "none", fontSize: 13 }}>
              <span className="muted">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{t("profile.summaryTitle")}</div>
            {[
              [t("profile.goalLabel"), getGoalLabel()],
              [t("profile.dietLabel"), currentMode.label],
              [t("profile.activityLabel"), getActivityLabel()],
              ...(goalType === "lose" && kilosPerWeek > 0 ? [[t("profile.rateLabel"), `${formatNumber(Math.round(kilosPerWeek * 10) / 10)} ${t("profile.kgPerWeek")}`]] : []),
              ...(currentMode.fastingHours ? [[t("profile.eatingWindow"), `${currentMode.eatingWindowHours} ${t("common.hours")}`]] : []),
            ].map(([label, value], i, arr) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                <span className="muted">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* ΔΙΑΤΡΟΦΙΚΟ ΠΡΟΦΙΛ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>🥗 {t("foodPrefs.title")}</h2>
          <button type="button" onClick={() => {
            const foodKeys = [...FOOD_CATEGORIES.map(c => "food_" + c.key), "allergies", "cooking_prefs"];
            const allOpen = foodKeys.every(k => expandedPrefs[k]);
            setExpandedPrefs(prev => { const next = { ...prev }; foodKeys.forEach(k => { next[k] = !allOpen; }); return next; });
          }} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {FOOD_CATEGORIES.every(c => expandedPrefs["food_" + c.key]) ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>{t("foodPrefs.subtitle")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {FOOD_CATEGORIES.map((cat) => {
            const isOpen = expandedPrefs["food_" + cat.key];
            const selectedCount = cat.items.filter(item => (foodCategories || []).includes(item)).length;
            return (
              <div key={cat.key}>
                <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, ["food_" + cat.key]: !prev["food_" + cat.key] }))}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  <span>{cat.emoji} {t("foodPrefs.cat." + cat.key)}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {selectedCount > 0 && <span style={{ background: "var(--color-accent)", color: "var(--bg-card)", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{selectedCount}</span>}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 4px 4px" }}>
                    {cat.items.map((item) => {
                      const active = (foodCategories || []).includes(item);
                      return (
                        <button key={item} type="button"
                          onClick={() => setFoodCategories(prev => { const list = prev || []; return active ? list.filter(x => x !== item) : [...list, item]; })}
                          style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: active ? "var(--color-accent)" : "var(--bg-soft)", color: active ? "var(--bg-card)" : "var(--text-primary)" }}>
                          {t("foodPrefs.item." + item)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {/* Allergies */}
          {(() => { const isOpen = expandedPrefs.allergies; return (
            <div>
              <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, allergies: !prev.allergies }))}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: allergies.length > 0 ? "#fef2f2" : "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                <span>{t("foodPrefs.allergies")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {allergies.length > 0 && <span style={{ background: "#dc2626", color: "white", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{allergies.length}</span>}
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 4px 4px" }}>
                  {ALLERGY_OPTIONS.map((a) => { const active = allergies.includes(a); return (
                    <button key={a} type="button" onClick={() => setAllergies(prev => active ? prev.filter(x => x !== a) : [...prev, a])}
                      style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: active ? "#dc2626" : "var(--bg-soft)", color: active ? "white" : "var(--text-primary)" }}>
                      {active ? "⚠️ " : ""}{t("foodPrefs.allergy." + a)}
                    </button>
                  ); })}
                </div>
              )}
            </div>
          ); })()}
          {/* Cooking */}
          {(() => { const isOpen = expandedPrefs.cooking_prefs; return (
            <div>
              <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, cooking_prefs: !prev.cooking_prefs }))}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                <span>👨‍🍳 {t("foodPrefs.cookingPrefs")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(cookingLevel || cookingTime) && <span style={{ background: "var(--color-accent)", color: "var(--bg-card)", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>✓</span>}
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: "8px 4px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{t("foodPrefs.cookingLevel")}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {COOKING_LEVELS.map((l) => (
                        <button key={l} type="button" onClick={() => setCookingLevel(cookingLevel === l ? "" : l)}
                          style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: cookingLevel === l ? "var(--color-accent)" : "var(--bg-soft)", color: cookingLevel === l ? "var(--bg-card)" : "var(--text-primary)" }}>
                          {t("foodPrefs.cooking." + l)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{t("foodPrefs.cookingTime")}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {COOKING_TIMES.map((ct) => (
                        <button key={ct} type="button" onClick={() => setCookingTime(cookingTime === ct ? "" : ct)}
                          style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: cookingTime === ct ? "var(--color-accent)" : "var(--bg-soft)", color: cookingTime === ct ? "var(--bg-card)" : "var(--text-primary)" }}>
                          {t("foodPrefs.time." + ct)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{t("foodPrefs.mealsPerDay")}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {MEAL_STRUCTURES.map((ms) => (
                        <button key={ms} type="button" onClick={() => setMealStructure(mealStructure === ms ? "" : ms)}
                          style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: mealStructure === ms ? "var(--color-accent)" : "var(--bg-soft)", color: mealStructure === ms ? "var(--bg-card)" : "var(--text-primary)" }}>
                          {t("foodPrefs.meals." + ms)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ); })()}
          {/* Simple groceries */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>🛒 {t("aiCoach.simpleMode")}</span>
            <button type="button" onClick={() => setSimpleMode(!simpleMode)}
              style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", padding: 2, flexShrink: 0,
                background: simpleMode ? "var(--color-green)" : "var(--border-color)", transition: "background 0.2s" }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: "white",
                transform: simpleMode ? "translateX(16px)" : "translateX(0)", transition: "transform 0.2s" }} />
            </button>
          </div>
        </div>
      </div>

      {/* ΠΡΟΦΙΛ ΓΥΜΝΑΣΤΙΚΗΣ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>💪 {t("exercisePrefs.title")}</h2>
          <button type="button" onClick={() => {
            const exKeys = ["ex_level", "ex_location", "ex_equipment", "ex_schedule", "ex_goals", "ex_cat_Cardio", "ex_cat_Gym", "ex_cat_Training", "ex_cat_Sports", "ex_limitations"];
            const allOpen = exKeys.every(k => expandedPrefs[k]);
            setExpandedPrefs(prev => { const next = { ...prev }; exKeys.forEach(k => { next[k] = !allOpen; }); return next; });
          }} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {["ex_level", "ex_location", "ex_equipment", "ex_schedule", "ex_goals"].every(k => expandedPrefs[k]) ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>{t("exercisePrefs.subtitle")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { key: "level", label: t("exercisePrefs.fitnessLevel"), items: FITNESS_LEVELS, value: fitnessLevel, setter: setFitnessLevel, renderItem: (l) => t("exercisePrefs.level." + l), badge: fitnessLevel ? t("exercisePrefs.level." + fitnessLevel) : null },
            { key: "location", label: "🏠 " + t("exercisePrefs.workoutLocation"), items: WORKOUT_LOCATIONS, value: workoutLocation, setter: setWorkoutLocation, renderItem: (l) => t("exercisePrefs.location." + l), badge: workoutLocation ? t("exercisePrefs.location." + workoutLocation) : null },
          ].map(({ key, label, items, value, setter, renderItem, badge }) => {
            const isOpen = expandedPrefs["ex_" + key];
            return (
              <div key={key}>
                <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, ["ex_" + key]: !prev["ex_" + key] }))}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  <span>{label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {badge && <span style={{ background: "var(--color-accent)", color: "var(--bg-card)", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{badge}</span>}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div style={{ display: "flex", gap: 6, padding: "8px 4px 4px" }}>
                    {items.map((l) => (
                      <button key={l} type="button" onClick={() => setter(value === l ? "" : l)}
                        style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: value === l ? "var(--color-accent)" : "var(--bg-soft)", color: value === l ? "var(--bg-card)" : "var(--text-primary)" }}>
                        {renderItem(l)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* Equipment */}
          {(() => { const isOpen = expandedPrefs.ex_equipment; const count = equipment.length; return (
            <div>
              <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, ex_equipment: !prev.ex_equipment }))}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                <span>🏋️ {t("exercisePrefs.equipment")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {count > 0 && <span style={{ background: "var(--color-accent)", color: "var(--bg-card)", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{count}</span>}
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 4px 4px" }}>
                  {EQUIPMENT_OPTIONS.map((eq) => { const active = equipment.includes(eq); return (
                    <button key={eq} type="button" onClick={() => setEquipment(prev => active ? prev.filter(x => x !== eq) : [...prev, eq])}
                      style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: active ? "var(--color-accent)" : "var(--bg-soft)", color: active ? "var(--bg-card)" : "var(--text-primary)" }}>
                      {t("exercisePrefs.equip." + eq)}
                    </button>
                  ); })}
                </div>
              )}
            </div>
          ); })()}
          {/* Schedule */}
          {(() => { const isOpen = expandedPrefs.ex_schedule; return (
            <div>
              <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, ex_schedule: !prev.ex_schedule }))}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                <span>🗓️ {t("exercisePrefs.schedule")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(workoutFrequency || sessionDuration) && <span style={{ background: "var(--color-accent)", color: "var(--bg-card)", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{workoutFrequency ? workoutFrequency + "x" : ""}{workoutFrequency && sessionDuration ? " · " : ""}{sessionDuration ? sessionDuration + t("exercisePrefs.min") : ""}</span>}
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: "8px 4px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{t("exercisePrefs.frequency")}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {WORKOUT_FREQUENCIES.map((f) => (
                        <button key={f} type="button" onClick={() => setWorkoutFrequency(workoutFrequency === f ? "" : f)}
                          style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: workoutFrequency === f ? "var(--color-accent)" : "var(--bg-soft)", color: workoutFrequency === f ? "var(--bg-card)" : "var(--text-primary)" }}>{f}x</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{t("exercisePrefs.sessionDuration")}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {SESSION_DURATIONS.map((d) => (
                        <button key={d} type="button" onClick={() => setSessionDuration(sessionDuration === d ? "" : d)}
                          style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: sessionDuration === d ? "var(--color-accent)" : "var(--bg-soft)", color: sessionDuration === d ? "var(--bg-card)" : "var(--text-primary)" }}>{d}{t("exercisePrefs.min")}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ); })()}
          {/* Goals */}
          {(() => { const isOpen = expandedPrefs.ex_goals; const count = (fitnessGoals || []).length; return (
            <div>
              <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, ex_goals: !prev.ex_goals }))}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                <span>🎯 {t("exercisePrefs.fitnessGoals")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {count > 0 && <span style={{ background: "var(--color-accent)", color: "var(--bg-card)", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{count}</span>}
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 4px 4px" }}>
                  {FITNESS_GOALS.map((g) => { const active = (fitnessGoals || []).includes(g); return (
                    <button key={g} type="button" onClick={() => setFitnessGoals(prev => { const list = prev || []; return active ? list.filter(x => x !== g) : [...list, g]; })}
                      style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: active ? "var(--color-accent)" : "var(--bg-soft)", color: active ? "var(--bg-card)" : "var(--text-primary)" }}>
                      {t("exercisePrefs.goal." + g)}
                    </button>
                  ); })}
                </div>
              )}
            </div>
          ); })()}
          {/* Exercise categories */}
          {["Cardio", "Gym", "Training", "Sports"].map((cat) => {
            const catKey = "ex_cat_" + cat;
            const isOpen = expandedPrefs[catKey];
            const catExercises = EXERCISE_LIBRARY.filter(e => e.category === cat);
            const selectedCount = catExercises.filter(e => (exerciseCategories || []).includes(e.name)).length;
            const catIcons = { Cardio: "🏃", Gym: "🏋️", Training: "🔥", Sports: "⚽" };
            return (
              <div key={cat}>
                <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  <span>{catIcons[cat]} {t("exercise.categories." + cat.toLowerCase())}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {selectedCount > 0 && <span style={{ background: "var(--color-accent)", color: "var(--bg-card)", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{selectedCount}</span>}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 4px 4px" }}>
                    {catExercises.map((ex) => { const active = (exerciseCategories || []).includes(ex.name); return (
                      <button key={ex.name} type="button"
                        onClick={() => setExerciseCategories(prev => { const list = prev || []; return active ? list.filter(x => x !== ex.name) : [...list, ex.name]; })}
                        style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border-color)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: active ? "var(--color-accent)" : "var(--bg-soft)", color: active ? "var(--bg-card)" : "var(--text-primary)" }}>
                        {ex.icon} {t("exerciseNames." + ex.name, { defaultValue: ex.name })}
                      </button>
                    ); })}
                  </div>
                )}
              </div>
            );
          })}
          {/* Limitations */}
          {(() => { const isOpen = expandedPrefs.ex_limitations; return (
            <div>
              <button type="button" onClick={() => setExpandedPrefs(prev => ({ ...prev, ex_limitations: !prev.ex_limitations }))}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: limitations ? "#fef2f2" : "var(--bg-soft)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                <span>🩹 {t("exercisePrefs.limitations")}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {limitations && <span style={{ background: "#dc2626", color: "white", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>!</span>}
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {isOpen && (
                <div style={{ padding: "8px 4px 4px" }}>
                  <input className="input" value={limitations} onChange={(e) => setLimitations(e.target.value)}
                    placeholder={t("exercisePrefs.limitationsPlaceholder")} style={{ fontSize: 13, ...inputStyle }} />
                </div>
              )}
            </div>
          ); })()}
        </div>
      </div>

      {/* ΓΛΩΣΣΑ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{t("profile.language")}</span>
          <select className="input" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)} style={{ width: "auto" }}>
            <option value="el">Ελληνικά</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* ACCOUNT */}
      {userEmail ? (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
          {userName && <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{userName}</div>}
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{userEmail}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-light" onClick={() => supabase.auth.signOut()} type="button"
              style={{ fontSize: 13, padding: "10px 24px" }}>
              {t("auth.logout")}
            </button>
            {isAdmin && (
              <button className="btn btn-dark" onClick={() => setShowAdmin(true)} type="button"
                style={{ fontSize: 13, padding: "10px 24px" }}>
                🛡️ Admin
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>{t("profile.loginHint")}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-dark" onClick={onShowAuth} type="button"
              style={{ fontSize: 13, padding: "10px 24px" }}>
              {t("auth.loginBtn")}
            </button>
            <button className="btn btn-light" onClick={onShowRegister} type="button"
              style={{ fontSize: 13, padding: "10px 24px" }}>
              {t("auth.registerBtn")}
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 4, marginBottom: 16 }}>
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--text-muted)", fontSize: 12 }}>
          {t("common.privacyPolicy")}
        </a>
      </div>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} adminEmail={userEmail} />}
    </>
  );
}
