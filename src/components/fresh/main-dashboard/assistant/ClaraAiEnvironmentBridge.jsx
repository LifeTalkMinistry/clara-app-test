import { useEffect } from "react";
import useClaraAiEnvironment from "@/components/fresh/main-dashboard/assistant/useClaraAiEnvironment";

export default function ClaraAiEnvironmentBridge() {
  const claraAiEnvironment = useClaraAiEnvironment();

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;
    const body = document.body;
    const isActive = Boolean(claraAiEnvironment.isActive);

    root.classList.toggle("clara-ai-environment-active", isActive);
    root.dataset.claraAiMode = isActive ? "active" : "idle";

    if (body) {
      body.classList.toggle("clara-ai-environment-active", isActive);
      body.dataset.claraAiMode = isActive ? "active" : "idle";
    }

    return () => {
      root.classList.remove("clara-ai-environment-active");
      delete root.dataset.claraAiMode;

      if (body) {
        body.classList.remove("clara-ai-environment-active");
        delete body.dataset.claraAiMode;
      }
    };
  }, [claraAiEnvironment.isActive]);

  return null;
}
