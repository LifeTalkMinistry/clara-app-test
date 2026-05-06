export const getYoutubeId = (value = "") => {
  const text = String(value || "").trim();

  if (!text) return null;

  try {
    if (text.includes("youtu.be/")) {
      return text.split("youtu.be/")[1]?.split(/[?&/]/)[0] || null;
    }

    if (text.includes("/shorts/")) {
      return text.split("/shorts/")[1]?.split(/[?&/]/)[0] || null;
    }

    if (text.includes("/embed/")) {
      return text.split("/embed/")[1]?.split(/[?&/]/)[0] || null;
    }

    const url = new URL(text);
    return url.searchParams.get("v");
  } catch {
    return null;
  }
};
