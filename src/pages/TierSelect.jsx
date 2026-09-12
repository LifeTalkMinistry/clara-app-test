import { Navigate } from "react-router-dom";

// The membership selector is preserved elsewhere for future monetization, but
// this legacy route must never flash plan UI during Founding Access.
export default function TierSelect() {
  return <Navigate to="/dashboard" replace />;
}
