export const MODES = {
  balanced: {
    key: "balanced",
    label: "Balanced",
    description: "Ισορροπημένη καθημερινή διατροφή",
    carbsPercent: 40,
    proteinPercent: 30,
    fatPercent: 30,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["balanced", "everyday", "quick-meal"],
    allowedTags: []
  },

  low_carb: {
    key: "low_carb",
    label: "Low Carb",
    description: "Χαμηλότεροι υδατάνθρακες, έμφαση σε πρωτεΐνη και λίπος",
    carbsPercent: 20,
    proteinPercent: 35,
    fatPercent: 45,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["low-carb", "high-protein", "quick-meal"],
    allowedTags: ["low-carb"]
  },

  keto: {
    key: "keto",
    label: "Keto",
    description: "Πολύ χαμηλοί υδατάνθρακες και υψηλότερο λίπος",
    carbsPercent: 8,
    proteinPercent: 27,
    fatPercent: 65,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["keto", "low-carb", "high-fat"],
    allowedTags: ["keto"]
  },

  fasting: {
    key: "fasting",
    label: "Fasting 16:8",
    description: "Περιορισμός ώρας φαγητού μέσα σε eating window",
    carbsPercent: 35,
    proteinPercent: 30,
    fatPercent: 35,
    fastingHours: 16,
    eatingWindowHours: 8,
    priorityTags: ["high-protein", "satiating", "quick-meal"],
    allowedTags: []
  },

  high_protein: {
    key: "high_protein",
    label: "High Protein",
    description: "Έμφαση στην πρωτεΐνη για fitness ή muscle gain",
    carbsPercent: 30,
    proteinPercent: 40,
    fatPercent: 30,
    fastingHours: null,
    eatingWindowHours: null,
    priorityTags: ["high-protein", "lean", "quick-meal"],
    allowedTags: ["high-protein"]
  }
};

export const MODE_OPTIONS = Object.values(MODES);