import { MEALS } from "../../data/constants";
import { formatNumber } from "../../utils/helpers";

export default function DayTab({ entries, groupedEntries, clearAll, deleteEntry, openEditEntry }) {
  return (
    <div className="card">
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Ημέρα</h2>
        <button className="btn btn-danger" onClick={clearAll}>
          Καθαρισμός ημέρας
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="muted">Δεν έχεις προσθέσει κάτι ακόμα για αυτή την ημέρα.</div>
      ) : (
        MEALS.map((meal) => (
          <div key={meal} style={{ marginBottom: 18 }}>
            <div className="row wrap" style={{ marginBottom: 8 }}>
              <div>
                <h3 style={{ margin: 0 }}>{meal}</h3>
                <div className="muted">
                  P {formatNumber(groupedEntries[meal].totalProtein)}g · C{" "}
                  {formatNumber(groupedEntries[meal].totalCarbs)}g · F{" "}
                  {formatNumber(groupedEntries[meal].totalFat)}g
                </div>
              </div>

              <div className="soft-box" style={{ padding: "8px 12px" }}>
                {formatNumber(groupedEntries[meal].totalCalories)} kcal
              </div>
            </div>

            {groupedEntries[meal].items.length === 0 ? (
              <div className="muted">—</div>
            ) : (
              groupedEntries[meal].items.map((item) => (
                <div key={item.id} className="food-list-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {item.name}
                      {item.brand ? ` · ${item.brand}` : ""}
                    </div>
                    <div className="muted">
                      {item.grams}g · {item.calories} kcal · P {item.protein} · C {item.carbs} · F{" "}
                      {item.fat}
                    </div>
                  </div>

                  <div className="action-row">
                    <button className="btn btn-edit" onClick={() => openEditEntry(item)}>
                      ✎
                    </button>
                    <button className="btn btn-danger" onClick={() => deleteEntry(item.id)}>
                      Χ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
}