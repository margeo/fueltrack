// src/components/tabs/ProfileTab.jsx
import { useState, useEffect } from "react";
import { calculateAppliedDailyDeficit } from "../../utils/calorieLogic";
import { formatNumber } from "../../utils/helpers";
import { MODE_GROUPS, MODES } from "../../data/modes";

function GoalWarning({ goalType, kilosPerWeek, rawDeficit, isCapped }) {
  if (goalType !== "lose" || kilosPerWeek <= 0) return null;
  let color = "#166534", bg = "#dcfce7", border = "#86efac", icon = "✅", message = "";
  if (kilosPerWeek > 1.5) {
    color = "#b91c1c"; bg = "#fef2f2"; border = "#fecaca"; icon = "⚠️";
    message = `Μη ρεαλιστικός στόχος. Δοκίμασε περισσότερες εβδομάδες ή μικρότερο στόχο.`;
  } else if (kilosPerWeek > 1) {
    color = "#92400e"; bg = "#fffbeb"; border = "#fde68a"; icon = "⚡";
    message = `Επιθετικός αλλά εφικτός ρυθμός (${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδ).`;
  } else {
    message = `Ρεαλιστικός στόχος`;
  }
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "8px 12px", marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div style={{ color, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>{message}</div>
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
  const currentMode = MODES[mode] || MODES.balanced;

  function getActivityLabel() {
    if (activity === "1.2") return "Καθιστική";
    if (activity === "1.4") return "Light";
    if (activity === "1.6") return "Moderate";
    if (activity === "1.8") return "High";
    return "-";
  }

  function getGoalLabel() {
    if (goalType === "lose") return "Lose weight";
    if (goalType === "gain") return "Muscle gain";
    if (goalType === "fitness") return "Fitness & Cardio";
    return "Maintain";
  }

  const rawDeficit = Number(dailyDeficit || 0);
  const appliedDeficit = calculateAppliedDailyDeficit(rawDeficit);
  const kilosNum = Number(targetWeightLoss || 0);
  const weeksNum = Number(weeks || 0);
  const kilosPerWeek = goalType === "lose" && kilosNum > 0 && weeksNum > 0 ? kilosNum / weeksNum : 0;
  const isCapped = goalType === "lose" && rawDeficit > 1000;

  const inputStyle = {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "white"
  };

  return (
    <>
      {/* ΤΑ ΒΑΣΙΚΑ — dark hero card */}
      <div className="day-card">
        <div className="day-card-total">
          <h2>👤 Προφίλ</h2>
        </div>

        {!profileComplete && (
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, border: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "white" }}>Συμπλήρωσε το προφίλ σου</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Βάλε τα βασικά σου στοιχεία για να υπολογιστεί ο ημερήσιος στόχος θερμίδων.</div>
          </div>
        )}

        <div className="grid-2 profile-grid-compact">
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Βάρος (kg)</div>
            <input className="input" placeholder="kg" inputMode="decimal" value={localWeight}
              onChange={(e) => setLocalWeight(e.target.value)} onBlur={() => setWeight(localWeight)}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Ύψος (cm)</div>
            <input className="input" placeholder="cm" inputMode="numeric" value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)} onBlur={() => setHeight(localHeight)}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Ηλικία</div>
            <input className="input" placeholder="Ηλικία" inputMode="numeric" value={localAge}
              onChange={(e) => setLocalAge(e.target.value)} onBlur={() => setAge(localAge)}
              style={inputStyle} />
          </label>
          <label className="profile-field">
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Στόχος</div>
            <select className="input" value={goalType} onChange={(e) => setGoalType(e.target.value)}
              style={inputStyle}>
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Muscle gain</option>
              <option value="fitness">Fitness &amp; Cardio</option>
            </select>
          </label>
        </div>
        <div style={{ fontSize: 12, marginTop: 10, color: "rgba(255,255,255,0.6)" }}>
          Το app προσαρμόζει αυτόματα τις θερμίδες σου
        </div>
      </div>

      {/* Ο ΣΤΟΧΟΣ ΣΟΥ */}
      {showGoalFields && (
        <div style={{ background: "var(--bg-soft)", borderRadius: 16, padding: "16px", marginBottom: 12, border: "1px solid var(--border-soft)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Ο στόχος σου</div>
          <div className="grid-2 profile-grid-compact">
            <label className="profile-field">
              <div className="profile-label">{goalType === "lose" ? "Θέλω να χάσω" : "Θέλω να πάρω"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="input" inputMode="decimal" value={localTargetWeightLoss}
                  onChange={(e) => setLocalTargetWeightLoss(e.target.value)}
                  onBlur={() => setTargetWeightLoss(localTargetWeightLoss)} />
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>κιλά</span>
              </div>
            </label>
            <label className="profile-field">
              <div className="profile-label">Σε</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input className="input" inputMode="numeric" value={localWeeks}
                  onChange={(e) => setLocalWeeks(e.target.value)} onBlur={() => setWeeks(localWeeks)} />
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>εβδομάδες</span>
              </div>
            </label>
          </div>
          <GoalWarning goalType={goalType} kilosPerWeek={kilosPerWeek} rawDeficit={rawDeficit} isCapped={isCapped} />
        </div>
      )}

      {/* ΠΕΡΙΣΣΟΤΕΡΑ */}
      <CollapsibleSection title="Περισσότερα" icon="⚙️">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="profile-field">
            <div className="profile-label">Φύλο</div>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Άνδρας</option>
              <option value="female">Γυναίκα</option>
            </select>
          </label>
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
            <div className="profile-label">Τρόπος διατροφής</div>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODE_GROUPS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.modes.map((modeKey) => {
                    const m = MODES[modeKey];
                    if (!m) return null;
                    return <option key={m.key} value={m.key}>{m.label}</option>;
                  })}
                </optgroup>
              ))}
            </select>
          </label>
          {currentMode.description && (
            <div style={{ background: "var(--bg-card)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", border: "1px solid var(--border-soft)" }}>
              {currentMode.description}
              {currentMode.fastingHours && (
                <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--text-primary)" }}>
                  · Νηστεία {currentMode.fastingHours}ω / Φαγητό {currentMode.eatingWindowHours}ω
                </span>
              )}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ΑΝΑΛΥΣΗ */}
      <CollapsibleSection title="Ανάλυση" icon="📊">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            ["Maintenance / TDEE", `${formatNumber(tdee)} kcal`],
            ["Ημερήσιος στόχος", `${formatNumber(targetCalories)} kcal`],
            ...(goalType === "lose" && appliedDeficit > 0 ? [["Ημερήσιο έλλειμμα", `${formatNumber(appliedDeficit)} kcal`]] : []),
            ...(goalType === "gain" ? [["Ημερήσιο πλεόνασμα", "300 kcal"]] : []),
            ["Στόχος πρωτεΐνης", `${formatNumber(proteinTarget || 0)} g`],
            ["Macro split", `${currentMode.proteinPercent}P / ${currentMode.carbsPercent}C / ${currentMode.fatPercent}F %`],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-soft)" : "none", fontSize: 13 }}>
              <span className="muted">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Σύνοψη</div>
            {[
              ["Στόχος", getGoalLabel()],
              ["Διατροφή", currentMode.label],
              ["Δραστηριότητα", getActivityLabel()],
              ...(goalType === "lose" && kilosPerWeek > 0 ? [["Ρυθμός", `${formatNumber(Math.round(kilosPerWeek * 10) / 10)} kg/εβδομάδα`]] : []),
              ...(currentMode.fastingHours ? [["Eating window", `${currentMode.eatingWindowHours} ώρες`]] : []),
            ].map(([label, value], i, arr) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                <span className="muted">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      <div className="card">
        <div className="action-row">
          <button className="btn btn-dark" onClick={onContinue} disabled={!profileComplete}
            style={{ opacity: profileComplete ? 1 : 0.5, cursor: profileComplete ? "pointer" : "not-allowed" }}>
            Αποθήκευση & συνέχεια
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Privacy Policy
          </a>
        </div>
      </div>
    </>
  );
}