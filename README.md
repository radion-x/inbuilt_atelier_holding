# Inbuilt Atelier — Holding Page

Simple Express server that serves the under-construction landing page and forwards contact form submissions to Mailgun for Inbuilt Atelier.

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Mailgun details (API key, domain, recipients, from address).
3. Start the server:
   ```bash
   npm run dev
   ```
4. Visit http://localhost:4337 to verify the page.

## Deployment notes (Coolify)

- Set the environment variables from `.env.example` inside your Coolify application (especially `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_TO`, and `MAILGUN_FROM`).
- Ensure the service exposes port `3000` (or configure `PORT`).
- Provide a valid `MAILGUN_FROM` identity authorised for your Mailgun domain. `MAILGUN_API_KEY` should be the private API key (or a sending key) from Mailgun; `MAILGUN_USERNAME` stays `api` unless you have a specific reason to override it.
- If using Mailgun's EU region, set `MAILGUN_API_BASE=https://api.eu.mailgun.net`.

## API

`POST /api/contact`
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "0417431124",
  "message": "I'd like to book a consultation."
}
```

Successful requests return `{ "ok": true }`.
Validation errors return HTTP `422` with `{ ok: false, errors: { field: message } }`.
All other failures respond with `502` or `503` and an `error` message.
