import { Navigate, useLocation } from "react-router-dom";
import ClaraLifeProfile from "./ClaraLifeProfile";

export default function Profile() {
  const location = useLocation();
  const view = new URLSearchParams(location.search).get("view");

  if (view === "life-context") {
    return <ClaraLifeProfile />;
  }

  return <Navigate to="/community?view=profile" replace />;
}
