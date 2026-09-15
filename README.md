# Aiallan Public Assistant — Supabase Edge Function

This function is the optional semantic/multilingual layer for the public Support Assistant.

## Required Supabase secret

Set `OPENAI_API_KEY` in the Supabase project secrets. Optionally set `OPENAI_MODEL`.

Deploy the function as `aiallan-assistant` with the Supabase CLI.

The browser sends only public website context and the current public product catalog. The function must never receive or return admin credentials or admin-only data.

The frontend has a local fallback, so product matching from the current Supabase catalog and the public website assistant still work if the semantic function is temporarily unavailable.
