import { Navigate } from "react-router-dom";

// Legacy route kept only so older links/builds cannot strand a new user.
// The founding-beta introduction has been retired; onboarding now begins
// immediately with the official CLARA onboarding flow.
export default function FoundingBetaWelcome() {
  return <Navigate to="/onboarding" replace />;
}
