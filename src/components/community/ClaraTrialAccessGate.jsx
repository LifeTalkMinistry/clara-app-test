import ClaraOrbPage from "@/components/community/ClaraOrbPage";

// Legacy access-gate entry point intentionally resolves straight to CLARA ORB.
// The pricing/trial screen is no longer part of the active user journey.
export default function ClaraTrialAccessGate() {
  return <ClaraOrbPage />;
}
