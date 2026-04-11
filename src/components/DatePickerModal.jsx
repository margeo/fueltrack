import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getTodayKey } from "../utils/helpers";

function pad(n) { return String(n).padStart(2, "0"); }
function formatDateKey(year, month, day) { return `${year}-${pad(month + 1)}-${pad(day)}`; }

export default function DatePickerModal({ selectedDate, onSelect, onClose }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const today = getTodayKey();

  const [view, setView] = useState(() => {
    const base = selectedDate || today;
    const [y, m] = base.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const todayParts = today.split("-").map(Number);
  const isAtCurrentMonth = view.year === todayParts[0] && view.month === todayParts[1] - 1;

  const firstDayOfMonth = new Date(view.year, view.month, 1).getDay();
  const firstDayMon = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const weekdayLabels = isEn
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"];

  const monthNames = isEn
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];

  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  }
  function nextMonth() {
    if (isAtCurrentMonth) return;
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  }

  const cells = [];
  for (let i = 0; i < firstDayMon; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateKey(view.year, view.month, day);
    cells.push({
      day,
      dateStr,
      isFuture: dateStr > today,
      isSelected: dateStr === selectedDate,
      isToday: dateStr === today
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  function handleSelect(cell) {
    if (!cell || cell.isFuture) return;
    onSelect(cell.dateStr);
    onClose();
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ position: "relative", background: "var(--bg-card)", color: "var(--text-primary)", borderRadius: 20, padding: 18, width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button type="button" onClick={prevMonth} aria-label="Previous month"
            style={{ background: "var(--bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "var(--text-primary)" }}>
            ‹
          </button>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            {monthNames[view.month]} {view.year}
          </div>
          <button type="button" onClick={nextMonth} disabled={isAtCurrentMonth} aria-label="Next month"
            style={{ background: "var(--bg-soft)", border: "1px solid var(--border-soft)", borderRadius: 10, width: 36, height: 36, cursor: isAtCurrentMonth ? "not-allowed" : "pointer", fontSize: 18, color: "var(--text-primary)", opacity: isAtCurrentMonth ? 0.3 : 1 }}>
            ›
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {weekdayLabels.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const bg = cell.isSelected ? "var(--color-accent)" : cell.isToday ? "var(--bg-soft)" : "transparent";
            const color = cell.isSelected ? "var(--bg-card)" : cell.isFuture ? "var(--text-muted)" : "var(--text-primary)";
            const border = cell.isToday && !cell.isSelected ? "1px solid var(--color-accent)" : "1px solid transparent";
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(cell)}
                disabled={cell.isFuture}
                style={{
                  aspectRatio: "1",
                  background: bg,
                  color,
                  border,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: cell.isSelected || cell.isToday ? 700 : 500,
                  cursor: cell.isFuture ? "not-allowed" : "pointer",
                  opacity: cell.isFuture ? 0.3 : 1,
                  padding: 0
                }}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button type="button" onClick={() => { onSelect(today); onClose(); }}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-soft)", background: "var(--bg-soft)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {isEn ? "Today" : "Σήμερα"}
          </button>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-soft)", background: "transparent", color: "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {isEn ? "Cancel" : "Άκυρο"}
          </button>
        </div>
      </div>
    </div>
  );
}
