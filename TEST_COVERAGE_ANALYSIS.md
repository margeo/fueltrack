# FuelTrack Test Coverage Analysis

## Current State

**The project has zero tests.** No test framework is installed, no test files exist, and no CI/CD pipeline runs tests. The only code quality tool in use is ESLint.

---

## Recommended Testing Strategy

### Phase 1: Setup

Install Vitest (natural fit for Vite projects) with jsdom for React component testing:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.js`:
```js
test: {
  environment: 'jsdom',
  globals: true,
}
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:coverage": "vitest --coverage"
```

---

### Phase 2: Priority Areas for Testing

#### Priority 1 — Pure Utility Functions (High Value, Low Effort)

These are pure functions with no dependencies — the easiest wins for test coverage.

**`src/utils/calorieLogic.js`** — Critical business logic
- `calculateBMR()` — Mifflin-St Jeor equation for male/female; edge cases: zero/missing inputs
- `calculateTDEE()` — Activity multiplier; edge case: missing bmr or activity
- `calculateDailyDeficit()` — Clamped to 150–1000 range; edge cases: zero weeks, zero kilos
- `calculateAppliedDailyDeficit()` — Min/max clamping logic
- `calculateTargetCalories()` — Goal-type branching (lose/gain/maintain/fitness); floor of 1200 for weight loss
- `calculateProteinTarget()` — Mode-aware multipliers (high_protein, gain, lose, fitness)
- `calculateMacroTargets()` — Macro ratio distribution based on dietary mode; tests should verify balanced, keto, low_carb, high_protein modes

**`src/utils/helpers.js`** — Data normalization and search
- `shiftDate()` — Date arithmetic; test month/year boundaries
- `formatNumber()` — Greek locale formatting
- `round1()` — Single decimal rounding; edge case: falsy input
- `normalizeDayLog()` — Defensive defaults for missing/malformed log data
- `stripDiacritics()` / `normalizeSearchText()` / `toCompactSearchText()` — Text normalization chain
- `transliterateGreekToLatin()` — Greek-to-Latin transliteration with digraphs (ου→ou, μπ→b, etc.)
- `simplifyLatinGreeklish()` — Greeklish simplification rules
- `buildSearchVariants()` — Deduplication of search variants
- `normalizeFood()` — Food object normalization; ensure defaults are applied correctly
- `createFoodEntry()` — Calorie/macro scaling from per-100g values; minimum 1g enforcement
- `entryBasePer100g()` — Reverse calculation from entry to per-100g base values
- `calculateBmr()` (duplicate in helpers.js) — Same formula as calorieLogic.js, verify consistency
- `calculateDailyDeficit()` (duplicate in helpers.js) — Different signature than calorieLogic.js version
- `calculateTargetCalories()` (duplicate in helpers.js) — Different signature, verify consistent results

**`src/utils/streak.js`** — Streak tracking
- `calculateStreak()` — Day-by-day backward iteration; edge cases: empty logs, today with no entries, broken streak, 100+ tolerance
- `getStreakEmoji()` — Threshold boundaries (1, 3, 7, 14, 30)
- `getStreakMessage()` — Same threshold boundaries

**`src/utils/suggestions.js`** — Food recommendations
- `getSuggestedFoods()` — Filtering by mode (keto carb limit ≤8, low_carb ≤15), scoring algorithm with protein weighting, calorie penalty, mode-specific bonuses; verify correct sort order and top-5 slicing

#### Priority 2 — Backend API Functions (Medium Effort, High Value)

**`netlify/functions/food-search.js`**
- USDA response parsing and nutrient extraction (`getNutrientValue`)
- Open Food Facts response parsing (Greek + World)
- FatSecret description regex parsing (calories, fat, carbs, protein from text)
- Deduplication logic across all sources
- Error handling: missing query, short query, API failures
- Timeout handling for slow APIs

**`netlify/functions/barcode-search.js`**
- Product lookup and nutrient extraction from Open Food Facts
- Missing/invalid barcode handling

**`netlify/functions/food-photo.js`**
- Response parsing from Claude Vision API
- Handling of multiple food items in a single photo

#### Priority 3 — React Hooks (Medium Effort)

**`src/hooks/useFoodSearch.js`**
- Debounce behavior (300ms delay)
- Cache hit vs cache miss paths
- Query variant generation (with/without accents)
- `mergeAndDedupe()` — Deduplication across multiple API calls
- Cancellation on query change
- Minimum query length (< 2 chars returns empty)

#### Priority 4 — React Components (Higher Effort)

**`src/components/EditEntryModal.jsx`**
- Gram recalculation when editing
- Meal type selection

**`src/components/WelcomeScreen.jsx`**
- Profile form validation
- Onboarding flow completion

**`src/components/tabs/ProfileTab.jsx`**
- BMR/TDEE recalculation on profile changes
- Goal type switching updates targets correctly

**`src/components/tabs/SummaryTab.jsx`**
- Daily totals calculation
- 7-day history rendering
- Weight tracking display

---

### Phase 3: Specific Bugs/Edge Cases to Test

| Area | Risk | Test Case |
|------|------|-----------|
| Calorie floor | User gets dangerously low calories | `calculateTargetCalories` with extreme deficit never returns < 1200 |
| Deficit clamping | Unrealistic weight loss plans | Deficit clamped to 150–1000 regardless of input |
| Zero division | Crash on 0 weeks or 0 weight | All division operations handle zero denominators |
| Duplicate functions | `helpers.js` and `calorieLogic.js` have overlapping BMR/deficit/target functions | Verify both return consistent results for identical inputs |
| Date boundary | `shiftDate` across month/year | Dec 31 + 1 day = Jan 1 next year |
| Greek text search | Accented vs unaccented Greek | "φέτα" and "φετα" should match the same foods |
| Transliteration | Digraph ordering | "μπουγάτσα" should transliterate correctly (μπ→b before μ→m) |
| Food entry scaling | Fractional grams | 1g serving, 0g serving (clamped to 1), 999g serving |
| Streak with gap | No food logged today | Today skipped, yesterday counts |
| Keto filter | Carb threshold | Food with exactly 8g carbs included, 9g excluded |
| FatSecret parsing | Regex edge cases | Description with unusual formatting or missing fields |

---

### Phase 4: Recommended CI/CD Addition

Add a GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

---

## Summary

| Priority | Area | Files | Estimated Tests |
|----------|------|-------|-----------------|
| P1 | Pure utility functions | `calorieLogic.js`, `helpers.js`, `streak.js`, `suggestions.js` | ~60–80 |
| P2 | Backend API functions | `food-search.js`, `barcode-search.js`, `food-photo.js` | ~20–30 |
| P3 | React hooks | `useFoodSearch.js` | ~10–15 |
| P4 | React components | `EditEntryModal`, `ProfileTab`, `SummaryTab` | ~20–30 |

**Start with P1.** The utility functions contain the core business logic (calorie calculations, macro targets, streak tracking, food suggestions) and can be tested with zero mocking. This alone would cover the most critical paths in the application.

**Notable risk:** There are duplicate calculation functions across `helpers.js` and `calorieLogic.js` (`calculateBmr`, `calculateDailyDeficit`, `calculateTargetCalories`). These have slightly different signatures and should be consolidated or at minimum tested to ensure they produce consistent results.
