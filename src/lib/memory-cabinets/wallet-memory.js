import { createMemoryCabinet } from "./cabinet-base";

const cabinet = createMemoryCabinet("Wallet Memory");

export function readWalletMemory() {
  return cabinet.readAll();
}

export function saveWalletMemory(entry) {
  return cabinet.save(entry);
}

export function searchWalletMemory(query, limit) {
  return cabinet.search(query, limit);
}

export const walletMemoryCabinet = cabinet;
