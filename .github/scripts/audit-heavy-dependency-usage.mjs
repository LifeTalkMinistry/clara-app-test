import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, "src");
const packageJsonPath = path.resolve(projectRoot, "package.json");
const reportPath = path.resolve(projectRoot, "heavy-dependency-usage-report.json");

const HEAVY_DEPENDENCIES = [
  "recharts",
  "jspdf",
  "html2canvas",
  "react-markdown",
  "canvas-confetti",
  "@hello-pangea/dnd",
  "framer-motion",
  "@tanstack/react-query",
  "axios",
  "lodash",
  "react-day-picker",
  "react-resizable-panels",
  "embla-carousel-react",
  "vaul",
  "cmdk",
  "date-fns",
  "react-hook-form",
  "@hookform/resolvers",
  "zod",
];

const KEEP_REASONS = {
  "framer-motion": "KEEP if used for premium navigation/page motion. Optimize usage only if it appears in startup chunks.",
  "@tanstack/react-query": "KEEP if data fetching/cache screens rely on it. Remove only if truly unused.",
  "lucide-react": "KEEP. Icons are widely used and tree-shaken by Vite/Rollup when imported correctly.",
};

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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeImportRegex(packageName) {
  const escaped = escapeRegExp(packageName);
  return new RegExp(
    `(?:from\\s+["']${escaped}(?:/[^"']*)?["']|import\\s*\\(["']${escaped}(?:/[^"']*)?["']\\)|require\\(["']${escaped}(?:/[^"']*)?["']\\))`,
    "g"
  );
}

function getPackageDependencies() {
  if (!fs.existsSync(packageJsonPath)) {
    fail("package.json not found. Run this script from the project root.");
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
}

function classifyDependency(packageName, usages) {
  if (!usages.length) {
    return {
      status: "REMOVE_CANDIDATE",
      recommendation: "No source imports found. Verify scripts/configs first, then consider uninstalling.",
      risk: "LOW-MEDIUM",
    };
  }

  const routeOnly = usages.every((usage) => {
    const file = usage.file.toLowerCase();
    return (
      file.includes("/pages/") ||
      file.includes("/admin/") ||
      file.includes("analytics") ||
      file.includes("report") ||
      file.includes("export") ||
      file.includes("document") ||
      file.includes("learning")
    );
  });

  const startupRisk = usages.some((usage) => {
    const file = usage.file.toLowerCase();
    return (
      file.endsWith("src/main.jsx") ||
      file.endsWith("src/app.jsx") ||
      file.includes("/context/") ||
      file.includes("/theme/") ||
      file.includes("/components/layout")
    );
  });

  const dashboardRisk = usages.some((usage) => usage.file.toLowerCase().includes("dashboard"));

  if (startupRisk) {
    return {
      status: "CHECK_STARTUP_IMPORT",
      recommendation: "Used in startup/global code. Consider lazy-loading or moving usage behind route/modal boundaries.",
      risk: "MEDIUM",
    };
  }

  if (dashboardRisk) {
    return {
      status: "CHECK_DASHBOARD_IMPORT",
      recommendation: "Used in dashboard path. Keep only if needed on first dashboard paint; otherwise lazy-load the feature.",
      risk: "MEDIUM",
    };
  }

  if (routeOnly) {
    return {
      status: "KEEP_ROUTE_ONLY",
      recommendation: "Used in route/feature code. Keep, but ensure the route/component is lazy-loaded.",
      risk: "LOW",
    };
  }

  return {
    status: "KEEP_USED",
    recommendation: KEEP_REASONS[packageName] || "Used by source files. Keep unless build report proves it is bloating startup chunks.",
    risk: "LOW-MEDIUM",
  };
}

function getLineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function audit() {
  const dependencies = getPackageDependencies();
  const sourceFiles = walkFiles(srcDir);

  const results = HEAVY_DEPENDENCIES
    .filter((packageName) => dependencies[packageName])
    .map((packageName) => {
      const importRegex = makeImportRegex(packageName);
      const usages = [];

      sourceFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, "utf8");
        const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
        const matches = [...content.matchAll(importRegex)];

        matches.forEach((match) => {
          usages.push({
            file: relativePath,
            line: getLineNumber(content, match.index || 0),
            import: match[0].replace(/\s+/g, " ").trim(),
          });
        });
      });

      const classification = classifyDependency(packageName, usages);

      return {
        package: packageName,
        version: dependencies[packageName],
        usageCount: usages.length,
        files: [...new Set(usages.map((usage) => usage.file))],
        usages,
        ...classification,
      };
    })
    .sort((a, b) => {
      const statusRank = {
        REMOVE_CANDIDATE: 0,
        CHECK_STARTUP_IMPORT: 1,
        CHECK_DASHBOARD_IMPORT: 2,
        KEEP_ROUTE_ONLY: 3,
        KEEP_USED: 4,
      };

      return (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99);
    });

  const report = {
    generatedAt: new Date().toISOString(),
    scannedSourceFiles: sourceFiles.length,
    auditedDependencies: results.length,
    summary: {
      removeCandidates: results.filter((item) => item.status === "REMOVE_CANDIDATE").map((item) => item.package),
      startupImportRisks: results.filter((item) => item.status === "CHECK_STARTUP_IMPORT").map((item) => item.package),
      dashboardImportRisks: results.filter((item) => item.status === "CHECK_DASHBOARD_IMPORT").map((item) => item.package),
      routeOnlyKeeps: results.filter((item) => item.status === "KEEP_ROUTE_ONLY").map((item) => item.package),
    },
    results,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\nCLARA Heavy Dependency Usage Audit");
  console.log("=================================");
  console.log(`Scanned source files: ${report.scannedSourceFiles}`);
  console.log(`Audited dependencies: ${report.auditedDependencies}`);

  console.log("\nRanked dependency findings:");
  results.forEach((item, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")}. ${item.package} | ${item.status} | usages: ${item.usageCount} | risk: ${item.risk}`
    );
    console.log(`    ${item.recommendation}`);
    if (item.files.length) {
      item.files.slice(0, 6).forEach((file) => console.log(`    - ${file}`));
      if (item.files.length > 6) console.log(`    - ...and ${item.files.length - 6} more`);
    }
  });

  console.log(`\nJSON report written to ${path.relative(projectRoot, reportPath)}`);
  console.log("Next: compare this with dist/clara-build-chunk-report.json before uninstalling anything.\n");
}

audit();
