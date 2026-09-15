import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const SYSTEM = `You are Allan Assistant, the public conversational assistant for Aiallan.shop.
Be natural, friendly, concise and human-like. You can chat casually even when the topic is not about the website, but never invent factual claims about Aiallan. When the user asks about Aiallan, use only the supplied website/catalog context.
Understand follow-up references such as "that one", "the second one", "it", and "yung sinabi mo kanina" using the conversation history.
If you do not know something, say specifically what you don't know and offer a useful next step. Do not repeatedly use the same generic fallback.
Match the user's language naturally. If they use Tagalog, Cebuano, Hiligaynon, English or another language, reply in that language. Do not announce that you are switching languages.
For casual chat, greetings, friendship, vibes and light conversation, respond naturally and continue the conversation instead of redirecting everything to Aiallan.
For product requests, choose only products that actually match the supplied catalog. Return their numeric product IDs in productIds. Never invent products, prices, URLs or availability.
A product card is opened inside Aiallan.shop; the website handles the product view and existing basket/partner-store action. Do not tell the user that clicking the assistant card immediately sends them to an external store.
Return ONLY valid JSON with keys: answer (string), productIds (array of integer catalog indexes).`;

async function gemini(
  question: string,
  history: any[],
  catalog: any[],
  language: string,
  key: string,
) {
  const prompt = {
    systemInstruction: {
      parts: [{ text: SYSTEM }],
    },
    contents: [
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      })),
      {
        role: "user",
        parts: [
          {
            text: `Language preference: ${language}
Catalog JSON:
${JSON.stringify(catalog)}

User message:
${question}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      responseMimeType: "application/json",
    },
  };

  const r = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
      encodeURIComponent(key),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prompt),
    },
  );

  if (!r.ok) {
    throw new Error(`Gemini HTTP ${r.status}`);
  }

  const d = await r.json();

  const text =
    d?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text || "")
      .join("") || "";

  if (!text) {
    throw new Error("Gemini returned no model text");
  }

  return JSON.parse(text);
}

async function openrouter(
  question: string,
  history: any[],
  catalog: any[],
  language: string,
  key: string,
) {
  const messages = [
    {
      role: "system",
      content: SYSTEM,
    },
    {
      role: "system",
      content: `Language preference: ${language}
Current Aiallan catalog JSON:
${JSON.stringify(catalog)}`,
    },
    ...history.map((m) => ({
      role: m.role,
      content: m.text,
    })),
    {
      role: "user",
      content: question,
    },
  ];

  const r = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aiallan.shop",
        "X-Title": "Allan Assistant",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages,
        temperature: 0.8,
      }),
    },
  );

  if (!r.ok) {
    throw new Error(`OpenRouter HTTP ${r.status}`);
  }

  const d = await r.json();

  let text = d?.choices?.[0]?.message?.content || "";

  if (Array.isArray(text)) {
    text = text
      .map((item: any) => item?.text || "")
      .join("");
  }

  text = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!text) {
    throw new Error("OpenRouter returned no model text");
  }

  return JSON.parse(text);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();

    const question = String(body?.question || "").trim();

    if (!question) {
      return json({ error: "Question required" }, 400);
    }

    const history = Array.isArray(body?.history)
      ? body.history.slice(-16)
      : [];

    const catalog = Array.isArray(body?.catalog)
      ? body.catalog.slice(0, 120)
      : [];

    const language = String(body?.language || "auto");

    const gkey = Deno.env.get("GEMINI_API_KEY") || "";
    const okey = Deno.env.get("OPENROUTER_API_KEY") || "";

    let result: any = null;
    let provider = "local";

    // Primary: Gemini
    if (gkey) {
      try {
        result = await gemini(
          question,
          history,
          catalog,
          language,
          gkey,
        );
        provider = "gemini";
      } catch (_) {
        // Gemini failed; continue to OpenRouter fallback.
      }
    }

    // Fallback: OpenRouter
    if (!result && okey) {
      try {
        result = await openrouter(
          question,
          history,
          catalog,
          language,
          okey,
        );
        provider = "openrouter";
      } catch (_) {
        // Both AI providers failed.
      }
    }

    if (!result) {
      return json(
        {
          answer:
            "I’m having trouble reaching my conversation service right now. Please try again in a moment.",
          productIds: [],
          provider: "unavailable",
        },
        200,
      );
    }

    const ids = Array.isArray(result.productIds)
      ? result.productIds
          .map((x: any) => Number(x))
          .filter(
            (x: number) =>
              Number.isInteger(x) &&
              x >= 0 &&
              x < catalog.length,
          )
          .slice(0, 12)
      : [];

    return json({
      answer: String(result.answer || ""),
      productIds: ids,
      provider,
    });
  } catch (e) {
    return json(
      {
        error: String(e?.message || e),
      },
      500,
    );
  }
});
