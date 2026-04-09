export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { systemPrompt, messages, model: requestModel } = body;

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

    // OpenRouter models (gemini, gemini-flash, haiku-openrouter)
    if (["gemini", "gemini-flash", "grok", "haiku-openrouter"].includes(aiModel)) {
      const modelMap = {
        "gemini": "google/gemini-2.5-flash-lite",
        "gemini-flash": "google/gemini-2.5-flash",
        "grok": "x-ai/grok-4.1-fast",
        "haiku-openrouter": "anthropic/claude-3.5-haiku"
      };
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://fueltrack.me",
          "X-Title": "FuelTrack"
        },
        body: JSON.stringify({
          model: modelMap[aiModel],
          max_tokens: 8000,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            ...recentMessages
          ]
        })
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}: ${await resp.text()}`);
      const d = await resp.json();
      const txt = d.choices?.[0]?.message?.content;
      if (!txt) throw new Error("Empty response from API");
      const u = d.usage || {};
      const modelNames = { "gemini": "Gemini 2.5 Flash Lite", "gemini-flash": "Gemini 2.5 Flash", "grok": "Grok 4.1 Fast", "haiku-openrouter": "Haiku 4.5 (OR)" };
      const pricing = { "gemini": [0.10, 0.40], "gemini-flash": [0.30, 2.50], "grok": [0.20, 0.50], "haiku-openrouter": [1, 5] };
      const [inPrice, outPrice] = pricing[aiModel] || [0, 0];
      const inTok = u.prompt_tokens || 0;
      const outTok = u.completion_tokens || 0;
      const orCost = (inTok * inPrice / 1000000) + (outTok * outPrice / 1000000);
      responseData = { advice: txt, usage: { inputTokens: inTok, outputTokens: outTok, costUsd: Math.round(orCost * 10000) / 10000, model: modelNames[aiModel] || aiModel } };

    // Google AI direct (gemini-direct)
    } else if (aiModel === "gemini-direct") {
      const geminiMessages = recentMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 8000, temperature: 0.7 }
        })
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}: ${await resp.text()}`);
      const d = await resp.json();
      const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!txt) throw new Error("Empty response from API");
      const u = d.usageMetadata || {};
      const gdIn = u.promptTokenCount || 0;
      const gdOut = u.candidatesTokenCount || 0;
      const gdCost = (gdIn * 0.075 / 1000000) + (gdOut * 0.30 / 1000000);
      responseData = { advice: txt, usage: { inputTokens: gdIn, outputTokens: gdOut, costUsd: Math.round(gdCost * 10000) / 10000, model: "Gemini 2.0 Flash Lite" } };

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
