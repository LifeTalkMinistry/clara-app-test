export const COMMAND_SCHEMA = {
  LOG_EXPENSE: {
    required: ["amount", "item", "category", "wallet", "date"],
    defaults: {
      date: "today",
    },
  },

  ADD_MONEY: {
    required: ["amount", "wallet"],
    defaults: {},
  },

  CREATE_BUDGET: {
    required: ["name", "amount", "period"],
    defaults: {},
  },

  CREATE_SAVINGS_GOAL: {
    required: ["name", "target_amount", "deadline"],
    defaults: {},
  },
};

export function getCommandSchema(intent) {
  return COMMAND_SCHEMA[intent] || null;
}