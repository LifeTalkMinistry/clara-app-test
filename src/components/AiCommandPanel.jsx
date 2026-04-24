import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Loader2, Send, Sparkles, X } from "lucide-react";
import useAiCommandSession from "@/hooks/useAiCommandSession";
import { getGeminiStatus } from "@/lib/ai-command/ai-engine";
import { stopSpeechOutput } from "@/lib/ai-command/voice-output";

const FALLBACK_THEME = {
  accent: "#34d399",
  accentEnd: "#059669",
  accentSoft: "rgba(52, 211, 153, 0.12)",
  accentBorder: "rgba(52, 211, 153, 0.18)",
  accentGlow: "rgba(52, 211, 153, 0.28)",
  panelStart: "rgba(11, 18, 32, 0.98)",
  panelEnd: "rgba(11, 18, 32, 0.94)",
  panelBorder: "rgba(255, 255, 255, 0.10)",
  mutedText: "rgba(255, 255, 255, 0.64)",
  strongText: "#ffffff",
};

function getFirstName(user) {
  const rawName =
    user?.user_metadata?.preferred_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")?.[0] ||
    "Max";

  return String(rawName).trim().split(/\s+/)[0] || "Max";
}

export default function AiCommandPanel({
  open,
  mode = "chat",
  user,
  onOpenChange,
  themePalette,
}) {
  const palette = useMemo(
    () => ({
      ...FALLBACK_THEME,
      ...(themePalette || {}),
    }),
    [themePalette]
  );

  const [text, setText] = useState("");
  const [displayHistory, setDisplayHistory] = useState([]);
  const inputRef = useRef(null);
  const historyRef = useRef(null);
  const hasOpenedRef = useRef(false);
  const syncedHistoryLengthRef = useRef(0);

  const sessionApi = useAiCommandSession({ user, mode: "chat" });
  const { session, processing, reset, submitText, confirm, cancel } = sessionApi;
  const geminiStatus = getGeminiStatus();
  const firstName = getFirstName(user);

  useEffect(() => {
    if (!open) {
      hasOpenedRef.current = false;
      syncedHistoryLengthRef.current = 0;
      setDisplayHistory([]);
      return;
    }

    if (hasOpenedRef.current) return;

    hasOpenedRef.current = true;
    syncedHistoryLengthRef.current = 0;
    setDisplayHistory([]);
    reset("chat");
    setText("");

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus?.();
    }, 180);

    return () => clearTimeout(focusTimer);
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    const currentLength = session.history.length;
    const previousLength = syncedHistoryLengthRef.current;

    if (currentLength < previousLength) {
      syncedHistoryLengthRef.current = currentLength;
      setDisplayHistory(session.history);
      return;
    }

    if (currentLength > previousLength) {
      const nextMessages = session.history.slice(previousLength);
      syncedHistoryLengthRef.current = currentLength;
      setDisplayHistory((current) => [...current, ...nextMessages]);
    }
  }, [open, session.history]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      const node = historyRef.current;
      if (!node) return;

      node.scrollTo({
        top: node.scrollHeight,
        behavior: displayHistory.length <= 1 ? "auto" : "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [open, processing, session.awaitingConfirmation, displayHistory.length]);

  const close = useCallback(() => {
    stopSpeechOutput();
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(() => {
    const next = text.trim();
    if (!next || processing) return;

    setText("");
    submitText(next);
  }, [processing, submitText, text]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleSubmit();
    },
    [handleSubmit]
  );

  const subtitle = geminiStatus.configured
    ? `AI ready • ${geminiStatus.model}`
    : "AI ready • local financial reasoning";

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[65] bg-black/50 backdrop-blur-[4px]"
        onClick={close}
        aria-label="Close CLARA chat"
      />

      <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-3">
        <section
          className="mx-auto flex max-h-[78dvh] max-w-md flex-col rounded-[28px] border p-4 shadow-[0_28px_90px_rgba(0,0,0,0.62)] backdrop-blur-2xl"
          style={{
            borderColor: palette.panelBorder,
            background: `linear-gradient(180deg, ${palette.panelStart} 0%, ${palette.panelEnd} 100%)`,
            color: palette.strongText,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  borderColor: palette.accentBorder,
                  background: palette.accentSoft,
                  color: palette.accent,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                CLARA
              </div>

              <h2 className="mt-3 text-2xl font-semibold leading-tight">
                Chat with CLARA
              </h2>

              <p className="mt-1 text-sm" style={{ color: palette.mutedText }}>
                Type your expense or financial question.
              </p>

              <p className="mt-2 text-[11px]" style={{ color: palette.mutedText }}>
                {subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="rounded-full border p-2 transition active:scale-95"
              style={{
                borderColor: palette.panelBorder,
                background: "rgba(255,255,255,0.06)",
                color: palette.mutedText,
              }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={historyRef}
            className="mt-4 min-h-[170px] flex-1 space-y-3 overflow-y-auto pr-1"
          >
            {displayHistory.length === 0 ? (
              <div
                className="rounded-3xl border px-4 py-4 text-sm leading-6"
                style={{
                  borderColor: palette.accentBorder,
                  background: palette.accentSoft,
                  color: palette.strongText,
                }}
              >
                Hey {firstName}, I’m CLARA.
                <br />
                <span style={{ color: palette.mutedText }}>
                  Tell me what you spent, added, or want to plan.
                </span>
                <br />
                <span style={{ color: palette.mutedText }}>
                  Example: “I spent 120 on Jollibee using GCash.”
                </span>
              </div>
            ) : null}

            {displayHistory.map((message, index) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={`${message.role}-${index}-${message.content}`}
                  className={`whitespace-pre-line rounded-2xl border px-3 py-2 text-sm leading-6 ${
                    isUser ? "ml-8" : "mr-8"
                  }`}
                  style={{
                    borderColor: isUser ? palette.accentBorder : palette.panelBorder,
                    background: isUser ? palette.accentSoft : "rgba(255,255,255,0.045)",
                    color: isUser ? palette.strongText : palette.mutedText,
                  }}
                >
                  {message.content}
                </div>
              );
            })}

            {processing ? (
              <div
                className="mr-8 flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm"
                style={{
                  borderColor: palette.panelBorder,
                  background: "rgba(255,255,255,0.045)",
                  color: palette.mutedText,
                }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                CLARA is thinking...
              </div>
            ) : null}
          </div>

          {session.awaitingConfirmation ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-2xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.99]"
                style={{
                  borderColor: palette.panelBorder,
                  background: "rgba(255,255,255,0.04)",
                  color: palette.mutedText,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirm}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
                style={{
                  background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentEnd} 100%)`,
                  boxShadow: `0 10px 24px ${palette.accentGlow}`,
                }}
              >
                Confirm
              </button>
            </div>
          ) : null}

          <div
            className="mt-3 flex items-center gap-2 rounded-2xl border p-2"
            style={{
              borderColor: palette.panelBorder,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <Keyboard className="ml-2 h-4 w-4" style={{ color: palette.mutedText }} />

            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{
                color: palette.strongText,
                caretColor: palette.accent,
              }}
              placeholder="Type your expense..."
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || processing}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition active:scale-95 disabled:opacity-40"
              style={{
                background: text.trim()
                  ? `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentEnd} 100%)`
                  : "rgba(255,255,255,0.08)",
              }}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}