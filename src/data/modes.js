export const MODE_GROUPS = [
  { group: "🥗 Ισορροπημένες", modes: ["balanced", "mediterranean", "whole_foods"] },
  { group: "🥩 High Protein", modes: ["high_protein", "muscle_gain"] },
  { group: "🥑 Low Carb / Keto", modes: ["low_carb", "keto", "carnivore"] },
  { group: "⏱️ Fasting", modes: ["fasting_16_8", "fasting_18_6", "omad"] },
  { group: "🌱 Φυτικές", modes: ["vegetarian", "vegan"] }
];

export const MODES = {
  balanced: {
    key: "balanced", label: "Balanced",
    description: "Ισορροπημένη καθημερινή διατροφή",
    carbsPercent: 40, proteinPercent: 30, fatPercent: 30,
    fastingHours: null, eatingWindowHours: null, carbLimit: null,
    aiRule: "Ισορροπημένη διατροφή. Όλες οι τροφές επιτρέπονται. Έμφαση σε ποικιλία, λαχανικά, δημητριακά ολικής, άπαχη πρωτεΐνη."
  },
  mediterranean: {
    key: "mediterranean", label: "Μεσογειακή",
    description: "Μεσογειακή διατροφή — ελαιόλαδο, ψάρι, λαχανικά",
    carbsPercent: 45, proteinPercent: 25, fatPercent: 30,
    fastingHours: null, eatingWindowHours: null, carbLimit: null,
    aiRule: "Μεσογειακή διατροφή. Βάση: ελαιόλαδο, ψάρι, θαλασσινά, λαχανικά, όσπρια, φρούτα, ξηροί καρποί, ολικής δημητριακά. Περιορισμός κόκκινου κρέατος και επεξεργασμένων τροφών."
  },
  whole_foods: {
    key: "whole_foods", label: "Whole Foods",
    description: "Φυσικές τροφές, χωρίς επεξεργασμένα",
    carbsPercent: 40, proteinPercent: 30, fatPercent: 30,
    fastingHours: null, eatingWindowHours: null, carbLimit: null,
    aiRule: "Whole Foods diet. ΜΟΝΟ φυσικές ανεπεξέργαστες τροφές. ΑΠΑΓΟΡΕΥΟΝΤΑΙ: επεξεργασμένα, ζάχαρη, fast food, συσκευασμένα σνακ. Προτίμηση: φρέσκα λαχανικά, φρούτα, κρέας, ψάρι, αυγά, ξηροί καρποί."
  },
  high_protein: {
    key: "high_protein", label: "High Protein",
    description: "Έμφαση στην πρωτεΐνη για fitness",
    carbsPercent: 30, proteinPercent: 40, fatPercent: 30,
    fastingHours: null, eatingWindowHours: null, carbLimit: null,
    aiRule: "High Protein diet. Κάθε γεύμα ΠΡΕΠΕΙ να έχει σημαντική πηγή πρωτεΐνης (≥20g). Στόχος: 2-2.5g πρωτεΐνης/kg. Προτίμηση: κοτόπουλο, ψάρι, αυγά, γαλοπούλα, τυρί cottage, whey, γιαούρτι 0%."
  },
  muscle_gain: {
    key: "muscle_gain", label: "Muscle Gain",
    description: "Μυϊκή ανάπτυξη — πλεόνασμα + υψηλή πρωτεΐνη",
    carbsPercent: 40, proteinPercent: 35, fatPercent: 25,
    fastingHours: null, eatingWindowHours: null, carbLimit: null,
    aiRule: "Muscle Gain diet. Caloric surplus ~300kcal πάνω από TDEE. Πρωτεΐνη: 2-2.2g/kg. Υδατάνθρακες γύρω από προπόνηση. Γεύματα κάθε 3-4 ώρες. Προτίμηση: ρύζι, βρώμη, κοτόπουλο, αυγά, μπανάνα, γλυκοπατάτα."
  },
  low_carb: {
    key: "low_carb", label: "Low Carb",
    description: "Χαμηλοί υδατάνθρακες (≤15g/100g)",
    carbsPercent: 20, proteinPercent: 35, fatPercent: 45,
    fastingHours: null, eatingWindowHours: null, carbLimit: 15,
    aiRule: "Low Carb diet. ΜΟΝΟ τρόφιμα με ≤15g carbs/100g. ΑΠΟΦΥΓΗ: ψωμί, ρύζι, ζυμαρικά, πατάτες, ζάχαρη, γλυκά. ΕΠΙΤΡΕΠΟΝΤΑΙ: κρέας, ψάρι, αυγά, τυρί, λαχανικά (χωρίς άμυλο), ξηροί καρποί."
  },
  keto: {
    key: "keto", label: "Keto",
    description: "Κετογονική — πολύ χαμηλοί carbs, υψηλό λίπος",
    carbsPercent: 8, proteinPercent: 27, fatPercent: 65,
    fastingHours: null, eatingWindowHours: null, carbLimit: 8,
    aiRule: "Ketogenic diet. ΜΟΝΟ τρόφιμα με ≤8g carbs/100g. ΑΠΟΛΥΤΩΣ ΑΠΑΓΟΡΕΥΟΝΤΑΙ: ψωμί, ρύζι, μακαρόνια, πατάτες, παστίτσιο, μουσακάς, πίτσα, φρούτα (εκτός μούρων), όσπρια, ζάχαρη. ΕΠΙΤΡΕΠΟΝΤΑΙ: κρέας, ψάρι, αυγά, τυρί, βούτυρο, ελαιόλαδο, αβοκάντο, σπανάκι, αγγούρι, κολοκυθάκι, φέτα, γαρίδες."
  },
  carnivore: {
    key: "carnivore", label: "Carnivore",
    description: "Μόνο ζωικά προϊόντα",
    carbsPercent: 0, proteinPercent: 35, fatPercent: 65,
    fastingHours: null, eatingWindowHours: null, carbLimit: 0,
    aiRule: "Carnivore diet. ΜΟΝΟ ζωικά: κρέας, ψάρι, αυγά, τυρί, βούτυρο, λίπος ζώων. ΜΗΔΕΝ φυτικές τροφές. Να επισημαίνεις ότι η επιστημονική τεκμηρίωση είναι περιορισμένη."
  },
  fasting_16_8: {
    key: "fasting_16_8", label: "Fasting 16:8",
    description: "Νηστεία 16ω — φαγητό σε παράθυρο 8 ωρών",
    carbsPercent: 35, proteinPercent: 30, fatPercent: 35,
    fastingHours: 16, eatingWindowHours: 8, carbLimit: null,
    aiRule: "Intermittent Fasting 16:8. Φαγητό ΜΟΝΟ σε eating window 8 ωρών (π.χ. 12:00-20:00). Τίποτα με θερμίδες εκτός window. Πρότεινε συγκεκριμένες ώρες γευμάτων. Έμφαση σε χορταστικά, υψηλής πρωτεΐνης γεύματα."
  },
  fasting_18_6: {
    key: "fasting_18_6", label: "Fasting 18:6",
    description: "Νηστεία 18ω — φαγητό σε παράθυρο 6 ωρών",
    carbsPercent: 35, proteinPercent: 30, fatPercent: 35,
    fastingHours: 18, eatingWindowHours: 6, carbLimit: null,
    aiRule: "Intermittent Fasting 18:6. Φαγητό ΜΟΝΟ σε eating window 6 ωρών (π.χ. 13:00-19:00). Μόνο 2-3 γεύματα. Έμφαση σε θρεπτικά, χορταστικά γεύματα."
  },
  omad: {
    key: "omad", label: "OMAD",
    description: "One Meal A Day — ένα γεύμα την ημέρα",
    carbsPercent: 35, proteinPercent: 30, fatPercent: 35,
    fastingHours: 23, eatingWindowHours: 1, carbLimit: null,
    aiRule: "OMAD. ΕΝΑ μόνο γεύμα με ΟΛΕΣ τις θερμίδες. Πολύ πλήρες σε θρεπτικά. Extreme approach — να επισημαίνεις ότι δεν είναι για όλους."
  },
  vegetarian: {
    key: "vegetarian", label: "Vegetarian",
    description: "Χωρίς κρέας — με αυγά και γαλακτοκομικά",
    carbsPercent: 45, proteinPercent: 25, fatPercent: 30,
    fastingHours: null, eatingWindowHours: null, carbLimit: null,
    aiRule: "Vegetarian diet. ΧΩΡΙΣ κρέας και ψάρι. ΕΠΙΤΡΕΠΟΝΤΑΙ: αυγά, γαλακτοκομικά, τυριά, όσπρια, ξηροί καρποί. Έμφαση σε πλήρεις πηγές πρωτεΐνης."
  },
  vegan: {
    key: "vegan", label: "Vegan",
    description: "Αποκλειστικά φυτική διατροφή",
    carbsPercent: 50, proteinPercent: 25, fatPercent: 25,
    fastingHours: null, eatingWindowHours: null, carbLimit: null,
    aiRule: "Vegan diet. ΜΟΝΟ φυτικές τροφές. ΑΠΑΓΟΡΕΥΟΝΤΑΙ: κρέας, ψάρι, αυγά, γαλακτοκομικά, μέλι. ΕΠΙΤΡΕΠΟΝΤΑΙ: όσπρια, τόφου, ξηροί καρποί, φρούτα, λαχανικά. Να επισημαίνεις ανάγκη για B12, ω-3, σίδηρο."
  }
};

export const MODE_OPTIONS = Object.values(MODES);