const isBrowser = typeof window !== "undefined";

const storage = isBrowser ? window.localStorage : null;

const toSnakeCase = (str) =>
  str.replace(/([A-Z])/g, "_$1").toLowerCase();

function getParamValue(
  paramName,
  { defaultValue = null, removeFromUrl = false } = {}
) {
  if (!isBrowser) return defaultValue;

  const storageKey = `clara_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const valueFromUrl = urlParams.get(paramName);

  if (valueFromUrl) {
    storage?.setItem(storageKey, valueFromUrl);

    if (removeFromUrl) {
      urlParams.delete(paramName);
      const newUrl = `${window.location.pathname}${
        urlParams.toString() ? `?${urlParams.toString()}` : ""
      }${window.location.hash}`;

      window.history.replaceState({}, document.title, newUrl);
    }

    return valueFromUrl;
  }

  const stored = storage?.getItem(storageKey);
  if (stored) return stored;

  if (defaultValue !== null) {
    storage?.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  return null;
}

function getAppParams() {
  if (!isBrowser) return {};

  if (getParamValue("clear_token") === "true") {
    storage?.removeItem("clara_access_token");
    storage?.removeItem("token");
  }

  return {
    token: getParamValue("access_token", { removeFromUrl: true }),
    fromUrl: window.location.href,

    // optional env (safe if missing)
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "",
    appName: import.meta.env.VITE_APP_NAME || "CLARA",
  };
}

export const appParams = {
  ...getAppParams(),
};