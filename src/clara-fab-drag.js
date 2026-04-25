// CLARA FAB draggable behavior
(function () {
  function makeDraggable(el) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;

    el.classList.add("clara-draggable-fab");

    const onDown = (e) => {
      isDragging = true;
      el.classList.add("is-dragging");
      startX = e.clientX || e.touches?.[0]?.clientX;
      startY = e.clientY || e.touches?.[0]?.clientY;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const x = e.clientX || e.touches?.[0]?.clientX;
      const y = e.clientY || e.touches?.[0]?.clientY;

      offsetX += x - startX;
      offsetY += y - startY;

      el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

      startX = x;
      startY = y;
    };

    const onUp = () => {
      isDragging = false;
      el.classList.remove("is-dragging");
    };

    el.addEventListener("mousedown", onDown);
    el.addEventListener("touchstart", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
  }

  function init() {
    const candidates = document.querySelectorAll(
      ".clara-fab, .clara-quick-fab, .clara-quick-button, .clara-ai-fab, .quick-fab, .quick-circle, .quick-orb, .fab-button, .ai-fab, .bottom-nav-fab, .floating-ai-button, .floating-quick-button, .floating-action-button"
    );

    candidates.forEach((el) => makeDraggable(el));
  }

  window.addEventListener("load", init);
})();
