const fs = require("fs");
const path = require("path");

const files = [
  "src/App.jsx",
  "src/components/BottomNav.jsx",
  "src/components/EditEntryModal.jsx",
  "src/components/WelcomeScreen.jsx",
  "src/components/tabs/SummaryTab.jsx",
  "src/components/tabs/FoodTab.jsx",
  "src/components/tabs/ExerciseTab.jsx",
  "src/components/tabs/ProfileTab.jsx",
  "src/data/constants.js",
  "src/data/modes.js",
  "src/hooks/useFoodSearch.js",
  "src/utils/calorieLogic.js",
  "src/utils/helpers.js",
  "src/utils/storage.js",
  "src/utils/suggestions.js",
  "netlify/functions/food-search.js"
];

let output = "# FuelTrack Snapshot\n\n";

files.forEach((filePath) => {
  try {
    const fullPath = path.join(__dirname, filePath);
    const content = fs.readFileSync(fullPath, "utf-8");

    output += `\n## FILE: ${filePath}\n`;
    output += "```javascript\n";
    output += content;
    output += "\n```\n";
  } catch (err) {
    output += `\n## FILE: ${filePath} (NOT FOUND)\n`;
  }
});

fs.writeFileSync("SNAPSHOT.md", output);

console.log("✅ Snapshot generated: SNAPSHOT.md");