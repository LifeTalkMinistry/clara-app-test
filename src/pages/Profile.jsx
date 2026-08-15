import { createPortal } from "react-dom";
import { Navigate, useLocation } from "react-router-dom";
import ClaraLifeProfile from "./ClaraLifeProfile";

export default function Profile() {
  const location = useLocation();
  const view = new URLSearchParams(location.search).get("view");

  if (view === "life-context") {
    if (typeof document === "undefined") return null;

    return createPortal(
      <div
        data-clara-life-profile-viewport="true"
        className="fixed inset-0 h-[100dvh] w-full overflow-y-auto bg-[#020714]"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100dvh",
          overflowX: "hidden",
          overflowY: "auto",
          background: "#020714",
          zIndex: 2147483500,
        }}
      >
        <style>{`
          [data-clara-life-profile-viewport="true"] [data-clara-life-profile-page="true"] > div:first-child {
            height: 3px !important;
            min-height: 3px !important;
            max-height: 3px !important;
            flex: 0 0 3px !important;
          }
        `}</style>
        <ClaraLifeProfile />
      </div>,
      document.body,
    );
  }

  return <Navigate to="/community?view=profile" replace />;
}
