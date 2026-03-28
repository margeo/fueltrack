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