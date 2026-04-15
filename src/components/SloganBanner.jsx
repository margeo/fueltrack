// Thin horizontal dark strip that carries the FuelTrack slogan.
// Rendered above the primary card of each main tab (Dashboard,
// Food, Exercise, Profile) so the brand tagline is visible
// wherever the user lands, WITHOUT duplicating it in the app
// shell header or on the Welcome screen (which has its own hero).
export default function SloganBanner() {
  return (
    <div
      className="hero-card"
      style={{
        padding: "10px 16px",
        marginBottom: 12,
        textAlign: "center",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0.3,
      }}
    >
      Plan → Track → Achieve!
    </div>
  );
}
