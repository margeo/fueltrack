var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/ai-coach.js
var ai_coach_exports = {};
__export(ai_coach_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(ai_coach_exports);
async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { weekData, profile } = body;
    if (!weekData || !profile) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing data" })
      };
    }
    const prompt = `\u0395\u03AF\u03C3\u03B1\u03B9 \u03AD\u03BD\u03B1\u03C2 fitness \u03BA\u03B1\u03B9 nutrition coach. \u0391\u03BD\u03B1\u03BB\u03CD\u03B5\u03B9\u03C2 \u03C4\u03B1 \u03B4\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1 \u03C4\u03BF\u03C5 \u03C7\u03C1\u03AE\u03C3\u03C4\u03B7 \u03BA\u03B1\u03B9 \u03B4\u03AF\u03BD\u03B5\u03B9\u03C2 \u03C3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B5\u03C2, \u03C0\u03C1\u03B1\u03BA\u03C4\u03B9\u03BA\u03AD\u03C2 \u03C3\u03C5\u03BC\u03B2\u03BF\u03C5\u03BB\u03AD\u03C2 \u03C3\u03C4\u03B1 \u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC.

\u03A0\u03C1\u03BF\u03C6\u03AF\u03BB \u03C7\u03C1\u03AE\u03C3\u03C4\u03B7:
- \u03A3\u03C4\u03CC\u03C7\u03BF\u03C2: ${profile.goalType === "lose" ? "\u0391\u03C0\u03CE\u03BB\u03B5\u03B9\u03B1 \u03B2\u03AC\u03C1\u03BF\u03C5\u03C2" : profile.goalType === "gain" ? "\u039C\u03C5\u03CA\u03BA\u03AE \u03B1\u03BD\u03AC\u03C0\u03C4\u03C5\u03BE\u03B7" : "\u0394\u03B9\u03B1\u03C4\u03AE\u03C1\u03B7\u03C3\u03B7"}
- \u03A4\u03C1\u03CC\u03C0\u03BF\u03C2 \u03B4\u03B9\u03B1\u03C4\u03C1\u03BF\u03C6\u03AE\u03C2: ${profile.mode}
- \u0397\u03BC\u03B5\u03C1\u03AE\u03C3\u03B9\u03BF\u03C2 \u03C3\u03C4\u03CC\u03C7\u03BF\u03C2: ${profile.targetCalories} kcal
- \u03A3\u03C4\u03CC\u03C7\u03BF\u03C2 \u03C0\u03C1\u03C9\u03C4\u03B5\u0390\u03BD\u03B7\u03C2: ${profile.proteinTarget}g

\u0394\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1 \u03C4\u03B5\u03BB\u03B5\u03C5\u03C4\u03B1\u03AF\u03C9\u03BD 7 \u03B7\u03BC\u03B5\u03C1\u03CE\u03BD:
${weekData.map((day, i) => `\u0397\u03BC\u03AD\u03C1\u03B1 ${i + 1}: ${day.eaten} kcal \u03C6\u03B1\u03B3\u03B7\u03C4\u03CC, ${day.exercise} kcal \u03AC\u03C3\u03BA\u03B7\u03C3\u03B7, \u03C5\u03C0\u03CC\u03BB\u03BF\u03B9\u03C0\u03BF ${day.remaining} kcal, \u03C0\u03C1\u03C9\u03C4\u03B5\u0390\u03BD\u03B7 ${day.protein}g`).join("\n")}

Streak: ${profile.streak} \u03C3\u03C5\u03BD\u03B5\u03C7\u03CC\u03BC\u03B5\u03BD\u03B5\u03C2 \u03BC\u03AD\u03C1\u03B5\u03C2 \u03B5\u03BD\u03C4\u03CC\u03C2 \u03C3\u03C4\u03CC\u03C7\u03BF\u03C5.
${profile.lastWeight ? `\u03A4\u03B5\u03BB\u03B5\u03C5\u03C4\u03B1\u03AF\u03BF \u03B2\u03AC\u03C1\u03BF\u03C2: ${profile.lastWeight} kg` : ""}

\u0394\u03CE\u03C3\u03B5 \u03BC\u03B9\u03B1 \u03C3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B7 \u03B1\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7 (3-4 \u03C0\u03C1\u03BF\u03C4\u03AC\u03C3\u03B5\u03B9\u03C2) \u03BA\u03B1\u03B9 2-3 \u03C3\u03C5\u03B3\u03BA\u03B5\u03BA\u03C1\u03B9\u03BC\u03AD\u03BD\u03B5\u03C2 \u03C3\u03C5\u03BC\u03B2\u03BF\u03C5\u03BB\u03AD\u03C2 \u03B3\u03B9\u03B1 \u03C4\u03B7\u03BD \u03B5\u03C0\u03CC\u03BC\u03B5\u03BD\u03B7 \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03B1. \u039D\u03B1 \u03B5\u03AF\u03C3\u03B1\u03B9 \u03B5\u03BD\u03B8\u03B1\u03C1\u03C1\u03C5\u03BD\u03C4\u03B9\u03BA\u03CC\u03C2 \u03B1\u03BB\u03BB\u03AC \u03B5\u03B9\u03BB\u03B9\u03BA\u03C1\u03B9\u03BD\u03AE\u03C2. \u0391\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B5 \u03BC\u03CC\u03BD\u03BF \u03C3\u03C4\u03B1 \u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC.`;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    const text = data.content?.[0]?.text || "\u0394\u03B5\u03BD \u03AE\u03C4\u03B1\u03BD \u03B4\u03C5\u03BD\u03B1\u03C4\u03AE \u03B7 \u03B1\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7.";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advice: text })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=ai-coach.js.map
