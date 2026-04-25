// CLARA FAB draggable behavior
(function () {
  const selector = ".clara-fab, .clara-quick-fab, .clara-quick-button, .clara-ai-fab, .quick-fab, .quick-circle, .quick-orb, .fab-button, .ai-fab, .bottom-nav-fab, .floating-ai-button, .floating-quick-button, .floating-action-button, button";
  const key = "clara_fab_position_v3";
  const gap = 16;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function saved() {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
      return null;
    }
  }

  function store(position) {
    try {
      localStorage.setItem(key, JSON.stringify(position));
    } catch (error) {
      console.warn("CLARA FAB position was not saved", error);
    }
  }

  function isFab(el) {
    if (!el || el.dataset.claraFabIgnore === "true") return false;

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const className = String(el.className || "").toLowerCase();
    const label = String(el.getAttribute("aria-label") || "").toLowerCase();
    const text = String(el.textContent || "").toLowerCase().trim();

    const namedLikeFab =
      className.includes("fab") ||
      className.includes("quick") ||
      className.includes("orb") ||
      label.includes("clara") ||
      label.includes("quick") ||
      label.includes("ai");

    const circular = rect.width >= 44 && rect.height >= 44 && Math.abs(rect.width - rect.height) <= 18;
    const floating = style.position === "fixed" || style.position === "absolute" || rect.bottom > window.innerHeight - 180;
    const notPanelButton = rect.width <= 96 && rect.height <= 96 && text.length <= 12;

    return namedLikeFab && circular && floating && notPanelButton;
  }

  function bounds(el, x, y) {
    const rect = el.getBoundingClientRect();
    const width = rect.width || 64;
    const height = rect.height || 64;

    return {
      x: clamp(x, gap, Math.max(gap, window.innerWidth - width - gap)),
      y: clamp(y, gap, Math.max(gap, window.innerHeight - height - gap)),
    };
  }

  function setPosition(el, position) {
    const next = bounds(el, position.x, position.y);
    el.style.position = "fixed";
    el.style.left = next.x + "px";
    el.style.top = next.y + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.zIndex = "80";
    el.style.transform = "none";
    store(next);
    return next;
  }

  function defaultPosition(el) {
    const rect = el.getBoundingClientRect();
    return bounds(el, window.innerWidth - (rect.width || 64) - 24, window.innerHeight - (rect.height || 64) - 96);
  }

  function snap(el, position) {
    const rect = el.getBoundingClientRect();
    const width = rect.width || 64;
    const leftSide = position.x + width / 2 < window.innerWidth / 2;
    el.classList.add("is-snapping");
    const next = setPosition(el, {
      x: leftSide ? gap : window.innerWidth - width - gap,
      y: position.y,
    });
    setTimeout(function () {
      el.classList.remove("is-snapping");
    }, 220);
    return next;
  }

  function make(el) {
    if (!isFab(el) || el.dataset.claraFabReady === "true") return;
    el.dataset.claraFabReady = "true";
    el.classList.add("clara-draggable-fab");

    let pos = setPosition(el, saved() || defaultPosition(el));
    let down = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let baseX = 0;
    let baseY = 0;
    let blockClick = false;

    function finishDrag(event) {
      if (!down) return;
      down = false;
      el.classList.remove("is-dragging");
      if (event && event.pointerId !== undefined) {
        try {
          el.releasePointerCapture(event.pointerId);
        } catch (error) {
          console.warn("CLARA FAB pointer release skipped", error);
        }
      }
      if (moved) {
        pos = snap(el, pos);
        blockClick = true;
        setTimeout(function () {
          blockClick = false;
        }, 220);
      }
    }

    el.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      down = true;
      moved = false;
      startX = event.clientX;
      startY = event.clientY;
      baseX = pos.x;
      baseY = pos.y;
      el.classList.add("is-dragging");
      if (event.pointerId !== undefined) {
        try {
          el.setPointerCapture(event.pointerId);
        } catch (error) {
          console.warn("CLARA FAB pointer capture skipped", error);
        }
      }
    });

    el.addEventListener("pointermove", function (event) {
      if (!down) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) < 8) return;
      moved = true;
      event.preventDefault();
      pos = setPosition(el, { x: baseX + dx, y: baseY + dy });
    });

    el.addEventListener("pointerup", finishDrag);
    el.addEventListener("pointercancel", finishDrag);

    el.addEventListener(
      "click",
      function (event) {
        if (!blockClick) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );

    window.addEventListener("resize", function () {
      pos = setPosition(el, pos);
    });
  }

  function init() {
    document.querySelectorAll(selector).forEach(make);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  setInterval(init, 600);
})();
