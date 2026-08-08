# CLARA backend gateway

Production Android builds use `https://clara-app-test.vercel.app/clara-api` as the stable public API gateway.

Vercel rewrites that path to CLARA's assigned backend tunnel. This keeps the tunnel-provider URL out of the Android production configuration, so app builds continue using the same public API address.

The assigned backend origin is `https://groin-mothproof-sixties.ngrok-free.dev`. Unlike the old Cloudflare Quick Tunnel, this endpoint is intentionally fixed in `vercel.json` and should not be replaced during normal backend restarts.

The local CLARA backend and the ngrok tunnel process still need to be running on the backend PC. If either process is stopped, the stable Vercel gateway remains the same but cannot reach the local backend until those processes are started again.
