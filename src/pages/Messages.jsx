import { Navigate, useLocation } from "react-router-dom";

export default function Messages() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set("view", "messages");
  return <Navigate to={`/community?${params.toString()}`} replace />;
}
