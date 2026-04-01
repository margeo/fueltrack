export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { weekData, profile } = body;

    if (!weekData || !profile) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing data" })
      };
    }

    const prompt = `Είσαι fitness και nutrition coach. Δίνεις σύντομες, πρακτικές συμβουλές στα Ελληνικά.

Προφίλ:
- Στόχος: ${profile.goalType === "lose" ? "Απώλεια βάρους" : profile.goalType === "gain" ? "Μυϊκή ανάπτυξη" : "Διατήρηση"}
- Διατροφή: ${profile.mode}
- Στόχος: ${profile.targetCalories} kcal / ${profile.proteinTarget}g πρωτεΐνη
- Streak: ${profile.streak} μέρες${profile.lastWeight ? ` · Βάρος: ${profile.lastWeight} kg` : ""}

7 ημέρες:
${weekData.map((d, i) => `${i + 1}. ${d.eaten} kcal, άσκηση ${d.exercise} kcal, υπόλοιπο ${d.remaining}, πρωτεΐνη ${d.protein}g`).join("\n")}

Γράψε:
1. Σύντομη αξιολόγηση εβδομάδας (2-3 προτάσεις)
2. 3 συγκεκριμένες συμβουλές για την επόμενη εβδομάδα
3. Μια πρόταση κινήτρου

Να είσαι ειλικρινής και ενθαρρυντικός. Μόνο Ελληνικά.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "Δεν ήταν δυνατή η ανάλυση.";

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