import { useRef, useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";
import { formatBubbleTime } from "@/components/fresh/messages/messagesUtils";

const LONG_PRESS_MS = 440;
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

function MessageConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-16 backdrop-blur-sm sm:items-center sm:pb-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-confirm-title"
        aria-describedby="message-confirm-description"
        className="w-full max-w-sm rounded-[26px] border border-white/10 bg-[#0a1728] p-5 shadow-2xl shadow-black/50"
      >
        <h2 id="message-confirm-title" className="text-base font-black text-white">
          {title}
        </h2>
        <p
          id="message-confirm-description"
          className="mt-2 text-sm font-semibold leading-relaxed text-white/52"
        >
          {description}
        </p>
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
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-white/75 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-11 rounded-2xl bg-red-500/90 text-sm font-black text-white shadow-lg shadow-red-950/20 disabled:opacity-50"
          >
            {busy ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
      <div className="flex h-6 items-center gap-0.5 rounded-full border border-white/10 bg-[#0a1728] px-2 shadow-lg shadow-black/25">
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
  onDeleted,
  onInteractionChanged,
}) {
  const token = getStoredBackendToken();
  const longPressTimerRef = useRef(null);
  const pointerStartRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isTemporary = messageIdIsTemporary(message?.id);

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
    setPressing(false);
  };

  const openActions = () => {
    if (isTemporary) return;
    setError("");
    setMenuOpen(true);
    setPressing(false);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  };

  const handlePointerDown = (event) => {
    if (isTemporary || event.pointerType === "mouse" && event.button !== 0) return;
    cancelLongPress();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    setPressing(true);
    longPressTimerRef.current = window.setTimeout(openActions, LONG_PRESS_MS);
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
    openActions();
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

  return (
    <>
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="relative max-w-[82%]">
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close message actions"
                onClick={() => {
                  if (!busy) setMenuOpen(false);
                }}
                className="fixed inset-0 z-[115] cursor-default bg-transparent"
              />
              <div
                className={`absolute bottom-[calc(100%+10px)] z-[120] w-max max-w-[calc(100vw-32px)] rounded-[22px] border border-white/10 bg-[#0a1728]/98 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl ${
                  isMine ? "right-0" : "left-0"
                }`}
              >
                <div className="flex items-center gap-0.5">
                  {MESSAGE_REACTIONS.map((reaction) => {
                    const selected = message.my_reaction === reaction.type;
                    return (
                      <button
                        type="button"
                        key={reaction.type}
                        aria-label={reaction.label}
                        aria-pressed={selected}
                        disabled={busy}
                        onClick={() => handleReaction(reaction.type)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-[20px] transition-transform active:scale-90 disabled:opacity-45 ${
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
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="flex h-10 w-full items-center gap-2 rounded-xl px-2.5 text-left text-xs font-black text-red-200/90 hover:bg-red-400/[0.08] disabled:opacity-45"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete message
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onContextMenu={handleContextMenu}
            className={`touch-pan-y select-none rounded-[22px] px-4 py-3 transition-transform duration-150 ${
              pressing ? "scale-[0.985]" : "scale-100"
            } ${
              isMine
                ? "rounded-br-md bg-[#22c7b8] text-[#042f2e]"
                : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white"
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
              {message.content}
            </p>
            <div
              className={`mt-1.5 text-[10px] ${
                isMine ? "text-[#042f2e]/65" : "text-white/35"
              }`}
            >
              {formatBubbleTime(message.created_at)}
            </div>
          </div>

          <ReactionSummary summary={message.reaction_summary} isMine={isMine} />
        </div>
      </div>

      <MessageConfirmDialog
        open={confirmOpen}
        title="Delete message?"
        description="This removes the message from your CLARA chat only. The other person keeps their copy."
        confirmLabel="Delete"
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
        aria-expanded={menuOpen}
        onClick={() => {
          setError("");
          setMenuOpen((current) => !current);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close conversation options"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-[115] cursor-default bg-transparent"
          />
          <div className="absolute right-0 top-12 z-[120] w-52 overflow-hidden rounded-[18px] border border-white/10 bg-[#0a1728]/98 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <button
              type="button"
              disabled={!canClear}
              onClick={() => {
                setError("");
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="flex h-11 w-full items-center gap-2.5 rounded-[13px] px-3 text-left text-xs font-black text-red-200/90 hover:bg-red-400/[0.08] disabled:cursor-not-allowed disabled:text-white/25"
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
