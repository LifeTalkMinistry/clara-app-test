import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_THEME_KEY,
  buildNavPalette,
  buildThemeGroups,
  claraThemes,
  extractProfileThemeKey,
  getThemeByKey,
  getThemeCssVariables,
  readStoredThemeKey,
  writeStoredThemeKey,
} from "./themes";

const ThemeContext = createContext(null);

function applyThemeToDocument(theme) {
  if (typeof document === "undefined") return;

  const selectedTheme = getThemeByKey(theme?.key || theme);
  const root = document.documentElement;
  const body = document.body;
  const variables = getThemeCssVariables(selectedTheme);

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.theme = selectedTheme.key;
  body?.setAttribute("data-theme", selectedTheme.key);

  if (selectedTheme.isLight) {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
}

async function persistThemeToProfile(userId, themeKey) {
  if (!userId) return false;

  const updates = [
    { app_theme: themeKey, updated_at: new Date().toISOString() },
    { theme_key: themeKey, updated_at: new Date().toISOString() },
    { dashboard_theme: themeKey, updated_at: new Date().toISOString() },
  ];

  for (const payload of updates) {
    try {
      const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
      if (!error) return true;
      console.warn("Theme profile field update failed:", error);
    } catch (error) {
      console.warn("Theme profile persistence attempt failed:", error);
    }
  }

  return false;
}

export function ThemeProvider({ children }) {
  const { user, profile, authReady } = useAuth();
  const [themeKey, setThemeKeyState] = useState(() => readStoredThemeKey());
  const [pickerOpen, setPickerOpen] = useState(false);
  const hydratedProfileRef = useRef(false);
  const pendingRemoteSyncRef = useRef(null);

  const selectedTheme = useMemo(() => getThemeByKey(themeKey), [themeKey]);
  const themeGroups = useMemo(() => buildThemeGroups(), []);

  const broadcastTheme = useCallback(
    (nextThemeKey) => {
      if (typeof window === "undefined") return;

      const nextTheme = getThemeByKey(nextThemeKey);
      const detail = {
        themeKey: nextTheme.key,
        key: nextTheme.key,
        theme: nextTheme.key,
        userId: user?.id || null,
        palette: buildNavPalette(nextTheme),
      };

      window.dispatchEvent(new CustomEvent("clara-theme-change", { detail }));
      window.dispatchEvent(new CustomEvent("clara-theme-selected", { detail }));
    },
    [user?.id]
  );

  const setTheme = useCallback(
    async (nextThemeKey) => {
      const nextTheme = getThemeByKey(nextThemeKey);
      writeStoredThemeKey(nextTheme.key);
      setThemeKeyState(nextTheme.key);
      broadcastTheme(nextTheme.key);

      if (user?.id) {
        pendingRemoteSyncRef.current = nextTheme.key;
        await persistThemeToProfile(user.id, nextTheme.key);
        pendingRemoteSyncRef.current = null;
      }
    },
    [broadcastTheme, user?.id]
  );

  const openThemePicker = useCallback(() => setPickerOpen(true), []);
  const closeThemePicker = useCallback(() => setPickerOpen(false), []);

  useLayoutEffect(() => {
    applyThemeToDocument(selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    broadcastTheme(themeKey);
  }, [broadcastTheme, themeKey]);

  useEffect(() => {
    if (!authReady) return;

    const storedThemeKey = readStoredThemeKey();
    const profileThemeKey = extractProfileThemeKey(profile);

    if (user?.id) {
      const nextThemeKey = profileThemeKey || storedThemeKey || DEFAULT_THEME_KEY;

      if (!hydratedProfileRef.current || nextThemeKey !== themeKey) {
        hydratedProfileRef.current = true;
        writeStoredThemeKey(nextThemeKey);
        setThemeKeyState(nextThemeKey);
        broadcastTheme(nextThemeKey);
      }

      if (!profileThemeKey && pendingRemoteSyncRef.current !== nextThemeKey) {
        pendingRemoteSyncRef.current = nextThemeKey;
        persistThemeToProfile(user.id, nextThemeKey).finally(() => {
          pendingRemoteSyncRef.current = null;
        });
      }

      return;
    }

    hydratedProfileRef.current = false;

    if (storedThemeKey !== themeKey) {
      setThemeKeyState(storedThemeKey);
      broadcastTheme(storedThemeKey);
    }
  }, [authReady, broadcastTheme, profile, themeKey, user?.id]);

  const value = useMemo(
    () => ({
      themeKey,
      selectedTheme,
      themes: claraThemes,
      themeGroups,
      pickerOpen,
      setTheme,
      openThemePicker,
      closeThemePicker,
      setPickerOpen,
    }),
    [
      closeThemePicker,
      openThemePicker,
      pickerOpen,
      selectedTheme,
      setTheme,
      themeGroups,
      themeKey,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
