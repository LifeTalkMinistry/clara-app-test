import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Loader2,
  Mic,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import useAiCommandSession from "@/hooks/useAiCommandSession";
import useVoiceCapture from "@/hooks/useVoiceCapture";
import { getGeminiStatus } from "@/lib/ai-command/ai-engine";
import {
  CLARA_VOICE_OPTIONS,
  getStoredClaraVoice,
  setStoredClaraVoice,
} from "@/lib/clara-settings";
import {
  getSpeechSynthesisVoices,
  pickSpeechVoice,
  speakClaraText,
  stopSpeechOutput,
} from "@/lib/ai-command/voice-output";

export default function AiCommandPanel({
  open,
  mode = "speak",
  user,
  onOpenChange,
  themePalette,
}) {
  const [text, setText] = useState("");
  const [voicePreference, setVoicePreference] = useState(() =>
    getStoredClaraVoice(user?.id)
  );
  const [voiceName, setVoiceName] = useState("");
  const inputRef = useRef(null);
  const historyRef = useRef(null);
  const lastSpokenRef = useRef("");
  const sessionApi = useAiCommandSession({ user, mode });
  const { session, processing, reset, submitText, confirm, cancel } = sessionApi;
  const geminiStatus = getGeminiStatus();

  const voice = useVoiceCapture({
    onTranscript: (nextTranscript) => {
      if (nextTranscript && nextTranscript.trim().length >= 2) {
        submitText(nextTranscript);
      }
    },
  });

  useEffect(() => {
    setVoicePreference(getStoredClaraVoice(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    reset(mode);
    setText("");
    lastSpokenRef.current = "";
    if (mode === "speak") {
      setTimeout(() => voice.start(), 180);
    } else {
      setTimeout(() => inputRef.current?.focus?.(), 180);
    }
  }, [open, mode, reset, voice]);

  useEffect(() => {
    if (open && mode === "chat") inputRef.current?.focus?.();
  }, [mode, open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const node = historyRef.current;
      if (!node) return;
      node.scrollTo({
        top: node.scrollHeight,
        behavior: session.history.length <= 1 ? "auto" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, processing, session.awaitingConfirmation, session.history.length, voice.transcript]);

  useEffect(() => {
    const syncVoices = () => {
      const selected = pickSpeechVoice(getSpeechSynthesisVoices(), voicePreference);
      setVoiceName(selected?.name || "");
    };

    syncVoices();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;

    window.speechSynthesis.onvoiceschanged = syncVoices;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === syncVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [voicePreference]);

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      const nextVoice = event?.detail?.settings?.ai?.voice;
      if (nextVoice) setVoicePreference(nextVoice);
    };
    window.addEventListener("clara-settings-updated", handler);
    return () => window.removeEventListener("clara-settings-updated", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const lastMessage = session.history[session.history.length - 1];
    if (lastMessage?.role !== "assistant") return;
    const content = String(lastMessage.content || "").trim();
    if (!content || content === lastSpokenRef.current) return;

    lastSpokenRef.current = content;
    try {
      speakClaraText(content, { voicePreference });
    } catch (error) {
      console.warn("CLARA voice output unavailable:", error);
    }
  }, [open, session.history, voicePreference]);

  const transcriptPreview = useMemo(
    () => String(voice.transcript || "").trim(),
    [voice.transcript]
  );

  if (!open) return null;

  const close = () => {
    voice.stop();
    stopSpeechOutput();
    onOpenChange(false);
  };

  const handleSubmit = () => {
    const next = text.trim();
    if (!next) return;
    setText("");
    submitText(next);
  };

  const handleVoicePreferenceChange = (nextVoice) => {
    setVoicePreference(setStoredClaraVoice(user?.id, nextVoice));
  };

  const voiceStatus = (() => {
    if (voice.voiceState === "requesting_permission") return "Requesting microphone...";
    if (voice.voiceState === "listening") return "Listening...";
    if (voice.voiceState === "processing") return "Processing your command...";
    if (voice.voiceState === "transcript_ready") return "Transcript captured.";
    if (voice.voiceState === "error" || voice.voiceState === "fallback_text") {
      return voice.transcriptError || "Microphone unavailable. You can type instead.";
    }
    return mode === "speak"
      ? "Speak naturally. I will ask only for what is missing."
      : "Text fallback is ready.";
  })();

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-[5px]"
        onClick={close}
        aria-label="Close CLARA command panel"
      />

      <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-3">
        <section
          className="mx-auto flex max-h-[80dvh] max-w-md flex-col rounded-[30px] border p-4 shadow-[0_28px_90px_rgba(0,0,0,0.72)] backdrop-blur-2xl"
          style={{
            borderColor: themePalette.panelBorder,
            background: `linear-gradient(180deg, ${themePalette.panelStart} 0%, ${themePalette.panelEnd} 100%)`,
            color: themePalette.strongText,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  borderColor: themePalette.accentBorder,
                  background: themePalette.accentSoft,
                  color: themePalette.accent,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                CLARA Command
              </div>
              <h2 className="mt-3 text-2xl font-semibold">
                {mode === "speak" ? "Speak to CLARA" : "Chat with CLARA"}
              </h2>
              <p className="mt-1 text-sm" style={{ color: themePalette.mutedText }}>
                Voice first. Text stays ready when you need it.
              </p>
              <p className="mt-2 text-[11px]" style={{ color: themePalette.mutedText }}>
                {geminiStatus.configured
                  ? `Gemini: ${geminiStatus.model}`
                  : "Gemini key not configured. Using safe local understanding."}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                <Volume2 className="h-4 w-4" />
                CLARA Voice
              </div>
              <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                {CLARA_VOICE_OPTIONS.map((option) => {
                  const active = voicePreference === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleVoicePreferenceChange(option.value)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
                      style={{
                        color: active ? "#fff" : "rgba(255,255,255,0.66)",
                        background: active
                          ? `linear-gradient(135deg, ${themePalette.accent} 0%, ${themePalette.accentEnd} 100%)`
                          : "transparent",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-white/50">
              {voiceName ? `Using ${voiceName}` : "Voice will use your selected male or female preference."}
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border ${
                  voice.voiceState === "listening" ? "animate-pulse" : ""
                }`}
                style={{
                  borderColor: themePalette.accentBorder,
                  background: themePalette.accentSoft,
                  color: themePalette.accent,
                }}
              >
                <Mic className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{voiceStatus}</p>
                {transcriptPreview ? (
                  <p className="mt-1 line-clamp-2 text-xs text-white/65">"{transcriptPreview}"</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={voice.start}
                className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/75"
                aria-label="Retry voice"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={historyRef} className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {session.history.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl border px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-8 border-emerald-300/15 bg-emerald-300/10 text-white"
                    : "mr-8 border-white/10 bg-white/[0.045] text-white/78"
                }`}
              >
                {message.content}
              </div>
            ))}

            {voice.voiceState === "listening" && transcriptPreview ? (
              <div className="ml-8 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-6 text-white/55">
                {transcriptPreview}
              </div>
            ) : null}

            {processing ? (
              <div className="mr-8 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-white/65">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : null}
          </div>

          {session.awaitingConfirmation ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/75"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${themePalette.accent} 0%, ${themePalette.accentEnd} 100%)`,
                }}
              >
                Confirm
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
            <Keyboard className="ml-2 h-4 w-4 text-white/45" />
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              placeholder="Type if speaking is not available..."
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || processing}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white disabled:opacity-40"
              aria-label="Send command"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
