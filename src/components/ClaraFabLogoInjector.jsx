import { useEffect } from "react";

export default function ClaraFabLogoInjector() {
  useEffect(() => {
    const run = () => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const target = buttons.find((button) => {
        if (button.dataset.claraFabLogo === "true") return false;
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const nearCenter = Math.abs(centerX - window.innerWidth / 2) < 90;
        const nearBottom = window.innerHeight - rect.bottom < 150;
        const roundSize = rect.width >= 46 && rect.width <= 92 && rect.height >= 46 && rect.height <= 92;
        const hasIcon = Boolean(button.querySelector("svg"));
        return nearCenter && nearBottom && roundSize && hasIcon;
      });

      if (!target) return;

      target.dataset.claraFabLogo = "true";
      const icon = target.querySelector("svg");
      if (icon) icon.style.display = "none";

      const mark = document.createElement("span");
      mark.style.width = "34px";
      mark.style.height = "34px";
      mark.style.borderRadius = "999px";
      mark.style.display = "inline-block";
      mark.style.pointerEvents = "none";
      mark.style.background = "conic-gradient(from 220deg, #0369c7 0 25%, #00a84f 25% 63%, #f8ff35 63% 78%, transparent 78% 100%)";
      mark.style.clipPath = "polygon(50% 0%, 100% 34%, 78% 42%, 82% 100%, 28% 86%, 0% 48%, 18% 12%)";
      mark.style.filter = "drop-shadow(0 3px 6px rgba(0,0,0,.32))";

      target.appendChild(mark);
    };

    run();
    const timer = window.setInterval(run, 800);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
