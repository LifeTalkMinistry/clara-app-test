function installPasswordResetRouteBridge() {
  if (typeof window === "undefined") return;

  const outerParams = new URLSearchParams(window.location.search);
  const token = outerParams.get("token")?.trim();
  if (!token) return;

  // PASSWORD_RESET_APP_URL used to be stored unquoted in .env.production.
  // Because # starts a comment in dotenv-style files, some reset emails were
  // generated as https://clarapmc.com/?token=... instead of the HashRouter
  // route https://clarapmc.com/#/reset-password?token=.... Canonicalize those
  // links before React Router mounts so both existing and future reset emails
  // open the dedicated password reset screen instead of falling through to login.
  outerParams.delete("token");
  const remainingSearch = outerParams.toString();
  const canonicalUrl = `${window.location.pathname}${
    remainingSearch ? `?${remainingSearch}` : ""
  }#/reset-password?token=${encodeURIComponent(token)}`;

  window.history.replaceState(window.history.state, "", canonicalUrl);
}

installPasswordResetRouteBridge();

export { installPasswordResetRouteBridge };
