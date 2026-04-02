export default function WelcomeScreen({ onStart }) {
  return (
    <div style={{ padding: "8px 0" }}>
      {/* HERO */}
      <div className="hero-card" style={{ marginBottom: 16, textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🥗💪</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "white", marginBottom: 8, lineHeight: 1.2 }}>
          Ο προσωπικός σου διατροφολόγος & γυμναστής
        </div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6 }}>
          Πες μου τον στόχο σου και εγώ αναλαμβάνω — τι να φας, τι άσκηση να κάνεις, πώς να φτάσεις εκεί που θέλεις.
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🎯</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Goal-first προσέγγιση</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Επιλέγεις στόχο — χάσιμο βάρους, μυϊκή μάζα ή διατήρηση — και το app προσαρμόζει αυτόματα θερμίδες, macros και προτάσεις.
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>AI Coach που σε ξέρει</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Ρώτα τον coach τι να φας τώρα, τι γυμναστική να κάνεις, ή ζήτα ολόκληρο meal plan για την ημέρα — βασισμένο στα γούστα σου.
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🇬🇷</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ελληνικά φαγητά & μερίδες</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Σουβλάκι, φέτα, χωριάτικη, τοστ — όχι cups και ounces. Βάλε "2 μεσαία αυγά" και υπολογίζουμε αυτόματα.
            </div>
          </div>
        </div>

        <div className="card" style={{ margin: 0, display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Γρήγορο & απλό</div>
            <div className="muted" style={{ lineHeight: 1.5 }}>
              Instant search, portions με 1 tap, barcode scanner και photo analysis. Χωρίς περιττά clicks.
            </div>
          </div>
        </div>
      </div>

      {/* FORMULA */}
      <div className="card" style={{ margin: "0 0 16px", background: "var(--bg-soft)", textAlign: "center" }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Η λογική μας είναι απλή:</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Υπόλοιπο = Στόχος − Φαγητό + Άσκηση
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Όσο πιο πράσινο, τόσο καλύτερα πας.
        </div>
      </div>

      <button className="btn btn-dark" onClick={onStart} style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 800, borderRadius: 16 }}>
        Ξεκίνα →
      </button>

      <div className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
        Διαρκεί λιγότερο από 2 λεπτά
      </div>
    </div>
  );
}