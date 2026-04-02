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
- Streak: ${profile.streak} συνεχόμενες μέρες εντός στόχου
${profile.lastWeight ? `- Τελευταίο βάρος: ${profile.lastWeight} kg` : ""}

ΣΗΜΕΡΑ:
- Έφαγε: ${todayData?.eaten || 0} kcal από ${profile.targetCalories} kcal
- Πρωτεΐνη: ${todayData?.protein || 0}g από ${profile.proteinTarget}g
- Άσκηση: ${todayData?.exercise || 0} kcal
- Υπόλοιπο: ${todayData?.remaining || profile.targetCalories} kcal
- Τύπος υπολοίπου: Υπόλοιπο = Στόχος − Φαγητό + Άσκηση

ΕΒΔΟΜΑΔΑ:
${(weekData || []).map((d, i) => `Μέρα ${i + 1}: ${d.eaten} kcal, πρωτεΐνη ${d.protein}g, άσκηση ${d.exercise} kcal`).join("\n")}

ΑΓΑΠΗΜΕΝΑ ΦΑΓΗΤΑ ΤΟΥ ΧΡΗΣΤΗ:
${(favoriteFoods || []).length > 0
  ? (favoriteFoods || []).map(f => `- ${f.name} (${f.caloriesPer100g} kcal/100g, πρωτεΐνη ${f.proteinPer100g}g/100g)`).join("\n")
  : "Δεν έχει αγαπημένα ακόμα"}

ΚΑΝΟΝΕΣ:
- Όταν προτείνεις φαγητό, προτίμα από τα αγαπημένα του χρήστη αν υπάρχουν
- Για γυμναστική, πρότεινε συγκεκριμένο τύπο, διάρκεια και ένταση
- Να είσαι σύντομος — max 150-200 λέξεις ανά απάντηση
- Χρησιμοποίησε emojis με μέτρο
- Αν ρωτήσει για λάθη, να είσαι ειλικρινής αλλά ενθαρρυντικός`;

    const userMessage = chatMessage ||
      `Κοίτα τα δεδομένα μου και πες μου:
1. Τι να φάω για την υπόλοιπη μέρα (συγκεκριμένα, από τα αγαπημένα μου αν μπορείς)
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
        max_tokens: 1200,
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