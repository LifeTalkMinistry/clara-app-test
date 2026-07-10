import { useEffect } from "react";
import CommittedAccessCodeModal from "@/components/access/CommittedAccessCodeModal";
import {
  readIosAccessSession,
  validateIosAccessSession,
} from "@/lib/ios-access-client";

export default function IosPwaAccessGate({ children }) {
  useEffect(() => {
    const session = readIosAccessSession();
    if (!session?.token) return;

    validateIosAccessSession().catch((error) => {
      if (error?.code === "network_error") {
        console.warn("CLARA could not refresh the Committed code while offline.");
        return;
      }

      console.info("CLARA Committed code session is no longer active.", {
        code: error?.code || "invalid_session",
      });
    });
  }, []);

  return (
    <>
      {children}
      <CommittedAccessCodeModal />
    </>
  );
}
