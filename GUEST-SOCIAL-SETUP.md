# Aiallan Guests — social profile connection

This feature adds a consent-based “Guests of Aiallan” wall. It does **not** inspect which app a visitor last opened and it never stores a social OAuth access token in `guest_profiles`.

## What is automatic

- A visitor can click a platform button and authorize Aiallan.
- After a successful authorization, the Edge Function fetches the permitted profile fields and publishes a sanitized guest card.
- TikTok can provide avatar, display name, username, verification and follower count when the required scopes are approved.
- Instagram can provide basic profile data for Professional (Business/Creator) accounts; follower count availability depends on the current Meta API access/permissions.
- YouTube can provide the authorized channel's avatar, title, public subscriber count and channel country when set.
- Facebook Login can provide basic public profile name and picture. A personal Facebook follower count/country is not assumed.
- Referral/source detection on the browser can label visits that arrive from TikTok, Instagram, YouTube or Facebook, but it never reveals the visitor's private account.

## Required Supabase setup

1. Run `supabase/migrations/20260912_guest_profiles.sql` in the Supabase SQL editor.
2. Deploy `supabase/functions/guest-social/index.ts` as the Edge Function named `guest-social`.
3. Add these Supabase Edge Function secrets. **Never put client secrets in `index.html` or `guest-social.js`.**

```text
AIALLAN_SITE_URL=https://aiallan.shop
AIALLAN_GUEST_STATE_SECRET=<long-random-secret>
META_GRAPH_VERSION=v25.0
TIKTOK_CLIENT_KEY=<TikTok client key>
TIKTOK_CLIENT_SECRET=<TikTok client secret>
META_INSTAGRAM_APP_ID=<Instagram App ID>
META_INSTAGRAM_APP_SECRET=<Instagram App Secret>
META_FACEBOOK_APP_ID=<Facebook App ID>
META_FACEBOOK_APP_SECRET=<Facebook App Secret>
GOOGLE_CLIENT_ID=<Google OAuth Web client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth Web client secret>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are normally supplied automatically to a Supabase Edge Function. Do not copy the service-role key into the website.

## OAuth callback URLs

Register the following callback URL with each provider:

```text
https://tqtmssdjfptmbvjtxien.supabase.co/functions/v1/guest-social/callback/tiktok
https://tqtmssdjfptmbvjtxien.supabase.co/functions/v1/guest-social/callback/instagram
https://tqtmssdjfptmbvjtxien.supabase.co/functions/v1/guest-social/callback/facebook
https://tqtmssdjfptmbvjtxien.supabase.co/functions/v1/guest-social/callback/youtube
```

The callback URL must match the provider's registered URL exactly. TikTok's current web Login Kit requires an HTTPS static redirect URI and server-side token exchange. Additional TikTok user-info scopes beyond the basic profile require the appropriate app approval.

## Provider notes

### TikTok

Request/approve:
- `user.info.basic`
- `user.info.profile`
- `user.info.stats`

TikTok's current User Info API documents avatar, display name, username, profile link, verification and follower count under those scopes. If the extra scopes are not approved, the function falls back to basic profile fields instead of breaking the whole site.

### Instagram

Use **Instagram API with Instagram Login** and the current `instagram_business_basic` permission. This path is for Instagram Professional accounts (Business/Creator), not ordinary consumer accounts. The code deliberately does not request publishing, messaging or comment permissions because the guest wall only needs profile data.

### Facebook

Use Facebook Login with `public_profile`. This guest wall only requests basic public profile information. It does not request friends, posts, messages or other unrelated permissions.

### YouTube

Create a Google OAuth 2.0 Web Application and enable YouTube Data API v3. The guest wall requests `youtube.readonly` so it can retrieve the authenticated user's own channel. YouTube channel data can include thumbnail, title, subscriber count and channel country when available.

## Safety / privacy design

- No social access token is stored in `guest_profiles`.
- The browser never receives client secrets.
- OAuth `state` is signed server-side and expires after 10 minutes.
- Only sanitized public-card fields are stored.
- The table exposes only active cards to public readers through RLS.
- A visitor is never silently identified by the website merely because TikTok/Instagram/Facebook/YouTube is installed or was last opened.
