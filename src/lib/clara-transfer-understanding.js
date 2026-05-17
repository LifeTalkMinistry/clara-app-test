export function normalizeTransferText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[₱,]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function extractTransferAmount(value = '') {
  const match = String(value || '').replace(/,/g, '').match(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/i);
  const amount = Number(match?.[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function inferTransferRoute(value = '', wallets = []) {
  const raw = String(value || '').trim();
  const clean = (item = '') => String(item || '')
    .replace(/[.!?]+$/g, '')
    .replace(/\b(?:transfer|tranfer|transfr|trnsfer|move|send|money|funds|balance|php|pesos?)\b/gi, ' ')
    .replace(/(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const direct = raw.match(/\b(?:transfer|tranfer|transfr|trnsfer|move|send)?(?:\s+(?:money|funds|balance))?(?:\s+(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)?\s*from\s+(.+?)\s+(?:to|into)\s+(.+?)(?=\s+(?:transfer|tranfer|transfr|trnsfer|move|send)\b|\s+(?:₱|php\s*)?\d|[.!?]|$)/i);
  if (direct) return { fromName: clean(direct[1]), toName: clean(direct[2]) };

  const dash = raw.match(/\b(?:transfer|tranfer|transfr|trnsfer|move|send)?(?:\s+(?:money|funds|balance))?(?:\s+(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)?\s*(.+?)\s*[-–—>]+\s*(.+?)(?=\s+(?:₱|php\s*)?\d|[.!?]|$)/i);
  if (dash) return { fromName: clean(dash[1]), toName: clean(dash[2]) };

  const text = normalizeTransferText(raw);
  const found = (wallets || [])
    .map((wallet) => ({ wallet, name: String(wallet?.name || wallet?.wallet_name || wallet?.title || '').trim() }))
    .filter((item) => item.name)
    .map((item) => ({ ...item, index: text.indexOf(normalizeTransferText(item.name)) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);

  if (found.length >= 2) return { fromName: found[0].name, toName: found[1].name };
  return { fromName: '', toName: '' };
}
