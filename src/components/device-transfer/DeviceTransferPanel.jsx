import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  Info,
  LoaderCircle,
  Send,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import {
  approveDeviceTransfer,
  cancelDeviceTransfer,
  claimDeviceTransfer,
  completeDeviceTransfer,
  createDeviceTransfer,
  fetchDeviceTransferPackage,
  getDeviceTransferStatus,
} from "@/lib/device-transfer-client";
import {
  createDeviceTransferSnapshot,
  hasLastDeviceTransferRecovery,
  importDeviceTransferIntoNewVault,
  rollbackLastDeviceTransfer,
} from "@/lib/device-transfer-vault";
import ClaraDataResetPanel from "./ClaraDataResetPanel";

function formatRemaining(expiresAt, now) {
  const remaining = Math.max(0, Date.parse(expiresAt || "") - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function SummaryGrid({ summary = {} }) {
  const rows = [
    ["Budget", summary.budgets],
    ["Wallets", summary.wallets],
    ["Transactions", summary.walletTransactions],
    ["Transfers", summary.transfers],
    ["Expenses", summary.expenses],
    ["Savings goals", summary.savingsGoals],
    ["Emergency fund", summary.emergencyFunds],
    ["Debt / obligations", summary.debts],
    ["Life profile", summary.lifeProfiles],
    ["Money Schedule", summary.moneySchedule],
    ["Streak days", summary.streakDays],
  ].filter(([, value]) => Number(value || 0) > 0);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {(rows.length ? rows : [["CLARA items", summary.total || 0]]).map(
        ([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
              {label}
            </p>
            <p className="mt-1 text-lg font-black text-white">{value || 0}</p>
          </div>
        )
      )}
    </div>
  );
}

function Instructions({ side }) {
  const steps =
    side === "sender"
      ? [
          "Keep this device open and online.",
          "On the other device, choose Receive data on this device.",
          "Enter the six-digit code shown here.",
          "Check the receiving device name, then approve it here.",
        ]
      : [
          "Sign in to the same CLARA account used by the sending device.",
          "Enter the six-digit code from the device holding the correct data.",
          "Wait for approval on the sending device.",
          "Tap Import safely only after the data preview appears.",
        ];

  return (
    <ol className="mt-4 space-y-2 text-xs leading-5 text-white/58">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-black text-white/70">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function DeviceTransferPanel({ user, profile }) {
  const [side, setSide] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState(null);
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(() =>
    hasLastDeviceTransferRecovery()
  );

  const status = session?.status || null;
  const remaining = useMemo(
    () => (session?.expiresAt ? formatRemaining(session.expiresAt, now) : null),
    [session?.expiresAt, now]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const reset = useCallback(() => {
    setSide(null);
    setSession(null);
    setCode("");
    setError("");
    setResult(null);
    setCopied(false);
    setShowTransferInfo(false);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!session?.transferId) return;
    const role = side === "receiver" ? "receiver" : "sender";
    const token =
      role === "receiver" ? session.receiverToken : session.senderToken;
    if (!token) return;

    try {
      const latest = await getDeviceTransferStatus({
        transferId: session.transferId,
        token,
        role,
      });
      setSession((current) => ({ ...current, ...latest }));
    } catch (statusError) {
      if ([404, 410].includes(Number(statusError?.status))) {
        setSession((current) => ({ ...current, status: "expired" }));
        setError(statusError.message);
      }
    }
  }, [session?.transferId, session?.receiverToken, session?.senderToken, side]);

  useEffect(() => {
    if (
      !session?.transferId ||
      ["consumed", "cancelled", "expired"].includes(status)
    ) {
      return undefined;
    }
    const timer = window.setInterval(refreshStatus, 2_500);
    return () => window.clearInterval(timer);
  }, [refreshStatus, session?.transferId, status]);

  const handleCreate = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const payload = await createDeviceTransferSnapshot({ user, profile });
      const created = await createDeviceTransfer(payload);
      setSession(created);
    } catch (createError) {
      setError(createError?.message || "Unable to create a transfer code.");
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async () => {
    if (code.replace(/\D/g, "").length !== 6) {
      setError("Enter the complete six-digit code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const claimed = await claimDeviceTransfer(code);
      setSession(claimed);
    } catch (claimError) {
      setError(claimError?.message || "Unable to request this transfer.");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    setBusy(true);
    setError("");
    try {
      const approved = await approveDeviceTransfer({
        transferId: session.transferId,
        senderToken: session.senderToken,
      });
      setSession((current) => ({ ...current, ...approved }));
    } catch (approveError) {
      setError(approveError?.message || "Unable to approve this device.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    setError("");
    try {
      const transferPackage = await fetchDeviceTransferPackage({
        transferId: session.transferId,
        receiverToken: session.receiverToken,
      });
      const imported = await importDeviceTransferIntoNewVault(
        transferPackage.snapshot,
        { user, profile }
      );
      const completed = await completeDeviceTransfer({
        transferId: session.transferId,
        receiverToken: session.receiverToken,
      });
      setSession((current) => ({ ...current, ...completed }));
      setResult({
        type: "success",
        message: `Transfer completed and verified with ${imported.actualRecords} protected financial records.`,
      });
      setHasRecovery(true);
    } catch (importError) {
      setError(
        importError?.rollbackError
          ? "Import stopped, but CLARA could not fully confirm the automatic rollback. Do not reset or uninstall the app."
          : importError?.message || "The transfer could not be imported safely."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    const token = session?.senderToken || session?.receiverToken;
    if (!session?.transferId || !token) {
      reset();
      return;
    }
    setBusy(true);
    try {
      await cancelDeviceTransfer({ transferId: session.transferId, token });
    } catch {
      // The local screen can still close; the server session expires automatically.
    } finally {
      setBusy(false);
      reset();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(session.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setError("Hold the code to copy it manually.");
    }
  };

  const handleRollback = async () => {
    const confirmed = window.confirm(
      "Return this device to the local data it had before the most recent transfer? The transferred vault will be retained as a protected copy."
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      await rollbackLastDeviceTransfer({ user });
      setResult({
        type: "success",
        message: "Previous local data restored. Reload CLARA to open it.",
      });
      setHasRecovery(false);
    } catch (rollbackError) {
      setError(rollbackError?.message || "Unable to restore the previous local vault.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="mt-5 rounded-[30px] border border-cyan-300/16 bg-cyan-300/[0.045] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
            <ArrowLeftRight size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-cyan-50">Transfer CLARA Data</h2>
              <button
                type="button"
                onClick={() => setShowTransferInfo((visible) => !visible)}
                aria-label="About CLARA data transfer"
                aria-expanded={showTransferInfo}
                aria-controls="clara-device-transfer-info"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100/70 transition hover:bg-cyan-200/10 hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
              >
                <Info size={15} />
              </button>
            </div>
          </div>
        </div>

        {showTransferInfo ? (
          <div
            id="clara-device-transfer-info"
            role="note"
            className="mt-3 rounded-2xl border border-cyan-200/12 bg-black/15 px-3 py-2.5 text-xs leading-5 text-cyan-50/60"
          >
            A deliberate one-time copy. The sending device is never erased, and
            the receiving device imports into a new vault before switching.
          </div>
        ) : null}

        {!side ? (
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={() => setSide("sender")}
              className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-left"
            >
              <Send size={18} className="text-emerald-200" />
              <span>
                <span className="block text-sm font-black text-emerald-50">
                  Send data to another device
                </span>
                <span className="mt-0.5 block text-[11px] text-emerald-50/50">
                  Choose this on the device containing the correct data.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSide("receiver")}
              className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.045] px-4 py-3 text-left"
            >
              <Download size={18} className="text-cyan-100" />
              <span>
                <span className="block text-sm font-black text-white">
                  Receive data on this device
                </span>
                <span className="mt-0.5 block text-[11px] text-white/45">
                  Choose this on the new or receiving device.
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {side === "sender" && !session ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Smartphone size={17} /> Sending device
            </div>
            <Instructions side="sender" />
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3.5 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              {busy ? <LoaderCircle size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
              {busy ? "Preparing protected copy..." : "Create one-time transfer code"}
            </button>
            <button type="button" onClick={reset} className="mt-3 w-full text-xs font-bold text-white/45">
              Go back
            </button>
          </div>
        ) : null}

        {side === "sender" && session ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white/60">
                {status === "awaiting_approval" ? "Approval needed" : status || "Waiting"}
              </span>
              {remaining ? <span className="text-xs font-black text-amber-200">{remaining}</span> : null}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-4"
            >
              <span className="text-3xl font-black tracking-[0.22em] text-emerald-100">
                {String(session.code || "").replace(/(\d{3})(\d{3})/, "$1 $2")}
              </span>
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>

            <SummaryGrid summary={session.summary} />

            {status === "waiting" ? (
              <p className="mt-4 text-center text-xs leading-5 text-white/50">
                Waiting for the other device to enter this code.
              </p>
            ) : null}

            {status === "awaiting_approval" ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
                <p className="text-xs font-black text-amber-50">Confirm the receiving device</p>
                <p className="mt-1 text-sm text-amber-50/70">
                  {session.receiverDeviceLabel || "Unknown receiving device"}
                </p>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={busy}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Approve this device
                </button>
              </div>
            ) : null}

            {status === "approved" ? (
              <p className="mt-4 text-center text-xs leading-5 text-cyan-100/65">
                Approved. The other device can now tap Import safely.
              </p>
            ) : null}

            {status === "consumed" ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-center text-sm font-black text-emerald-100">
                Transfer completed. This device&apos;s data stayed unchanged.
              </div>
            ) : null}

            {!['consumed', 'cancelled', 'expired'].includes(status) ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-white/55"
              >
                <X size={15} /> Cancel transfer
              </button>
            ) : (
              <button type="button" onClick={reset} className="mt-4 w-full text-xs font-black text-white/55">
                Done
              </button>
            )}
          </div>
        ) : null}

        {side === "receiver" && !session ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Smartphone size={17} /> Receiving device
            </div>
            <Instructions side="receiver" />
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000 000"
              className="mt-4 h-14 w-full rounded-2xl border border-white/12 bg-black/25 px-4 text-center text-2xl font-black tracking-[0.2em] text-white outline-none focus:border-cyan-300/50"
            />
            <button
              type="button"
              onClick={handleClaim}
              disabled={busy || code.length !== 6}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-200 px-4 py-3.5 text-sm font-black text-slate-950 disabled:opacity-40"
            >
              {busy ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowLeftRight size={17} />}
              Request this transfer
            </button>
            <button type="button" onClick={reset} className="mt-3 w-full text-xs font-bold text-white/45">
              Go back
            </button>
          </div>
        ) : null}

        {side === "receiver" && session ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white/60">
                {status === "awaiting_approval" ? "Waiting for approval" : status}
              </span>
              {remaining ? <span className="text-xs font-black text-amber-200">{remaining}</span> : null}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/55">
              Data preview from <strong className="text-white/80">{session.senderDeviceLabel || "sending device"}</strong>
            </p>
            <SummaryGrid summary={session.summary} />

            {status === "awaiting_approval" ? (
              <p className="mt-4 text-center text-xs leading-5 text-cyan-100/60">
                Approve this device on the sending device. Nothing has been imported yet.
              </p>
            ) : null}

            {status === "approved" ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                <p className="text-xs leading-5 text-emerald-50/70">
                  CLARA will stage this copy in a new protected vault, verify it, and only then switch this device. Existing local data will not be cleared first.
                </p>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={busy}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3.5 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}
                  {busy ? "Importing and verifying..." : "Migrate to this device now"}
                </button>
              </div>
            ) : null}

            {status === "consumed" && result ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-100">
                <p className="font-black">{result.message}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 w-full rounded-xl bg-emerald-200 px-4 py-3 font-black text-slate-950"
                >
                  Open transferred data
                </button>
              </div>
            ) : null}

            {!['consumed', 'cancelled', 'expired'].includes(status) ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-white/55"
              >
                <X size={15} /> Cancel request
              </button>
            ) : null}
          </div>
        ) : null}

        {hasRecovery ? (
          <button
            type="button"
            onClick={handleRollback}
            disabled={busy}
            className="mt-4 w-full rounded-2xl border border-amber-300/18 bg-amber-300/[0.07] px-4 py-3 text-xs font-black text-amber-100 disabled:opacity-50"
          >
            Return to data from before the last transfer
          </button>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs leading-5 text-red-100">
            {error}
          </div>
        ) : null}
      </section>
      <ClaraDataResetPanel />
    </>
  );
}
