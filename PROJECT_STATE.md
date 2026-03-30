# FuelTrack - Project State

## 1. Current status
- React + Vite app
- Netlify Functions backend for food search
- LocalStorage-based persistence
- Stable deployed version
- Cleanup completed: removed unused files DayTab.jsx, QuickActionsModal.jsx, goals.js

## 2. Active goals
- lose
- maintain
- gain

## 3. Removed
- fitness goal removed from:
  - calorie logic
  - profile UI
  - App localStorage cleanup flow

## 4. Core rules
- Exercise calories are ADDED to remaining calories
- Food search uses one unified search box
- Search results combine local foods + backend/database foods in one flow
- Do not split local and USDA into separate UI fields
- Always return full updated files, not partial snippets

## 5. Project structure

### src
- App.jsx
- main.jsx
- App.css
- index.css

### src/components
- BottomNav.jsx
- EditEntryModal.jsx
- FabButton.jsx
- WelcomeScreen.jsx

### src/components/tabs
- SummaryTab.jsx
- FoodTab.jsx
- ExerciseTab.jsx
- ProfileTab.jsx

### src/data
- constants.js
- modes.js

### src/hooks
- useFoodSearch.js

### src/utils
- calorieLogic.js
- helpers.js
- storage.js
- suggestions.js

### netlify/functions
- food-search.js