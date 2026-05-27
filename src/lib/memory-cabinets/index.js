import { MEMORY_CABINET_DEFINITIONS, getAvailableCabinetNames, getCabinetDefinition, normalizeCabinetName } from "./cabinet-registry";
import { createMemoryCabinet } from "./cabinet-base";

const cabinetCache = new Map();

export { MEMORY_CABINET_DEFINITIONS, getAvailableCabinetNames, getCabinetDefinition, normalizeCabinetName };

export function getMemoryCabinet(cabinetName) {
  const definition = getCabinetDefinition(cabinetName);
  if (!definition) return null;

  if (!cabinetCache.has(definition.name)) {
    cabinetCache.set(definition.name, createMemoryCabinet(definition.name));
  }

  return cabinetCache.get(definition.name);
}

export function saveMemoryToCabinet(cabinetName, entry) {
  const cabinet = getMemoryCabinet(cabinetName);
  return cabinet ? cabinet.save(entry) : null;
}

export function searchMemoryCabinet(cabinetName, query = "", limit = 5) {
  const cabinet = getMemoryCabinet(cabinetName);
  return cabinet ? cabinet.search(query, limit) : [];
}

export function readMemoryCabinet(cabinetName) {
  const cabinet = getMemoryCabinet(cabinetName);
  return cabinet ? cabinet.readAll() : [];
}

export function searchMultipleMemoryCabinets(cabinetNames = [], query = "", limit = 5) {
  return cabinetNames
    .map(normalizeCabinetName)
    .filter(Boolean)
    .flatMap((cabinetName) => searchMemoryCabinet(cabinetName, query, limit).map((entry) => ({ ...entry, cabinet: cabinetName })))
    .sort((a, b) => Number(b.relevanceScore || 0) - Number(a.relevanceScore || 0))
    .slice(0, limit);
}

export function getMemoryCabinetStats() {
  return MEMORY_CABINET_DEFINITIONS.map((definition) => ({
    ...definition,
    count: readMemoryCabinet(definition.name).length,
  }));
}
