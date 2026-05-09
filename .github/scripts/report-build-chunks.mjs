import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const distDir = path.resolve("dist");
const assetsDir = path.join(distDir, "assets");
const BYTE_UNITS = ["B", "KB", "MB", "GB"];
const LARGE_RAW_JS_KB = 250;
const LARGE_GZIP_JS_KB = 90;
const LARGE_RAW_CSS_KB = 80;
const LARGE_GZIP_CSS_KB = 28;

function formatBytes(value = 0) {
  let size = Number(value) || 0;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${BYTE_UNITS[unitIndex]}`;
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!entry.isFile()) return [];
    return [fullPath];
  });
}

function getAssetType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".js") return "js";
  if (ext === ".css") return "css";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico"].includes(ext)) return "image";
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(ext)) return "font";
  return ext.replace(/^\./, "") || "other";
}

function getRecommendation(asset) {
  if (asset.type === "js") {
    if (asset.rawKb >= LARGE_RAW_JS_KB || asset.gzipKb >= LARGE_GZIP_JS_KB) {
      if (/charts|recharts|d3/i.test(asset.name)) {
        return "CHECK: charts chunk. Keep lazy/route-only; avoid dashboard import.";
      }
      if (/document|jspdf|html2canvas|markdown/i.test(asset.name)) {
        return "CHECK: document/export chunk. Lazy-load only on export/document screens.";
      }
      if (/admin/i.test(asset.name)) {
        return "KEEP: admin chunk is route/admin-only; split tabs if still large.";
      }
      if (/dashboard/i.test(asset.name)) {
        return "CHECK: dashboard chunk. Look for direct panel/modal imports still bundled.";
      }
      if (/vendor|shared|ui|interaction|forms/i.test(asset.name)) {
        return "CHECK: vendor chunk. Audit unused dependency imports before removing packages.";
      }
      return "CHECK: large JS chunk. Consider route split, component lazy-load, or dependency audit.";
    }
    return "KEEP: JS chunk size is acceptable.";
  }

  if (asset.type === "css") {
    if (asset.rawKb >= LARGE_RAW_CSS_KB || asset.gzipKb >= LARGE_GZIP_CSS_KB) {
      return "CHECK: large CSS. Consider route-specific styles only if measurable.";
    }
    return "KEEP: CSS size is acceptable.";
  }

  if (asset.type === "image") {
    if (asset.rawKb >= 150) return "CHECK: large image asset. Compress or lazy-load if not above-the-fold.";
    return "KEEP: image size is acceptable.";
  }

  return "KEEP: not a concerning startup asset by default.";
}

function buildReport() {
  if (!fs.existsSync(distDir)) {
    console.error("❌ dist folder not found. Run `npm run build` first.");
    process.exit(1);
  }

  const files = walkFiles(distDir);
  const assets = files.map((filePath) => {
    const buffer = fs.readFileSync(filePath);
    const gzip = zlib.gzipSync(buffer, { level: 9 });
    const relativePath = path.relative(distDir, filePath).replaceAll(path.sep, "/");
    const type = getAssetType(filePath);
    const rawKb = buffer.length / 1024;
    const gzipKb = gzip.length / 1024;

    return {
      name: relativePath,
      type,
      rawBytes: buffer.length,
      gzipBytes: gzip.length,
      rawKb,
      gzipKb,
      recommendation: getRecommendation({
        name: relativePath,
        type,
        rawKb,
        gzipKb,
      }),
    };
  });

  const totalRaw = assets.reduce((sum, asset) => sum + asset.rawBytes, 0);
  const totalGzip = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
  const jsAssets = assets.filter((asset) => asset.type === "js");
  const cssAssets = assets.filter((asset) => asset.type === "css");
  const imageAssets = assets.filter((asset) => asset.type === "image");

  const concerning = assets
    .filter((asset) => !asset.recommendation.startsWith("KEEP"))
    .sort((a, b) => b.gzipBytes - a.gzipBytes);

  const topAssets = [...assets].sort((a, b) => b.gzipBytes - a.gzipBytes).slice(0, 25);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      files: assets.length,
      raw: formatBytes(totalRaw),
      gzip: formatBytes(totalGzip),
      jsFiles: jsAssets.length,
      jsRaw: formatBytes(jsAssets.reduce((sum, asset) => sum + asset.rawBytes, 0)),
      jsGzip: formatBytes(jsAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0)),
      cssFiles: cssAssets.length,
      cssRaw: formatBytes(cssAssets.reduce((sum, asset) => sum + asset.rawBytes, 0)),
      cssGzip: formatBytes(cssAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0)),
      imageFiles: imageAssets.length,
      imageRaw: formatBytes(imageAssets.reduce((sum, asset) => sum + asset.rawBytes, 0)),
      imageGzip: formatBytes(imageAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0)),
    },
    topAssets: topAssets.map((asset) => ({
      file: asset.name,
      type: asset.type,
      raw: formatBytes(asset.rawBytes),
      gzip: formatBytes(asset.gzipBytes),
      recommendation: asset.recommendation,
    })),
    concerning: concerning.map((asset) => ({
      file: asset.name,
      type: asset.type,
      raw: formatBytes(asset.rawBytes),
      gzip: formatBytes(asset.gzipBytes),
      recommendation: asset.recommendation,
    })),
  };
}

const report = buildReport();
const reportPath = path.resolve("dist", "clara-build-chunk-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("\nCLARA Build Chunk Report");
console.log("========================");
console.log(`Files: ${report.totals.files}`);
console.log(`Total raw: ${report.totals.raw}`);
console.log(`Total gzip: ${report.totals.gzip}`);
console.log(`JS raw/gzip: ${report.totals.jsRaw} / ${report.totals.jsGzip}`);
console.log(`CSS raw/gzip: ${report.totals.cssRaw} / ${report.totals.cssGzip}`);
console.log(`Images raw/gzip: ${report.totals.imageRaw} / ${report.totals.imageGzip}`);

console.log("\nTop assets by gzip size:");
report.topAssets.forEach((asset, index) => {
  console.log(
    `${String(index + 1).padStart(2, "0")}. ${asset.file} | raw ${asset.raw} | gzip ${asset.gzip} | ${asset.recommendation}`
  );
});

if (report.concerning.length) {
  console.log("\nConcerning assets to review:");
  report.concerning.forEach((asset, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")}. ${asset.file} | raw ${asset.raw} | gzip ${asset.gzip} | ${asset.recommendation}`
    );
  });
} else {
  console.log("\nNo concerning assets found based on the current thresholds.");
}

console.log(`\nJSON report written to ${path.relative(process.cwd(), reportPath)}`);
console.log("Next: paste the top assets here if you want the next cleanup decision based on real chunk sizes.\n");
