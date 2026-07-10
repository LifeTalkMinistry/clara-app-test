# Universal CLARA Account Backend

CLARA now has one provider-independent account contract for iPhone PWA, Android Capacitor, and normal web users.

## Security and data boundary

The custom account service stores only:

- account identity and account status
- signup platform
- password hashes
- server-authoritative sessions
- plan and subscription status
- administrator notes and safe audit summaries
- optional legacy iOS access-link metadata

It must never receive wallets, expenses, transactions, budgets, salaries, savings, emergency-fund details, spending reasons, AI financial memory, streak details, or feature-usage analytics. Those records remain device-local and are linked through an account-ID-to-local-vault-ID mapping on each installation.

Account login is not financial-data backup. Reinstalling CLARA does not restore device-local financial records unless a separate backup feature is built later.

## Required deployment order

1. Provision a PostgreSQL database.
2. Deploy the `server/` Node.js package behind HTTPS.
3. Configure all variables from `server/.env.example`.
4. Generate an Argon2id hash for the administrator password and set `CLARA_ADMIN_PASSWORD_HASH`.
5. Run `npm --prefix server run migrate`.
6. Set the frontend build variable:

   ```text
   VITE_CLARA_ACCOUNT_API_URL=https://accounts.example.com
   ```

7. Add the exact production frontend origins to `CLARA_ALLOWED_ORIGINS`.
8. Rebuild and deploy the GitHub Pages frontend and Android wrapper.

Until `VITE_CLARA_ACCOUNT_API_URL` is configured, production login remains visibly disabled. The frontend never falls back to a local fake global account database.

## Cookie and origin requirements

The API uses a short-lived access token in frontend memory and a rotating refresh credential in an HttpOnly cookie. Production must use HTTPS. For the GitHub Pages/PWA origin, the cookie uses `SameSite=None; Secure`; the API must return credentialed CORS headers only for exact approved origins.

Android Capacitor origins such as `capacitor://localhost` and local development origins must be explicitly listed when applicable. Do not use a wildcard CORS origin with credentials.

## Legacy iPhone access records

The old Supabase iPhone access-code runtime is deprecated and is no longer part of first launch. Do not delete its table or Edge Function until activated records are inspected and exported.

For each activated historical record that should be retained:

1. Export only safe legacy fields: record ID, code label, activated name/email, activation date, and an administrator note.
2. Insert those fields into `legacy_ios_access_links`.
3. Ask the legacy user to create a normal CLARA account.
4. Link the legacy record to that account from the administrator migration view or API.
5. Never import access-token hashes, administrator secrets, or plaintext codes as account credentials.

The repository cannot determine how many activated production records exist without access to the deployed legacy database. That inventory remains a deployment-time verification step.

## Environment variables

Frontend:

```text
VITE_CLARA_ACCOUNT_API_URL
```

Backend:

```text
NODE_ENV
PORT
DATABASE_URL
DATABASE_SSL
CLARA_ACCESS_TOKEN_SECRET
CLARA_ADMIN_ACCESS_TOKEN_SECRET
CLARA_ADMIN_PASSWORD_HASH
CLARA_ADMIN_IDENTIFIER
CLARA_ALLOWED_ORIGINS
CLARA_REFRESH_COOKIE_NAME
CLARA_ADMIN_REFRESH_COOKIE_NAME
CLARA_COOKIE_DOMAIN
CLARA_ACCESS_TOKEN_TTL_SECONDS
CLARA_REFRESH_TOKEN_TTL_DAYS
CLARA_ADMIN_TOKEN_TTL_SECONDS
CLARA_ADMIN_REFRESH_TOKEN_TTL_HOURS
CLARA_OFFLINE_GRACE_HOURS
TRUST_PROXY
```

Secrets must be supplied through the deployment platform. Do not commit production values.

## Local verification

Frontend:

```text
npm install
npm test
npm run lint
npm run build:web
npm run build:android
```

Backend:

```text
npm --prefix server install
npm --prefix server test
npm --prefix server run migrate
npm --prefix server start
```

A real database is required for migration and endpoint integration verification. The pure security and membership tests do not require a database.
