import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, "src");
const reportPath = path.resolve(projectRoot, "offline-finance-performance-report.json");

const FINANCE_PATH_PATTERNS = [
  "src/hooks/useFinancialData.js",
  "src/lib/financeRepository.js",
  "src/lib/localFinanceStore.js",
  "src/utils/financialEngine",
  "src/components/fresh/main-dashboard/finance-actions",
  "src/components/fresh/main-dashboard/assistant",
  "src/pages/TransactionHub.jsx",
  "src/pages/Dashboard.jsx",
];

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
    if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) return [];

    const relativePath = path.relative(projectRoot, fullPath).replaceAll(path.sep, "/");
    const isFinanceRelated = FINANCE_PATH_PATTERNS.some((pattern) =>
      relativePath.startsWith(pattern) || relativePath.includes(pattern)
    );

    return isFinanceRelated ? [fullPath] : [];
  });
}

function countMatches(content, regex) {
  return [...String(content || "").matchAll(regex)].length;
}

function getLineMatches(content, regex) {
  const lines = content.split("\n");
  return lines
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((item) => regex.test(item.text));
}

function getRisk(score) {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (score >= 15) return "LOW";
  return "KEEP";
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
  const lines = content.split("\n").length;

  const metrics = {
    lines,
    indexedDbOpen: countMatches(content, /indexedDB\.open\s*\(/g),
    getAllCalls: countMatches(content, /\.getAll\s*\(/g),
    getCalls: countMatches(content, /\.get\s*\(/g),
    putCalls: countMatches(content, /\.put\s*\(/g),
    deleteCalls: countMatches(content, /\.delete\s*\(/g),
    transactionCalls: countMatches(content, /\.transaction\s*\(/g),
    promiseAllCalls: countMatches(content, /Promise\.all\s*\(/g),
    refreshDataCalls: countMatches(content, /refreshData\s*\(/g),
    loadAllCalls: countMatches(content, /loadAll\s*\(/g),
    fullSorts: countMatches(content, /\.sort\s*\(/g),
    fullFilters: countMatches(content, /\.filter\s*\(/g),
    fullMaps: countMatches(content, /\.map\s*\(/g),
    fullReduces: countMatches(content, /\.reduce\s*\(/g),
    jsonStringify: countMatches(content, /JSON\.stringify\s*\(/g),
    jsonParse: countMatches(content, /JSON\.parse\s*\(/g),
    localStorage: countMatches(content, /localStorage\./g),
    sessionStorage: countMatches(content, /sessionStorage\./g),
    consoleError: countMatches(content, /console\.error\s*\(/g),
    dateConstruction: countMatches(content, /new\s+Date\s*\(/g),
    setStateCalls: countMatches(content, /\bset[A-Z][A-Za-z0-9_]*\s*\(/g),
  };

  const suspiciousLines = [
    ...getLineMatches(content, /localStorage\.|sessionStorage\./g).map((item) => ({
      ...item,
      type: "storage",
      note: "Storage usage found in finance-related file. Verify this is not finance data persistence.",
    })),
    ...getLineMatches(content, /refreshData\s*\(\s*\)/g).map((item) => ({
      ...item,
      type: "refresh",
      note: "Direct refresh call. Verify repeated writes are not triggering full hydration too often.",
    })),
    ...getLineMatches(content, /getAll\s*\(/g).map((item) => ({
      ...item,
      type: "indexeddb-getall",
      note: "Full-store read. Fine for small local data, but monitor if records grow.",
    })),
  ].slice(0, 40);

  const findings = [];
  let score = 0;

  if (metrics.getAllCalls >= 6) {
    score += 20;
    findings.push("Several IndexedDB getAll/full-store reads. Consider indexed queries or cache reuse if data grows.");
  } else if (metrics.getAllCalls >= 3) {
    score += 10;
    findings.push("Multiple full-store reads. Keep if local data remains small; monitor real-device timing.");
  }

  if (metrics.refreshDataCalls >= 12) {
    score += 20;
    findings.push("Many refreshData calls. Check whether write operations trigger repeated full reloads.");
  } else if (metrics.refreshDataCalls >= 6) {
    score += 10;
    findings.push("Several refreshData calls. Acceptable, but batching writes may help later.");
  }

  const arrayWork = metrics.fullSorts + metrics.fullFilters + metrics.fullMaps + metrics.fullReduces;
  if (arrayWork >= 35) {
    score += 22;
    findings.push("Heavy array processing. Memoize derived finance views and avoid recomputing inside render loops.");
  } else if (arrayWork >= 18) {
    score += 12;
    findings.push("Moderate array processing. Watch transaction-heavy users.");
  }

  if (metrics.promiseAllCalls >= 3) {
    score += 8;
    findings.push("Parallel hydration/fetch detected. Good for speed, but check duplicate simultaneous refreshes.");
  }

  if (metrics.jsonStringify + metrics.jsonParse >= 8) {
    score += 8;
    findings.push("JSON serialization used frequently. Verify it is not in hot render paths.");
  }

  if (metrics.localStorage > 0 && relativePath.toLowerCase().includes("finance")) {
    score += 30;
    findings.push("localStorage found in finance-related path. Finance data should remain IndexedDB/offline-first.");
  }

  if (metrics.dateConstruction >= 25) {
    score += 8;
    findings.push("Many Date constructions. Cache month/date keys when processing large transaction lists.");
  }

  if (relativePath.endsWith("useFinancialData.js")) {
    score += 8;
    findings.push("Core hydration hook. Keep behavior stable; optimize only with measurement.");
  }

  if (relativePath.endsWith("localFinanceStore.js")) {
    score += 8;
    findings.push("Core IndexedDB layer. Do not rewrite unless report shows measurable bottleneck.");
  }

  const risk = getRisk(score);
  const recommendation =
    risk === "HIGH"
      ? "MEASURE / OPTIMIZE CAREFULLY"
      : risk === "MEDIUM"
        ? "MONITOR / TARGETED OPTIMIZATION"
        : risk === "LOW"
          ? "KEEP WATCH"
          : "KEEP";

  const safestNextAction =
    risk === "HIGH"
      ? "Add timing logs around hydration/refresh first. Do not rewrite persistence logic yet."
      : risk === "MEDIUM"
        ? "Test with 500+ expenses/wallet transactions before changing logic."
        : risk === "LOW"
          ? "Keep as-is unless real-device testing shows lag."
          : "No action needed.";

  return {
    file: relativePath,
    risk,
    score,
    recommendation,
    safestNextAction,
    metrics,
    findings,
    suspiciousLines,
  };
}

function audit() {
  if (!fs.existsSync(srcDir)) {
    fail("src folder not found. Run this script from the project root.");
  }

  const files = walkFiles(srcDir);
  const results = files
    .map(analyzeFile)
    .sort((a, b) => {
      const riskRank = { HIGH: 0, MEDIUM: 1, LOW: 2, KEEP: 3 };
      const riskDiff = (riskRank[a.risk] ?? 99) - (riskRank[b.risk] ?? 99);
      if (riskDiff !== 0) return riskDiff;
      return b.score - a.score;
    });

  const report = {
    generatedAt: new Date().toISOString(),
    scannedFinanceRelatedFiles: files.length,
    summary: {
      highRisk: results.filter((item) => item.risk === "HIGH").length,
      mediumRisk: results.filter((item) => item.risk === "MEDIUM").length,
      lowRisk: results.filter((item) => item.risk === "LOW").length,
      keep: results.filter((item) => item.risk === "KEEP").length,
      filesWithLocalStorage: results
        .filter((item) => item.metrics.localStorage > 0)
        .map((item) => item.file),
      filesWithFullStoreReads: results
        .filter((item) => item.metrics.getAllCalls > 0)
        .map((item) => item.file),
    },
    topFindings: results.slice(0, 25),
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\nCLARA Offline Finance Performance Audit");
  console.log("=======================================");
  console.log(`Finance-related files scanned: ${report.scannedFinanceRelatedFiles}`);
  console.log(
    `Risk summary: HIGH ${report.summary.highRisk} | MEDIUM ${report.summary.mediumRisk} | LOW ${report.summary.lowRisk} | KEEP ${report.summary.keep}`
  );

  if (report.summary.filesWithLocalStorage.length) {
    console.log("\nFinance-related files using localStorage/sessionStorage:");
    report.summary.filesWithLocalStorage.forEach((file) => console.log(`- ${file}`));
  }

  console.log("\nTop offline finance risk files:");
  report.topFindings.forEach((item, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")}. ${item.file} | ${item.risk} | score ${item.score} | ${item.recommendation}`
    );
    console.log(`    Next: ${item.safestNextAction}`);
    item.findings.slice(0, 4).forEach((finding) => console.log(`    - ${finding}`));
  });

  console.log(`\nJSON report written to ${path.relative(projectRoot, reportPath)}`);
  console.log("Next: if HIGH appears, add timing instrumentation before changing finance logic.\n");
}

audit();
