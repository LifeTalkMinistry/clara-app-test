import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function useVoiceCapture({ onTranscript } = {}) {
  const recognitionRef = useRef(null);
  const [voiceState, setVoiceState] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [transcriptError, setTranscriptError] = useState("");

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore browser cleanup quirks
    }
  }, []);

  const start = useCallback(() => {
    setTranscript("");
    setTranscriptError("");

    if (!SpeechRecognition) {
      setVoiceState("fallback_text");
      setTranscriptError("Microphone access isn’t available right now. You can type your command instead.");
      return;
    }

    try {
      setVoiceState("requesting_permission");
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-PH";

      let finalText = "";
      recognition.onstart = () => setVoiceState("listening");
      recognition.onresult = (event) => {
        let interim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const part = event.results[index][0]?.transcript || "";
          if (event.results[index].isFinal) finalText += part;
          else interim += part;
        }
        setTranscript(`${finalText} ${interim}`.trim());
      };
      recognition.onerror = (event) => {
        const denied = event?.error === "not-allowed" || event?.error === "service-not-allowed";
        setVoiceState("error");
        setTranscriptError(
          denied
            ? "Microphone access isn’t available right now. You can type your command instead."
            : "I didn’t catch that. Try again or type it."
        );
      };
      recognition.onend = () => {
        const text = finalText.trim();
        if (text) {
          setVoiceState("transcript_ready");
          onTranscript?.(text);
          return;
        }
        setVoiceState((state) => (state === "error" ? state : "fallback_text"));
        setTranscriptError((current) => current || "I didn’t catch anything clearly. Try again or type your command.");
      };
      recognition.start();
    } catch (error) {
      console.error("Voice capture failed:", error);
      setVoiceState("fallback_text");
      setTranscriptError("Microphone access isn’t available right now. You can type your command instead.");
    }
  }, [onTranscript]);

  useEffect(() => () => stop(), [stop]);

  return {
    supported: Boolean(SpeechRecognition),
    voiceState,
    transcript,
    transcriptError,
    start,
    stop,
    setVoiceState,
  };
}

