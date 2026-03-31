export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { weekData, profile } = body;

    if (!weekData || !profile) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing data" }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Temporary debug
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "API key missing" }) };
    }

    const prompt = `Είσαι ένας fitness και nutrition coach. Αναλύεις τα δεδομένα του χρήστη και δίνεις σύντομες, πρακτικές συμβουλές στα Ελληνικά.

Προφίλ χρήστη:
- Στόχος: ${profile.goalType === "lose" ? "Απώλεια βάρους" : profile.goalType === "gain" ? "Μυϊκή ανάπτυξη" : "Διατήρηση"}
- Τρόπος διατροφής: ${profile.mode}
- Ημερήσιος στόχος: ${profile.targetCalories} kcal
- Στόχος πρωτεΐνης: ${profile.proteinTarget}g

Δεδομένα τελευταίων 7 ημερών:
${weekData.map((day, i) => `Ημέρα ${i + 1}: ${day.eaten} kcal φαγητό, ${day.exercise} kcal άσκηση, υπόλοιπο ${day.remaining} kcal, πρωτεΐνη ${day.protein}g`).join("\n")}

Streak: ${profile.streak} συνεχόμενες μέρες εντός στόχου.
${profile.lastWeight ? `Τελευταίο βάρος: ${profile.lastWeight} kg` : ""}

Δώσε μια σύντομη ανάλυση (3-4 προτάσεις) και 2-3 συγκεκριμένες συμβουλές για την επόμενη εβδομάδα. Να είσαι ενθαρρυντικός αλλά ειλικρινής. Απάντησε μόνο στα Ελληνικά.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
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