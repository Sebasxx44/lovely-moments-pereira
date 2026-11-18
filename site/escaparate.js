(() => {
  "use strict";
  const runway = document.querySelector(".showcase-runway");
  const board = runway.querySelector(".showcase-board");
  const rail = runway.querySelector(".product-rail");
  const masthead = document.querySelector(".masthead");
  const objects = [...rail.querySelectorAll(".rail-object")];
  const details = board.querySelector("[data-hero-detail]");
  const colors = objects.map(item => item.dataset.paper.match(/[a-f0-9]{2}/gi).map(channel => parseInt(channel, 16)));
  const products = objects.map(item => document.querySelector('.product[data-id="' + item.dataset.id + '"]'));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const size = objects.length;
  const last = size - 1;
  let active = -1;
  let position = 0;
  let start = 0;
  let stride = 1;
  let width = 0;
  let height = 0;
  let pending = false;
  let aimX = 0, aimY = 0;
  let touch = null;
  const set = (element, prop, value) => element.style.setProperty(prop, value);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  // A satin gift ribbon twists around its tangent in the back of the photographic set.
  const canvas = board.querySelector(".wrapping-ribbon");
  const ctx = canvas.getContext("2d");
  let paintedAt = -10;
  function paintRibbon(travel) {
    if (!ctx || !width || !height || Math.abs(travel - paintedAt) < .004) return;
    paintedAt = travel;
    const resolution = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(width * resolution);
    const h = Math.round(height * resolution);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const length = width < 650 ? 66 : 112;
    const breadth = Math.max(12, Math.min(height * .115, width * .047, 69));
    const shift = travel * .55;
    const tau = Math.PI * 2;
    const knots = [];
    for (let i = 0; i <= length; i++) {
      const u = i / length;
      const a = tau * (u * 1.22 - .14) + shift;
      const b = tau * (u * 2.02 + .05) - shift * .56;
      const x = (u * 1.18 - .09) * width;
      const y = (.49 + .25 * Math.sin(a) + .115 * Math.sin(b)) * height;
      const slope = height * tau * (.25 * 1.22 * Math.cos(a) + .115 * 2.02 * Math.cos(b)) / (1.18 * width);
      const normal = 1 / Math.hypot(1, slope);
      const twist = u * Math.PI * 3.9 + shift * 1.25 - .45;
      const half = breadth * .5 * Math.cos(twist);
      const dx = -slope * normal * half, dy = normal * half;
      knots.push({ ax: x - dx, ay: y - dy, bx: x + dx, by: y + dy, twist });
    }
    for (let i = 1; i < knots.length; i++) {
      const a = knots[i - 1], b = knots[i];
      const light = (Math.sin(b.twist - .5) + 1) / 2;
      const front = Math.cos(b.twist) >= 0;
      const tint = (gloss) => {
        const n = clamp((front ? .20 : .05) + light * .44 + gloss, 0, 1);
        return `rgb(${Math.round(107 + 144 * n)} ${Math.round(49 + 153 * n)} ${Math.round(50 + 109 * n)})`;
      };
      const across = ctx.createLinearGradient(a.ax, a.ay, a.bx + .01, a.by + .01);
      across.addColorStop(0, tint(.18));
      across.addColorStop(.1, tint(.025));
      across.addColorStop(.46, tint(.19));
      across.addColorStop(.92, tint(0));
      across.addColorStop(1, tint(.28));
      ctx.fillStyle = across;
      ctx.beginPath();
      ctx.moveTo(a.ax, a.ay); ctx.lineTo(b.ax + .22, b.ay);
      ctx.lineTo(b.bx + .22, b.by); ctx.lineTo(a.bx, a.by);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = across; ctx.lineWidth = .7; ctx.stroke();
    }
  }
  const modelHost = document.querySelector("#hero-box");
  const box = modelHost && window.LovelyBox?.mount(modelHost);
  if (box) objects[0].classList.add("has-model");

  function select(index) {
    if (index === active) return;
    active = index;
    const item = objects[index];
    const product = products[index];
    runway.dataset.active = index;
    board.querySelector("#hero-title").textContent = item.dataset.title;
    board.querySelector(".set-description").textContent = product.querySelector(".product-description").textContent;
    board.querySelector(".scroll-caption").textContent = index === last ? "Sigue al catálogo" : "Desliza para recorrer";
    details.dataset.heroDetail = item.dataset.id;
    details.href = product.querySelector("a").href;
    details.setAttribute("aria-label", "Ver el regalo: " + item.dataset.title);
    objects.forEach((button, i) => {
      button.tabIndex = i === index ? 0 : -1;
      button.setAttribute("aria-label", (index === i ? "Ver detalle de " : "Centrar ") + button.dataset.title);
    });
  }

  function paint() {
    pending = false;
    // Each native page-scroll interval moves the next gift to the focal point.
    const raw = clamp((window.scrollY - start) / stride, 0, last);
    position = reduced.matches ? Math.round(raw) : raw;
    const focus = Math.round(position);
    paintRibbon(reduced.matches ? 0 : position);
    select(focus);
    const inView = window.scrollY <= start + (runway.offsetHeight - masthead.offsetHeight);
    document.body.classList.toggle("in-showcase", inView);
    const lo = Math.floor(position);
    const hi = Math.min(last, lo + 1);
    const mix = position - lo;
    const color = colors[lo].map((channel, i) => Math.round(channel + (colors[hi][i] - channel) * mix));
    set(document.documentElement, "--set-paper", "rgb(" + color.join(" ") + ")");

    // The neighbours wrap behind the set. The scroll sequence itself has two fixed ends.
    const spacing = width * (width <= 650 ? .51 : width <= 900 ? .355 : .332);
    objects.forEach((object, i) => {
      const offset = ((i - position + size * 1.5) % size) - size / 2;
      const distance = Math.abs(offset);
      const nearness = Math.max(0, 1 - distance);
      const scale = 1 - Math.min(distance, 1.8) * .265;
      const lift = Math.min(height * .10, 48) * Math.min(distance, 1.5);
      set(object, "--offset", (offset * spacing + aimX * nearness * 4).toFixed(2) + "px");
      set(object, "--lift", (lift + aimY * nearness * 2).toFixed(2) + "px");
      set(object, "--scale", scale.toFixed(4));
      set(object, "--turn", (-offset * 15 + aimX * nearness * 5).toFixed(2) + "deg");
      set(object, "--roll", (offset * 5.5 - aimX * nearness * 1.2).toFixed(2) + "deg");
      set(object, "--pitch", (-aimY * nearness * 4).toFixed(2) + "deg");
      set(object, "--opacity", String(1 - Math.max(0, distance - .3) * .11));
      set(object, "--order", String(10 - Math.round(distance * 4)));
      set(object, "--shadow-scale", scale.toFixed(3));
    });
    if (box) box.update(reduced.matches ? 0 : .18 + .63 * Math.min(position, 1), aimX, aimY);
    set(board, "--drift", String(position / last));
    set(board, "--aim", aimX.toFixed(3));
  }
  function queue() {
    if (!pending) { pending = true; requestAnimationFrame(paint); }
  }
  function measure() {
    const top = runway.getBoundingClientRect().top + window.scrollY;
    start = top - masthead.offsetHeight;
    const hold = Math.max(0, board.offsetHeight * .085);
    stride = Math.max(1, (runway.offsetHeight - board.offsetHeight - hold) / last);
    width = rail.clientWidth;
    height = rail.clientHeight;
    paintedAt = -10;
    queue();
  }
  function goTo(index) {
    const destination = start + clamp(index, 0, last) * stride;
    window.scrollTo({ top: destination, behavior: reduced.matches ? "instant" : "smooth" });
  }
  objects.forEach((object, i) => {
    object.addEventListener("click", () => {
      if (i !== active || Math.abs(position - i) > .13) { goTo(i); return; }
      details.click();
    });
  });
  board.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    goTo(active + (e.key === "ArrowRight" ? 1 : -1));
  });
  rail.addEventListener("pointermove", e => {
    if (reduced.matches || !fine.matches || e.pointerType === "touch") return;
    const b = rail.getBoundingClientRect();
    aimX = clamp((e.clientX - b.left) / b.width * 2 - 1, -1, 1);
    aimY = clamp((e.clientY - b.top) / b.height * 2 - 1, -1, 1);
    queue();
  });
  rail.addEventListener("pointerleave", () => { aimX = aimY = 0; queue(); });
  rail.addEventListener("touchstart", e => {
    if (e.touches.length === 1) touch = [e.touches[0].clientX, e.touches[0].clientY];
  }, { passive: true });
  rail.addEventListener("touchend", e => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch[0];
    const dy = e.changedTouches[0].clientY - touch[1];
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.7) goTo(active + (dx < 0 ? 1 : -1));
  }, { passive: true });
  rail.addEventListener("touchcancel", () => { touch = null; });
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", measure);
  reduced.addEventListener("change", () => { aimX = aimY = 0; measure(); });
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(board);
  measure();
  paint();
})();
