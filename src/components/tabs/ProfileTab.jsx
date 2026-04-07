// src/components/tabs/ProfileTab.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { calculateAppliedDailyDeficit, calculateSuggestedExercise } from "../../utils/calorieLogic";
import { formatNumber } from "../../utils/helpers";
import { MODE_GROUPS, MODES } from "../../data/modes";

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
  dailyDeficit, proteinTarget, profileComplete, onContinue,
  onLogout, userEmail, userName, onShowAuth, onShowRegister
}) {
  const { t, i18n } = useTranslation();
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

  const inputStyle = {};

  return (
    <>
      {/* ΤΑ ΒΑΣΙΚΑ — dark hero card */}
      <div className="day-card">
        <div className="day-card-total">
          <h2>{`👤 ${t("profile.title")}`}</h2>
        </div>

        {!profileComplete && (
          <div style={{ background: "var(--bg-input)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, border: "1px solid var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t("profile.fillProfile")}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("profile.fillProfileDesc")}</div>
          </div>
        )}

        <div className="grid-2 profile-grid-compact">
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.weight")}</div>
            <input className="input" placeholder="kg" inputMode="decimal" value={localWeight}
              onChange={(e) => setLocalWeight(e.target.value)} onBlur={() => setWeight(localWeight)}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.height")}</div>
            <input className="input" placeholder="cm" inputMode="numeric" value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => setHeight(localHeight)}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.age")}</div>
            <input className="input" placeholder={t("profile.age")} inputMode="numeric" value={localAge}
              onChange={(e) => setLocalAge(e.target.value)} onBlur={() => setAge(localAge)}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("profile.goal")}</div>
            <select className="input" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
              <option value="lose" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.loseShort")}</option>
              <option value="maintain" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.maintainShort")}</option>
              <option value="gain" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.gainShort")}</option>
              <option value="fitness" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>{t("goals.fitnessShort")}</option>
            </select>
          </label>
        </div>
        <div style={{ fontSize: 12, marginTop: 10, color: "var(--text-muted)" }}>
          {t("profile.autoAdjust")}
        </div>
      </div>

      {/* Ο ΣΤΟΧΟΣ ΣΟΥ */}
      {showGoalFields && (
        <div style={{ background: "var(--bg-soft)", borderRadius: 16, padding: "16px", marginBottom: 12, border: "1px solid var(--border-soft)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{t("profile.yourGoal")}</div>
          <div className="grid-2 profile-grid-compact">
            <label className="profile-field">
              <div className="profile-label">{goalType === "lose" ? t("profile.wantToLose") : t("profile.wantToGain")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="input" inputMode="decimal" value={localTargetWeightLoss}
                  onChange={(e) => setLocalTargetWeightLoss(e.target.value)}
                  onBlur={() => setTargetWeightLoss(localTargetWeightLoss)} />
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{t("common.kilos")}</span>
              </div>
            </label>
            <label className="profile-field">
              <div className="profile-label">{t("profile.inWeeks")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="input" inputMode="numeric" value={localWeeks}
                  onChange={(e) => setLocalWeeks(e.target.value)} onBlur={() => setWeeks(localWeeks)} />
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{t("common.weeks")}</span>
              </div>
            </label>
          </div>
          <GoalWarning goalType={goalType} kilosPerWeek={kilosPerWeek} rawDeficit={rawDeficit} isCapped={isCapped} />
        </div>
      )}

      {/* ΠΕΡΙΣΣΟΤΕΡΑ */}
      <CollapsibleSection title={t("common.more")} icon="⚙️">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="profile-field">
            <div className="profile-label">{t("profile.gender")}</div>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">{t("profile.male")}</option>
              <option value="female">{t("profile.female")}</option>
            </select>
          </label>
          <label className="profile-field">
            <div className="profile-label">{t("profile.activityLevel")}</div>
            <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
              <option value="1.2">{t("profile.sedentary")}</option>
              <option value="1.4">{t("profile.light")}</option>
              <option value="1.6">{t("profile.moderate")}</option>
              <option value="1.8">{t("profile.high")}</option>
            </select>
          </label>
          <label className="profile-field">
            <div className="profile-label">{t("profile.dietMode")}</div>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
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
          {currentMode.description && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border-soft)" }}>
              {t("modeDescriptions." + mode, { defaultValue: "" }) || currentMode.description}
              {currentMode.fastingHours && (
                <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--text-primary)" }}>
                  {t("profile.fasting", { fasting: currentMode.fastingHours, eating: currentMode.eatingWindowHours })}
                </span>
              )}
            </div>
          )}
        </div>
      </CollapsibleSection>

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
          <button className="btn btn-light" onClick={onLogout} type="button"
            style={{ fontSize: 13, padding: "10px 24px" }}>
            {t("auth.logout")}
          </button>
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
    </>
  );
}
