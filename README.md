# Mono Wallet Demo (HTML/CSS/JS + Netlify Functions)

## What it includes
- Dashboard: balance (COP), quick actions, cards preview, activity preview
- Activity page: list of recent movements (best-effort from API + local fallback)
- Cards page: list active cards + create a virtual card via API
- Send money: confirm screen + Success receipt modal with transaction id

## Deploy (Netlify)
1. Push this repo to GitHub
2. Create a new site in Netlify from GitHub
3. Add Environment Variables:
   - `MONO_API_KEY` = your sandbox token (DO NOT commit it)
   - Optional: `MONO_BASE_URL` = `https://api.sandbox.cuentamono.com`

## Local
You can use any static server for the front.
To run functions locally, use Netlify CLI (`netlify dev`) if you want.
