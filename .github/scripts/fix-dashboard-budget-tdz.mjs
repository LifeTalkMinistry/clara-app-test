import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";

if (!fs.existsSync(dashboardPath)) {
  console.warn(`Dashboard file not found: ${dashboardPath}`);
  process.exit(0);
}

const source = fs.readFileSync(dashboardPath, "utf8");

const declarationIndexCache = new Map();
const ignoredDependencyTokens = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity",
  "Number",
  "String",
  "Boolean",
  "Array",
  "Object",
  "Math",
  "Date",
  "Intl",
]);

function isIdentifierStart(char) {
  return /[A-Za-z_$]/.test(char || "");
}

function isIdentifierPart(char) {
  return /[A-Za-z0-9_$]/.test(char || "");
}

function findMatching(sourceText, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    const next = sourceText[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function splitTopLevelComma(text) {
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
    else if (char === "," && round === 0 && square === 0 && curly === 0) return index;
  }

  return -1;
}

function getDeclarationIndex(name) {
  if (declarationIndexCache.has(name)) return declarationIndexCache.get(name);

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declarationPattern = new RegExp(`\\b(?:const|let|var|function)\\s+${escapedName}\\b`);
  const match = source.match(declarationPattern);
  const index = match ? match.index : -1;
  declarationIndexCache.set(name, index);
  return index;
}

function hasLateDependency(depsText, callbackIndex) {
  const identifiers = new Set(depsText.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []);

  for (const token of identifiers) {
    if (ignoredDependencyTokens.has(token)) continue;
    const declarationIndex = getDeclarationIndex(token);
    if (declarationIndex > callbackIndex) return true;
  }

  return false;
}

function stripWrappingParens(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) return trimmed;

  const closeIndex = findMatching(trimmed, 0, "(", ")");
  return closeIndex === trimmed.length - 1 ? trimmed.slice(1, -1).trim() : trimmed;
}

function convertArrowCallback(name, callbackExpression) {
  const trimmed = callbackExpression.trim();
  const arrowIndex = trimmed.indexOf("=>");
  if (arrowIndex === -1) return null;

  let paramsText = trimmed.slice(0, arrowIndex).trim();
  let bodyText = trimmed.slice(arrowIndex + 2).trim();
  let asyncPrefix = "";

  if (paramsText.startsWith("async ")) {
    asyncPrefix = "async ";
    paramsText = paramsText.slice(6).trim();
  }

  const params = stripWrappingParens(paramsText);

  if (bodyText.startsWith("{")) {
    const bodyCloseIndex = findMatching(bodyText, 0, "{", "}");
    if (bodyCloseIndex !== bodyText.length - 1) return null;
    return `${asyncPrefix}function ${name}(${params}) ${bodyText}`;
  }

  return `${asyncPrefix}function ${name}(${params}) {\n    return ${bodyText};\n  }`;
}

function findStatementEnd(sourceText, index) {
  let cursor = index + 1;
  while (/\s/.test(sourceText[cursor] || "")) cursor += 1;
  return sourceText[cursor] === ";" ? cursor + 1 : index + 1;
}

const replacements = [];
const useCallbackPattern = /const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*useCallback\s*\(/g;
let match;

while ((match = useCallbackPattern.exec(source)) !== null) {
  const name = match[1];
  const callOpenIndex = useCallbackPattern.lastIndex - 1;
  const callCloseIndex = findMatching(source, callOpenIndex, "(", ")");

  if (callCloseIndex === -1) continue;

  const callContent = source.slice(callOpenIndex + 1, callCloseIndex);
  const commaIndex = splitTopLevelComma(callContent);
  if (commaIndex === -1) continue;

  const callbackExpression = callContent.slice(0, commaIndex).trim();
  const depsText = callContent.slice(commaIndex + 1).trim();

  if (!hasLateDependency(depsText, match.index)) continue;

  const converted = convertArrowCallback(name, callbackExpression);
  if (!converted) continue;

  replacements.push({
    start: match.index,
    end: findStatementEnd(source, callCloseIndex),
    text: converted,
    name,
  });
}

if (replacements.length === 0) {
  console.log("Dashboard TDZ prebuild fix found no risky late-dependency callbacks.");
  process.exit(0);
}

let nextSource = source;
for (const replacement of replacements.reverse()) {
  nextSource =
    nextSource.slice(0, replacement.start) +
    replacement.text +
    nextSource.slice(replacement.end);
}

fs.writeFileSync(dashboardPath, nextSource);
console.log(
  `Fixed Dashboard TDZ callbacks before build: ${replacements
    .map((item) => item.name)
    .reverse()
    .join(", ")}`
);
