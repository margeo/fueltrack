# FuelTrack - Project State

## 1. Current status
- React + Vite app
- Netlify Functions backend for food search
- LocalStorage-based persistence
- Stable deployed version
- Main styling source: `src/index.css`
- `App.css` is not used
- Search currently uses:
  - local foods from `src/data/foods.json`
  - USDA
  - Open Food Facts
- Food search speed was improved by making Open Food Facts non-blocking
- Local foods were moved out of JS constants into external JSON
- Snapshot/project files exist in repo root:
  - `PROJECT_STATE.md`
  - `SNAPSHOT.md`
  - `generateSnapshot.cjs`

## 2. Active goals
- lose
- maintain
- gain

## 3. Core rules
- Exercise calories are ADDED to remaining calories
- Food search uses one unified search box
- Search results combine local foods + backend/database foods in one flow
- Do not split local and USDA/Open Food Facts into separate UI fields
- Always return full updated files, never snippets
- Before changing code, first explain what will change and why

## 4. Current architecture

### Root
- `.env`
- `.gitignore`
- `deno.lock`
- `eslint.config.js`
- `generateSnapshot.cjs`
- `index.html`
- `manifest.json`
- `netlify.toml`
- `package-lock.json`
- `package.json`
- `PROJECT_STATE.md`
- `README.md`
- `SNAPSHOT.md`
- `src.zip`
- `vite.config.js`

### src
- `App.jsx`
- `index.css`
- `main.jsx`

### src/components
- `BottomNav.jsx`
- `EditEntryModal.jsx`
- `FabButton.jsx`
- `WelcomeScreen.jsx`

### src/components/tabs
- `ExerciseTab.jsx`
- `FoodTab.jsx`
- `ProfileTab.jsx`
- `SummaryTab.jsx`

### src/data
- `constants.js`
- `foods.json`
- `modes.js`

### src/hooks
- `useFoodSearch.js`

### src/utils
- `calorieLogic.js`
- `helpers.js`
- `storage.js`
- `suggestions.js`

### netlify/functions
- `food-search.js`

## 5. Current priorities
1. Better food search
2. Add more truly free databases if usable
3. Better Greek food coverage
4. Better ranking / matching
5. Keep search fast
6. Keep UI clean and mobile-friendly

## 6. Important product decisions in progress
- Profile tab should stay simple and not overload the user with warnings
- Food search is priority #1
- Large food datasets should live in external files, not hardcoded inside JS
- Potential future direction:
  - more Greek foods coverage
  - more free databases
  - possible image-to-food workflow later