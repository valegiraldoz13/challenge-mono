# Mono Wallet Demo (Netlify + Vanilla JS)

A simple wallet dashboard demo that matches Mono UI style.

## Features
- Dashboard: balance, quick actions, cards, activity
- Activity: grouped by date + in/out arrow icons
- Cards: list active cards + create a virtual card (API)
- Send money: choose saved recipients (e.g. "Mamá"), confirm, and show success receipt modal

## Demo UI mode
This project uses **UI demo data** for a realistic look (balance/cards/activity),
while still executing real API calls for:
- Topup (fund account)
- Transfer (account-to-account)
- Create virtual card

You can change this in `app.js`:
- `const DEMO_UI = true;`

## Deploy (Netlify)
Environment variables needed:
- `MONO_API_KEY` = your sandbox token (sandbox_...)
Optional:
- `MONO_BASE_URL` = https://api.sandbox.cuentamono.com

## API endpoints used
- GET `/v1/cards`
- GET `/v1/ledger/accounts/{account_id}/balances`
- POST `/v1/ledger/accounts/{account_id}/balance` (topup)
- POST `/v1/ledger/transfers`
- POST `/v1/ledger/cards`
