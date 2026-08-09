# CLARA backend gateway

Production CLARA clients now use `https://api.clarapmc.com` directly.

That hostname terminates at a persistent, named Cloudflare Tunnel running on the backend PC and routes to the local CLARA Node.js service at `http://127.0.0.1:3000`.

Production API traffic no longer depends on an ngrok hostname or a Vercel `/clara-api` rewrite. Vercel and GitHub Pages may still host frontend files, but the account, Community, Support, coaching, and other backend-authoritative requests go to the owned CLARA API hostname.

The root domain `clarapmc.com` remains available as CLARA's official public website. Other services may use subdomains such as `app.clarapmc.com` and `admin.clarapmc.com` without changing the backend hostname.

The backend PC remains the authority for Node.js, PostgreSQL, authentication, and server-side CLARA data. The `cloudflared` Windows service and the PM2 `clara-backend` process must remain running. If the PC, home internet, PostgreSQL, PM2 process, or Cloudflare Tunnel is unavailable, online CLARA backend features will be unavailable until the origin returns.
