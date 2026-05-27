import { createMemoryCabinet } from "./cabinet-base";

const cabinet = createMemoryCabinet("Spending Memory");

export const spendingMemoryCabinet = cabinet;
export const readSpendingMemory = cabinet.readAll;
export const saveSpendingMemory = cabinet.save;
export const searchSpendingMemory = cabinet.search;
