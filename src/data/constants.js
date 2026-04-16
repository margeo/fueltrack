// src/data/constants.js

// Internal meal keys — stored in localStorage, do NOT change
export const MEALS = ["Πρωινό", "Μεσημεριανό", "Βραδινό", "Σνακ"];

// Translation key mapping for meals
export const MEAL_KEYS = {
  "Πρωινό": "meals.breakfast",
  "Μεσημεριανό": "meals.lunch",
  "Βραδινό": "meals.dinner",
  "Σνακ": "meals.snack",
};

export const APP_TABS = [
  { key: "summary", labelKey: "tabs.summary", icon: "📊" },
  { key: "food", labelKey: "tabs.food", icon: "🍔" },
  { key: "exercise", labelKey: "tabs.exercise", icon: "💪" },
  { key: "profile", labelKey: "tabs.profile", icon: "👤" }
];

export const EXERCISE_LIBRARY = [
  // Cardio
  { name: "Περπάτημα", category: "Cardio", caloriesPerMinute: 4, icon: "🚶" },
  { name: "Τρέξιμο", category: "Cardio", caloriesPerMinute: 10, icon: "🏃" },
  { name: "Ποδήλατο", category: "Cardio", caloriesPerMinute: 8, icon: "🚴" },
  { name: "Spinning", category: "Cardio", caloriesPerMinute: 10, icon: "🔥" },
  { name: "Κολύμπι", category: "Cardio", caloriesPerMinute: 9, icon: "🏊" },
  { name: "Σχοινάκι", category: "Cardio", caloriesPerMinute: 12, icon: "⚡" },
  { name: "HIIT", category: "Cardio", caloriesPerMinute: 12, icon: "🔥" },
  { name: "Ελλειπτικό", category: "Cardio", caloriesPerMinute: 8, icon: "🏃" },
  { name: "Κωπηλατική", category: "Cardio", caloriesPerMinute: 7, icon: "🚣" },
  // Gym
  { name: "Gym session", category: "Gym", caloriesPerMinute: 6, icon: "🏋️" },
  { name: "Upper Body", category: "Gym", caloriesPerMinute: 5, icon: "💪" },
  { name: "Lower Body", category: "Gym", caloriesPerMinute: 7, icon: "🦵" },
  { name: "Full Body", category: "Gym", caloriesPerMinute: 6, icon: "🏋️" },
  // Training
  { name: "Full body workout", category: "Training", caloriesPerMinute: 6, icon: "🔥" },
  { name: "HIIT workout", category: "Training", caloriesPerMinute: 12, icon: "🔥" },
  { name: "TRX", category: "Training", caloriesPerMinute: 8, icon: "💪" },
  { name: "Calisthenics", category: "Training", caloriesPerMinute: 8, icon: "💪" },
  { name: "CrossFit", category: "Training", caloriesPerMinute: 12, icon: "🔥" },
  { name: "Aerobics", category: "Training", caloriesPerMinute: 7, icon: "💃" },
  { name: "Aqua Aerobics", category: "Training", caloriesPerMinute: 6, icon: "🏊" },
  { name: "Yoga", category: "Training", caloriesPerMinute: 4, icon: "🧘" },
  { name: "Pilates", category: "Training", caloriesPerMinute: 4, icon: "🧘" },
  { name: "Stretching", category: "Training", caloriesPerMinute: 3, icon: "🤸" },
  { name: "Zumba", category: "Training", caloriesPerMinute: 8, icon: "💃" },
  // Sports
  { name: "Ποδόσφαιρο", category: "Sports", caloriesPerMinute: 10, icon: "⚽" },
  { name: "Μπάσκετ", category: "Sports", caloriesPerMinute: 8, icon: "🏀" },
  { name: "Βόλεϊ", category: "Sports", caloriesPerMinute: 6, icon: "🏐" },
  { name: "Beach volley", category: "Sports", caloriesPerMinute: 8, icon: "🏐" },
  { name: "Τένις", category: "Sports", caloriesPerMinute: 7, icon: "🎾" },
  { name: "Padel", category: "Sports", caloriesPerMinute: 6, icon: "🎾" },
  { name: "Πινγκ-πονγκ", category: "Sports", caloriesPerMinute: 4, icon: "🏓" },
  { name: "Χάντμπολ", category: "Sports", caloriesPerMinute: 9, icon: "🤾" },
  { name: "Water Polo", category: "Sports", caloriesPerMinute: 10, icon: "🏊" },
  { name: "Πολεμικές τέχνες", category: "Sports", caloriesPerMinute: 10, icon: "🥋" },
  { name: "Πυγμαχία", category: "Sports", caloriesPerMinute: 11, icon: "🥊" },
  { name: "Kickboxing", category: "Sports", caloriesPerMinute: 11, icon: "🥊" },
  { name: "Χορός", category: "Sports", caloriesPerMinute: 6, icon: "🕺" },
  { name: "Ski", category: "Sports", caloriesPerMinute: 8, icon: "⛷️" },
  { name: "Surf", category: "Sports", caloriesPerMinute: 7, icon: "🏄" },
  { name: "Roller / Πατίνια", category: "Sports", caloriesPerMinute: 7, icon: "⛸️" },
  { name: "Ιππασία", category: "Sports", caloriesPerMinute: 5, icon: "🐎" },
  { name: "Σκέιτμπορντ", category: "Sports", caloriesPerMinute: 6, icon: "🛹" },
];
