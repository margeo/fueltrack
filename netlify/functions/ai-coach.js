export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { systemPrompt, messages, model: requestModel, jsonMode } = body;

    if (!systemPrompt || !messages || !Array.isArray(messages)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing systemPrompt or messages" }) };
    }

    const validMessages = messages.filter(
      (m) => m.role && typeof m.content === "string" && m.content.trim()
    );

    if (validMessages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No valid messages" }) };
    }

    const recentMessages = validMessages.slice(-6);
    const aiModel = requestModel || process.env.AI_MODEL || "gemini";

    let responseData;

    // OpenRouter models
    if (["gemini", "gemini-flash", "gemini-3.1", "grok", "haiku-openrouter", "gpt4o-mini"].includes(aiModel)) {
      const modelMap = {
        "gemini": "google/gemini-2.5-flash-lite",
        "gemini-flash": "google/gemini-2.5-flash",
        "gemini-3.1": "google/gemini-3.1-flash-lite-preview",
        "grok": "x-ai/grok-4.1-fast",
        "haiku-openrouter": "anthropic/claude-3.5-haiku",
        "gpt4o-mini": "openai/gpt-4o-mini"
      };
      const reqBody = {
        model: modelMap[aiModel],
        max_tokens: jsonMode ? 16000 : 8000,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages
        ]
      };
      if (jsonMode) {
        const mealSlots = body.mealSlots || ["meal_1", "meal_2", "meal_3", "meal_4"];
        const snackSlots = body.snackSlots || ["meal_2"];
        const mealSchema = (isSnack) => ({
          type: "object",
          properties: {
            desc: { type: "string" },
            kcal: isSnack ? { type: "integer", maximum: 300 } : { type: "integer" },
            pro: { type: "integer" }
          },
          required: ["desc", "kcal", "pro"],
          additionalProperties: false
        });
        const daySchema = {
          type: "object",
          properties: {
            ...Object.fromEntries(mealSlots.map(s => [s, mealSchema(snackSlots.includes(s))])),
            daily_total: { type: "integer" }
          },
          required: [...mealSlots, "daily_total"],
          additionalProperties: false
        };
        reqBody.response_format = {
          type: "json_schema",
          json_schema: {
            name: "diet_plan",
            strict: true,
            schema: {
              type: "object",
              properties: Object.fromEntries(
                ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(day => [day, daySchema])
              ),
              required: ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"],
              additionalProperties: false
            }
          }
        };
      }

      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://fueltrack.me",
          "X-Title": "FuelTrack"
        },
        body: JSON.stringify(reqBody)
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}: ${await resp.text()}`);
      const d = await resp.json();
      const txt = d.choices?.[0]?.message?.content;
      if (!txt) throw new Error("Empty response from API");
      const u = d.usage || {};
      const modelNames = { "gemini": "Gemini 2.5 Flash Lite", "gemini-flash": "Gemini 2.5 Flash", "gemini-3.1": "Gemini 3.1 Flash Lite", "grok": "Grok 4.1 Fast", "haiku-openrouter": "Haiku 4.5 (OR)", "gpt4o-mini": "GPT-4o Mini" };
      const pricing = { "gemini": [0.10, 0.40], "gemini-flash": [0.30, 2.50], "gemini-3.1": [0.10, 1.50], "grok": [0.20, 0.50], "haiku-openrouter": [1, 5], "gpt4o-mini": [0.15, 0.60] };
      const [inPrice, outPrice] = pricing[aiModel] || [0, 0];
      const inTok = u.prompt_tokens || 0;
      const outTok = u.completion_tokens || 0;
      const orCost = (inTok * inPrice / 1000000) + (outTok * outPrice / 1000000);
      responseData = { advice: txt, usage: { inputTokens: inTok, outputTokens: outTok, costUsd: Math.round(orCost * 10000) / 10000, model: modelNames[aiModel] || aiModel } };

    // Anthropic direct (default: haiku)
    } else {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8000,
          system: systemPrompt,
          messages: recentMessages
        })
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}: ${await resp.text()}`);
      const d = await resp.json();
      const txt = d.content?.[0]?.text;
      if (!txt) throw new Error("Empty response from API");
      const u = d.usage || {};
      const inputTokens = u.input_tokens || 0;
      const outputTokens = u.output_tokens || 0;
      const costUsd = (inputTokens * 1 / 1000000) + (outputTokens * 5 / 1000000);
      responseData = { advice: txt, usage: { inputTokens, outputTokens, costUsd: Math.round(costUsd * 10000) / 10000, model: "Claude Haiku 4.5" } };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown error" })
    };
  }
}
