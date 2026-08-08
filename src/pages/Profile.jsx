import { Navigate } from "react-router-dom";

export default function Profile() {
  return <Navigate to="/community?view=profile" replace />;
}
