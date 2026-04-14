import { createContext, useState, useContext, useEffect, useCallback } from "react";
import { appParams } from "@/lib/app-params";

const AuthContext = createContext(null);

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(appParams.token
        ? { Authorization: `Bearer ${appParams.token}` }
        : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed: ${url}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);

      const result = await fetchJson("/api/auth/me");
      const currentUser = result?.user || null;

      setUser(currentUser);
      setIsAuthenticated(!!currentUser);

      if (!currentUser) {
        setAuthError({
          type: "auth_required",
          message: "Authentication required",
        });
      }
    } catch (error) {
      console.error("User auth check failed:", error);
      setUser(null);
      setIsAuthenticated(false);

      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: "auth_required",
          message: "Authentication required",
        });
      } else {
        setAuthError({
          type: "unknown",
          message: error.message || "Failed to verify user",
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const publicSettings = await fetchJson("/api/public-settings");
      setAppPublicSettings(publicSettings);

      if (appParams.token) {
        await checkUserAuth();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error("App state check failed:", error);

      if (error.status === 403 && error.data?.extra_data?.reason) {
        const reason = error.data.extra_data.reason;

        if (reason === "auth_required") {
          setAuthError({
            type: "auth_required",
            message: "Authentication required",
          });
        } else if (reason === "user_not_registered") {
          setAuthError({
            type: "user_not_registered",
            message: "User not registered for this app",
          });
        } else {
          setAuthError({
            type: reason,
            message: error.message || "Failed to load app",
          });
        }
      } else {
        setAuthError({
          type: "unknown",
          message: error.message || "Failed to load app",
        });
      }

      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    } finally {
      setIsLoadingPublicSettings(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = async (shouldRedirect = true) => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    localStorage.removeItem("clara_access_token");
    localStorage.removeItem("token");

    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);

    if (shouldRedirect) {
      window.location.href = "/";
    }
  };

  const navigateToLogin = () => {
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `/login?redirect=${currentUrl}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
