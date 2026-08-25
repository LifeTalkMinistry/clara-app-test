from pathlib import Path

path = Path('src/lib/clara-buy-check-expert-ai.js')
text = path.read_text(encoding='utf-8')

marker = 'const localPurchaseMessage = clean(message);'
if marker in text:
    print('Local timeout purchase parsing already present.')
    raise SystemExit(0)

needle = '''function fallbackTurn(message = "", evidence = {}, assistantContext = {}) {\n  const current = sanitizeEvidence(evidence);\n  const name = firstName(userNameFromContext(assistantContext));\n'''
replacement = '''function fallbackTurn(message = "", evidence = {}, assistantContext = {}) {\n  const current = sanitizeEvidence(evidence);\n  const localPurchaseMessage = clean(message);\n\n  // Gemini normally extracts purchase evidence. If Gemini times out on the very\n  // first purchase message, recover the obvious price/item locally so the\n  // canonical Means simulator can still answer immediately.\n  if (!current.price) {\n    const priceMatch = localPurchaseMessage.match(/(?:₱|php\\s*)?(\\d[\\d,]*(?:\\.\\d{1,2})?)\\s*(?:pesos?|php)?/i);\n    const parsedPrice = priceMatch ? Number(String(priceMatch[1]).replace(/,/g, "")) : 0;\n    if (Number.isFinite(parsedPrice) && parsedPrice > 0) current.price = parsedPrice;\n  }\n\n  if (!current.item && current.price > 0 && /\\b(buy|buying|purchase|get|spend|worth|cost)\\b/i.test(localPurchaseMessage)) {\n    current.item = localPurchaseMessage\n      .replace(/(?:₱|php\\s*)?\\d[\\d,]*(?:\\.\\d{1,2})?\\s*(?:pesos?|php)?/gi, " ")\n      .replace(/\\b(can\\s+i|should\\s+i|i(?:'m| am)?\\s+thinking\\s+of|thinking\\s+of|want\\s+to|buying|buy|purchase|worth|for)\\b/gi, " ")\n      .replace(/[?!.]+/g, " ")\n      .replace(/\\s+/g, " ")\n      .trim() || "this purchase";\n  }\n\n  const name = firstName(userNameFromContext(assistantContext));\n'''
if needle not in text:
    raise SystemExit('Could not find fallbackTurn header')
text = text.replace(needle, replacement, 1)

path.write_text(text, encoding='utf-8')
print('Added local item/price recovery for Buy Check timeout fallback.')
