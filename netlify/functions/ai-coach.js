export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const { systemPrompt, messages } = body;

    if (!systemPrompt || !messages || !Array.isArray(messages)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing systemPrompt or messages" }) };
    }

    const validMessages = messages.filter(
      (m) => m.role && typeof m.content === "string" && m.content.trim()
    );

    if (validMessages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No valid messages" }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY not set" }) };
    }

    const recentMessages = validMessages.slice(-10);

    const geminiMessages = recentMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: `Gemini error ${response.status}: ${responseText}` }) };
    }

    const data = JSON.parse(responseText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { statusCode: 500, body: JSON.stringify({ error: "Empty response" }) };

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