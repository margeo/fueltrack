export default function WelcomeScreen({ onStart }) {
  return (
    <div className="card">
      <div className="soft-box" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          Welcome to FuelTrack
        </div>
        <div className="muted" style={{ lineHeight: 1.6 }}>
          Ρύθμισε πρώτα το προφίλ σου για να υπολογιστούν σωστά οι θερμίδες,
          η πρωτεΐνη και η καθημερινή σου πρόοδος.
        </div>
      </div>

      <div className="stack-10">
        <div className="soft-box">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Τι θα κάνεις εδώ</div>
          <div className="muted">• Θα βάλεις τα βασικά στοιχεία σου</div>
          <div className="muted">• Θα επιλέξεις τον στόχο σου</div>
          <div className="muted">• Θα παρακολουθείς φαγητό, άσκηση και macros</div>
        </div>
      </div>

      <div className="action-row" style={{ marginTop: 18 }}>
        <button className="btn btn-dark" onClick={onStart}>
          Ξεκίνα το προφίλ σου
        </button>
      </div>
    </div>
  );
}