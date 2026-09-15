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

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description: "The natural conversational answer to the user's latest message.",
    },
    productIds: {
      type: "array",
      items: { type: "integer" },
      description:
        "Only current catalog indexes that directly match a product request. Empty for general conversation.",
    },
  },
  required: ["answer", "productIds"],
  additionalProperties: false,
};

const SYSTEM = `You are Allan Assistant, a highly capable public conversational assistant for Aiallan.shop.

CORE BEHAVIOR
- Understand what the user actually means, not just individual keywords.
- Answer the user's latest question directly and naturally. Do not give a generic fallback when the topic is clear.
- You can discuss general world knowledge, science, history, geography, technology, space, mathematics, culture, everyday questions, and casual conversation—not only Aiallan.shop.
- For general factual questions, prefer accurate, well-supported information. If current information is needed and web search is available, use it.
- Never pretend to know something that is uncertain. Clearly distinguish established facts from estimates, opinions, or uncertainty.
- Keep answers conversational and appropriately detailed for the question. A one-word prompt such as "Science" should be treated as an invitation to explain or ask what area of science the user wants, not as a reason to repeat the website fallback.
- Follow the conversation naturally. Understand references such as "that one", "the second one", "it", "yung sinabi mo kanina", and "what about this?" using history.
- Match the user's language. Tagalog -> Tagalog, Cebuano/Bisaya -> Cebuano/Bisaya, Hiligaynon/Ilonggo -> Hiligaynon/Ilonggo, English -> English, and similarly for other languages. Do not announce the language switch.
- For casual chat, greetings, friendship, jokes, and light conversation, respond naturally and continue the topic.

Aiallan-specific truthfulness
- When the user asks about Aiallan.shop, its website, products, categories, prices, availability, purchase links, or other site facts, use ONLY the supplied website/catalog context.
- Never invent an Aiallan product, price, category, URL, stock status, owner detail, or feature.
- If the supplied context does not contain the requested Aiallan fact, say that the current public catalog/context does not show it and offer the closest useful next step.
- Product matching must use only the supplied catalog. Return numeric productIds only for products that actually match the request.
- For general topics, do NOT attach Aiallan products just because product text happens to contain a common word.
- Do not claim that an assistant product card opens an external store; the website handles its internal product view and existing purchase link.

PRODUCT SELECTION
- productIds are zero-based indexes from the supplied Catalog JSON.
- For a general question (science, history, friendship, etc.), productIds MUST be [].
- For "show products/all products", return the first relevant catalog indexes; the client may paginate compactly.
- For a specific product/category request, select only genuinely relevant matches.

OUTPUT
Return ONLY valid JSON matching the provided schema. No markdown fences and no extra keys.`;

function shouldUseWebSearch(question: string) {
  const q = question.toLowerCase();
  const aiallanSpecific = /\baiallan(?:\.shop)?\b|current catalog|catalogue|product|products|produkto|basket|purchase|buy on aiallan|shop on aiallan/i.test(q);
  if (aiallanSpecific) return false;
  // Use web grounding for genuinely time-sensitive/current questions.
  // Ordinary knowledge questions should stay on the fast model path.
  return /\b(latest|today|current|right now|now|recent|recently|news|update|updates|this week|this month|breaking|weather|election|president|prime minister|price today|stock price|exchange rate|who is the current|as of 202[0-9]|202[6-9]|203[0-9])\b/i.test(q);
}

function cleanResult(value: any) {
  const answer = String(value?.answer || "").trim();
  const productIds = Array.isArray(value?.productIds)
    ? value.productIds.map((x: any) => Number(x)).filter(Number.isInteger)
    : [];
  if (!answer) throw new Error("Model returned an empty answer");
  return { answer, productIds };
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 5500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function gemini(
  question: string,
  history: any[],
  catalog: any[],
  language: string,
  key: string,
) {
  const web = shouldUseWebSearch(question);
  const prompt = {
    systemInstruction: {
      parts: [{ text: `${SYSTEM}\nCurrent date: ${new Date().toISOString().slice(0, 10)}.` }],
    },
    contents: [
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: String(m.text || "") }],
      })),
      {
        role: "user",
        parts: [
          {
            text: `Language preference: ${language}
Catalog JSON (authoritative only for Aiallan facts):
${JSON.stringify(catalog)}

User message:
${question}`,
          },
        ],
      },
    ],
    generationConfig: {
      thinkingConfig: { thinkingLevel: "low" },
      responseMimeType: "application/json",
      responseSchema: OUTPUT_SCHEMA,
    },
    ...(web ? { tools: [{ googleSearch: {} }] } : {}),
  };

  const r = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
      encodeURIComponent(key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompt),
    },
    5500,
  );

  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
  const d = await r.json();
  const text =
    d?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text || "")
      .join("") || "";
  if (!text) throw new Error("Gemini returned no model text");
  return cleanResult(JSON.parse(text));
}

async function openrouter(
  question: string,
  history: any[],
  catalog: any[],
  language: string,
  key: string,
) {
  const web = shouldUseWebSearch(question);
  const messages = [
    {
      role: "system",
      content: `${SYSTEM}\nCurrent date: ${new Date().toISOString().slice(0, 10)}.`,
    },
    {
      role: "system",
      content: `Language preference: ${language}\nCurrent Aiallan catalog JSON (authoritative only for Aiallan facts):\n${JSON.stringify(catalog)}`,
    },
    ...history.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.text || ""),
    })),
    { role: "user", content: question },
  ];

  const r = await fetchWithTimeout(
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
        plugins: [{ id: "response-healing" }, ...(web ? [{ id: "web", max_results: 5 }] : [])],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "allan_assistant_response",
            strict: true,
            schema: OUTPUT_SCHEMA,
          },
        },
        provider: { require_parameters: true },
      }),
    },
    5500,
  );

  if (!r.ok) throw new Error(`OpenRouter HTTP ${r.status}`);
  const d = await r.json();
  let text = d?.choices?.[0]?.message?.content || "";
  if (Array.isArray(text)) text = text.map((item: any) => item?.text || "").join("");
  text = String(text).replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!text) throw new Error("OpenRouter returned no model text");
  return cleanResult(JSON.parse(text));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();
    if (!question) return json({ error: "Question required" }, 400);

    const history = Array.isArray(body?.history) ? body.history.slice(-18) : [];
    const catalog = Array.isArray(body?.catalog) ? body.catalog.slice(0, 300) : [];
    const language = String(body?.language || "auto");
    const gkey = Deno.env.get("GEMINI_API_KEY") || "";
    const okey = Deno.env.get("OPENROUTER_API_KEY") || "";

    let result: any = null;
    let provider = "unavailable";

    if (gkey) {
      try {
        result = await gemini(question, history, catalog, language, gkey);
        provider = "gemini";
      } catch (e) {
        console.warn("[AIALAN] Gemini failed:", e?.message || e);
      }
    }

    if (!result && okey) {
      try {
        result = await openrouter(question, history, catalog, language, okey);
        provider = "openrouter";
      } catch (e) {
        console.warn("[AIALAN] OpenRouter failed:", e?.message || e);
      }
    }

    if (!result) {
      return json({
        answer: "",
        productIds: [],
        provider: "unavailable",
      });
    }

    const ids = result.productIds
      .filter((x: number) => x >= 0 && x < catalog.length)
      .slice(0, 24);

    return json({ answer: result.answer, productIds: ids, provider });
  } catch (e) {
    console.error("[AIALAN] Function error:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
