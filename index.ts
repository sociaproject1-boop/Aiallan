// Aiallan public website assistant — no admin data is returned.
// Required Supabase secrets for multilingual semantic replies:
//   OPENAI_API_KEY
// Optional: OPENAI_MODEL (defaults to gpt-5-mini)
// Deploy as: supabase functions deploy aiallan-assistant
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "https://aiallan.shop",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function cleanContext(input: any) {
  const categories = Array.isArray(input?.categories) ? input.categories.map((c:any) => ({
    name: String(c?.name || ""), thumb: String(c?.thumb || ""),
    products: Array.isArray(c?.products) ? c.products.map((p:any) => ({
      name:String(p?.name||""), url:String(p?.url||""), price:String(p?.price||""), caption:String(p?.caption||""), subcategory:String(p?.subcategory||""), thumb:String(p?.thumb||""), images:Array.isArray(p?.images)?p.images.map(String).slice(0,8):[]
    })).slice(0,200) : []
  })).slice(0,20) : [];
  return {
    site: "aiallan.shop",
    location: String(input?.location || ""),
    contactEmail: String(input?.contactEmail || ""),
    phone: String(input?.phone || ""),
    currentUrl: String(input?.currentUrl || ""),
    publicText: String(input?.publicText || "").slice(0,50000),
    profile: { name:String(input?.profile?.name||""), bio:String(input?.profile?.bio||"") },
    social: { fb:String(input?.social?.fb||""), ig:String(input?.social?.ig||""), tt:String(input?.social?.tt||""), yt:String(input?.social?.yt||""), tw:String(input?.social?.tw||"") },
    categories,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();
    const language = String(body?.language || "en");
    if (!question) return json({ error: "Question required" }, 400);
    const context = cleanContext(body?.context || {});
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "Assistant model is not configured" }, 503);
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-5-mini";
    const system = `You are the public Aiallan.shop website assistant. Answer ONLY from the supplied current public website context. Never reveal, infer, summarize, or mention admin-panel data, credentials, secrets, internal implementation, private user data, or hidden files. If a requested fact is not present in the context, say that it is not available on the current public website. Do not answer unrelated general-knowledge questions. For unrelated questions say, in the user's language, that the question may be mistaken and you can help only with Aiallan.shop. If the user asks why you can answer, explain only that you use information and content available on Aiallan.shop. Never say your replies are pre-programmed. For product requests, return actual matching products from context only. Keep product URLs exactly as supplied. Respond in the user's language (${language}) and use clear step-by-step instructions for buying/navigation questions. Do not claim a feature works if the context does not establish that it works.`;
    const user = `CURRENT PUBLIC WEBSITE CONTEXT:\n${JSON.stringify(context)}\n\nUSER QUESTION:\n${question}`;
    const r = await fetch("https://api.openai.com/v1/responses", { method:"POST", headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"}, body:JSON.stringify({model,input:[{role:"system",content:[{type:"input_text",text:system}]},{role:"user",content:[{type:"input_text",text:user}]}],temperature:0.2}) });
    const data = await r.json();
    if (!r.ok) return json({ error: "Assistant request failed" }, 502);
    const answer = String(data?.output_text || "").trim();
    if (!answer) return json({ error: "No answer" }, 502);
    // Product extraction is intentionally simple and safe: only products whose names appear in the model answer are returned.
    const all = context.categories.flatMap((c:any)=>c.products.map((p:any)=>({...p,category:c.name})));
    const products = all.filter((p:any)=>p.name && answer.toLowerCase().includes(String(p.name).toLowerCase())).slice(0,12);
    return json({ answer, products });
  } catch (e) {
    return json({ error: "Assistant unavailable" }, 500);
  }
});
