const CATEGORY_RULES = [
  {
    label: "Food",
    budgetNames: ["food", "groceries", "meal", "meals", "snacks", "coffee", "drinks"],
    keywords: ["food", "meal", "lunch", "dinner", "breakfast", "snack", "ice cream", "coffee", "milk tea", "grocery", "groceries", "restaurant", "eat", "drink", "buko", "grabfood"],
  },
  {
    label: "Transportation",
    budgetNames: ["transport", "transportation", "commute", "fare", "gas"],
    keywords: ["fare", "jeep", "jeepney", "bus", "taxi", "grab", "angkas", "joyride", "gas", "fuel", "commute", "transport", "transportation"],
  },
  {
    label: "Bills",
    budgetNames: ["bills", "utilities", "internet", "electric", "water", "load"],
    keywords: ["bill", "bills", "electric", "electricity", "water", "internet", "wifi", "load", "phone bill", "utility", "utilities"],
  },
  {
    label: "Debt Payments",
    budgetNames: ["debt", "debt payments", "loan", "utang", "payment"],
    keywords: ["debt", "utang", "loan", "installment", "credit card", "repayment", "pay back"],
  },
  {
    label: "Family Support",
    budgetNames: ["family", "family support", "support", "responsibility"],
    keywords: ["family", "parents", "parent", "sibling", "allowance", "padala", "send money", "support"],
  },
  {
    label: "Emergency Fund",
    budgetNames: ["emergency", "emergency fund", "protection"],
    keywords: ["emergency fund", "emergency", "buffer", "safety fund"],
  },
  {
    label: "Savings",
    budgetNames: ["savings", "save", "goal", "goals"],
    keywords: ["save", "savings", "goal", "goals", "laptop fund", "travel fund"],
  },
  {
    label: "Self Care / Personal",
    budgetNames: ["self care", "self-care", "personal", "clothing", "clothes", "shopping", "wants", "want", "misc", "miscellaneous"],
    keywords: ["shoes", "shoe", "sneakers", "slippers", "sandals", "clothes", "clothing", "shirt", "pants", "dress", "bag", "watch", "perfume", "haircut", "skincare", "makeup", "shopping", "mall", "self care", "self-care", "personal"],
  },
  {
    label: "Entertainment",
    budgetNames: ["entertainment", "games", "fun", "leisure", "hobby"],
    keywords: ["movie", "cinema", "netflix", "game", "games", "gaming", "concert", "outing", "entertainment", "hobby"],
  },
];

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function budgetName(budget = {}) {
  return String(budget?.name || budget?.category || budget?.title || budget?.label || "Budget").trim();
}

function ruleMatchesMessage(rule, message = "") {
  const text = normalizeText(message);
  return rule.keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function findMatchingBudgetForRule(rule, budgets = []) {
  const normalizedBudgetNames = rule.budgetNames.map(normalizeText);

  return (Array.isArray(budgets) ? budgets : []).find((budget) => {
    const name = normalizeText(budgetName(budget));
    return normalizedBudgetNames.some((candidate) => name === candidate || name.includes(candidate) || candidate.includes(name));
  });
}

export function buildClaraPurchaseCategoryGuide(message = "", budgets = []) {
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const matchedRule = CATEGORY_RULES.find((rule) => ruleMatchesMessage(rule, message));
  const matchedBudget = matchedRule ? findMatchingBudgetForRule(matchedRule, safeBudgets) : null;
  const availableBudgetNames = safeBudgets.map(budgetName).filter(Boolean);

  if (!matchedRule) {
    return {
      detectedCategory: "unclear",
      matchedBudgetName: null,
      availableBudgetNames,
      instruction: "The item category is unclear. Do not assume the first budget row. Ask one short category question if category matters for the recommendation.",
    };
  }

  return {
    detectedCategory: matchedRule.label,
    matchedBudgetName: matchedBudget ? budgetName(matchedBudget) : null,
    availableBudgetNames,
    instruction: matchedBudget
      ? `Use the matched ${budgetName(matchedBudget)} budget as the most relevant category for this purchase.`
      : `The item looks like ${matchedRule.label}, but no matching budget row is loaded. Do not force it into Food. Ask whether to treat it as ${matchedRule.label} or another category.`,
  };
}

export function formatClaraPurchaseCategoryGuideForPrompt(guide = {}) {
  return [
    `Detected category: ${guide.detectedCategory || "unclear"}`,
    `Matched budget: ${guide.matchedBudgetName || "none"}`,
    `Available budget names: ${(guide.availableBudgetNames || []).join(", ") || "none"}`,
    `Instruction: ${guide.instruction || "Do not assume the first budget row."}`,
    "Category rule: Do not pick the first budget row by default. Do not map shoes/clothing/personal shopping to Food. If category is unclear or no matching budget exists, ask one short category question instead of pretending the item belongs to Food.",
  ].join("\n");
}
