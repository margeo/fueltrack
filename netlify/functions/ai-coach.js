export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { weekData, todayData, profile, favoriteFoods, chatMessage } = body;

    if (!profile) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing data" }) };
    }

    const goalLabel = profile.goalType === "lose" ? "Απώλεια βάρους" :
      profile.goalType === "gain" ? "Μυϊκή ανάπτυξη" : "Διατήρηση";

    const systemPrompt = `Είσαι ο προσωπικός διατροφολόγος και γυμναστής του χρήστη στο app FuelTrack. Μιλάς στα Ελληνικά, είσαι φιλικός, άμεσος και πρακτικός. Δίνεις πάντα συγκεκριμένες, actionable συμβουλές — ποτέ γενικόλογα.

ΠΡΟΦΙΛ ΧΡΗΣΤΗ:
- Στόχος: ${goalLabel}
- Τρόπος διατροφής: ${profile.mode}
- Ημερήσιος στόχος: ${profile.targetCalories} kcal
- Στόχος πρωτεΐνης: ${profile.proteinTarget}g
- Streak: ${profile.streak} συνεχόμενες μέρες
${profile.lastWeight ? `- Τελευταίο βάρος: ${profile.lastWeight} kg` : ""}

ΓΟΥΣΤΑ ΧΡΗΣΤΗ:
- Αγαπημένα φαγητά: ${profile.favoriteFoodsText || "Δεν έχει δηλώσει"}
- Αγαπημένες ασκήσεις: ${profile.favoriteExercisesText || "Δεν έχει δηλώσει"}
- Αγαπημένα από το app: ${(favoriteFoods || []).length > 0 ? (favoriteFoods || []).map(f => f.name).join(", ") : "Κανένα ακόμα"}

ΣΗΜΕΡΑ:
- Έφαγε: ${todayData?.eaten || 0} kcal από ${profile.targetCalories} kcal
- Πρωτεΐνη: ${todayData?.protein || 0}g από ${profile.proteinTarget}g
- Άσκηση: ${todayData?.exercise || 0} kcal
- Υπόλοιπο: ${todayData?.remaining || profile.targetCalories} kcal
  (Υπόλοιπο = Στόχος − Φαγητό + Άσκηση)

ΕΒΔΟΜΑΔΑ:
${(weekData || []).map((d, i) => `Μέρα ${i + 1}: ${d.eaten} kcal, πρωτεΐνη ${d.protein}g, άσκηση ${d.exercise} kcal`).join("\n")}

ΚΑΝΟΝΕΣ:
- ΠΑΝΤΑ πρότεινε φαγητά από τα γούστα του χρήστη αν υπάρχουν
- ΠΑΝΤΑ πρότεινε ασκήσεις από τα αγαπημένα του αν υπάρχουν
- Όταν ζητάει meal plan, δώσε συγκεκριμένο πρόγραμμα για ολόκληρη την ημέρα (πρωινό, μεσημεριανό, βραδινό, σνακ) με θερμίδες
- Όταν ζητάει training plan, δώσε συγκεκριμένο πρόγραμμα με τύπο, διάρκεια, ένταση
- Να είσαι σύντομος αλλά πλήρης — χρησιμοποίησε bullet points
- Χρησιμοποίησε emojis με μέτρο`;

    const userMessage = chatMessage ||
      `Κοίτα τα δεδομένα μου και πες μου:
1. Τι να φάω για την υπόλοιπη μέρα (από τα αγαπημένα μου)
2. Αν πρέπει να γυμναστώ σήμερα και τι ακριβώς
3. Ένα πράγμα που κάνω λάθος αυτή την εβδομάδα`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
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