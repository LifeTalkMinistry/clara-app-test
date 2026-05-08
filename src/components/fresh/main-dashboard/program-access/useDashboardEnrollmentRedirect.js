import { useEffect } from "react";
import { shouldForceToEnroll } from "@/components/fresh/main-dashboard/program-access/programAccessRules";

export default function useDashboardEnrollmentRedirect({
  guardChecked,
  profileData,
  latestEnrollment,
  isPaid,
  navigate,
}) {
  useEffect(() => {
    if (!guardChecked || !profileData) return;

    const shouldRedirect = shouldForceToEnroll(profileData, latestEnrollment, isPaid);

    if (shouldRedirect) {
      navigate("/enroll", { replace: true });
    }
  }, [guardChecked, profileData, latestEnrollment, isPaid, navigate]);
}
