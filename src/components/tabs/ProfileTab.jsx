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

      {/* ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ */}
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

      {/* ΣΤΟΙΧΕΙΑ ΣΤΟΧΟΥ */}
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
        <button className="btn btn-dark" onClick={onContinue} disabled={!profileComplete}
          style={{ opacity: profileComplete ? 1 : 0.5, cursor: profileComplete ? "pointer" : "not-allowed" }}>
          Αποθήκευση & συνέχεια
        </button>
      </div>
    </div>
  );
}