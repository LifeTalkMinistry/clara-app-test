let financeRefreshRevision = 0;

export function getFinanceRefreshRevision() {
  return financeRefreshRevision;
}

export function bumpFinanceRefreshRevision() {
  financeRefreshRevision += 1;
  return financeRefreshRevision;
}

export function isFinanceRefreshRevisionCurrent(revision) {
  return Number(revision) === financeRefreshRevision;
}

export function resetFinanceRefreshRevisionForTests() {
  financeRefreshRevision = 0;
}
