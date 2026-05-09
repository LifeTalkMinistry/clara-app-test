import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, "src");
const reportPath = path.resolve(projectRoot, "supabase-realtime-usage-report.json");

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

    return [fullPath];
  });
}

function countMatches(content, regex) {
  return [...String(content || "").matchAll(regex)].length;
}

function getLineMatches(content, regex) {
  return content
    .split("\n")
    .map((text, index) => ({ line: index + 1, text: text.trim() }))
    .filter((item) => regex.test(item.text));
}

function getRisk(score) {
  if (score >= 70) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (score >= 15) return "LOW";
  return "KEEP";
}

function classifyFilePath(relativePath) {
  const file = relativePath.toLowerCase();
  if (file.includes("main.jsx") || file.includes("app.jsx") || file.includes("layout")) return "startup/global";
  if (file.includes("dashboard")) return "dashboard";
  if (file.includes("messages")) return "messages";
  if (file.includes("feed")) return "feed";
  if (file.includes("admin")) return "admin";
  if (file.includes("hooks")) return "hook";
  return "feature";
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, "/");

  const hasSupabase = /supabase\./.test(content);
  const hasRealtime = /supabase\.channel|postgres_changes|\.subscribe\s*\(/.test(content);
  const hasAuthListener = /onAuthStateChange/.test(content);

  if (!hasSupabase && !hasRealtime && !hasAuthListener) return null;

  const metrics = {
    supabaseCalls: countMatches(content, /supabase\./g),
    channels: countMatches(content, /supabase\.channel\s*\(/g),
    postgresChanges: countMatches(content, /postgres_changes/g),
    subscribeCalls: countMatches(content, /\.subscribe\s*\(/g),
    removeChannelCalls: countMatches(content, /supabase\.removeChannel\s*\(/g),
    unsubscribeCalls: countMatches(content, /\.unsubscribe\s*\(/g),
    authStateListeners: countMatches(content, /onAuthStateChange\s*\(/g),
    useEffectCalls: countMatches(content, /\buseEffect\s*\(/g),
    useCallbackCalls: countMatches(content, /\buseCallback\s*\(/g),
    selectCalls: countMatches(content, /\.select\s*\(/g),
    insertCalls: countMatches(content, /\.insert\s*\(/g),
    updateCalls: countMatches(content, /\.update\s*\(/g),
    deleteCalls: countMatches(content, /\.delete\s*\(/g),
    orderCalls: countMatches(content, /\.order\s*\(/g),
    maybeSingleCalls: countMatches(content, /\.maybeSingle\s*\(/g),
  };

  const lineFindings = [
    ...getLineMatches(content, /supabase\.channel\s*\(/g).map((item) => ({
      ...item,
      type: "channel",
      note: "Realtime channel created here. Verify it only mounts when the feature is visible.",
    })),
    ...getLineMatches(content, /postgres_changes/g).map((item) => ({
      ...item,
      type: "postgres_changes",
      note: "Database realtime listener. Verify table scope is narrow and cleanup exists.",
    })),
    ...getLineMatches(content, /onAuthStateChange\s*\(/g).map((item) => ({
      ...item,
      type: "auth-listener",
      note: "Auth listener. Usually KEEP if in AuthContext; avoid duplicates elsewhere.",
    })),
    ...getLineMatches(content, /supabase\.removeChannel\s*\(|\.unsubscribe\s*\(/g).map((item) => ({
      ...item,
      type: "cleanup",
      note: "Cleanup found.",
    })),
  ];

  const category = classifyFilePath(relativePath);
  const findings = [];
  let score = 0;

  if (metrics.channels > 0 || metrics.subscribeCalls > 0) {
    score += 18;
    findings.push("Realtime subscription/channel usage found. Verify it is lazy and route/feature scoped.");
  }

  if (metrics.channels > metrics.removeChannelCalls + metrics.unsubscribeCalls) {
    score += 22;
    findings.push("Possible missing cleanup: channel/subscribe count is higher than removeChannel/unsubscribe count.");
  }

  if (category === "startup/global" && (metrics.channels > 0 || metrics.subscribeCalls > 0)) {
    score += 30;
    findings.push("Realtime is used in startup/global path. This can affect every route and Android battery/memory.");
  }

  if (category === "dashboard" && (metrics.channels > 0 || metrics.subscribeCalls > 0)) {
    score += 16;
    findings.push("Realtime is used in dashboard path. Ensure it is tied to active panel visibility, not dashboard first paint.");
  }

  if (metrics.authStateListeners > 0) {
    score += category === "startup/global" ? 8 : 18;
    findings.push("Auth state listener found. Keep centralized; avoid duplicate listeners outside AuthContext/main auth boot.");
  }

  if (metrics.supabaseCalls >= 20) {
    score += 14;
    findings.push("Many Supabase calls in one file. Consider separating services/hooks if this route feels slow.");
  } else if (metrics.supabaseCalls >= 10) {
    score += 8;
    findings.push("Moderate Supabase call count. Watch route load and repeated fetch behavior.");
  }

  if (metrics.selectCalls >= 5 && metrics.useEffectCalls >= 4) {
    score += 10;
    findings.push("Multiple reads and effects. Check for duplicate fetches during mount or dependency churn.");
  }

  if (metrics.postgresChanges > 0 && !/filter|eq\.|in\.|match\./.test(content)) {
    score += 8;
    findings.push("Realtime listener may be broad. Verify it is scoped to the current user/conversation/feed where possible.");
  }

  const risk = getRisk(score);
  const recommendation =
    risk === "HIGH"
      ? "OPTIMIZE / SCOPE REALTIME"
      : risk === "MEDIUM"
        ? "CHECK / LAZY REALTIME"
        : risk === "LOW"
          ? "KEEP WATCH"
          : "KEEP";

  const safestNextAction =
    risk === "HIGH"
      ? "Manually inspect cleanup and mount conditions. Move realtime setup behind active route/panel visibility before changing behavior."
      : risk === "MEDIUM"
        ? "Confirm subscription cleanup and avoid mounting until the relevant panel/page is opened."
        : risk === "LOW"
          ? "Keep as-is unless real-device testing shows memory/battery/network issues."
          : "No action needed.";

  return {
    file: relativePath,
    category,
    risk,
    score,
    recommendation,
    safestNextAction,
    metrics,
    findings,
    lineFindings: lineFindings.slice(0, 50),
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
      const riskDiff = (riskRank[a.risk] ?? 99) - (riskRank[b.risk] ?? 99);
      if (riskDiff !== 0) return riskDiff;
      return b.score - a.score;
    });

  const report = {
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    filesWithSupabaseUsage: results.length,
    summary: {
      highRisk: results.filter((item) => item.risk === "HIGH").length,
      mediumRisk: results.filter((item) => item.risk === "MEDIUM").length,
      lowRisk: results.filter((item) => item.risk === "LOW").length,
      keep: results.filter((item) => item.risk === "KEEP").length,
      realtimeFiles: results
        .filter((item) => item.metrics.channels > 0 || item.metrics.subscribeCalls > 0)
        .map((item) => item.file),
      possibleMissingCleanup: results
        .filter((item) => item.metrics.channels > item.metrics.removeChannelCalls + item.metrics.unsubscribeCalls)
        .map((item) => item.file),
      authListenerFiles: results
        .filter((item) => item.metrics.authStateListeners > 0)
        .map((item) => item.file),
    },
    topFindings: results.slice(0, 30),
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\nCLARA Supabase Realtime Usage Audit");
  console.log("==================================");
  console.log(`Scanned files: ${report.scannedFiles}`);
  console.log(`Files with Supabase usage: ${report.filesWithSupabaseUsage}`);
  console.log(
    `Risk summary: HIGH ${report.summary.highRisk} | MEDIUM ${report.summary.mediumRisk} | LOW ${report.summary.lowRisk} | KEEP ${report.summary.keep}`
  );

  if (report.summary.realtimeFiles.length) {
    console.log("\nRealtime files:");
    report.summary.realtimeFiles.forEach((file) => console.log(`- ${file}`));
  }

  if (report.summary.possibleMissingCleanup.length) {
    console.log("\nPossible missing cleanup files:");
    report.summary.possibleMissingCleanup.forEach((file) => console.log(`- ${file}`));
  }

  console.log("\nTop Supabase/realtime risk files:");
  report.topFindings.forEach((item, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")}. ${item.file} | ${item.category} | ${item.risk} | score ${item.score} | ${item.recommendation}`
    );
    console.log(`    Next: ${item.safestNextAction}`);
    item.findings.slice(0, 4).forEach((finding) => console.log(`    - ${finding}`));
  });

  console.log(`\nJSON report written to ${path.relative(projectRoot, reportPath)}`);
  console.log("Next: if HIGH appears, fix cleanup/mount scope before adding new realtime features.\n");
}

audit();
