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
  onContinue
}) {
  const showGoalFields = goalType === "lose" || goalType === "gain";

  return (
    <div className="card">
      <h2>Profile</h2>

      {!profileComplete && (
        <div className="soft-box" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Συμπλήρωσε πρώτα το προφίλ σου</div>
          <div className="muted">
            Μόλις βάλεις τα βασικά στοιχεία σου, το app θα υπολογίσει σωστά στόχο θερμίδων και
            πρωτεΐνης.
          </div>
        </div>
      )}

      <div className="grid-2">
        <input
          className="input"
          placeholder="Ηλικία"
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
        <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="male">Άνδρας</option>
          <option value="female">Γυναίκα</option>
        </select>
      </div>

      <div className="grid-2">
        <input
          className="input"
          placeholder="Ύψος (cm)"
          inputMode="numeric"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
        <input
          className="input"
          placeholder="Βάρος (kg)"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>

      <div className="stack-10">
        <div>
          <div className="muted" style={{ marginBottom: 6 }}>
            Activity level
          </div>
          <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="1.2">Καθιστική</option>
            <option value="1.4">Light</option>
            <option value="1.6">Moderate</option>
            <option value="1.8">High</option>
          </select>
        </div>

        <div>
          <div className="muted" style={{ marginBottom: 6 }}>
            Στόχος
          </div>
          <select className="input" value={goalType} onChange={(e) => setGoalType(e.target.value)}>
            <option value="lose">Lose weight</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Muscle gain</option>
          </select>
        </div>
      </div>

      {showGoalFields && (
        <div className="grid-2">
          <input
            className="input"
            placeholder={goalType === "lose" ? "Κιλά να χάσω" : "Κιλά να πάρω"}
            inputMode="decimal"
            value={targetWeightLoss}
            onChange={(e) => setTargetWeightLoss(e.target.value)}
          />
          <input
            className="input"
            placeholder="Σε πόσες εβδομάδες"
            inputMode="numeric"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
          />
        </div>
      )}

      <div className="soft-box">
        <div>
          BMR: <strong>{formatNumber(bmr)} kcal</strong>
        </div>
        <div>
          Maintenance: <strong>{formatNumber(tdee)} kcal</strong>
        </div>
        <div>
          Target: <strong>{formatNumber(targetCalories)} kcal</strong>
        </div>

        {goalType === "lose" && dailyDeficit > 0 && (
          <div>
            Ημερήσιο deficit: <strong>{formatNumber(dailyDeficit)} kcal</strong>
          </div>
        )}

        {goalType === "gain" && (
          <div>
            Ημερήσιο surplus: <strong>300 kcal</strong>
          </div>
        )}

        <div>
          Protein target: <strong>{formatNumber(proteinTarget || 0)} g</strong>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 12 }}>
        {goalType === "lose" &&
          "Στόχος: να τρως κάτω από το TDEE σου με ελεγχόμενο ημερήσιο έλλειμμα θερμίδων."}

        {goalType === "maintain" &&
          "Στόχος: να διατηρείς περίπου το βάρος σου, με ημερήσιο στόχο κοντά στο TDEE σου."}

        {goalType === "gain" &&
          "Στόχος: να υποστηρίζεις μυϊκή ανάπτυξη με περίπου 300 kcal πάνω από το TDEE σου και αυξημένη πρωτεΐνη."}
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