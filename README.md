# CLARA App

CLARA is a financial behavior and accountability system designed to help users make better money decisions, build discipline, and protect their resources.

## Architecture

- Private finance data is local-first and stored in the CLARA IndexedDB vault.
- Authentication, account services, community, support, notifications, and other shared services use the CLARA Backend.
- The frontend does not depend on a third-party database client.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Configure the CLARA Backend URL

Create a `.env` file for local development when you need to override the default backend URL:

```bash
VITE_CLARA_API_URL=http://localhost:3000
```

Production uses the configured CLARA Backend endpoint. Do not place private server credentials in frontend environment variables.

### 3. Install and run

```bash
npm install
npm run dev
```

Build the production app with:

```bash
npm run build
```
