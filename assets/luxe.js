// Shared micro-interactions: a trailing cursor ring and a soft parallax tilt on the product line cards.
// Mouse only; skipped entirely for touch screens and reduced-motion users.
(function () {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ring = document.createElement("div");
  ring.className = "cursor";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(ring);
  let x = -100, y = -100, rx = x, ry = y, raf = 0;
  const HOT = "a, button, summary, [role=button], .panel, .card .media, input, select, textarea";
  function loop() {
    rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
    ring.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
    raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.3 ? requestAnimationFrame(loop) : 0;
  }
  addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    ring.classList.add("on");
    ring.classList.toggle("hot", !!e.target.closest(HOT));
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener("pointerleave", () => ring.classList.remove("on"));

  // Product line cards lean toward the cursor; the photo drifts the other way for depth
  document.querySelectorAll(".cats .cat").forEach(card => {
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${(px * 5).toFixed(2)}deg) rotateX(${(-py * 4).toFixed(2)}deg)`;
      card.style.setProperty("--px", (-px * 14).toFixed(1) + "px");
      card.style.setProperty("--py", (-py * 14).toFixed(1) + "px");
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; card.style.removeProperty("--px"); card.style.removeProperty("--py"); });
  });
})();
