export function normalizeTransferText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[₱,]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function splitTransferWords(value = '') {
  return normalizeTransferText(value).split(/\s+/).filter(Boolean);
}

function distance(a = '', b = '') {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }

  return previous[right.length];
}

export function transferSimilarity(a = '', b = '') {
  const left = normalizeTransferText(a);
  const right = normalizeTransferText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.92;
  return Math.max(0, 1 - distance(left, right) / Math.max(left.length, right.length));
}

export function extractTransferAmount(value = '') {
  const match = String(value || '').replace(/,/g, '').match(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/i);
  const amount = Number(match?.[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function getTransferWalletName(wallet = {}) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || wallet?.type || '').trim();
}

export function findTransferWalletByName(wallets = [], name = '') {
  const requested = normalizeTransferText(name);
  if (!requested) return null;

  const exact = (wallets || []).find((wallet) => normalizeTransferText(getTransferWalletName(wallet)) === requested)
    || (wallets || []).find((wallet) => normalizeTransferText(getTransferWalletName(wallet)).includes(requested))
    || (wallets || []).find((wallet) => requested.includes(normalizeTransferText(getTransferWalletName(wallet))));

  if (exact) return exact;

  let best = null;
  let bestScore = 0;
  for (const wallet of wallets || []) {
    const nameText = normalizeTransferText(getTransferWalletName(wallet));
    const words = splitTransferWords(nameText);
    const score = Math.max(transferSimilarity(requested, nameText), ...words.map((word) => transferSimilarity(requested, word)));
    if (score > bestScore) {
      best = wallet;
      bestScore = score;
    }
  }

  return bestScore >= 0.68 ? best : null;
}

function cleanRouteName(value = '') {
  return String(value || '')
    .replace(/[.!?]+$/g, '')
    .replace(/\b(?:transfer|tranfer|transfr|trnsfer|move|send|money|funds|balance|php|pesos?)\b/gi, ' ')
    .replace(/(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findWalletMentions(value = '', wallets = []) {
  const text = normalizeTransferText(value);
  const words = splitTransferWords(value);

  return (wallets || [])
    .map((wallet) => {
      const name = getTransferWalletName(wallet);
      const normalizedName = normalizeTransferText(name);
      if (!normalizedName) return null;

      const exactIndex = text.indexOf(normalizedName);
      if (exactIndex >= 0) return { wallet, name, index: exactIndex, score: 1 };

      let bestIndex = -1;
      let bestScore = 0;
      const walletWords = splitTransferWords(name);

      words.forEach((word, index) => {
        const score = Math.max(transferSimilarity(word, normalizedName), ...walletWords.map((walletWord) => transferSimilarity(word, walletWord)));
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });

      return bestScore >= 0.72 ? { wallet, name, index: bestIndex, score: bestScore } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index || b.score - a.score)
    .filter((mention, index, items) => items.findIndex((item) => item.name === mention.name) === index);
}

export function inferTransferRoute(value = '', wallets = []) {
  const raw = String(value || '').trim();

  const direct = raw.match(/\b(?:transfer|tranfer|transfr|trnsfer|move|send)?(?:\s+(?:money|funds|balance))?(?:\s+(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)?\s*from\s+(.+?)\s+(?:to|into)\s+(.+?)(?=\s+(?:transfer|tranfer|transfr|trnsfer|move|send)\b|\s+(?:₱|php\s*)?\d|[.!?]|$)/i);
  if (direct) return { fromName: cleanRouteName(direct[1]), toName: cleanRouteName(direct[2]) };

  const dash = raw.match(/\b(?:transfer|tranfer|transfr|trnsfer|move|send)?(?:\s+(?:money|funds|balance))?(?:\s+(?:₱|php\s*)?\d[\d,]*(?:\.\d{1,2})?)?\s*(.+?)\s*[-–—>]+\s*(.+?)(?=\s+(?:₱|php\s*)?\d|[.!?]|$)/i);
  if (dash) return { fromName: cleanRouteName(dash[1]), toName: cleanRouteName(dash[2]) };

  const found = findWalletMentions(raw, wallets);
  if (found.length >= 2) return { fromName: found[0].name, toName: found[1].name };
  if (found.length === 1) {
    const hasToOnly = /\b(to|into|destination|receive)\b/i.test(raw) && !/\bfrom\b/i.test(raw);
    return hasToOnly ? { fromName: '', toName: found[0].name } : { fromName: found[0].name, toName: '' };
  }

  return { fromName: '', toName: '' };
}

export function isLikelyTransferText(value = '') {
  const text = normalizeTransferText(value);
  return /\b(transfer|tranfer|transfr|trnsfer|move|send)\b/.test(text)
    || /\bfrom\b.+\b(to|into)\b/.test(text)
    || /\b(cash|gcash|maya|wallet|bank|sb)\b.+\b(cash|gcash|maya|wallet|bank|sb)\b.+\d/.test(text);
}
