# CLARA App

CLARA is a Personal Money Coach and financial accountability app designed to help users make better everyday money decisions.

## Architecture

CLARA no longer uses Supabase as an application runtime or database client.

- **CLARA backend API** owns account authentication and server-owned features.
- **Device-local storage** owns private financial records such as wallets, budgets, expenses, savings goals, emergency-fund data, and other personal money context unless a feature explicitly uses a CLARA backend API.
- **Firebase / platform notification services** are reached through the CLARA backend for server push delivery.
- The frontend must not connect directly to a database provider.

The default backend is configured in `src/lib/clara-backend-client.js` and can be overridden for development with:

```bash
VITE_CLARA_API_URL=https://your-clara-backend.example.com
```

Web Push deployments may also provide the existing VAPID public-key environment variable when required by the notification setup.

## Getting Started

```bash
npm install
npm run dev
```

Before a production build, run:

```bash
npm test
npm run build
```

The test suite includes a regression guard that prevents the Supabase SDK, Supabase cloud environment variables, legacy Supabase edge-function directory, or cloud Supabase client from being reintroduced into the app.

## Android

For a fresh Android build:

```bash
npm install
npm run android:fresh
```

Native push registration uses Capacitor/Firebase on the device, while notification tokens and server delivery are handled through the CLARA backend.

## Product Principle

CLARA focuses on practical decision clarity and accountability. It is not intended to be an accounting-grade, real-time ledger or a financial institution.
