import { Navigate, useLocation } from "react-router-dom";
import ClaraLifeProfile from "./ClaraLifeProfile";

export default function Profile() {
  const location = useLocation();
  const view = new URLSearchParams(location.search).get("view");

  if (view === "life-context") {
    return (
      <div
        data-clara-life-profile-viewport="true"
        className="fixed inset-0 h-[100dvh] w-full overflow-y-auto bg-[#020714]"
        style={{ zIndex: 2147483500 }}
      >
        <ClaraLifeProfile />
      </div>
    );
  }

  return <Navigate to="/community?view=profile" replace />;
}
