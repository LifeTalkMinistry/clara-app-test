export const FINANCE_ITEM_HIERARCHY_TONES = {
  neutral: { key: "neutral", name: "Neutral Slate", rgb: "148 163 184" },
  frost: { key: "frost", name: "Frost Blue", rgb: "125 211 252" },
  cyan: { key: "cyan", name: "Cyan", rgb: "34 211 238" },
  teal: { key: "teal", name: "Aqua Teal", rgb: "45 212 191" },
  sapphire: { key: "sapphire", name: "Sapphire", rgb: "96 165 250" },
  violet: { key: "violet", name: "Royal Violet", rgb: "167 139 250" },
  gold: { key: "gold", name: "Premium Gold", rgb: "232 201 122" },
};

function toFinanceNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getRelativeAmountShare(amount, total) {
  const safeAmount = Math.max(toFinanceNumber(amount), 0);
  const safeTotal = Math.max(toFinanceNumber(total), 0);
  if (safeAmount <= 0 || safeTotal <= 0) return 0;
  return Math.max(0, Math.min(safeAmount / safeTotal, 1));
}

export function getFinanceItemHierarchyTone(amountOrShare, total) {
  const share = total === undefined
    ? Math.max(0, Math.min(toFinanceNumber(amountOrShare), 1))
    : getRelativeAmountShare(amountOrShare, total);

  if (share <= 0) return { ...FINANCE_ITEM_HIERARCHY_TONES.neutral, share: 0 };
  if (share <= 0.05) return { ...FINANCE_ITEM_HIERARCHY_TONES.frost, share };
  if (share <= 0.10) return { ...FINANCE_ITEM_HIERARCHY_TONES.cyan, share };
  if (share <= 0.20) return { ...FINANCE_ITEM_HIERARCHY_TONES.teal, share };
  if (share <= 0.35) return { ...FINANCE_ITEM_HIERARCHY_TONES.sapphire, share };
  if (share <= 0.50) return { ...FINANCE_ITEM_HIERARCHY_TONES.violet, share };
  return { ...FINANCE_ITEM_HIERARCHY_TONES.gold, share };
}
