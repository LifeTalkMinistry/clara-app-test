export default function DashboardPanelRenderer({
  activePanel = "home",
  renderHome,
  renderFeed,
  renderMessages,
  renderTask,
  renderSettings,
  fallback = null,
}) {
  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") return renderSettings?.() ?? fallback;

  return renderHome?.() ?? fallback;
}
