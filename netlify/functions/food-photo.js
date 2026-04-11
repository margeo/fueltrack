export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { imageBase64, mediaType, language = "el", model: requestModel } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing image" })
      };
    }

    const isEn = language === "en";

    const prompt = isEn
      ? `Look at this food photo and analyze its contents.

Reply ONLY with a JSON object in the exact format below, no other text:
{
  "name": "Food name in English",
  "description": "Short description",
  "estimatedGrams": 150,
  "caloriesPer100g": 250,
  "proteinPer100g": 15,
  "carbsPer100g": 30,
  "fatPer100g": 8,
  "confidence": "high"
}

confidence must be one of: "high", "medium", "low".
If you can't recognize the food, set confidence to "low" and estimate based on what you see.
All values are per 100g except estimatedGrams which is the estimated quantity shown in the photo.`
      : `Κοίτα αυτή τη φωτογραφία φαγητού και αναλύσε το περιεχόμενό της.

Απάντησε ΜΟΝΟ με ένα JSON object στην παρακάτω ακριβή μορφή, χωρίς κανένα άλλο κείμενο:
{
  "name": "Όνομα φαγητού στα ελληνικά",
  "description": "Σύντομη περιγραφή",
  "estimatedGrams": 150,
  "caloriesPer100g": 250,
  "proteinPer100g": 15,
  "carbsPer100g": 30,
  "fatPer100g": 8,
  "confidence": "high"
}

Το confidence πρέπει να είναι ένα από: "high", "medium", "low".
Αν δεν μπορείς να αναγνωρίσεις το φαγητό, βάλε confidence: "low" και εκτίμησε με βάση αυτό που βλέπεις.
Όλες οι τιμές είναι ανά 100g εκτός από το estimatedGrams που είναι η εκτιμώμενη ποσότητα στη φωτογραφία.`;

    const dataUrl = `data:${mediaType || "image/jpeg"};base64,${imageBase64}`;
    const aiModel = requestModel || "gemini";

    let result;
    let usageMeta;

    if (["gemini", "gemini-flash", "gemini-3.1", "haiku-openrouter", "gpt4o-mini"].includes(aiModel)) {
      const modelMap = {
        "gemini": "google/gemini-2.5-flash-lite",
        "gemini-flash": "google/gemini-2.5-flash",
        "gemini-3.1": "google/gemini-3.1-flash-lite-preview",
        "haiku-openrouter": "anthropic/claude-3.5-haiku",
        "gpt4o-mini": "openai/gpt-4o-mini"
      };
      const pricing = { "gemini": [0.10, 0.40], "gemini-flash": [0.30, 2.50], "gemini-3.1": [0.10, 1.50], "haiku-openrouter": [1, 5], "gpt4o-mini": [0.15, 0.60] };
      const modelNames = { "gemini": "Gemini 2.5 Flash Lite", "gemini-flash": "Gemini 2.5 Flash", "gemini-3.1": "Gemini 3.1 Flash Lite", "haiku-openrouter": "Haiku 4.5 (OR)", "gpt4o-mini": "GPT-4o Mini" };

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://fueltrack.me",
          "X-Title": "FuelTrack"
        },
        body: JSON.stringify({
          model: modelMap[aiModel],
          max_tokens: 500,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      result = JSON.parse(clean);

      const u = data.usage || {};
      const inTok = u.prompt_tokens || 0;
      const outTok = u.completion_tokens || 0;
      const [inPrice, outPrice] = pricing[aiModel] || [0, 0];
      const costUsd = (inTok * inPrice / 1000000) + (outTok * outPrice / 1000000);
      usageMeta = {
        inputTokens: inTok,
        outputTokens: outTok,
        costUsd: Math.round(costUsd * 10000) / 10000,
        model: modelNames[aiModel] || aiModel
      };
    } else {
      // Anthropic direct (haiku or opus)
      const anthropicModel = aiModel === "opus" ? "claude-opus-4-5-20251101" : "claude-haiku-4-5-20251001";
      const modelLabel = aiModel === "opus" ? "Claude Opus 4.5" : "Claude Haiku 4.5";
      const pricing = aiModel === "opus" ? [15, 75] : [1, 5];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 }
                },
                { type: "text", text: prompt }
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
      const clean = text.replace(/```json|```/g, "").trim();
      result = JSON.parse(clean);

      const u = data.usage || {};
      const inTok = u.input_tokens || 0;
      const outTok = u.output_tokens || 0;
      const costUsd = (inTok * pricing[0] / 1000000) + (outTok * pricing[1] / 1000000);
      usageMeta = {
        inputTokens: inTok,
        outputTokens: outTok,
        costUsd: Math.round(costUsd * 10000) / 10000,
        model: modelLabel
      };
    }

    result.usage = usageMeta;

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
