import { Navigate } from "react-router-dom";

// The old Committed upgrade screen is intentionally retired. CLARA's normal
// financial/accountability experience is free and should never route a user
// into a feature-unlock purchase flow.
export default function Enroll() {
  return <Navigate to="/dashboard" replace />;
}
