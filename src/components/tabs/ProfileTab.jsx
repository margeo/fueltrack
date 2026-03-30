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

  const appliedDeficit =
    goalType === "lose"
      ? Math.min(Math.max(Number(dailyDeficit || 0), 150), 900)
      : 0;

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