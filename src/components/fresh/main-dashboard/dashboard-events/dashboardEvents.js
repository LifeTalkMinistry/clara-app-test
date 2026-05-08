export const dispatchClaraEvent = (name, detail = null) => {
  if (typeof window === "undefined") return;

  if (detail && typeof detail === "object") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    return;
  }

  window.dispatchEvent(new Event(name));
};
