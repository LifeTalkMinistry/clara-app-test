import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";
import { formatBubbleTime } from "@/components/fresh/messages/messagesUtils";

const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE = 10;

const MESSAGE_REACTIONS = [
  { type: "like", emoji: "👍", label: "Like" },
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "care", emoji: "🤗", label: "Care" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

function messageIdIsTemporary(messageId) {
  return String(messageId || "").startsWith("temp-");
}

function bubbleShape(isMine, groupPosition) {
  if (groupPosition === "middle") {
    return isMine ? "rounded-r-lg" : "rounded-l-lg";
  }
  if (groupPosition === "first") {
    return isMine ? "rounded-br-lg" : "rounded-bl-lg";
  }
  if (groupPosition === "last") {
    return isMine
      ? "rounded-tr-lg rounded-br-md"
      : "rounded-tl-lg rounded-bl-md";
  }
  return isMine ? "rounded-br-md" : "rounded-bl-md";
}

function MessageConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel = "Working...",
  busy,
  error,
  onCancel,
  onConfirm,
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onCancel();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-[160] w-[calc(100%-32px)] max-w-sm -translate-x-1/2 rounded-[26px] border border-white/10 bg-[#0a1728] p-5 text-white shadow-2xl shadow-black/50 outline-none sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
        >
          <DialogPrimitive.Title className="text-base font-black text-white">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm font-semibold leading-relaxed text-white/52">
            {description}
          </DialogPrimitive.Description>
          {error ? (
            <p className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.08] px-3 py-2 text-xs font-bold text-red-200/85">
              {error}
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-white/75 transition hover:bg-white/[0.08] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="h-11 rounded-2xl bg-red-500/90 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 disabled:opacity-50"
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ReactionSummary({ summary = {}, isMine }) {
  const active = MESSAGE_REACTIONS.filter(
    (reaction) => Number(summary?.[reaction.type] || 0) > 0
  );
  if (!active.length) return null;

  const total = active.reduce(
    (sum, reaction) => sum + Number(summary?.[reaction.type] || 0),
    0
  );

  return (
    <div className={`-mt-1.5 flex ${isMine ? "justify-end pr-3" : "justify-start pl-3"}`}>
      <div className="flex h-6 items-center gap-0.5 rounded-full border border-white/10 bg-[#0a1728]/95 px-2 shadow-lg shadow-black/25 backdrop-blur-xl">
        {active.slice(0, 3).map((reaction) => (
          <span key={reaction.type} className="text-[12px] leading-none">
            {reaction.emoji}
          </span>
        ))}
        {total > 1 ? (
          <span className="ml-0.5 text-[9px] font-black text-white/55">{total}</span>
        ) : null}
      </div>
    </div>
  );
}

export function InteractiveMessageBubble({
  message,
  isMine,
  groupPosition = "single",
  showReceipt = false,
  onDeleted,
  onInteractionChanged,
}) {
  const token = getStoredBackendToken();
  const longPressTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const firstActionRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isTemporary = messageIdIsTemporary(message?.id);
  const messageTime = formatBubbleTime(message.created_at);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const timer = window.setTimeout(() => firstActionRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [menuOpen]);

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
    setPressing(false);
  };

  const openActions = ({ haptic = true } = {}) => {
    if (isTemporary) return;
    setError("");
    setMenuOpen(true);
    setPressing(false);
    if (
      haptic &&
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(8);
    }
  };

  const handlePointerDown = (event) => {
    if (
      isTemporary ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    cancelLongPress();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    setPressing(true);
    longPressTimerRef.current = window.setTimeout(
      () => openActions({ haptic: true }),
      LONG_PRESS_MS
    );
  };

  const handlePointerMove = (event) => {
    const start = pointerStartRef.current;
    if (!start) return;
    if (
      Math.abs(event.clientX - start.x) > LONG_PRESS_MOVE_TOLERANCE ||
      Math.abs(event.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelLongPress();
    }
  };

  const handleContextMenu = (event) => {
    if (isTemporary) return;
    event.preventDefault();
    cancelLongPress();
    openActions({ haptic: event.pointerType !== "mouse" });
  };

  const handleBubbleKeyDown = (event) => {
    if (isTemporary) return;
    const opensMenu =
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ContextMenu" ||
      (event.shiftKey && event.key === "F10");
    if (!opensMenu) return;
    event.preventDefault();
    cancelLongPress();
    openActions({ haptic: false });
  };

  const handleReaction = async (reactionType) => {
    if (!token || busy || isTemporary) return;
    setBusy(true);
    setError("");
    try {
      const result = await backendRequest(
        `/api/messages/${encodeURIComponent(message.id)}/reaction`,
        {
          method: "PUT",
          token,
          body: { reaction_type: reactionType },
        }
      );
      onInteractionChanged?.(result);
      setMenuOpen(false);
    } catch (reactionError) {
      console.error("[Messages] reaction update failed:", reactionError);
      setError("Couldn’t update that reaction. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!token || busy || isTemporary) return;
    setBusy(true);
    setError("");
    try {
      const result = await backendRequest(
        `/api/messages/${encodeURIComponent(message.id)}`,
        {
          method: "DELETE",
          token,
        }
      );
      onDeleted?.(result?.id ?? message.id);
      setConfirmOpen(false);
      setMenuOpen(false);
    } catch (deleteError) {
      console.error("[Messages] delete-for-me failed:", deleteError);
      setError("Couldn’t delete this message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const receiptText = isTemporary
    ? "Sending…"
    : message.is_read
      ? "Seen"
      : "Sent";

  return (
    <>
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="relative max-w-[84%] sm:max-w-[72%]">
          {menuOpen ? (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close message actions"
                onClick={() => {
                  if (!busy) setMenuOpen(false);
                }}
                className="fixed inset-0 z-[115] cursor-default bg-transparent"
              />
              <div
                role="menu"
                aria-label="Message actions"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !busy) {
                    event.preventDefault();
                    setMenuOpen(false);
                  }
                }}
                className={`absolute bottom-[calc(100%+10px)] z-[120] w-max max-w-[calc(100vw-24px)] rounded-[24px] border border-white/10 bg-[#0a1728]/98 p-2.5 shadow-2xl shadow-black/55 backdrop-blur-2xl ${
                  isMine ? "right-0" : "left-0"
                }`}
              >
                <p className="px-1 pb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/32">
                  React
                </p>
                <div className="flex items-center gap-0.5">
                  {MESSAGE_REACTIONS.map((reaction, index) => {
                    const selected = message.my_reaction === reaction.type;
                    return (
                      <button
                        type="button"
                        role="menuitemradio"
                        ref={index === 0 ? firstActionRef : undefined}
                        key={reaction.type}
                        aria-label={reaction.label}
                        aria-checked={selected}
                        disabled={busy}
                        onClick={() => handleReaction(reaction.type)}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-[21px] outline-none transition duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#5eead4]/70 active:scale-90 disabled:opacity-45 ${
                          selected
                            ? "bg-[#22c7b8]/18 ring-1 ring-[#5eead4]/50"
                            : "hover:bg-white/[0.07]"
                        }`}
                      >
                        {reaction.emoji}
                      </button>
                    );
                  })}
                </div>
                <div className="my-2 h-px bg-white/[0.08]" />
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="flex h-10 w-full items-center gap-2 rounded-xl px-2.5 text-left text-xs font-black text-red-200/90 outline-none transition hover:bg-red-400/[0.08] focus-visible:bg-red-400/[0.08] disabled:opacity-45"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete for you
                </button>
                {error ? (
                  <p className="px-2.5 pb-1 pt-1 text-[10px] font-bold text-red-200/80">
                    {error}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          <div
            role={isTemporary ? undefined : "button"}
            tabIndex={isTemporary ? -1 : 0}
            aria-label={
              isTemporary
                ? undefined
                : `${isMine ? "Your" : "Received"} message at ${messageTime}. Press Enter for message actions.`
            }
            aria-haspopup={isTemporary ? undefined : "menu"}
            aria-expanded={isTemporary ? undefined : menuOpen}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onContextMenu={handleContextMenu}
            onKeyDown={handleBubbleKeyDown}
            className={`touch-pan-y select-none rounded-[22px] px-4 py-2.5 outline-none transition duration-150 focus-visible:ring-2 focus-visible:ring-[#5eead4]/55 ${
              pressing ? "scale-[0.985]" : "scale-100"
            } ${bubbleShape(isMine, groupPosition)} ${
              isMine
                ? "bg-gradient-to-br from-[#23c9ba] to-[#13b8ad] text-[#032f2c] shadow-[0_10px_28px_rgba(20,184,166,0.10)]"
                : "border border-white/[0.08] bg-white/[0.065] text-white shadow-[0_10px_28px_rgba(0,0,0,0.10)] backdrop-blur-sm"
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed">
              {message.content}
            </p>
            <div
              className={`mt-1 flex items-center justify-end gap-1.5 text-[9px] font-semibold ${
                isMine ? "text-[#042f2e]/58" : "text-white/32"
              }`}
            >
              {messageTime}
            </div>
          </div>

          <ReactionSummary summary={message.reaction_summary} isMine={isMine} />
          {showReceipt && isMine ? (
            <p className="mt-1 pr-1 text-right text-[9px] font-bold tracking-[0.02em] text-white/34">
              {receiptText}
            </p>
          ) : null}
        </div>
      </div>

      <MessageConfirmDialog
        open={confirmOpen}
        title="Delete for you?"
        description="This removes the message from your CLARA chat only. The other person keeps their copy."
        confirmLabel="Delete"
        busyLabel="Deleting..."
        busy={busy}
        error={error}
        onCancel={() => {
          if (busy) return;
          setError("");
          setConfirmOpen(false);
        }}
        onConfirm={handleDelete}
      />
    </>
  );
}

export function ConversationActionsMenu({ messageIds = [], onCleared }) {
  const token = getStoredBackendToken();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const persistentIds = messageIds.filter((id) => !messageIdIsTemporary(id));
  const canClear = persistentIds.length > 0;

  const handleClear = async () => {
    if (!token || busy || !canClear) return;
    setBusy(true);
    setError("");
    try {
      const result = await backendRequest("/api/messages/clear", {
        method: "POST",
        token,
        body: { ids: persistentIds },
      });
      onCleared?.(Array.isArray(result?.ids) ? result.ids : persistentIds);
      setConfirmOpen(false);
      setMenuOpen(false);
    } catch (clearError) {
      console.error("[Messages] clear conversation failed:", clearError);
      setError("Couldn’t clear this conversation. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Conversation options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => {
          setError("");
          setMenuOpen((current) => !current);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/60 outline-none transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[#5eead4]/55"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {menuOpen ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close conversation options"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-[115] cursor-default bg-transparent"
          />
          <div
            role="menu"
            aria-label="Conversation actions"
            className="absolute right-0 top-12 z-[120] w-56 overflow-hidden rounded-[20px] border border-white/10 bg-[#0a1728]/98 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-2xl"
          >
            <div className="px-3 pb-1.5 pt-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
              Conversation
            </div>
            <button
              type="button"
              role="menuitem"
              disabled={!canClear}
              onClick={() => {
                setError("");
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="flex h-11 w-full items-center gap-2.5 rounded-[13px] px-3 text-left text-xs font-black text-red-200/90 outline-none transition hover:bg-red-400/[0.08] focus-visible:bg-red-400/[0.08] disabled:cursor-not-allowed disabled:text-white/25"
            >
              <Trash2 className="h-4 w-4" />
              Clear conversation
            </button>
          </div>
        </>
      ) : null}

      <MessageConfirmDialog
        open={confirmOpen}
        title="Clear conversation?"
        description="This removes every message in this conversation from your CLARA view only. The other person keeps their copy."
        confirmLabel="Clear chat"
        busyLabel="Clearing..."
        busy={busy}
        error={error}
        onCancel={() => {
          if (busy) return;
          setError("");
          setConfirmOpen(false);
        }}
        onConfirm={handleClear}
      />
    </div>
  );
}
