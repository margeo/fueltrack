import { useTranslation } from "react-i18next";
import { MEALS, MEAL_KEYS } from "../data/constants";
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
  const { t } = useTranslation();
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
        <h3>{t("editEntry.title")}</h3>

        <div className="muted" style={{ marginBottom: 12 }}>
          {entry.name}
          {entry.brand ? ` · ${entry.brand}` : ""}
        </div>

        <div className="grid-2">
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              {t("editEntry.grams")}
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
              {t("editEntry.meal")}
            </div>
            <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {MEALS.map((item) => (
                <option key={item} value={item}>{t(MEAL_KEYS[item])}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 10 }}>
          <div className="soft-box">
            <div className="muted">{t("editEntry.calories")}</div>
            <div>{formatNumber(preview.calories)}</div>
          </div>
          <div className="soft-box">
            <div className="muted">{t("common.protein")}</div>
            <div>{formatNumber(preview.protein)}g</div>
          </div>
          <div className="soft-box">
            <div className="muted">{t("common.carbs")}</div>
            <div>{formatNumber(preview.carbs)}g</div>
          </div>
          <div className="soft-box">
            <div className="muted">{t("common.fat")}</div>
            <div>{formatNumber(preview.fat)}g</div>
          </div>
        </div>

        <div className="action-row" style={{ marginTop: 14 }}>
          <button className="btn btn-light" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-dark" onClick={onSave}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
