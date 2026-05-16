import { useEffect, useRef, useState } from "react";
import { ArrowDown, Check } from "lucide-react";

const SCROLL_TAP_THRESHOLD = 8;

export default function QuickActionDropdown({
  value,
  placeholder = "Select option",
  options = [],
  onChange,
  disabled = false,
  ariaLabel = "Select option",
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const pointerStartRef = useRef({ x: 0, y: 0, moved: false });
  const selected = options.find((item) => String(item.value) === String(value));

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const getToneClass = (tone) => {
    if (tone === "amber") {
      return "border-amber-300/15 bg-amber-500/10 text-amber-50 hover:bg-amber-500/15";
    }

    if (tone === "cyan") {
      return "border-cyan-300/15 bg-cyan-500/10 text-cyan-50 hover:bg-cyan-500/15";
    }

    if (tone === "emerald") {
      return "border-emerald-300/15 bg-emerald-500/10 text-emerald-50 hover:bg-emerald-500/15";
    }

    return "border-white/8 bg-white/[0.035] text-white hover:bg-white/[0.07]";
  };

  const handleOptionPointerDown = (event) => {
    pointerStartRef.current = {
      x: event.clientX || 0,
      y: event.clientY || 0,
      moved: false,
    };
  };

  const handleOptionPointerMove = (event) => {
    const start = pointerStartRef.current;
    const distanceX = Math.abs((event.clientX || 0) - start.x);
    const distanceY = Math.abs((event.clientY || 0) - start.y);

    if (distanceX > SCROLL_TAP_THRESHOLD || distanceY > SCROLL_TAP_THRESHOLD) {
      pointerStartRef.current = { ...start, moved: true };
    }
  };

  const handleOptionClick = (item) => {
    if (pointerStartRef.current.moved) {
      pointerStartRef.current = { x: 0, y: 0, moved: false };
      return;
    }

    if (item.disabled) {
      item.onDisabledClick?.();
      return;
    }

    onChange?.(item.value, item);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-55 ${
          open
            ? "border-cyan-300/35 bg-white/[0.075] shadow-[0_0_0_3px_rgba(34,211,238,0.10),0_12px_34px_rgba(0,0,0,0.22)]"
            : "border-white/15 bg-white/[0.075] hover:border-white/16 hover:bg-white/[0.06]"
        }`}
      >
        <span className={selected ? "min-w-0 text-white" : "min-w-0 text-white/35"}>
          <span className="block truncate">{selected?.label || placeholder}</span>
          {selected?.subtitle ? (
            <span className="mt-0.5 block truncate text-[11px] text-white/45">
              {selected.subtitle}
            </span>
          ) : null}
        </span>
        <ArrowDown
          className={`h-4 w-4 shrink-0 text-cyan-100/70 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="listbox"
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[220] max-h-[min(18rem,44vh)] overflow-y-auto overscroll-contain rounded-3xl border border-cyan-200/10 bg-[#06111f]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_36px_rgba(34,211,238,0.10)] backdrop-blur-2xl [-webkit-overflow-scrolling:touch]"
        >
          {options.map((item) => {
            const isSelected = String(value) === String(item.value);
            const toneClass = getToneClass(item.tone);

            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={item.disabled}
                onPointerDown={handleOptionPointerDown}
                onPointerMove={handleOptionPointerMove}
                onClick={() => handleOptionClick(item)}
                className={`mb-1 flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition last:mb-0 disabled:cursor-not-allowed disabled:opacity-45 ${toneClass} ${
                  isSelected
                    ? "ring-1 ring-cyan-300/30 shadow-[0_0_22px_rgba(34,211,238,0.10)]"
                    : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  {item.subtitle ? (
                    <span className="mt-0.5 block truncate text-[11px] text-white/45">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-cyan-200" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
