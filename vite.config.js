import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const claraIconSource = path.resolve(__dirname, "./assets/icon.png");
const claraIconsSource = path.resolve(__dirname, "./icons");
const claraPwaBuildMarker = "__CLARA_APP_BUILD__";
const claraReleaseBuildId = String(
  process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CI_COMMIT_SHA ||
    ""
).trim();

const claraWebManifest = JSON.stringify(
  {
    name: "CLARA",
    short_name: "CLARA",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "./icons/icon-192.webp",
        type: "image/webp",
        sizes: "192x192",
        purpose: "any maskable",
      },
      {
        src: "./icons/icon-512.webp",
        type: "image/webp",
        sizes: "512x512",
        purpose: "any maskable",
      },
    ],
  },
  null,
  2,
);

function claraPwaBranding() {
  const sendFile = (res, filePath, contentType) => {
    if (!fs.existsSync(filePath)) return false;
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-cache");
    fs.createReadStream(filePath).pipe(res);
    return true;
  };

  return {
    name: "clara-pwa-branding",
    enforce: "pre",

    transformIndexHtml(html) {
      const brandedIconLinks = [
        '<link rel="icon" type="image/png" href="./clara-icon.png?v=clara-official-20260810-2" />',
        '<link rel="apple-touch-icon" sizes="180x180" href="./clara-icon.png?v=clara-official-20260810-2" />',
        '<meta name="apple-mobile-web-app-capable" content="yes" />',
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
        '<meta name="apple-mobile-web-app-title" content="CLARA" />',
      ].join("\n    ");

      return html
        .replace(/<link\s+rel=["']icon["'][^>]*>/i, brandedIconLinks)
        .replace(
          /<link\s+rel=["']manifest["'][^>]*>/i,
          '<link rel="manifest" href="./manifest.webmanifest" />',
        );
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = String(req.url || "").split("?")[0];

        if (pathname.endsWith("/clara-icon.png")) {
          if (sendFile(res, claraIconSource, "image/png")) return;
        }

        if (pathname.endsWith("/manifest.webmanifest")) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.end(claraWebManifest);
          return;
        }

        next();
      });
    },

    writeBundle(outputOptions) {
      const outDir = path.resolve(__dirname, outputOptions.dir || "dist");
      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(claraIconSource, path.join(outDir, "clara-icon.png"));
      fs.writeFileSync(
        path.join(outDir, "manifest.webmanifest"),
        `${claraWebManifest}\n`,
        "utf8",
      );

      if (fs.existsSync(claraIconsSource)) {
        fs.cpSync(claraIconsSource, path.join(outDir, "icons"), {
          recursive: true,
        });
      }

      // Vercel builds Vite directly and does not run the GitHub Pages stamping
      // step. Stamp the copied production service worker in the actual bundle so
      // the browser never receives the raw __CLARA_APP_BUILD__ placeholder.
      const serviceWorkerOutput = path.join(outDir, "clara-task-reminder-sw.js");
      if (claraReleaseBuildId && fs.existsSync(serviceWorkerOutput)) {
        const source = fs.readFileSync(serviceWorkerOutput, "utf8");
        if (source.includes(claraPwaBuildMarker)) {
          fs.writeFileSync(
            serviceWorkerOutput,
            source.replaceAll(claraPwaBuildMarker, claraReleaseBuildId),
            "utf8",
          );
        }
      }

      if (claraReleaseBuildId) {
        fs.writeFileSync(
          path.join(outDir, "build-info.json"),
          `${JSON.stringify({
            commit: claraReleaseBuildId,
            builtAt: new Date().toISOString(),
          })}\n`,
          "utf8",
        );
      }
    },
  };
}

function getManualChunk(id) {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
    return "react-vendor";
  }

  if (id.includes("node_modules/react-router") || id.includes("@remix-run")) {
    return "router-vendor";
  }

  if (id.includes("node_modules/@tanstack/")) {
    return "query-vendor";
  }

  if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-")) {
    return "charts-vendor";
  }

  if (
    id.includes("node_modules/jspdf/") ||
    id.includes("node_modules/html2canvas/") ||
    id.includes("node_modules/react-markdown/")
  ) {
    return "document-vendor";
  }

  if (
    id.includes("node_modules/@radix-ui/") ||
    id.includes("node_modules/cmdk/") ||
    id.includes("node_modules/vaul/") ||
    id.includes("node_modules/embla-carousel-react/") ||
    id.includes("node_modules/react-day-picker/") ||
    id.includes("node_modules/react-resizable-panels/")
  ) {
    return "ui-vendor";
  }

  if (
    id.includes("node_modules/framer-motion/") ||
    id.includes("node_modules/canvas-confetti/") ||
    id.includes("node_modules/@hello-pangea/dnd/")
  ) {
    return "interaction-vendor";
  }

  if (
    id.includes("node_modules/react-hook-form/") ||
    id.includes("node_modules/@hookform/") ||
    id.includes("node_modules/zod/")
  ) {
    return "forms-vendor";
  }

  if (
    id.includes("node_modules/axios/") ||
    id.includes("node_modules/date-fns/") ||
    id.includes("node_modules/lodash/") ||
    id.includes("node_modules/lucide-react/") ||
    id.includes("node_modules/clsx/") ||
    id.includes("node_modules/class-variance-authority/") ||
    id.includes("node_modules/tailwind-merge/") ||
    id.includes("node_modules/sonner/") ||
    id.includes("node_modules/react-hot-toast/")
  ) {
    return "shared-vendor";
  }

  return undefined;
}

export default defineConfig({
  plugins: [claraPwaBranding(), react()],

  define: {
    "import.meta.env.VITE_CLARA_WELCOME_SESSION_FORM_URL": JSON.stringify(
      "https://forms.gle/58cJ2wJVpC4H5qFS8",
    ),
  },

  // IMPORTANT FOR ANDROID/CAPACITOR:
  // The app is loaded from local Android assets, not from https://domain/clara-app-test/.
  // A repository-path base makes the installed app look for JS/CSS in the wrong place,
  // which commonly results in a blank white screen after install.
  // Relative assets work for Capacitor and still work with the current HashRouter setup.
  base: "./",

  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
