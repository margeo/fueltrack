export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { imageBase64, mediaType } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing image" })
      };
    }

    const prompt = `Κοίτα αυτή τη φωτογραφία φαγητού και αναλύσε το περιεχόμενό της.

Απάντησε ΜΟΝΟ με ένα JSON object στην παρακάτω μορφή, χωρίς κανένα άλλο κείμενο:
{
  "name": "Όνομα φαγητού στα ελληνικά",
  "description": "Σύντομη περιγραφή",
  "estimatedGrams": 150,
  "caloriesPer100g": 250,
  "proteinPer100g": 15,
  "carbsPer100g": 30,
  "fatPer100g": 8,
  "confidence": "high/medium/low"
}

Αν δεν μπορείς να αναγνωρίσεις το φαγητό, βάλε confidence: "low" και εκτίμησε με βάση αυτό που βλέπεις.
Όλες οι τιμές είναι ανά 100g εκτός από το estimatedGrams που είναι η εκτιμώμενη ποσότητα στη φωτογραφία.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: imageBase64
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON από την απάντηση
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}