(() => {
  "use strict";

  const scene = document.querySelector("[data-studio]");
  if (!scene) return;
  const background = scene.querySelector(".scene-backdrop");
  const subject = scene.querySelector(".scene-subject");
  const ribbon = scene.querySelector(".scene-ribbon");
  const control = scene.querySelector(".scene-pause");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const preference = "lovely-moments/pausa-escena";
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  let paused = false;
  function readPreference() {
    try { paused = sessionStorage.getItem(preference) === "1"; } catch { /* The control still works in this page. */ }
  }
  readPreference();

  let visible = true, playing = false, frame = 0, previousTime = 0;
  let width = 1, height = 1, top = 0;
  let pointerX = 0, pointerY = 0, aimX = 0, aimY = 0, progress = 0;

  function advance(value, target, weight) {
    return Math.abs(value - target) < .001 ? target : value + (target - value) * weight;
  }
  function paint(time) {
    frame = 0;
    const dt = clamp(time - previousTime, 0, 50);
    previousTime = time;
    const follow = 1 - Math.exp(-dt / 82);
    const target = clamp((window.scrollY - top) / height, 0, 1);
    progress = advance(progress, target, follow);
    aimX = advance(aimX, pointerX, follow);
    aimY = advance(aimY, pointerY, follow);
    // The paper, ribbon and photograph move at different depths. Text stays on its baseline.
    background.style.transform = "translate3d(" + (-3 * aimX).toFixed(2) + "px," + (24 * progress - 2 * aimY).toFixed(2) + "px,0)";
    ribbon.style.transform = "translate3d(" + (-8 * aimX + 14 * progress).toFixed(2) + "px," + (-24 * progress - 4 * aimY).toFixed(2) + "px,0)";
    subject.style.transform = "perspective(1100px) translate3d(" + (6 * aimX).toFixed(2) + "px," + (-42 * progress + 4 * aimY).toFixed(2) + "px,0) rotateY(" + (2.6 * aimX).toFixed(2) + "deg) rotateZ(" + (-1.6 * progress + .6 * aimX).toFixed(2) + "deg)";
    if (progress !== target || aimX !== pointerX || aimY !== pointerY) schedule();
    else previousTime = 0;
  }
  function schedule() {
    if (!playing || frame) return;
    if (!previousTime) previousTime = performance.now();
    frame = requestAnimationFrame(paint);
  }
  function onScroll() {
    document.body.classList.toggle("scene-at-top", window.scrollY <= 24);
    schedule();
  }
  function measure() {
    const rect = scene.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    top = window.scrollY + rect.top;
    onScroll();
  }
  function playback() {
    playing = visible && !document.hidden && !reduced.matches && !paused;
    scene.classList.toggle("is-playing", playing);
    control.hidden = reduced.matches;
    control.toggleAttribute("data-paused", paused);
    control.querySelector("use").setAttribute("href", paused ? "/assets/iconos.svg#play" : "/assets/iconos.svg#pause");
    control.title = paused ? "Reanudar movimiento" : "Pausar movimiento";
    control.setAttribute("aria-label", control.title);
    if (reduced.matches) {
      scene.classList.remove("reveal-copy", "reveal-gift");
      for (const layer of [background, ribbon, subject]) layer.style.removeProperty("transform");
      pointerX = pointerY = aimX = aimY = progress = 0;
    }
    if (playing) schedule();
    else {
      cancelAnimationFrame(frame);
      frame = previousTime = 0;
    }
  }
  control.addEventListener("click", () => {
    paused = !paused;
    try {
      if (paused) sessionStorage.setItem(preference, "1");
      else sessionStorage.removeItem(preference);
    } catch { /* Keep the preference in memory when storage is unavailable. */ }
    playback();
  });
  scene.addEventListener("pointermove", event => {
    if (!playing || !fine.matches || event.pointerType === "touch") return;
    pointerX = clamp(event.clientX / width * 2 - 1, -1, 1);
    pointerY = clamp((event.clientY + window.scrollY - top) / height * 2 - 1, -1, 1);
    schedule();
  });
  scene.addEventListener("pointerleave", () => { pointerX = pointerY = 0; schedule(); });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pageshow", event => {
    if (event.persisted) { readPreference(); playback(); }
    measure();
  });
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(scene);
  if ("IntersectionObserver" in window) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    playback();
  }).observe(scene);
  document.addEventListener("visibilitychange", playback);
  reduced.addEventListener("change", playback);

  const back = performance.getEntriesByType("navigation")[0]?.type === "back_forward";
  if (!paused && !reduced.matches && !back && !location.hash && !window.scrollY) {
    scene.classList.add("reveal-copy");
    const photo = subject.querySelector("img");
    function revealGift() {
      if (!paused && !reduced.matches && window.scrollY <= 24) scene.classList.add("reveal-gift");
    }
    if (photo.decode) photo.decode().then(revealGift).catch(() => {});
    else if (photo.complete) revealGift();
    else photo.addEventListener("load", revealGift, { once: true });
  }
  scene.addEventListener("animationend", event => {
    if (event.animationName === "gift-arrives") scene.classList.remove("reveal-gift");
    if (event.animationName === "scene-copy-in") scene.classList.remove("reveal-copy");
  });
  measure();
  playback();
})();
