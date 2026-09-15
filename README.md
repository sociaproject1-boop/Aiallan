# Allan Assistant — Gemini + OpenRouter

Public AI support assistant for Aiallan.shop.

## Providers
- Primary: Google Gemini API
- Fallback: OpenRouter Free (`openrouter/free`)

## Supabase secrets
Set these in Supabase Edge Function Secrets:
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`

Do not place API keys in frontend code or commit them to GitHub.

## Function
`aiallan-assistant`

The frontend sends the user's question, recent conversation history, catalog context, and language preference to this Edge Function.

The function returns:
- `answer`
- `productIds`
- `provider`

Product IDs are validated against the catalog supplied by the website.
