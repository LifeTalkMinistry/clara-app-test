import { createMemoryCabinet } from "./cabinet-base";

export const budgetMemoryCabinet = createMemoryCabinet("Budget Memory");
export const readBudgetMemory = () => budgetMemoryCabinet.readAll();
export const saveBudgetMemory = (entry) => budgetMemoryCabinet.save(entry);
export const searchBudgetMemory = (query, limit) => budgetMemoryCabinet.search(query, limit);
