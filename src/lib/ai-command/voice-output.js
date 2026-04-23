const FEMALE_HINTS = [
  "female",
  "woman",
  "zira",
  "samantha",
  "ava",
  "aria",
  "jenny",
  "karen",
  "siri female",
];

const MALE_HINTS = [
  "male",
  "man",
  "david",
  "daniel",
  "fred",
  "jorge",
  "thomas",
  "alex",
  "google uk english male",
];

const LOCALE_HINTS = ["en-ph", "fil-ph", "en-us", "en-gb", "english"];

function matchesHints(voice, hints = []) {
  const haystack = `${voice?.name || ""} ${voice?.lang || ""}`.toLowerCase();
  return hints.some((hint) => haystack.includes(hint));
}

function rankVoice(voice, preference) {
  const haystack = `${voice?.name || ""} ${voice?.lang || ""}`.toLowerCase();
  let score = 0;

  if (LOCALE_HINTS.some((hint) => haystack.includes(hint))) score += 20;
  if (preference === "female" && matchesHints(voice, FEMALE_HINTS)) score += 40;
  if (preference === "male" && matchesHints(voice, MALE_HINTS)) score += 40;
  if (preference === "female" && matchesHints(voice, MALE_HINTS)) score -= 10;
  if (preference === "male" && matchesHints(voice, FEMALE_HINTS)) score -= 10;

  return score;
}

export function speechOutputSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getSpeechSynthesisVoices() {
  if (!speechOutputSupported()) return [];
  return window.speechSynthesis.getVoices() || [];
}

export function pickSpeechVoice(voices = [], preference = "female") {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const ranked = [...voices].sort(
    (a, b) => rankVoice(b, preference) - rankVoice(a, preference)
  );

  if (rankVoice(ranked[0], preference) > 0) return ranked[0];

  const localeVoices = voices.filter((voice) => rankVoice(voice, preference) >= 20);
  if (preference === "male" && localeVoices.length > 1) return localeVoices[1];
  return localeVoices[0] || voices[0];
}

export function stopSpeechOutput() {
  if (!speechOutputSupported()) return;
  window.speechSynthesis.cancel();
}

export function warmupSpeechOutput() {
  if (!speechOutputSupported()) return [];
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.resume();
  } catch (error) {
    console.warn("CLARA speech warmup failed:", error);
  }
  return getSpeechSynthesisVoices();
}

export function speakClaraText(
  text,
  { voicePreference = "female", onStart, onEnd, onError } = {}
) {
  if (!speechOutputSupported() || !String(text || "").trim()) {
    onError?.(new Error("Speech synthesis unavailable."));
    return null;
  }

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(String(text).trim());
  const voices = warmupSpeechOutput();
  const voice = pickSpeechVoice(voices, voicePreference);

  utterance.lang = voice?.lang || "en-PH";
  utterance.voice = voice || null;
  utterance.rate = 0.96;
  utterance.pitch = voicePreference === "male" ? 0.9 : 1.06;
  utterance.volume = 1;

  utterance.onstart = () => onStart?.({ utterance, voice });
  utterance.onend = () => onEnd?.({ utterance, voice });
  utterance.onerror = (event) => {
    const error = Object.assign(new Error("Speech synthesis failed."), {
      originalEvent: event,
    });
    onError?.(error);
  };

  try {
    stopSpeechOutput();
    synthesis.resume();
    setTimeout(() => {
      try {
        synthesis.speak(utterance);
      } catch (error) {
        onError?.(error);
      }
    }, 60);
  } catch (error) {
    onError?.(error);
  }

  return {
    utterance,
    voice,
  };
}
