import { useMemo, useState } from "react";
import { formatDisplayDate, formatNumber } from "../../utils/helpers";

export default function WeightTab({ weightLog, onAddWeight, onDeleteWeight }) {
  const [inputWeight, setInputWeight] = useState("");
  const [inputDate, setInputDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const sortedLog = useMemo(() => {
    return [...(weightLog || [])].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [weightLog]);

  const chartData = useMemo(() => {
    return [...(weightLog || [])]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [weightLog]);

  const firstWeight = chartData[0]?.weight;
  const lastWeight = chartData[chartData.length - 1]?.weight;
  const diff = firstWeight && lastWeight ? lastWeight - firstWeight : null;

  function handleAdd() {
    const w = parseFloat(inputWeight);
    if (!w || w <= 0) return;
    onAddWeight({ date: inputDate, weight: w });
    setInputWeight("");
  }

  const minW = Math.min(...chartData.map((d) => d.weight)) - 1;
  const maxW = Math.max(...chartData.map((d) => d.weight)) + 1;
  const range = maxW - minW || 1;
  const chartH = 160;
  const chartW = 300;

  return (
    <>
      <div className="card">
        <h2>Καταγραφή βάρους</h2>

        <div className="soft-box">
          <div className="grid-2">
            <label className="profile-field">
              <div className="profile-label">Βάρος (kg)</div>
              <input
                className="input"
                type="number"
                step="0.1"
                placeholder="π.χ. 82.5"
                inputMode="decimal"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
              />
            </label>

            <label className="profile-field">
              <div className="profile-label">Ημερομηνία</div>
              <input
                className="input"
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
              />
            </label>
          </div>

          <div className="action-row" style={{ marginTop: 12 }}>
            <button className="btn btn-dark" onClick={handleAdd} type="button">
              Αποθήκευση
            </button>
          </div>
        </div>
      </div>

      {chartData.length >= 2 && (
        <div className="card">
          <h2>Πρόοδος βάρους</h2>

          <div className="soft-box" style={{ overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${chartW} ${chartH + 20}`}
              style={{ width: "100%", maxWidth: chartW }}
            >
              {chartData.map((point, i) => {
                const x = (i / (chartData.length - 1)) * (chartW - 20) + 10;
                const y =
                  chartH - ((point.weight - minW) / range) * (chartH - 20) + 10;
                const next = chartData[i + 1];
                const nx = next
                  ? ((i + 1) / (chartData.length - 1)) * (chartW - 20) + 10
                  : null;
                const ny = next
                  ? chartH - ((next.weight - minW) / range) * (chartH - 20) + 10
                  : null;

                return (
                  <g key={point.date}>
                    {next && (
                      <line
                        x1={x} y1={y} x2={nx} y2={ny}
                        stroke="var(--color-accent, #111)"
                        strokeWidth="2"
                      />
                    )}
                    <circle cx={x} cy={y} r="4" fill="var(--color-accent, #111)" />
                    <text
                      x={x} y={chartH + 18}
                      textAnchor="middle"
                      fontSize="8"
                      fill="var(--color-muted, #888)"
                    >
                      {point.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {diff !== null && (
            <div className="soft-box" style={{ marginTop: 10 }}>
              <span className="muted">Αλλαγή (30 μέρες): </span>
              <strong style={{ color: diff <= 0 ? "green" : "red" }}>
                {diff > 0 ? "+" : ""}{formatNumber(Math.round(diff * 10) / 10)} kg
              </strong>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2>Ιστορικό</h2>

        {sortedLog.length === 0 ? (
          <div className="soft-box">
            <div className="muted">Δεν έχεις καταγράψει βάρος ακόμα.</div>
          </div>
        ) : (
          <div className="stack-10">
            {sortedLog.map((entry) => (
              <div key={entry.date} className="food-entry-card">
                <div className="food-entry-main">
                  <div className="food-entry-title">{formatDisplayDate(entry.date)}</div>
                  <div className="muted">{entry.date}</div>
                </div>
                <div className="food-entry-actions">
                  <div style={{ fontWeight: 700 }}>{entry.weight} kg</div>
                  <button
                    className="btn btn-light"
                    onClick={() => onDeleteWeight(entry.date)}
                    type="button"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}