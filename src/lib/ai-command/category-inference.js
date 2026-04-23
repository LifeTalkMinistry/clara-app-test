const CATEGORY_RULES = [
  ["food", ["rice", "food", "meal", "snack", "snacks", "milk tea", "coffee", "grocery", "groceries", "lunch", "dinner", "breakfast"]],
  ["transport", ["tricycle", "jeep", "jeepney", "fare", "bus", "taxi", "grab", "gas", "fuel", "commute"]],
  ["utilities", ["electricity", "electric", "water", "internet", "wifi", "load", "phone", "bill", "meralco"]],
  ["housing", ["rent", "housing", "apartment", "condo", "mortgage"]],
  ["entertainment", ["movie", "netflix", "game", "concert", "karaoke"]],
  ["shopping", ["clothes", "shoes", "shirt", "dress", "shop", "shopping"]],
  ["health", ["medicine", "doctor", "hospital", "clinic", "vitamins"]],
  ["education", ["school", "tuition", "book", "course", "class"]],
  ["personal", ["haircut", "salon", "self care", "skincare", "personal"]],
];

export function inferExpenseCategory(text) {
  const haystack = String(text || "").toLowerCase();
  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return category;
  }
  return "other";
}

