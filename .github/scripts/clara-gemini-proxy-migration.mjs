import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function ensureImport(content, importLine) {
  if (content.includes(importLine)) return content;
  return `${importLine}\n${content}`;
}

function replaceFunction(content, name, replacement) {
  const start = content.indexOf(`function ${name}(`);
  if (start < 0) return content;
  const bodyStart = content.indexOf('{', start);
  if (bodyStart < 0) return content;
  let depth = 0;
  for (let i = bodyStart; i < content.length; i += 1) {
    const char = content[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(0, start) + replacement + content.slice(i + 1);
      }
    }
  }
  return content;
}

function replaceExportFunction(content, name, replacement) {
  const start = content.indexOf(`export function ${name}(`);
  if (start < 0) return content;
  const bodyStart = content.indexOf('{', start);
  if (bodyStart < 0) return content;
  let depth = 0;
  for (let i = bodyStart; i < content.length; i += 1) {
    const char = content[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(0, start) + replacement + content.slice(i + 1);
      }
    }
  }
  return content;
}

function replaceAsyncFunction(content, name, replacement) {
  const start = content.indexOf(`async function ${name}(`);
  if (start < 0) return content;
  const bodyStart = content.indexOf('{', start);
  if (bodyStart < 0) return content;
  let depth = 0;
  for (let i = bodyStart; i < content.length; i += 1) {
    const char = content[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(0, start) + replacement + content.slice(i + 1);
      }
    }
  }
  return content;
}

function replaceExportAsyncFunction(content, name, replacement) {
  const start = content.indexOf(`export async function ${name}(`);
  if (start < 0) return content;
  const bodyStart = content.indexOf('{', start);
  if (bodyStart < 0) return content;
  let depth = 0;
  for (let i = bodyStart; i < content.length; i += 1) {
    const char = content[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(0, start) + replacement + content.slice(i + 1);
      }
    }
  }
  return content;
}

function patchGeminiService() {
  const path = 'src/lib/ai-command/gemini-service.js';
  let content = read(path);
  content = ensureImport(content, 'import { requestClaraGeminiProxyJson, getClaraProxyModel } from "@/lib/clara-gemini-proxy-client";');
  content = replaceFunction(content, 'getGeminiConfig', `function getGeminiConfig() {
  return {
    apiKey: 'server-proxy',
    model: getClaraProxyModel(DEFAULT_MODEL),
  };
}`);
  content = content.replace(/\n\s*if \(!apiKey\) \{[\s\S]*?code: "GEMINI_NOT_CONFIGURED"[\s\S]*?\}\);\n\s*\}\n/g, '\n');
  content = content.replace(/\n\s*const endpoint = `https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/\$\{encodeURIComponent\(model\)\}:generateContent\?key=\$\{encodeURIComponent\(apiKey\)\}`;/g, '');
  content = content.replace(/const response = await fetch\(endpoint, \{ method: "POST", headers: \{ "Content-Type": "application\/json" \}, body: JSON\.stringify\(body\), signal: timeout\.signal \}\);\n\s*const payload = await response\.json\(\)\.catch\(\(\) => \(\{\}\)\);\n\n\s*if \(!response\.ok\) throw Object\.assign\(new Error\(payload\?\.error\?\.message \|\| "Gemini request failed\."\), \{ code: "GEMINI_FAILED", status: response\.status, payload \}\);\n\n\s*const textPayload = payload\?\.candidates\?\.\[0\]\?\.content\?\.parts\?\.map\(\(part\) => part\?\.text \|\| ""\)\.filter\(Boolean\)\.join\("\\n"\) \|\| "";/, `const textPayload = await requestClaraGeminiProxyJson({
      prompt,
      model,
      signal: timeout.signal,
      generationConfig: body.generationConfig,
    });`);
  content = replaceExportFunction(content, 'getGeminiStatus', `export function getGeminiStatus() {
  const { model } = getGeminiConfig();
  return { configured: true, model };
}`);
  write(path, content);
}

function patchScheduleRefinement() {
  const path = 'src/lib/ai-command/schedule-refinement-service.js';
  let content = read(path);
  content = ensureImport(content, 'import { requestClaraGeminiProxyJson, getClaraProxyModel } from "@/lib/clara-gemini-proxy-client";');
  content = replaceFunction(content, 'getGeminiConfig', `function getGeminiConfig() {
  return {
    apiKey: 'server-proxy',
    model: getClaraProxyModel(DEFAULT_MODEL),
  };
}`);
  content = content.replace(/\n\s*if \(!apiKey\) \{[\s\S]*?code: "GEMINI_NOT_CONFIGURED"[\s\S]*?\}\);\n\s*\}\n/g, '\n');
  content = content.replace(/\n\s*const endpoint = `https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/\$\{encodeURIComponent\(model\)\}:generateContent\?key=\$\{encodeURIComponent\(apiKey\)\}`;/g, '');
  content = content.replace(/const response = await fetch\(endpoint, \{[\s\S]*?signal: timeout\.signal,\n\s*\}\);\n\n\s*const payload = await response\.json\(\)\.catch\(\(\) => \(\{\}\)\);\n\s*if \(!response\.ok\) \{[\s\S]*?\n\s*\}\n\n\s*const textPayload =[\s\S]*?\.join\("\\n"\) \|\| "";/, `const textPayload = await requestClaraGeminiProxyJson({
      prompt,
      model,
      signal: timeout.signal,
      generationConfig: {
        temperature: 0.55,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 900,
        responseMimeType: "application/json",
      },
    });`);
  write(path, content);
}

function patchScheduleImpact() {
  const path = 'src/lib/ai-command/schedule-impact-service.js';
  let content = read(path);
  content = ensureImport(content, 'import { requestClaraGeminiProxyJson, getClaraProxyModel } from "@/lib/clara-gemini-proxy-client";');
  content = replaceFunction(content, 'getGeminiConfig', `function getGeminiConfig() {
  return {
    apiKey: 'server-proxy',
    model: getClaraProxyModel(DEFAULT_MODEL),
  };
}`);
  content = content.replace(/\n\s*if \(!apiKey\) \{[\s\S]*?code: "GEMINI_NOT_CONFIGURED"[\s\S]*?\}\);\n\s*\}\n/g, '\n');
  content = content.replace(/\n\s*const endpoint = `https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/\$\{encodeURIComponent\(model\)\}:generateContent\?key=\$\{encodeURIComponent\(apiKey\)\}`;/g, '');
  content = content.replace(/const response = await fetch\(endpoint, \{[\s\S]*?signal: timeout\.signal,\n\s*\}\);\n\n\s*const payload = await response\.json\(\)\.catch\(\(\) => \(\{\}\)\);\n\s*if \(!response\.ok\) \{[\s\S]*?\n\s*\}\n\n\s*const textPayload =[\s\S]*?\.join\("\\n"\) \|\| "";/, `const textPayload = await requestClaraGeminiProxyJson({
        prompt,
        model,
        signal: timeout.signal,
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1800,
          responseMimeType: "application/json",
        },
      });`);
  write(path, content);
}

function patchIncomeConfigGuards() {
  for (const path of ['src/lib/clara-income-direct-finance-reply.js', 'src/lib/clara-direct-finance-reply.js']) {
    let content = read(path);
    content = replaceFunction(content, 'hasGeminiEnvironmentConfig', `function hasGeminiEnvironmentConfig() {
  return true;
}`);
    write(path, content);
  }
}

patchGeminiService();
patchScheduleRefinement();
patchScheduleImpact();
patchIncomeConfigGuards();
