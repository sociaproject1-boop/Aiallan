# AIALAN — Cloudflare CDN

## Architecture

GitHub Pages stays as the website host.

The existing Supabase Storage bucket remains the origin for uploaded images.
The Cloudflare Worker is a read-only CDN proxy/cache in front of those public assets.

This means no Supabase service-role key or Cloudflare secret is placed in the website.

## Deployment

1. Create a Cloudflare Worker from `cloudflare-worker/worker.js`.
2. Attach a custom Worker domain such as `cdn.aiallan.shop`.
3. Make sure `aiallan.shop` DNS is managed by Cloudflare so that hostname can be attached.
4. Open `cdn-config.js` and change:
   `window.AIALLAN_CDN_BASE = '';`
   to:
   `window.AIALLAN_CDN_BASE = 'https://cdn.aiallan.shop';`
5. Commit/push the updated files to GitHub Pages.

## Behavior

Before CDN deployment, the site automatically uses the existing Supabase public URL.

After CDN deployment, public images from `site-assets` are automatically rewritten to the CDN URL.

Admin uploads still go through the existing Supabase Storage upload flow. The CDN is only the public delivery/cache layer.

R2 is intentionally not required for the first stage. This avoids changing the existing upload/database system while giving the public images edge caching.

## Security

Do NOT place a Supabase service-role key, Cloudflare API token, or R2 secret in `index.html` or `cdn-config.js`.
