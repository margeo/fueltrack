export const DEFAULT_FOODS = [
  {
    id: "local-tost",
    source: "local",
    name: "Τοστ",
    brand: "",
    caloriesPer100g: 250,
    proteinPer100g: 10,
    carbsPer100g: 30,
    fatPer100g: 10
  },
  {
    id: "local-avga",
    source: "local",
    name: "Αυγά",
    brand: "",
    caloriesPer100g: 140,
    proteinPer100g: 12,
    carbsPer100g: 1,
    fatPer100g: 10
  },
  {
    id: "local-kotopoulo",
    source: "local",
    name: "Κοτόπουλο",
    brand: "",
    caloriesPer100g: 300,
    proteinPer100g: 40,
    carbsPer100g: 0,
    fatPer100g: 15
  },
  {
    id: "local-banana",
    source: "local",
    name: "Μπανάνα",
    brand: "",
    caloriesPer100g: 100,
    proteinPer100g: 1,
    carbsPer100g: 25,
    fatPer100g: 0
  },
  {
    id: "local-ryzi",
    source: "local",
    name: "Ρύζι",
    brand: "",
    caloriesPer100g: 200,
    proteinPer100g: 4,
    carbsPer100g: 44,
    fatPer100g: 1
  },
  {
    id: "local-giaourti",
    source: "local",
    name: "Γιαούρτι",
    brand: "",
    caloriesPer100g: 150,
    proteinPer100g: 15,
    carbsPer100g: 8,
    fatPer100g: 6
  }
];

export const EXERCISE_LIBRARY = [
  { name: "Περπάτημα", caloriesPerMinute: 4 },
  { name: "Γρήγορο περπάτημα", caloriesPerMinute: 5.5 },
  { name: "Τρέξιμο", caloriesPerMinute: 11 },
  { name: "Βάρη", caloriesPerMinute: 4.5 },
  { name: "Ποδήλατο", caloriesPerMinute: 7 },
  { name: "Κολύμπι", caloriesPerMinute: 8.5 }
];

export const MEALS = [
  "Πρωινό",
  "Μεσημεριανό",
  "Βραδινό",
  "Σνακ"
];

export const APP_TABS = [
  { key: "summary", icon: "🏠", label: "Summary" },
  { key: "food", icon: "🍔", label: "Food" },
  { key: "exercise", icon: "🏃", label: "Exercise" },
  { key: "day", icon: "📊", label: "Day" },
  { key: "profile", icon: "👤", label: "Profile" }
];