const CATEGORY_ALIASES = Object.freeze({
  food: ["food", "foods", "meal", "meals", "coffee", "snack", "snacks", "grocery", "groceries", "dining", "restaurant", "ulam", "pagkain"],
  transport: ["transport", "transportation", "commute", "fare", "fares", "gas", "fuel", "jeep", "jeepney", "bus", "taxi", "grab", "angkas", "moveit", "pamasahe"],
  housing: ["housing", "house", "rent", "mortgage", "apartment", "renta"],
  utilities: ["bill", "bills", "utility", "utilities", "electric", "electricity", "water", "internet", "wifi", "load", "subscription", "subscriptions", "kuryente"],
  health: ["health", "medical", "medicine", "doctor", "hospital", "vitamin", "checkup", "wellness", "fitness", "gamot"],
  education: ["education", "school", "study", "tuition", "books", "supplies", "class", "assignment", "eskwela"],
  work: ["work", "office", "job", "professional", "business tool", "work equipment", "trabaho"],
  shopping: ["shopping", "shop", "shoe", "shoes", "sneaker", "sneakers", "clothes", "clothing", "shirt", "bag", "watch", "gadget", "phone", "lazada", "shopee"],
  entertainment: ["entertainment", "fun", "leisure", "game", "games", "gaming", "movie", "cinema", "concert", "hobby", "hobbies", "outing"],
  personal: ["personal", "self care", "selfcare", "beauty", "skincare", "makeup", "haircut", "allowance"],
});

const CATEGORY_LABELS = Object.freeze({
  food: "Food",
  transport: "Transportation",
  housing: "Housing",
  utilities: "Bills",
  health: "Health",
  education: "Education",
  work: "Work",
  shopping: "Shopping",
  entertainment: "Entertainment",
  personal: "Personal",
  other: "Lifestyle",
});

function cleanCategoryText(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeCategoryText(value = "") {
  return cleanCategoryText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsCategoryPhrase(text = "", phrase = "") {
  const source = normalizeCategoryText(text).split(" ").filter(Boolean);
  const target = normalizeCategoryText(phrase).split(" ").filter(Boolean);
  if (!source.length || !target.length || target.length > source.length) return false;
  for (let index = 0; index <= source.length - target.length; index += 1) {
    if (target.every((token, offset) => source[index + offset] === token)) return true;
  }
  return false;
}

function includesCategoryAlias(text = "", aliases = []) {
  return aliases.some((alias) => containsCategoryPhrase(text, alias));
}

function inferCategoryKey(value = "") {
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (includesCategoryAlias(value, aliases)) return key;
  }
  return "other";
}

function inferPurchaseCategory({ item = "", reason = "" } = {}) {
  const itemCategory = inferCategoryKey(item);
  const reasonCategory = inferCategoryKey(reason);
  const reasonHasPurpose = /\b(school|study|class|work|office|job|professional|medical|health|replacement|replace|repair|broken|trabaho|eskwela)\b/i.test(normalizeCategoryText(reason));
  if (reasonCategory !== "other" && reasonHasPurpose) return reasonCategory;
  return itemCategory !== "other" ? itemCategory : reasonCategory;
}

function normalizeExpenseCategory(item = "", reason = "") {
  return inferPurchaseCategory({ item, reason });
}

export {
  CATEGORY_ALIASES,
  CATEGORY_LABELS,
  cleanCategoryText,
  normalizeCategoryText,
  containsCategoryPhrase,
  includesCategoryAlias,
  inferCategoryKey,
  inferPurchaseCategory,
  normalizeExpenseCategory,
};
