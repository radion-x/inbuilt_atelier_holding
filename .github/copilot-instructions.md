# Copilot Instructions for Confidental Holding Site

## Architecture Overview

This is a minimal Express.js holding page with a contact form that forwards submissions to Mailgun. The stack is intentionally lean:
- **Backend**: Single-file Express server (`server.js`) using ES modules
- **Frontend**: Vanilla HTML/CSS/JS in `public/` (no build step, no framework)
- **Email delivery**: Mailgun SDK with form-data adapter

Data flow: `public/script.js` → POST `/api/contact` → `server.js` validates/sanitizes → Mailgun API → email to `MAILGUN_TO` recipients.

## Environment Configuration

All config lives in `.env` (never committed). Required variables:
- `MAILGUN_API_KEY`: Private API key from Mailgun dashboard
- `MAILGUN_DOMAIN`: Verified sending domain (e.g., `mg.websited.org`)
- `MAILGUN_TO`: Comma-separated recipient emails
- `MAILGUN_FROM`: Authorized sender identity (must be verified in Mailgun)

Optional overrides: `MAILGUN_USERNAME` (defaults to `api`), `MAILGUN_API_BASE` (for EU region), `PORT` (defaults to 3000), `PAYLOAD_LIMIT` (defaults to 1mb).

## Validation Pattern

**Dual validation** (client + server) using shared logic:
- Client-side: `public/script.js` validators object (immediate feedback)
- Server-side: `validatePayload()` in `server.js` (security boundary)

Both enforce: name ≥2 chars, valid email pattern, message ≥10 chars, phone ≥6 chars if provided. Server returns HTTP 422 with `{ ok: false, errors: { field: "message" } }` for validation failures.

## Error Handling Strategy

Express error middleware catches:
- `SyntaxError` → 400 (malformed JSON)
- Mailgun failures → 502 with generic message (don't leak internals)
- Missing Mailgun config → 503 on POST (server logs warning on startup)
- 404 for unknown `/api/*` routes

Client-side: `script.js` displays server errors in status mount, shows validation errors inline via `[data-error-for]` elements.

## Development Workflow

**No build step required** – edit and refresh:
1. `npm run dev` starts server with nodemon-style behavior (manual restarts)
2. Visit `http://localhost:3000` to test form
3. Check `server.log` for runtime issues (if logging added)
4. Test email delivery with real Mailgun credentials or use console.log for local dev

**Key files to modify**:
- Form validation rules: update both `server.js` `validatePayload()` AND `public/script.js` validators
- Email template: edit `server.js` textLines/htmlLines arrays
- Styling: `public/styles.css` (no preprocessor)

## Deployment (Coolify)

This app is designed for Coolify deployment:
- Set all `.env` variables in Coolify's environment config
- Expose port 3000 (or override with `PORT` env var)
- No build command needed – `npm start` runs `NODE_ENV=production node server.js`
- Static assets served directly by Express (no CDN/reverse proxy assumed)

For EU Mailgun region: set `MAILGUN_API_BASE=https://api.eu.mailgun.net`.

## API Contract

Single endpoint: `POST /api/contact`

**Request body** (JSON):
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com", 
  "phone": "+61 400 000 000",
  "message": "I'd like to book a consultation."
}
```

**Responses**:
- 200: `{ "ok": true }` – email sent
- 422: `{ "ok": false, "errors": { "field": "message" } }` – validation failed
- 502: `{ "ok": false, "error": "Unable to send email..." }` – Mailgun API error
- 503: `{ "ok": false, "error": "Mailgun configuration missing..." }` – env vars not set

## Conventions & Patterns

- **ES modules**: Use `import/export`, not `require()`. Note `__dirname` is manually derived from `import.meta.url`
- **Sanitization**: All user input passes through `sanitize()` before validation/use
- **Mailgun client init**: Happens at module level – server won't start without valid config (fails fast)
- **SPA fallback**: `GET *` (except `/api/*`) serves `public/index.html` for client-side routing (future-proofing)
- **No external CSS frameworks**: Custom CSS using Google Fonts (Montserrat, Playfair Display)

## Testing Approach

No automated tests currently. Manual testing checklist:
1. Submit valid form → verify email received at `MAILGUN_TO`
2. Submit with missing/invalid fields → check inline error messages appear
3. Stop Mailgun service → verify 502 error with user-friendly message
4. Remove `MAILGUN_API_KEY` from env → verify 503 on submission
5. Send malformed JSON → verify 400 response

When adding tests: consider Supertest for API endpoints, validate both success/error paths.
