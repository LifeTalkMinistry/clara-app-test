import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, "src");
const reportPath = path.resolve(projectRoot, "react-render-risk-report.json");

const HIGH_LINE_COUNT = 700;
const MEDIUM_LINE_COUNT = 350;
const HIGH_JSX_MAP_COUNT = 8;
const MEDIUM_JSX_MAP_COUNT = 4;
const HIGH_INLINE_HANDLER_COUNT = 20;
const MEDIUM_INLINE_HANDLER_COUNT = 10;
const HIGH_USE_EFFECT_COUNT = 8;
const MEDIUM_USE_EFFECT_COUNT = 4;

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", "android"].includes(entry.name)) {
        return [];
      }
      return walkFiles(fullPath);
    }

    if (!entry.isFile()) return [];

    const ext = path.extname(entry.name).toLowerCase();
    if (![".jsx", ".tsx", ".js", ".ts"].includes(ext)) return [];

    return [fullPath];
  });
}

function countMatches(content, regex) {
  return [...String(content || "").matchAll(regex)].length;
}

function getRiskLevel(score) {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (score >= 15) return "LOW";
  return "KEEP";
}

function getComponentPriority(file) {
  const normalized = file.toLowerCase();
  if (normalized.includes("dashboard")) return 1;
  if (normalized.includes("transactionhub")) return 2;
  if (normalized.includes("messages")) return 3;
  if (normalized.includes("feed")) return 4;
  if (normalized.includes("settings")) return 5;
  return 9;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
  const lines = content.split("\n").length;
  const isLikelyComponent = /export\s+default\s+function|function\s+[A-Z]|const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\(/.test(content);
  const hasReactImport = /from\s+["']react["']/.test(content);
  const jsxLike = /<[A-Z][A-Za-z0-9]*|<div|<section|<article|<button|<form/.test(content);

  if (!isLikelyComponent && !hasReactImport && !jsxLike) return null;

  const metrics = {
    lines,
    useMemo: countMatches(content, /\buseMemo\s*\(/g),
    useCallback: countMatches(content, /\buseCallback\s*\(/g),
    useEffect: countMatches(content, /\buseEffect\s*\(/g),
    useState: countMatches(content, /\buseState\s*\(/g),
    jsxMaps: countMatches(content, /\.map\s*\(\s*\(?[A-Za-z0-9_$,\s{}]*\)?\s*=>\s*\(?\s*</g),
    inlineHandlers: countMatches(content, /on[A-Z][A-Za-z0-9]*=\{\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)?\s*=>/g),
    inlineObjects: countMatches(content, /=\{\s*\{[\s\S]{0,120}?\}\s*\}/g),
    inlineArrays: countMatches(content, /=\{\s*\[[\s\S]{0,160}?\]\s*\}/g),
    reduceCalls: countMatches(content, /\.reduce\s*\(/g),
    sortCalls: countMatches(content, /\.sort\s*\(/g),
    filterCalls: countMatches(content, /\.filter\s*\(/g),
    expensiveDateCalls: countMatches(content, /new\s+Date\s*\(/g),
    contextUsage: countMatches(content, /useContext\s*\(|useUserRole\s*\(|useAuth\s*\(/g),
    portalUsage: countMatches(content, /createPortal\s*\(/g),
    realtimeUsage: countMatches(content, /supabase\.channel\s*\(|postgres_changes|subscribe\s*\(/g),
    localStorageUsage: countMatches(content, /localStorage\./g),
  };

  const findings = [];
  let score = 0;

  if (metrics.lines >= HIGH_LINE_COUNT) {
    score += 25;
    findings.push("Large component/file. Split by visible sections or hooks only if behavior stays identical.");
  } else if (metrics.lines >= MEDIUM_LINE_COUNT) {
    score += 12;
    findings.push("Medium-large component. Keep watch for readability and render cost.");
  }

  if (metrics.jsxMaps >= HIGH_JSX_MAP_COUNT) {
    score += 20;
    findings.push("Many JSX list renders. Consider memoized child rows or virtualization if lists grow.");
  } else if (metrics.jsxMaps >= MEDIUM_JSX_MAP_COUNT) {
    score += 10;
    findings.push("Several JSX list renders. Ensure arrays are memoized and keys are stable.");
  }

  if (metrics.inlineHandlers >= HIGH_INLINE_HANDLER_COUNT) {
    score += 18;
    findings.push("Many inline JSX handlers. Consider stable callbacks only for hot child components.");
  } else if (metrics.inlineHandlers >= MEDIUM_INLINE_HANDLER_COUNT) {
    score += 8;
    findings.push("Some inline JSX handlers. Usually okay unless passed to memoized children.");
  }

  if (metrics.useEffect >= HIGH_USE_EFFECT_COUNT) {
    score += 16;
    findings.push("Many effects. Check for duplicate fetches, subscriptions, and dependency churn.");
  } else if (metrics.useEffect >= MEDIUM_USE_EFFECT_COUNT) {
    score += 7;
    findings.push("Several effects. Verify cleanup and dependency stability.");
  }

  if (metrics.reduceCalls + metrics.sortCalls + metrics.filterCalls >= 18) {
    score += 14;
    findings.push("Many array derivations. Ensure expensive derived data is inside useMemo.");
  } else if (metrics.reduceCalls + metrics.sortCalls + metrics.filterCalls >= 9) {
    score += 7;
    findings.push("Moderate array derivation usage. Watch repeated calculations on render.");
  }

  if (metrics.expensiveDateCalls >= 20) {
    score += 10;
    findings.push("Many Date constructions. Memoize date formatting/grouping if used in render loops.");
  }

  if (metrics.portalUsage > 0) {
    score += 5;
    findings.push("Uses portal overlays. Good candidate for conditional/lazy overlay split.");
  }

  if (metrics.realtimeUsage > 0) {
    score += 8;
    findings.push("Uses realtime subscriptions. Verify subscription is lazy and cleaned up.");
  }

  if (metrics.contextUsage >= 3) {
    score += 6;
    findings.push("Multiple context/global hook usages. Watch broad context updates causing re-renders.");
  }

  if (metrics.localStorageUsage > 0 && relativePath.toLowerCase().includes("finance")) {
    score += 20;
    findings.push("Finance-related localStorage usage found. Verify this does not violate offline-first IndexedDB rules.");
  }

  const risk = getRiskLevel(score);
  let recommendation = "KEEP";
  let safestNextAction = "No render optimization needed right now.";

  if (risk === "HIGH") {
    recommendation = "AUDIT / SPLIT CAREFULLY";
    safestNextAction = "Inspect this file manually, then extract only isolated UI overlays/lists or memoize derived arrays. Do not rewrite behavior.";
  } else if (risk === "MEDIUM") {
    recommendation = "CHECK";
    safestNextAction = "Run through hot interactions and memoize/split only if real lag is observed.";
  } else if (risk === "LOW") {
    recommendation = "KEEP WATCH";
    safestNextAction = "Keep as-is unless build/runtime testing shows lag.";
  }

  return {
    file: relativePath,
    priority: getComponentPriority(relativePath),
    risk,
    score,
    recommendation,
    safestNextAction,
    metrics,
    findings,
  };
}

function audit() {
  if (!fs.existsSync(srcDir)) {
    fail("src folder not found. Run this script from the project root.");
  }

  const files = walkFiles(srcDir);
  const results = files
    .map(analyzeFile)
    .filter(Boolean)
    .sort((a, b) => {
      const riskRank = { HIGH: 0, MEDIUM: 1, LOW: 2, KEEP: 3 };
      const rankDiff = (riskRank[a.risk] ?? 9) - (riskRank[b.risk] ?? 9);
      if (rankDiff !== 0) return rankDiff;
      const priorityDiff = a.priority - b.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.score - a.score;
    });

  const report = {
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    analyzedReactLikeFiles: results.length,
    summary: {
      highRisk: results.filter((item) => item.risk === "HIGH").length,
      mediumRisk: results.filter((item) => item.risk === "MEDIUM").length,
      lowRisk: results.filter((item) => item.risk === "LOW").length,
      keep: results.filter((item) => item.risk === "KEEP").length,
    },
    topFindings: results.slice(0, 30),
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\nCLARA React Render Risk Audit");
  console.log("=============================");
  console.log(`Scanned files: ${report.scannedFiles}`);
  console.log(`React-like files analyzed: ${report.analyzedReactLikeFiles}`);
  console.log(
    `Risk summary: HIGH ${report.summary.highRisk} | MEDIUM ${report.summary.mediumRisk} | LOW ${report.summary.lowRisk} | KEEP ${report.summary.keep}`
  );

  console.log("\nTop render-risk files:");
  report.topFindings.forEach((item, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")}. ${item.file} | ${item.risk} | score ${item.score} | ${item.recommendation}`
    );
    console.log(`    Next: ${item.safestNextAction}`);
    item.findings.slice(0, 4).forEach((finding) => console.log(`    - ${finding}`));
  });

  console.log(`\nJSON report written to ${path.relative(projectRoot, reportPath)}`);
  console.log("Next: test the HIGH files on-device before changing code.\n");
}

audit();
