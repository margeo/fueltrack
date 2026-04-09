import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatNumber } from "../utils/helpers";

export default function GoogleFitButton({ selectedDate, onAddExercise }) {
  const { t } = useTranslation();
  const [token, setToken] = useState(() => localStorage.getItem("ft_gfit_token") || "");
  const [fitData, setFitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fitToken = params.get("fit_token");
    const fitRefresh = params.get("fit_refresh");
    const fitError = params.get("fit_error");

    if (fitToken) {
      localStorage.setItem("ft_gfit_token", fitToken);
      if (fitRefresh) localStorage.setItem("ft_gfit_refresh", fitRefresh);
      setToken(fitToken);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (fitError) {
      setError(t("googleFit.connectError"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (token && selectedDate) fetchFitData();
  }, [token, selectedDate]);

  async function fetchFitData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/.netlify/functions/google-fit-data?token=${encodeURIComponent(token)}&date=${selectedDate}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFitData(data);
    } catch {
      setError(t("googleFit.loadError"));
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    window.location.href = "/.netlify/functions/google-fit-auth";
  }

  function handleDisconnect() {
    localStorage.removeItem("ft_gfit_token");
    localStorage.removeItem("ft_gfit_refresh");
    setToken("");
    setFitData(null);
  }

  function handleAddToLog() {
    if (!fitData || !fitData.calories) return;
    onAddExercise({
      id: Date.now() + Math.random(),
      name: `Google Fit — ${fitData.steps ? fitData.steps.toLocaleString("el-GR") + ` ${t("googleFit.steps")}` : ""} ${fitData.distanceKm ? fitData.distanceKm + " km" : ""}`.trim(),
      minutes: 0,
      caloriesPerMinute: 0,
      calories: fitData.calories
    });
  }

  if (!token) {
    return (
      <button
        className="btn btn-dark"
        onClick={handleConnect}
        type="button"
        style={{ fontSize: 13, padding: "8px 0", width: 90, textAlign: "center" }}
      >
        🏃 Google Fit
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12, background: "var(--bg-soft)", borderRadius: 12, padding: 14, border: "1px solid var(--border-soft)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>🏃 {t("googleFit.title")}</span>
        <button className="btn btn-light" onClick={handleDisconnect} type="button" style={{ fontSize: 12, padding: "4px 10px" }}>
          {t("googleFit.disconnect")}
        </button>
      </div>

      {loading && <div className="muted" style={{ fontSize: 13 }}>{t("googleFit.loading")}</div>}
      {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}

      {fitData && !loading && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{formatNumber(fitData.steps)}</div>
              <div className="muted" style={{ fontSize: 12 }}>{t("googleFit.steps")}</div>
            </div>
            <div style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{fitData.distanceKm}</div>
              <div className="muted" style={{ fontSize: 12 }}>km</div>
            </div>
            <div style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{formatNumber(fitData.calories)}</div>
              <div className="muted" style={{ fontSize: 12 }}>kcal</div>
            </div>
          </div>

          {fitData.calories > 0 && (
            <button className="btn btn-dark" onClick={handleAddToLog} type="button" style={{ width: "100%", fontSize: 13 }}>
              {t("googleFit.addToLog", { calories: formatNumber(fitData.calories) })}
            </button>
          )}

          <button className="btn btn-light" onClick={fetchFitData} type="button" style={{ width: "100%", marginTop: 8, fontSize: 12 }}>
            🔄 {t("googleFit.refresh")}
          </button>
        </>
      )}
    </div>
  );
}
