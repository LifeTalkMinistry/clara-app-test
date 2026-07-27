# CLARA backend gateway

Production Android builds use `https://clara-app-test.vercel.app/clara-api` as the stable public API gateway.

Vercel rewrites that path to the currently active backend tunnel. This intentionally keeps tunnel-provider URLs out of the Android production configuration so a backend tunnel can be replaced without changing the public API address used by future app builds.

The current origin is a Cloudflare Quick Tunnel and is temporary. Keep its `cloudflared tunnel --url http://localhost:3000` process running while it is in use.
