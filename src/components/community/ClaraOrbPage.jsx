import { useEffect, useId, useRef, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Clock3,
  Landmark,
  ListChecks,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";
import { triggerClaraHaptic } from "@/lib/claraHaptics";
import {
  CLARA_ORB_COMMANDS,
  ORB_COMMAND_HOLD_MS,
  ORB_COMMAND_PRE_HOLD_MOVE_PX,
  dispatchClaraOrbCommandSelection,
  getOrbCommandDeadZone,
  getOrbCommandRadius,
  getOrbCommandTarget,
} from "@/lib/clara-orb-command-ring";

// Keep the traced CLARA silhouette, but express the long sampled blue contour as
// deliberate curves so the solid edge stays smooth at mobile render sizes.
const CLARA_BLUE_PATH =
  "M 163.3 72.0 C 132.0 72.0 106.2 87.0 90.0 111.0 C 76.7 130.8 73.9 157.7 82.2 178.4 C 85.0 185.4 89.4 191.0 92.6 195.8 C 93.3 198.1 90.2 214.6 85.8 229.9 L 111.0 221.5 C 114.5 220.3 116.2 220.1 118.1 220.7 C 141.4 234.5 172.6 239.0 200.7 222.7 C 203.6 220.6 203.2 216.8 200.1 212.0 C 197.5 208.2 193.4 203.4 188.6 204.8 C 171.7 211.6 153.8 212.7 138.4 205.3 C 116.7 194.9 104.2 174.7 104.2 152.9 C 104.2 122.7 128.5 98.4 160.8 95.9 C 174.3 94.9 188.1 100.2 197.7 108.4 C 200.4 110.5 204.7 106.1 208.7 102.0 C 211.8 98.8 213.4 95.9 212.6 94.4 C 204.6 80.8 184.5 72.3 163.3 72.0 Z";

const CLARA_RED_PATH =
  "M 223.0 108.6 L 220.5 110.0 L 218.2 112.0 L 216.1 114.2 L 213.8 116.3 L 211.9 118.6 L 211.0 121.3 L 211.6 124.1 L 212.9 126.6 L 214.2 129.1 L 215.3 131.8 L 216.3 134.4 L 217.1 137.2 L 217.9 140.0 L 218.5 142.8 L 219.0 145.6 L 219.4 148.6 L 219.6 151.6 L 219.6 154.6 L 219.4 157.6 L 219.0 160.6 L 218.6 163.5 L 218.0 166.3 L 217.3 169.1 L 216.5 171.8 L 215.6 174.5 L 214.4 177.1 L 213.3 179.7 L 211.9 182.2 L 210.4 184.7 L 208.9 187.1 L 207.1 189.5 L 205.5 191.9 L 204.6 194.6 L 205.1 197.4 L 206.7 199.9 L 208.6 202.1 L 210.4 204.4 L 212.4 206.7 L 214.6 208.5 L 217.5 209.0 L 220.2 208.0 L 222.3 206.0 L 224.2 203.7 L 225.9 201.5 L 227.6 199.2 L 229.3 197.0 L 231.0 195.0 L 231.9 192.3 L 233.2 190.0 L 234.4 187.4 L 235.6 184.8 L 236.5 182.3 L 237.6 179.7 L 238.4 177.0 L 239.3 174.2 L 239.9 171.4 L 240.5 168.6 L 241.0 165.7 L 241.4 162.8 L 241.8 159.9 L 242.0 156.9 L 242.0 153.8 L 242.0 150.7 L 241.8 147.7 L 241.5 144.8 L 241.0 141.9 L 240.7 139.0 L 240.1 136.1 L 239.3 133.4 L 238.6 130.6 L 237.7 127.9 L 236.7 125.2 L 235.6 122.6 L 234.4 120.0 L 233.2 117.5 L 231.7 115.0 L 230.2 112.5 L 228.5 110.2 L 226.0 108.8 Z";

const ORB_COMMAND_ICONS = {
  "log-expense": ReceiptText,
  "add-income": BadgeDollarSign,
  wallet: WalletCards,
  calendar: CalendarDays,
  "money-schedule": Clock3,
  "emergency-fund": ShieldCheck,
  "savings-goal": PiggyBank,
  "debt-obligation": Landmark,
  "weekly-cross-check": ListChecks,
};

const COMMAND_VISIBLE_STATES = new Set([
  "commandOpening",
  "commandActive",
  "commandTargeted",
  "commandSelected",
  "closing",
]);

function ClaraOrbVector({ className = "", compact = false }) {
  const rawId = useId();
  const id = rawId.replace(/:/g, "");
  const glassId = `clara-orb-glass-${id}`;
  const ambientId = `clara-orb-ambient-${id}`;
  const rimId = `clara-orb-rim-${id}`;
  const blueId = `clara-orb-blue-${id}`;
  const redId = `clara-orb-red-${id}`;
  const goldId = `clara-orb-gold-${id}`;
  const floorId = `clara-orb-floor-${id}`;
  const glowId = `clara-orb-glow-${id}`;
  const softGlowId = `clara-orb-soft-glow-${id}`;
  const logoGlowId = `clara-orb-logo-glow-${id}`;

  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
      className={`${className} clara-orb-vector block overflow-visible select-none`}
    >
      <defs>
        <radialGradient id={glassId} cx="39%" cy="27%" r="78%">
          <stop offset="0%" stopColor="#173874" stopOpacity="0.78" />
          <stop offset="30%" stopColor="#081b42" stopOpacity="0.95" />
          <stop offset="67%" stopColor="#02081c" />
          <stop offset="100%" stopColor="#010217" />
        </radialGradient>

        <radialGradient id={ambientId} cx="42%" cy="34%" r="66%">
          <stop offset="0%" stopColor="#2e69c7" stopOpacity="0.15" />
          <stop offset="58%" stopColor="#0b1b3a" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#010217" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={rimId} x1="7%" y1="13%" x2="94%" y2="87%">
          <stop offset="0%" stopColor="#58c9ff" />
          <stop offset="18%" stopColor="#20bfff" />
          <stop offset="43%" stopColor="#1475ff" />
          <stop offset="65%" stopColor="#4c52ff" />
          <stop offset="82%" stopColor="#d62db5" />
          <stop offset="100%" stopColor="#ff3358" />
        </linearGradient>

        <linearGradient id={blueId} x1="18%" y1="8%" x2="79%" y2="94%">
          <stop offset="0%" stopColor="#3be4ff" />
          <stop offset="24%" stopColor="#1fc5ff" />
          <stop offset="55%" stopColor="#1591ff" />
          <stop offset="82%" stopColor="#0e5aff" />
          <stop offset="100%" stopColor="#2544ff" />
        </linearGradient>

        <linearGradient id={redId} x1="24%" y1="6%" x2="76%" y2="96%">
          <stop offset="0%" stopColor="#ff5558" />
          <stop offset="31%" stopColor="#ff2538" />
          <stop offset="73%" stopColor="#ff102d" />
          <stop offset="100%" stopColor="#e90c35" />
        </linearGradient>

        <linearGradient id={goldId} x1="28%" y1="0%" x2="72%" y2="100%">
          <stop offset="0%" stopColor="#fff58a" />
          <stop offset="26%" stopColor="#ffe548" />
          <stop offset="76%" stopColor="#ffd01c" />
          <stop offset="100%" stopColor="#ffbd00" />
        </linearGradient>

        <linearGradient id={floorId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#168bff" stopOpacity="0" />
          <stop offset="24%" stopColor="#168bff" stopOpacity="0.65" />
          <stop offset="52%" stopColor="#315fff" stopOpacity="0.58" />
          <stop offset="77%" stopColor="#e52b95" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#f32645" stopOpacity="0" />
        </linearGradient>

        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={logoGlowId} x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={softGlowId} x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      {!compact ? (
        <>
          <ellipse
            cx="160"
            cy="281"
            rx="80"
            ry="8"
            fill={`url(#${floorId})`}
            filter={`url(#${softGlowId})`}
            opacity="0.58"
          />
          <ellipse
            cx="160"
            cy="278.5"
            rx="56"
            ry="2.5"
            fill={`url(#${floorId})`}
            opacity="0.76"
          />
        </>
      ) : null}

      <circle
        cx="160"
        cy="153"
        r="117"
        fill="#0b2a66"
        opacity="0.20"
        filter={`url(#${softGlowId})`}
      />

      <circle
        cx="160"
        cy="153"
        r="113"
        fill={`url(#${glassId})`}
        stroke={`url(#${rimId})`}
        strokeWidth="3.4"
        filter={`url(#${glowId})`}
      />

      <circle
        cx="160"
        cy="153"
        r="107"
        fill={`url(#${ambientId})`}
        stroke="#8bcfff"
        strokeOpacity="0.06"
        strokeWidth="1"
      />

      <path
        d={CLARA_BLUE_PATH}
        fill={`url(#${blueId})`}
        stroke="#78dcff"
        strokeOpacity="0.16"
        strokeWidth="1"
        strokeLinejoin="round"
        filter={`url(#${logoGlowId})`}
      />

      <path
        d={CLARA_RED_PATH}
        fill={`url(#${redId})`}
        stroke="#ff9a95"
        strokeOpacity="0.18"
        strokeWidth="0.9"
        strokeLinejoin="round"
        filter={`url(#${logoGlowId})`}
      />

      <rect
        x="142.6"
        y="126.5"
        width="14.6"
        height="55.3"
        rx="7.3"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />
      <rect
        x="167.3"
        y="126.5"
        width="14.6"
        height="55.3"
        rx="7.3"
        fill={`url(#${goldId})`}
        filter={`url(#${glowId})`}
      />

      <rect x="145.0" y="131.3" width="2.2" height="44" rx="1.1" fill="#fffde6" opacity="0.34" />
      <rect x="169.7" y="131.3" width="2.2" height="44" rx="1.1" fill="#fffde6" opacity="0.34" />
    </svg>
  );
}

export function ClaraOrbMark({ className = "", title = "CLARA Orb" }) {
  return (
    <span className={`${className} inline-flex items-center justify-center`} title={title}>
      <ClaraOrbVector className="h-full w-full" compact />
    </span>
  );
}

function MoneyLeftOrbVisual({ launching = false }) {
  return (
    <span
      aria-hidden="true"
      className={`clara-orb-asset-shell relative isolate flex h-full w-full items-center justify-center ${
        launching ? "clara-money-left-orb-launching" : "clara-money-left-orb-idle"
      }`}
    >
      <ClaraOrbVector className="h-full w-full" />
    </span>
  );
}

function ClaraOrbCommandPresentation({
  interactionState,
  selectedCommandId,
  commandRadius,
}) {
  if (!COMMAND_VISIBLE_STATES.has(interactionState)) return null;

  const expanded = interactionState !== "commandOpening" && interactionState !== "closing";

  return (
    <div
      className="clara-orb-command-ring pointer-events-none absolute inset-0 z-10"
      aria-hidden={interactionState === "closing" ? "true" : undefined}
      data-clara-orb-command-ring="true"
      data-expanded={expanded ? "true" : "false"}
    >
      {CLARA_ORB_COMMANDS.map((command, index) => {
        const Icon = ORB_COMMAND_ICONS[command.id];
        const radians = (command.angle * Math.PI) / 180;
        const radius = commandRadius * command.radius;
        const x = Math.cos(radians) * radius;
        const y = Math.sin(radians) * radius;
        const selected = selectedCommandId === command.id;
        const scale = selected ? 1.12 : expanded ? 1 : 0.74;
        const translateX = expanded ? x : 0;
        const translateY = expanded ? y : 0;

        return (
          <button
            key={command.id}
            type="button"
            tabIndex={-1}
            aria-label={command.label}
            className={`clara-orb-command-action absolute left-1/2 top-1/2 grid h-[50px] w-[50px] place-items-center rounded-full border ${
              selected ? "is-selected" : ""
            }`}
            style={{
              opacity: interactionState === "closing" ? 0 : expanded ? 1 : 0,
              transform: `translate(-50%, -50%) translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
              transitionDelay: expanded ? `${Math.min(index * 12, 72)}ms` : "0ms",
            }}
            data-clara-orb-command-id={command.id}
            data-selected={selected ? "true" : "false"}
          >
            {Icon ? <Icon aria-hidden="true" className="h-[19px] w-[19px]" strokeWidth={2.15} /> : null}
            {selected ? (
              <span className="clara-orb-command-action-label absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 whitespace-nowrap text-[9px] font-black tracking-[0.02em] text-white/82">
                {command.label}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function ClaraOrbPage({ onActivate, activationDelayMs = 0 }) {
  const [launching, setLaunching] = useState(false);
  const [interactionState, setInteractionState] = useState("idle");
  const [selectedCommandId, setSelectedCommandId] = useState(null);
  const [commandRadius, setCommandRadius] = useState(132);
  const weeklyAutoStartRef = useRef(false);
  const orbButtonRef = useRef(null);
  const interactionStateRef = useRef("idle");
  const selectedCommandIdRef = useRef(null);
  const activeGestureRef = useRef(null);
  const holdTimerRef = useRef(null);
  const openingFrameRef = useRef(null);
  const confirmationTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const suppressNextClickRef = useRef(false);
  const suppressionResetTimerRef = useRef(null);
  const lastSelectionHapticAtRef = useRef(0);

  // Tutorial controls pass onActivate and intentionally keep their original tap-only lesson.
  // Production renders without onActivate, so the canonical Orb receives command mode there.
  const isCommandModeEnabled = typeof onActivate !== "function";
  const commandModeVisible = COMMAND_VISIBLE_STATES.has(interactionState);
  const selectedCommand = CLARA_ORB_COMMANDS.find(
    (command) => command.id === selectedCommandId
  );
  const commandStatus = selectedCommand?.label || "CLARA COMMANDS";
  const weeklyMoneyCheckAutoStart =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "weekly-money-check";

  const setOrbInteractionState = (nextState) => {
    interactionStateRef.current = nextState;
    setInteractionState(nextState);
  };

  const setOrbCommandTarget = (commandId) => {
    selectedCommandIdRef.current = commandId;
    setSelectedCommandId(commandId);
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = null;
  };

  const clearCommandCloseTimers = () => {
    if (typeof window === "undefined") return;
    if (confirmationTimerRef.current !== null) {
      window.clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const armClickSuppression = () => {
    suppressNextClickRef.current = true;
    if (typeof window === "undefined") return;
    if (suppressionResetTimerRef.current !== null) {
      window.clearTimeout(suppressionResetTimerRef.current);
    }
    suppressionResetTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = false;
      suppressionResetTimerRef.current = null;
    }, 0);
  };

  const resetCommandGesture = () => {
    clearHoldTimer();
    activeGestureRef.current = null;
    setOrbCommandTarget(null);
    setOrbInteractionState("idle");
  };

  const measureOrbGeometry = () => {
    const launcher = orbButtonRef.current;
    if (!launcher || typeof window === "undefined") return null;

    const rect = launcher.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deadZonePx = getOrbCommandDeadZone(rect.width);
    const radius = getOrbCommandRadius({
      centerX,
      centerY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      orbWidth: rect.width,
    });

    setCommandRadius(radius);
    return { centerX, centerY, deadZonePx };
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("clara-orb-page-active");
    return () => document.body.classList.remove("clara-orb-page-active");
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
        if (confirmationTimerRef.current !== null) window.clearTimeout(confirmationTimerRef.current);
        if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
        if (openingFrameRef.current !== null) window.cancelAnimationFrame(openingFrameRef.current);
        if (suppressionResetTimerRef.current !== null) {
          window.clearTimeout(suppressionResetTimerRef.current);
        }
      }
      activeGestureRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!weeklyMoneyCheckAutoStart || weeklyAutoStartRef.current || typeof window === "undefined") {
      return undefined;
    }

    weeklyAutoStartRef.current = true;
    const delay = Math.max(180, Number(activationDelayMs) || 0);
    const timerId = window.setTimeout(() => {
      if (typeof onActivate === "function") {
        onActivate();
        return;
      }

      const requestId = `clara-weekly-money-check-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.dispatchEvent(
        new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
          detail: {
            requestId,
            source: "clara-orb-page-weekly-money-check",
          },
        })
      );
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [activationDelayMs, onActivate, weeklyMoneyCheckAutoStart]);

  const openClara = () => {
    if (launching || typeof window === "undefined") return;

    setLaunching(true);

    const activate = () => {
      if (typeof onActivate === "function") {
        onActivate();
        return;
      }

      const requestId = `clara-orb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.dispatchEvent(
        new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
          detail: {
            requestId,
            source: "clara-orb-page",
          },
        })
      );
    };

    const delay = Math.max(0, Number(activationDelayMs) || 0);
    if (delay > 0) window.setTimeout(activate, delay);
    else activate();

    window.setTimeout(() => setLaunching(false), 700);
  };

  const handleOrbClick = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    openClara();
  };

  const handleOrbPointerDown = (event) => {
    if (!isCommandModeEnabled || launching || interactionStateRef.current !== "idle") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    clearCommandCloseTimers();
    clearHoldTimer();
    setOrbCommandTarget(null);
    setOrbInteractionState("pressing");

    const launcher = event.currentTarget;
    const pointerId = event.pointerId;
    try {
      launcher.setPointerCapture?.(pointerId);
    } catch {}

    activeGestureRef.current = {
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      commandMode: false,
      cancelled: false,
      geometry: null,
    };

    if (typeof window === "undefined") return;
    holdTimerRef.current = window.setTimeout(() => {
      const gesture = activeGestureRef.current;
      if (!gesture || gesture.pointerId !== pointerId || gesture.cancelled) return;

      const geometry = measureOrbGeometry();
      if (!geometry) {
        resetCommandGesture();
        return;
      }

      gesture.commandMode = true;
      gesture.geometry = geometry;
      armClickSuppression();
      setOrbInteractionState("commandOpening");
      triggerClaraHaptic("light");

      openingFrameRef.current = window.requestAnimationFrame(() => {
        openingFrameRef.current = null;
        const activeGesture = activeGestureRef.current;
        if (!activeGesture?.commandMode || activeGesture.cancelled) return;
        setOrbInteractionState(
          selectedCommandIdRef.current ? "commandTargeted" : "commandActive"
        );
      });
    }, ORB_COMMAND_HOLD_MS);
  };

  const handleOrbPointerMove = (event) => {
    const gesture = activeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (!gesture.commandMode) {
      const preHoldDistance = Math.hypot(
        event.clientX - gesture.startX,
        event.clientY - gesture.startY
      );
      if (preHoldDistance > ORB_COMMAND_PRE_HOLD_MOVE_PX) {
        gesture.cancelled = true;
        clearHoldTimer();
        setOrbInteractionState("idle");
        armClickSuppression();
      }
      return;
    }

    const geometry = gesture.geometry;
    if (!geometry) return;

    const nextTarget = getOrbCommandTarget({
      pointerX: event.clientX,
      pointerY: event.clientY,
      centerX: geometry.centerX,
      centerY: geometry.centerY,
      deadZonePx: geometry.deadZonePx,
    });
    const nextTargetId = nextTarget?.id || null;

    if (nextTargetId === selectedCommandIdRef.current) return;

    setOrbCommandTarget(nextTargetId);
    setOrbInteractionState(nextTargetId ? "commandTargeted" : "commandActive");

    if (nextTargetId) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - lastSelectionHapticAtRef.current >= 45) {
        lastSelectionHapticAtRef.current = now;
        triggerClaraHaptic("selection");
      }
    }
  };

  const releaseOrbPointerCapture = (event) => {
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {}
  };

  const closeCommandMode = ({ dispatchCommandId = null } = {}) => {
    clearHoldTimer();
    clearCommandCloseTimers();

    const finish = () => {
      if (dispatchCommandId) {
        dispatchClaraOrbCommandSelection(dispatchCommandId);
      }
      activeGestureRef.current = null;
      setOrbCommandTarget(null);
      setOrbInteractionState("idle");
    };

    if (typeof window === "undefined") {
      finish();
      return;
    }

    setOrbInteractionState("closing");
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      finish();
    }, 170);
  };

  const handleOrbPointerUp = (event) => {
    const gesture = activeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    clearHoldTimer();
    releaseOrbPointerCapture(event);

    if (!gesture.commandMode) {
      if (gesture.cancelled) armClickSuppression();
      activeGestureRef.current = null;
      setOrbCommandTarget(null);
      setOrbInteractionState("idle");
      return;
    }

    armClickSuppression();
    const commandId = selectedCommandIdRef.current;
    if (!commandId) {
      closeCommandMode();
      return;
    }

    setOrbInteractionState("commandSelected");

    if (typeof window === "undefined") {
      closeCommandMode({ dispatchCommandId: commandId });
      return;
    }

    confirmationTimerRef.current = window.setTimeout(() => {
      confirmationTimerRef.current = null;
      closeCommandMode({ dispatchCommandId: commandId });
    }, 110);
  };

  const handleOrbPointerCancel = (event) => {
    const gesture = activeGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    clearHoldTimer();
    armClickSuppression();
    releaseOrbPointerCapture(event);
    setOrbCommandTarget(null);

    if (gesture.commandMode) {
      closeCommandMode();
      return;
    }

    activeGestureRef.current = null;
    setOrbInteractionState("idle");
  };

  return (
    <main
      className="clara-community-orb-view relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-5 text-center text-white"
      aria-label="CLARA Orb"
      data-clara-orb-page="true"
    >
      <style>{`
        body.clara-orb-page-active #clara-support-world {
          display: none !important;
        }

        .clara-community-root[data-community-view="orb"],
        .clara-community-orb-view {
          background: #010217 !important;
        }

        .clara-community-orb-view {
          isolation: isolate;
        }

        .clara-community-orb-view::before {
          content: none !important;
          display: none !important;
        }

        .clara-orb-asset-shell {
          border-radius: 999px;
        }

        .clara-orb-vector {
          transform: translateZ(0);
          shape-rendering: geometricPrecision;
          text-rendering: geometricPrecision;
        }

        .clara-orb-launcher-shell {
          touch-action: none;
          transform-origin: center;
          transition: transform 150ms cubic-bezier(.22,1,.36,1), filter 180ms ease;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
        }

        .clara-orb-launcher-shell[data-orb-interaction-state="pressing"] {
          transform: scale(.975);
        }

        .clara-orb-launcher-shell[data-orb-command-visible="true"] {
          transform: scale(1.006);
          filter: saturate(1.035) brightness(1.02);
        }

        .clara-orb-command-energy {
          position: absolute;
          inset: 10%;
          z-index: 1;
          border-radius: 999px;
          border: 1px solid rgba(87, 207, 255, 0.28);
          opacity: 0;
          transform: scale(.88);
          box-shadow:
            0 0 22px rgba(23, 139, 255, 0.15),
            inset 0 0 24px rgba(90, 89, 255, 0.07);
          transition: opacity 150ms ease, transform 220ms cubic-bezier(.22,1,.36,1);
        }

        .clara-orb-launcher-shell[data-orb-command-visible="true"] .clara-orb-command-energy {
          opacity: .92;
          transform: scale(1.04);
        }

        .clara-orb-command-ring {
          overflow: visible;
        }

        .clara-orb-command-action {
          pointer-events: none;
          color: rgba(238, 247, 255, 0.68);
          border-color: rgba(116, 170, 255, 0.23);
          background:
            radial-gradient(circle at 35% 28%, rgba(47, 105, 199, 0.32), rgba(7, 20, 52, 0.94) 58%, rgba(2, 7, 27, 0.98));
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.28),
            inset 0 0 0 1px rgba(255, 255, 255, 0.025),
            0 0 18px rgba(37, 99, 235, 0.08);
          transform-origin: center;
          transition:
            transform 220ms cubic-bezier(.22,1,.36,1),
            opacity 145ms ease,
            border-color 130ms ease,
            color 130ms ease,
            box-shadow 160ms ease,
            background 160ms ease;
          will-change: transform, opacity;
        }

        .clara-orb-command-action.is-selected {
          color: rgba(255, 255, 255, 0.98);
          border-color: rgba(255, 218, 92, 0.68);
          background:
            radial-gradient(circle at 34% 26%, rgba(51, 126, 229, 0.58), rgba(15, 34, 78, 0.98) 54%, rgba(3, 8, 29, 1));
          box-shadow:
            0 14px 34px rgba(0, 0, 0, 0.32),
            0 0 0 1px rgba(255, 218, 92, 0.12),
            0 0 24px rgba(51, 134, 255, 0.24),
            0 0 16px rgba(255, 210, 62, 0.12);
        }

        .clara-orb-command-action-label {
          text-shadow: 0 2px 10px rgba(0, 0, 0, .8);
        }

        .clara-orb-status-copy,
        .clara-orb-idle-copy {
          transition: opacity 150ms ease, transform 180ms cubic-bezier(.22,1,.36,1), color 150ms ease;
        }

        .clara-orb-idle-copy:has([data-clara-orb-means-metric="true"]) [data-clara-orb-means-placeholder="true"] {
          display: none;
        }

        @keyframes clara-money-left-orb-breathe {
          0%, 100% { transform: scale(.992); }
          50% { transform: scale(1.012); }
        }

        @keyframes clara-money-left-orb-tap {
          0% { transform: scale(1); }
          45% { transform: scale(.96); }
          100% { transform: scale(1.02); }
        }

        .clara-money-left-orb-idle {
          animation: clara-money-left-orb-breathe 4.2s ease-in-out infinite;
          transform-origin: center;
        }

        .clara-money-left-orb-launching {
          animation: clara-money-left-orb-tap .52s cubic-bezier(.22,1,.36,1) both;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .clara-money-left-orb-idle,
          .clara-money-left-orb-launching {
            animation: none !important;
          }

          .clara-orb-launcher-shell,
          .clara-orb-command-energy,
          .clara-orb-command-action,
          .clara-orb-status-copy,
          .clara-orb-idle-copy {
            transition-duration: 1ms !important;
            transition-delay: 0ms !important;
          }
        }
      `}</style>

      <div
        className="relative z-10 flex w-full max-w-3xl flex-col items-center justify-center"
        data-clara-orb-visual-offset="none"
        data-clara-orb-composition="true"
      >
        <div className="clara-orb-status-copy mb-1 min-h-[29px] select-none">
          <p
            className={`font-black uppercase text-white transition-all ${
              commandModeVisible
                ? "text-[12px] tracking-[0.18em]"
                : "text-[10px] tracking-[0.34em] text-white/42"
            }`}
          >
            {commandModeVisible ? commandStatus : "CLARA ORB"}
          </p>
          <div
            className={`mx-auto mt-3 h-px bg-[linear-gradient(90deg,transparent,#168bff,#ffd84a,#f32645,transparent)] transition-all ${
              commandModeVisible ? "w-32 opacity-90" : "w-24 opacity-70"
            }`}
          />
        </div>

        <div
          className="relative mt-1 shrink-0 overflow-visible"
          style={{ width: "min(78vw, 38dvh, 315px)" }}
          data-clara-orb-command-stage="true"
        >
          <ClaraOrbCommandPresentation
            interactionState={interactionState}
            selectedCommandId={selectedCommandId}
            commandRadius={commandRadius}
          />

          <button
            ref={orbButtonRef}
            type="button"
            onClick={handleOrbClick}
            onPointerDown={handleOrbPointerDown}
            onPointerMove={handleOrbPointerMove}
            onPointerUp={handleOrbPointerUp}
            onPointerCancel={handleOrbPointerCancel}
            onContextMenu={(event) => {
              if (isCommandModeEnabled) event.preventDefault();
            }}
            disabled={launching}
            className="clara-orb-launcher-shell group relative z-20 grid aspect-square w-full shrink-0 place-items-center outline-none disabled:cursor-default focus-visible:ring-2 focus-visible:ring-[#ffd84a]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#010217]"
            style={{ touchAction: isCommandModeEnabled ? "none" : "manipulation" }}
            aria-label="Tap CLARA to start Ask Before You Spend. Press and hold for CLARA commands."
            data-clara-orb-launcher="true"
            data-clara-orb-visual-source="native-vector-v3"
            data-orb-interaction-state={interactionState}
            data-orb-command-visible={commandModeVisible ? "true" : "false"}
          >
            <span className="clara-orb-command-energy pointer-events-none" aria-hidden="true" />
            <MoneyLeftOrbVisual launching={launching} />
          </button>
        </div>

        <div
          className={`clara-orb-idle-copy -mt-1 min-h-[59px] select-none ${
            commandModeVisible ? "pointer-events-none translate-y-1 opacity-0" : "opacity-100"
          }`}
          aria-hidden={commandModeVisible ? "true" : undefined}
        >
          <h1 className="text-[21px] font-black tracking-[-0.035em] text-white sm:text-[24px]">
            Ask before you spend.
          </h1>
          <div
            data-clara-orb-means-placeholder="true"
            className="mt-2 text-[11px] font-extrabold tracking-[0.005em] text-white/42"
            aria-live="polite"
          >
            — · Means score
          </div>
        </div>
      </div>
    </main>
  );
}
