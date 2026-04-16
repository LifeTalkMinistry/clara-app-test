import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

function getManualChunk(id) {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
    return "react-vendor";
  }

  if (id.includes("node_modules/react-router") || id.includes("@remix-run")) {
    return "router-vendor";
  }

  if (id.includes("node_modules/@supabase/")) {
    return "supabase-vendor";
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
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
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