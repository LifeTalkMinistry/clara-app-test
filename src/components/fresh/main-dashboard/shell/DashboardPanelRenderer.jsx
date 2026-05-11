export default function DashboardPanelRenderer({
  activePanel = "home",
  renderHome,
  renderFeed,
  renderMessages,
  renderTask,
  renderSettings,
  renderMe,
  renderLifeOS,
  fallback = null,
}) {
  if (activePanel === "me") {
    return renderMe?.() ?? renderSettings?.() ?? fallback;
  }

  if (activePanel === "lifeos") {
    return renderLifeOS?.() ?? renderFeed?.() ?? fallback;
  }

  if (activePanel === "feed") return renderFeed?.() ?? fallback;
  if (activePanel === "messages") return renderMessages?.() ?? fallback;
  if (activePanel === "task") return renderTask?.() ?? fallback;
  if (activePanel === "settings") return renderSettings?.() ?? fallback;

  return renderHome?.() ?? fallback;
}
