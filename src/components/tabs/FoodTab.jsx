// src/components/tabs/FoodTab.jsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MEALS, MEAL_KEYS } from "../../data/constants";
import { createFoodEntry, formatNumber, normalizeFood, stripDiacritics } from "../../utils/helpers";
import { apiUrl } from "../../utils/apiBase";
import useFoodSearch from "../../hooks/useFoodSearch";
import BarcodeScanner from "../BarcodeScanner";
import FoodPhotoAnalyzer from "../FoodPhotoAnalyzer";

function getFoodSearchScore(food, query) {
  const q = stripDiacritics(String(query || "")).toLowerCase().trim();
  if (!q) return 0;
  const name = stripDiacritics(String(food.name || "")).toLowerCase();
  const brand = stripDiacritics(String(food.brand || "")).toLowerCase();
  const combined = `${name} ${brand}`.trim();
  let score = 0;
  if (name === q) score += 120;
  if (combined === q) score += 110;
  if (name.startsWith(q)) score += 80;
  if (brand.startsWith(q)) score += 35;
  if (name.includes(q)) score += 45;
  if (combined.includes(q)) score += 20;
  if (food.source === "local") score += 25;
  if (food.source === "usda") score += 10;
  if (food.source === "off") score += 8;
  const protein = Number(food.proteinPer100g || 0);
  const calories = Number(food.caloriesPer100g || 0);
  if (protein > 0) score += Math.min(protein, 30) * 0.1;
  if (calories > 0 && calories < 700) score += 2;
  return score;
}

const FILTER_DEFS = [
  { key: "all", labelKey: "common.all" },
  { key: "high_protein", labelKey: "food.highProtein", icon: "💪", check: (f) => Number(f.proteinPer100g || 0) >= 15 },
  { key: "low_carb", labelKey: "food.lowCarb", icon: "🥑", check: (f) => Number(f.carbsPer100g || 0) <= 15 },
  { key: "low_cal", labelKey: "food.lowCal", icon: "🥗", check: (f) => Number(f.caloriesPer100g || 0) <= 200 },
  { key: "keto", labelKey: "food.keto", icon: "⚡", check: (f) => Number(f.carbsPer100g || 0) <= 8 },
];

function FoodAddModal({ food, onAdd, onClose }) {
  const { t } = useTranslation();
  const hasPotions = Array.isArray(food.portions) && food.portions.length > 0;
  const [mode, setMode] = useState(hasPotions ? "portion" : "grams");
  const [selectedPortion, setSelectedPortion] = useState(0);
  const [portionQty, setPortionQty] = useState("1");
  const [grams, setGrams] = useState(String(food.estimatedGrams || 100));
  const [meal, setMeal] = useState(MEALS[0]);

  const effectiveGrams = useMemo(() => {
    if (mode === "portion" && hasPotions) {
      const portion = food.portions[selectedPortion];
      const qty = Math.max(parseFloat(portionQty) || 1, 0.5);
      return Math.round(portion.grams * qty);
    }
    return Math.max(Number(grams) || 100, 1);
  }, [mode, selectedPortion, portionQty, grams, food.portions, hasPotions]);

  const calories = Math.round((food.caloriesPer100g || 0) * effectiveGrams / 100);
  const protein = Math.round((food.proteinPer100g || 0) * effectiveGrams / 100 * 10) / 10;
  const carbs = Math.round((food.carbsPer100g || 0) * effectiveGrams / 100 * 10) / 10;
  const fat = Math.round((food.fatPer100g || 0) * effectiveGrams / 100 * 10) / 10;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--bg-card)", borderRadius: 20, padding: 20, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-modal)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{food.name}</div>
        {food.brand && <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{food.brand}</div>}

        {hasPotions && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <button onClick={() => setMode("portion")} type="button"
              style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mode === "portion" ? "var(--color-accent)" : "var(--bg-soft)", color: mode === "portion" ? "var(--bg-card)" : "var(--text-muted)" }}>
              🥣 {t("food.portion")}
            </button>
            <button onClick={() => setMode("grams")} type="button"
              style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: mode === "grams" ? "var(--color-accent)" : "var(--bg-soft)", color: mode === "grams" ? "var(--bg-card)" : "var(--text-muted)" }}>
              ⚖️ {t("common.grams")}
            </button>
          </div>
        )}

        {mode === "portion" && hasPotions && (
          <div style={{ marginBottom: 14 }}>
            <div className="profile-label" style={{ marginBottom: 6 }}>{t("food.portion")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {food.portions.map((portion, i) => (
                <button key={i} onClick={() => setSelectedPortion(i)} type="button"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 600, fontSize: 13, border: `2px solid ${selectedPortion === i ? "var(--color-accent)" : "var(--border-color)"}`, background: selectedPortion === i ? "var(--bg-soft)" : "var(--bg-card)", color: "var(--text-primary)" }}>
                  <span>{portion.label}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{portion.grams}g</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="profile-label" style={{ margin: 0, whiteSpace: "nowrap" }}>{t("food.quantity")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setPortionQty((prev) => String(Math.max(0.5, parseFloat(prev) - 0.5)))} type="button"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>−</button>
                <input className="input" type="number" step="0.5" min="0.5" value={portionQty} onChange={(e) => setPortionQty(e.target.value)} style={{ width: 60, textAlign: "center", padding: "6px 8px" }} />
                <button onClick={() => setPortionQty((prev) => String(parseFloat(prev) + 0.5))} type="button"
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>+</button>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>= {effectiveGrams}g</span>
            </div>
          </div>
        )}

        {mode === "grams" && (
          <div style={{ marginBottom: 14 }}>
            <div className="profile-label" style={{ marginBottom: 6 }}>{t("common.grams")}</div>
            <input className="input" type="number" value={grams} onChange={(e) => setGrams(e.target.value)} inputMode="numeric" autoFocus={!hasPotions} />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div className="profile-label" style={{ marginBottom: 6 }}>{t("food.meal")}</div>
          <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
            {MEALS.map((m) => <option key={m} value={m}>{t(MEAL_KEYS[m])}</option>)}
          </select>
        </div>

        <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{formatNumber(calories)}</div>
              <div className="muted" style={{ fontSize: 11 }}>kcal</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{formatNumber(protein)}g</div>
              <div className="muted" style={{ fontSize: 11 }}>{t("common.protein")}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{formatNumber(carbs)}g</div>
              <div className="muted" style={{ fontSize: 11 }}>{t("common.carbs")}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{formatNumber(fat)}g</div>
              <div className="muted" style={{ fontSize: 11 }}>{t("common.fat")}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-dark" onClick={() => onAdd(food, effectiveGrams, meal)} type="button" style={{ flex: 1 }}>{t("common.add")}</button>
          <button className="btn btn-light" onClick={onClose} type="button">{t("common.cancel")}</button>
        </div>
      </div>
    </div>
  );
}

export default function FoodTab({
  foods, customFoods, onAddCustomFood, onDeleteCustomFood,
  recentFoods, favoriteFoods, isFavorite, toggleFavorite,
  saveRecentFood, updateCurrentDay, quickAddRecent, quickAddFavorite,
  entries, groupedEntries, deleteEntry, openEditEntry,
  session, onShowAuth, onShowRegister
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedFood, setSelectedFood] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhotoAnalyzer, setShowPhotoAnalyzer] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  const [addFoodOpen, _setAddFoodOpen] = useState(() => sessionStorage.getItem('ft_food_add') === 'true');
  const [favoritesOpen, _setFavoritesOpen] = useState(() => sessionStorage.getItem('ft_food_fav') === 'true');
  const [recentOpen, _setRecentOpen] = useState(() => sessionStorage.getItem('ft_food_recent') === 'true');
  const [customOpen, _setCustomOpen] = useState(() => sessionStorage.getItem('ft_food_custom') === 'true');
  const setAddFoodOpen = (v) => { _setAddFoodOpen(p => { const n = typeof v === 'function' ? v(p) : v; sessionStorage.setItem('ft_food_add', n); return n; }); };
  const setFavoritesOpen = (v) => { _setFavoritesOpen(p => { const n = typeof v === 'function' ? v(p) : v; sessionStorage.setItem('ft_food_fav', n); return n; }); };
  const setRecentOpen = (v) => { _setRecentOpen(p => { const n = typeof v === 'function' ? v(p) : v; sessionStorage.setItem('ft_food_recent', n); return n; }); };
  const setCustomOpen = (v) => { _setCustomOpen(p => { const n = typeof v === 'function' ? v(p) : v; sessionStorage.setItem('ft_food_custom', n); return n; }); };
  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFat, setNewFat] = useState("");
  const [newFavorite, setNewFavorite] = useState(false);

  const { results: databaseResults, loading: databaseLoading } = useFoodSearch(query);

  const filteredFoods = useMemo(() => {
    if (!query.trim()) return foods;
    const q = stripDiacritics(query.toLowerCase().trim());
    return foods.filter((food) => {
      const aliases = Array.isArray(food.aliases) ? food.aliases.join(" ") : "";
      const haystack = stripDiacritics(`${food.name} ${food.brand || ""} ${aliases}`).toLowerCase();
      return haystack.includes(q);
    });
  }, [foods, query]);

  const normalizedDatabaseResults = useMemo(() => {
    return (Array.isArray(databaseResults) ? databaseResults : []).map((food) =>
      normalizeFood({
        id: food.id, source: food.source || "database", sourceLabel: food.sourceLabel || "Database",
        name: food.name, brand: food.brand || "",
        caloriesPer100g: Number(food.caloriesPer100g ?? food.calories) || 0,
        proteinPer100g: Number(food.proteinPer100g ?? food.protein) || 0,
        carbsPer100g: Number(food.carbsPer100g ?? food.carbs) || 0,
        fatPer100g: Number(food.fatPer100g ?? food.fat) || 0
      })
    );
  }, [databaseResults]);

  const visibleFoods = useMemo(() => {
    const localFoods = filteredFoods.map((food) =>
      normalizeFood({ ...food, source: food.source || "local", sourceLabel: food.sourceLabel || "Local" })
    );
    const merged = [...localFoods, ...normalizedDatabaseResults];
    const seen = new Set();
    const deduped = merged.filter((food) => {
      const key = `${String(food.name || "").trim().toLowerCase()}|${String(food.brand || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const filter = FILTER_DEFS.find((f) => f.key === activeFilter);
    const afterFilter = filter?.check ? deduped.filter(filter.check) : deduped;
    if (!query.trim()) return afterFilter;
    return [...afterFilter].sort((a, b) => getFoodSearchScore(b, query) - getFoodSearchScore(a, query));
  }, [filteredFoods, normalizedDatabaseResults, query, activeFilter]);

  const topSearchResults = useMemo(() => visibleFoods.slice(0, 8), [visibleFoods]);
  const showAutocomplete = query.trim().length >= 2;

  function handleFoodSelect(food) { setSelectedFood(food); setQuery(""); setAddFoodOpen(true); }

  function handleAdd(food, gramsValue, meal) {
    const entry = createFoodEntry(food, gramsValue, meal);
    updateCurrentDay((current) => ({ ...current, entries: [entry, ...current.entries] }));
    saveRecentFood(food, gramsValue, meal);
    setSelectedFood(null);
  }

  function handleAddCustomFood() {
    if (!newName.trim() || !newCalories) return;
    const wasFavorite = newFavorite;
    onAddCustomFood({
      name: newName.trim(),
      caloriesPer100g: Number(newCalories) || 0,
      proteinPer100g: Number(newProtein) || 0,
      carbsPer100g: Number(newCarbs) || 0,
      fatPer100g: Number(newFat) || 0
    }, { favorite: wasFavorite });
    setNewName(""); setNewCalories(""); setNewProtein(""); setNewCarbs(""); setNewFat("");
    setNewFavorite(false);
    if (wasFavorite) setFavoritesOpen(true);
    setRecentOpen(true);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  async function handleBarcodeResult(code) {
    setShowScanner(false); setBarcodeLoading(true); setBarcodeError("");
    try {
      const res = await fetch(apiUrl(`/.netlify/functions/barcode-search?code=${encodeURIComponent(code)}`));
      const data = await res.json();
      if (!data.found) { setBarcodeError(t("food.barcodeNotFound", { code })); return; }
      setSelectedFood(normalizeFood(data));
    } catch { setBarcodeError(t("food.barcodeError")); }
    finally { setBarcodeLoading(false); }
  }

  function getSourceBadge(food) {
    if (food.source === "local") return "";
    if (food.source === "usda") return "USDA";
    if (food.source === "off") return "OpenFood";
    if (food.source === "fatsecret") return "FatSecret";
    if (food.sourceLabel && food.sourceLabel !== "Local") return food.sourceLabel;
    return "";
  }

  const totalFoodCalories = entries.reduce((sum, item) => sum + Number(item.calories || 0), 0);

  return (
    <>
      {showScanner && <BarcodeScanner onResult={handleBarcodeResult} onClose={() => setShowScanner(false)} />}
      {showPhotoAnalyzer && (
        <FoodPhotoAnalyzer
          onFoodFound={(food) => { setSelectedFood(food); setShowPhotoAnalyzer(false); }}
          onClose={() => setShowPhotoAnalyzer(false)}
          session={session}
          onShowAuth={() => { setShowPhotoAnalyzer(false); onShowAuth?.(); }}
          onShowRegister={() => { setShowPhotoAnalyzer(false); onShowRegister?.(); }}
        />
      )}
      {selectedFood && (
        <FoodAddModal food={selectedFood} onAdd={handleAdd} onClose={() => setSelectedFood(null)} />
      )}

      {/* ΦΑΓΗΤΟ ΗΜΕΡΑΣ */}
      <div className="day-card">
        <div className="day-card-total">
          <h2>🍔 {t("food.dayTitle")}</h2>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{formatNumber(totalFoodCalories)} kcal</span>
        </div>
        {entries.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>{t("food.empty")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {MEALS.map((meal) => {
              const group = groupedEntries[meal];
              if (!group || group.items.length === 0) return null;
              return (
                <div key={meal}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 2px" }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{t(MEAL_KEYS[meal])}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{formatNumber(group.totalCalories)} kcal</span>
                  </div>
                  {group.items.map((item) => (
                    <div key={item.id} className="day-card-entry">
                      <button onClick={() => openEditEntry(item)} type="button" style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
                        <span className="day-card-entry-title">{item.name}</span>
                        <span className="day-card-entry-meta">{item.grams}g · {formatNumber(item.calories)} kcal · P{formatNumber(item.protein)}</span>
                      </button>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button className="day-card-btn" onClick={() => openEditEntry(item)} type="button">✏️</button>
                        <button className="day-card-btn" onClick={() => deleteEntry(item.id)} type="button">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ΠΡΟΣΘΗΚΗ ΦΑΓΗΤΟΥ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: addFoodOpen ? 12 : 0, gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>🍽️ {t("food.addTitle")}</h2>
          <button type="button" onClick={() => setAddFoodOpen(prev => !prev)}
            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {addFoodOpen ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        {addFoodOpen && (<>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {/* Photo και Barcode ίσο μέγεθος */}
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-dark" onClick={() => setShowPhotoAnalyzer(true)} type="button"
              style={{ fontSize: 13, padding: "8px 0", width: 120, textAlign: "center" }}>
              📸 {t("food.photo")}
            </button>
            <button className="btn btn-dark" onClick={() => { setShowScanner(true); setBarcodeError(""); }} type="button"
              style={{ fontSize: 13, padding: "8px 0", width: 120, textAlign: "center" }}>
              🔲 {t("food.barcode")}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {FILTER_DEFS.map((f) => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)} type="button"
              style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${activeFilter === f.key ? "var(--color-accent)" : "var(--border-color)"}`, background: activeFilter === f.key ? "var(--color-accent)" : "var(--bg-soft)", color: activeFilter === f.key ? "var(--bg-card)" : "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {f.icon ? `${f.icon} ${t(f.labelKey)}` : t(f.labelKey)}
            </button>
          ))}
        </div>

        {barcodeLoading && <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>🔍 {t("food.barcodeSearching")}</div>}
        {barcodeError && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{barcodeError}</div>}

        <input className="input" placeholder={t("food.searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} />

        {showAutocomplete && (
          <div style={{ marginTop: 6, background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {databaseLoading && <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>{t("food.searching")}</div>}
            {!databaseLoading && topSearchResults.length === 0 && (
              <div className="muted" style={{ padding: "6px 8px", fontSize: 13 }}>{t("common.noResults")}</div>
            )}
            {!databaseLoading && topSearchResults.map((food) => (
              <div key={`auto-${food.source || "local"}-${food.id}`}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                {/* Κουμπί επιλογής - ΑΡΙΣΤΕΡΑ */}
                <button onClick={() => handleFoodSelect(food)} type="button"
                  style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px 8px 12px", background: "none", border: "none", cursor: "pointer", gap: 8, flexWrap: "wrap", textAlign: "left" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                      {food.name}{food.brand ? ` · ${food.brand}` : ""}
                    </span>
                    {getSourceBadge(food) && <span className="tag" style={{ marginLeft: 6, fontSize: 11 }}>{getSourceBadge(food)}</span>}
                    {food.portions?.length > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--color-green)", fontWeight: 700 }}>🥣</span>}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}
                  </span>
                </button>
                {/* Κουμπί αγαπημένου - ΔΕΞΙΑ */}
                <button
                  onClick={() => toggleFavorite(food)}
                  type="button"
                  title={isFavorite(food) ? t("food.removeFavorite") : t("food.addFavorite")}
                  style={{ padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 16, flexShrink: 0, color: isFavorite(food) ? "#d97706" : "var(--text-muted)" }}>
                  {isFavorite(food) ? "⭐" : "☆"}
                </button>
              </div>
            ))}
          </div>
        )}
        </>)}
      </div>

      {/* ΑΓΑΠΗΜΕΝΑ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: favoritesOpen ? 10 : 0 }}>
          <h2 style={{ margin: 0 }}>⭐ {t("food.favoritesTitle")}</h2>
          <button type="button" onClick={() => setFavoritesOpen(prev => !prev)}
            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {favoritesOpen ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        {favoritesOpen && (<>

        {favoriteFoods.length === 0 ? (
          <div style={{ background: "var(--bg-soft)", borderRadius: 12, padding: "14px 16px", border: "1px dashed var(--border-color)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t("food.noFavorites")}</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {t("food.noFavoritesHint")}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {favoriteFoods.map((food) => (
              <div key={`${food.source || "local"}-${food.id}`}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden", minHeight: 40 }}>
                <button className="btn btn-dark" onClick={() => quickAddFavorite(food)} type="button"
                  style={{ padding: "4px 10px", fontSize: 12, margin: "0 0 0 8px", flexShrink: 0 }}>+</button>
                <div style={{ flex: 1, minWidth: 0, padding: "8px 0", overflow: "hidden" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{food.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{formatNumber(food.caloriesPer100g || 0)} kcal · P{formatNumber(food.proteinPer100g || 0)}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 8, alignItems: "center" }}>
                  <button className="btn btn-light" onClick={() => handleFoodSelect(food)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                  <button onClick={() => toggleFavorite(food)} type="button" title={t("food.removeFavorite")}
                    style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#d97706" }}>⭐</button>
                </div>
              </div>
            ))}
          </div>
        )}
        </>)}
      </div>

      {/* ΠΡΟΣΦΑΤΑ */}
      {recentFoods.length > 0 && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: recentOpen ? 10 : 0 }}>
            <h2 style={{ margin: 0 }}>🕐 {t("common.recent")}</h2>
            <button type="button" onClick={() => setRecentOpen(prev => !prev)}
              style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
              {recentOpen ? "▲ Collapse" : "▼ Expand"}
            </button>
          </div>
          {recentOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentFoods.slice(0, 6).map((item) => {
              const cal = createFoodEntry(item.food, item.grams, item.mealType);
              return (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-soft)", borderRadius: 8, border: "1px solid var(--border-soft)", overflow: "hidden", minHeight: 40 }}>
                  <button className="btn btn-dark" onClick={() => quickAddRecent(item)} type="button"
                    style={{ padding: "4px 10px", fontSize: 12, margin: "0 0 0 8px", flexShrink: 0, alignSelf: "center" }}>+</button>
                  <div style={{ flex: 1, minWidth: 0, padding: "8px 0", overflow: "hidden" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.food.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{item.grams}g · {item.mealType} · {formatNumber(cal.calories)} kcal</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingRight: 8, alignItems: "center" }}>
                    <button className="btn btn-light" onClick={() => handleFoodSelect(item.food)} type="button" style={{ padding: "4px 8px", fontSize: 11 }}>✏️</button>
                    <button onClick={() => toggleFavorite(item.food)} type="button"
                      title={isFavorite(item.food) ? t("food.removeFavorite") : t("food.addFavorite")}
                      style={{ padding: "4px 6px", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: isFavorite(item.food) ? "#d97706" : "var(--text-muted)" }}>
                      {isFavorite(item.food) ? "⭐" : "☆"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* CUSTOM ΦΑΓΗΤΟ */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: customOpen ? 10 : 0 }}>
          <h2 style={{ margin: 0 }}>✏️ {t("food.customFood")}</h2>
          <button type="button" onClick={() => setCustomOpen(prev => !prev)}
            style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-soft)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
            {customOpen ? "▲ Collapse" : "▼ Expand"}
          </button>
        </div>
        {customOpen && (<>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="input" placeholder={t("food.name")} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder={t("food.kcalPer100g")} inputMode="numeric" value={newCalories} onChange={(e) => setNewCalories(e.target.value)} />
            <input className="input" placeholder={t("common.protein")} inputMode="decimal" value={newProtein} onChange={(e) => setNewProtein(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder={t("common.carbs")} inputMode="decimal" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value)} />
            <input className="input" placeholder={t("common.fat")} inputMode="decimal" value={newFat} onChange={(e) => setNewFat(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-dark" onClick={handleAddCustomFood} type="button" style={{ flex: 1 }}>
              {savedFeedback ? `✅ ${t("common.saved")}` : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => setNewFavorite((prev) => !prev)}
              title={newFavorite ? t("food.removeFavorite") : t("food.addFavorite")}
              style={{ padding: "10px 14px", background: "var(--bg-soft)", border: "1px solid var(--border-color)", borderRadius: 12, cursor: "pointer", fontSize: 18, flexShrink: 0, color: newFavorite ? "#d97706" : "var(--text-muted)" }}>
              {newFavorite ? "⭐" : "☆"}
            </button>
          </div>
        </div>

        </>)}
      </div>
    </>
  );
}