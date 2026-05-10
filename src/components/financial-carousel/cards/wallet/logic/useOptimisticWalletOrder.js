import { useCallback, useEffect, useMemo, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";

const getWalletId = (wallet = {}) => wallet?.id ?? wallet?.wallet_id ?? wallet?.local_id;

const getOrderValue = (wallet = {}, fallbackIndex = 0) => {
  const parsed = Number(wallet?.sort_order ?? wallet?.position ?? wallet?.display_order);
  return Number.isFinite(parsed) ? parsed : fallbackIndex;
};

const sortWalletRows = (wallets = []) =>
  wallets
    .map((wallet, index) => ({ wallet, index }))
    .filter(({ wallet }) => wallet && !wallet?.is_archived)
    .sort((a, b) => {
      const diff = getOrderValue(a.wallet, a.index) - getOrderValue(b.wallet, b.index);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(({ wallet }) => wallet);

export default function useOptimisticWalletOrder(wallets = []) {
  const { user } = useUserRole();
  const { updateWallet } = useFinancialData(user);
  const [rows, setRows] = useState(() => sortWalletRows(wallets));

  useEffect(() => {
    setRows(sortWalletRows(wallets));
  }, [wallets]);

  const moveWallet = useCallback(
    async (walletId, direction) => {
      const idToMove = String(walletId || "");
      const step = Number(direction);
      if (!idToMove || !Number.isFinite(step) || step === 0) return;

      const current = sortWalletRows(rows);
      const fromIndex = current.findIndex((wallet) => String(getWalletId(wallet)) === idToMove);
      if (fromIndex < 0) return;

      const toIndex = fromIndex + step;
      if (toIndex < 0 || toIndex >= current.length) return;

      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];

      const ordered = next.map((wallet, index) => ({ ...wallet, sort_order: index }));
      setRows(ordered);

      if (typeof updateWallet !== "function") return;

      try {
        await Promise.all(
          ordered.map((wallet, index) => {
            const rowId = getWalletId(wallet);
            return rowId
              ? updateWallet(String(rowId), { sort_order: index, updated_at: new Date().toISOString() })
              : Promise.resolve();
          })
        );
      } catch (error) {
        console.warn("CLARA could not save wallet order:", error);
        setRows(sortWalletRows(wallets));
      }
    },
    [rows, updateWallet, wallets]
  );

  const orderedWallets = useMemo(() => sortWalletRows(rows), [rows]);

  return { orderedWallets, moveWallet };
}
