(() => {
  "use strict";

  const runway = document.querySelector(".showcase-runway");
  const board = runway.querySelector(".showcase-board");
  const rail = board.querySelector(".product-rail");
  const backdrop = board.querySelector(".set-backdrop");
  const ornaments = board.querySelector(".set-ornaments");
  const masthead = document.querySelector(".masthead");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const gifts = [...rail.querySelectorAll(".rail-object")].map((link, index) => {
    const card = document.querySelector('.product[data-id="' + link.dataset.id + '"]');
    const wash = backdrop.querySelector('[data-scene="' + link.dataset.id + '"]');
    const props = board.querySelector('[data-props="' + link.dataset.id + '"]');
    const paper = link.dataset.paper;
    wash.style.setProperty("--set-paper", paper);
    wash.style.setProperty("--set-light", link.dataset.light);
    return {
      link, wash, props, paper, prepared: index === 0,
      photo: link.querySelector(".object-figure > img"),
      canvas: link.querySelector(".gift-model"), model: null, modelRequested: false,
      figure: link.querySelector(".object-figure"),
      title: link.dataset.title,
      description: link.dataset.description || card.querySelector(".product-description").textContent
    };
  });
  const last = gifts.length - 1;
  runway.style.setProperty("--steps", last);
  const boxIndex = gifts.findIndex(gift => gift.link.querySelector("#hero-box"));
  const heartIndex = gifts.findIndex(gift => gift.link.dataset.id === "corazon-sorpresa");
  const heartFigure = gifts[heartIndex].figure;
  const heartImage = heartFigure.querySelector("img");
  const heartAspect = Number(heartImage.getAttribute("width")) / Number(heartImage.getAttribute("height"));
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = value => value * value * (3 - 2 * value);

  // Stacked lines reserve the same space for all gifts, even when text wraps.
  function makeLines(selector, field) {
    const lines = gifts.map((gift, index) => {
      const line = document.createElement("span");
      line.className = "caption-line";
      line.textContent = gift[field];
      line.setAttribute("aria-hidden", String(index !== 0));
      return line;
    });
    board.querySelector(selector).replaceChildren(...lines);
    return lines;
  }
  const titles = makeLines("#hero-title", "title");
  const descriptions = makeLines(".set-description", "description");
  let active = -1;

  function select(index) {
    if (index === active) return;
    const hasRailFocus = rail.contains(document.activeElement);
    active = index;
    const gift = gifts[index];
    runway.dataset.active = index;
    themeColor.content = gift.paper;
    gifts.forEach(({ link, title }, i) => {
      link.tabIndex = i === index ? 0 : -1;
      link.setAttribute("aria-label", (i === index ? "Ver detalle de " : "Centrar ") + title);
      for (const line of [titles[i], descriptions[i]]) {
        line.setAttribute("aria-hidden", String(i !== index));
        line.toggleAttribute("data-past", i < index);
      }
    });
    if (hasRailFocus) gift.link.focus({ preventScroll: true });
  }

  let start = 0, travel = 0, stride = 1, spacing = 0;
  let width = 0, height = 0, boardHeight = 0, railTop = 0;
  let heartBoost = 0, paintedPosition = -1;
  let position = 0, velocity = 0;
  let aimX = 0, aimY = 0, pointerX = 0, pointerY = 0;
  let decorX = 0, decorY = 0, decorTargetX = 0, decorTargetY = 0;
  let frame = 0, previousTime = 0;
  let sync = true, dirty = true;
  let openingAt = null;
  let swipe = null;
  let lastWheelTime = -Infinity, wheelStarted = -Infinity, lastWheelDelta = 0;
  let wheelCaptured = false, wheelListening = false, wheelFading = false, lastWheelHorizontal = false;
  let ignoreClickUntil = 0;
  let box = null;

  function measure() {
    const bounds = runway.getBoundingClientRect();
    start = bounds.top + window.scrollY;
    boardHeight = board.getBoundingClientRect().height;
    travel = Math.max(1, bounds.height - boardHeight);
    // The final stop must fit inside the sticky range on fractional mobile viewports.
    stride = Math.floor(travel) / last;
    width = rail.clientWidth;
    height = rail.clientHeight;
    railTop = rail.parentElement.offsetTop;
    spacing = width * parseFloat(getComputedStyle(runway).getPropertyValue("--gift-spacing"));
    // Size the actual cutout, including its bow, against the space above the title.
    const imageWidth = Math.max(1, Math.min(heartFigure.clientWidth, heartFigure.clientHeight * heartAspect));
    const roomAboveTitle = height + Math.min(28, height * .09);
    heartBoost = clamp(Math.min(width * .94, roomAboveTitle * heartAspect) / imageWidth - 1, 0, .34);
    for (const gift of gifts) gift.model?.resize(gift.canvas.clientWidth, gift.canvas.clientHeight);
    dirty = true;
    queue();
  }

  function prepareModel(gift, index) {
    if (gift.modelRequested || reduced.matches || navigator.connection?.saveData) return;
    if (!gift.canvas && index !== boxIndex) return;
    gift.modelRequested = true;
    if (index === boxIndex) {
      box = window.LovelyBox?.mount(gift.link.querySelector("#hero-box"));
      box?.ready.then(() => {
        gift.link.classList.add("has-model");
        dirty = true; queue();
      }).catch(() => {});
      return;
    }
    const canvas = gift.canvas;
    const load = async () => {
      if (reduced.matches || Math.abs(position - index) > 1 || !document.body.classList.contains("in-showcase")) {
        gift.modelRequested = false;
        return;
      }
      try {
        await gift.photo.decode();
        const model = await window.LovelyGiftModel.mount(canvas, gift.photo);
        if (model) {
          gift.model = model;
          gift.link.classList.add("has-model");
          dirty = true; queue();
        }
      } catch { /* The responsive photograph stays in place on devices without 3D. */ }
    };
    if ("requestIdleCallback" in window) requestIdleCallback(load, {timeout: 400});
    else setTimeout(load, 40);
  }

  function prepareArt(gift) {
    gift.prepared = true;
    for (const holder of [gift.wash, gift.props]) {
      const template = holder.querySelector("template");
      if (template) template.replaceWith(template.content);
    }
    if (gift.photo.dataset.srcset) {
      gift.photo.fetchPriority = "auto";
      gift.photo.srcset = gift.photo.dataset.srcset;
    }
  }

  function lightSet() {
    if (position === paintedPosition) return;
    paintedPosition = position;
    const lower = Math.floor(position);
    const upper = Math.min(last, lower + 1);
    const mix = smoothstep(position - lower);
    // Crossfade two prepainted backdrops. The lower layer remains opaque.
    for (let i = 0; i <= last; i++) {
      const gift = gifts[i];
      const offset = i - position;
      const focus = 1 - smoothstep(clamp(Math.abs(offset)));
      if (gift.canvas) gift.figure.style.setProperty("--plush-scale", (.8 + .2 * focus).toFixed(3));
      if (!gift.prepared && Math.abs(offset) < 1) prepareArt(gift);
      if (Math.abs(offset) < .78) prepareModel(gift, i);
      const alpha = i === lower ? 1 : i === upper ? mix : 0;
      gift.wash.style.opacity = alpha.toFixed(3);
      gift.props.style.opacity = focus.toFixed(3);
      gift.props.toggleAttribute("data-floating", focus > .01);
      if (focus) gift.props.style.transform = reduced.matches ? "none"
        : `translate3d(${(offset * 6).toFixed(2)}%, ${((1 - focus) * 10).toFixed(2)}px, 0)`;
    }
  }

  function draw(opening) {
    if (Math.abs(position - active) > .54) select(Math.round(position));
    const heartFocus = 1 - smoothstep(clamp(Math.abs(position - heartIndex)));
    lightSet();
    gifts.forEach(({ link, figure, model }, index) => {
      // The side gifts exchange edges only after they have completely faded out.
      const count = gifts.length;
      const offset = (index - position + count * 1.5) % count - count / 2;
      const distance = Math.abs(offset);
      const squared = distance * distance;
      const depth = squared / (.68 + squared);
      const focus = 1 - smoothstep(Math.min(1, distance));
      const isHeart = index === heartIndex;
      const opacity = (.16 + .84 * focus) * (1 - smoothstep(clamp((distance - 1.17) / .48)));
      link.style.opacity = opacity.toFixed(3);
      link.style.pointerEvents = opacity > .05 ? "auto" : "none";
      if (opacity === 0) return;

      const x = offset * spacing + aimX * focus * 3;
      const lift = isHeart ? Math.min(18, height * .035) * heartFocus : 0;
      const y = depth * Math.min(height * .105, 58) + aimY * focus * 2 - lift;
      const scale = (1 - depth * .50) * (isHeart ? 1 + heartBoost * heartFocus : 1);
      link.style.transform = "translate(-50%, -50%) translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + scale.toFixed(4) + ")";
      link.style.zIndex = String(10 - Math.round(distance * 4));
      const turn = model ? 0 : -offset * 10 + aimX * focus * 3;
      const pitch = model ? 0 : -aimY * focus * 2;
      const roll = offset * 3.2 - aimX * focus;
      figure.style.transform = "perspective(1200px) rotateY(" + turn.toFixed(2) + "deg) rotateX(" + pitch.toFixed(2) + "deg) rotateZ(" + roll.toFixed(2) + "deg)";
      if (model) {
        const yaw = reduced.matches ? 0 : -offset * .22 + aimX * focus * .13 - (1 - opening) * focus * .12;
        model.paint(yaw, reduced.matches ? 0 : aimY * focus * .075 + offset * .028);
      }
    });

    if (box && Math.abs(position - boxIndex) < 1.65) {
      const focus = 1 - smoothstep(Math.min(1, Math.abs(position - boxIndex)));
      const lift = reduced.matches ? 0 : .30 + .34 * (1 - focus);
      box.update(+lift.toFixed(3), +(aimX * focus).toFixed(3), +(aimY * focus).toFixed(3));
    }
  }

  function followPointer(current, target, easing) {
    const next = current + (target - current) * easing;
    return Math.abs(target - next) < .002 ? target : next;
  }

  function moveProps() {
    const x = (decorX * Math.min(46, width * .035)).toFixed(2) + "px";
    const y = (decorY * Math.min(32, boardHeight * .046)).toFixed(2) + "px";
    const roll = (decorX * 7).toFixed(2) + "deg";
    ornaments.style.setProperty("--pointer-x", x);
    ornaments.style.setProperty("--pointer-y", y);
    ornaments.style.setProperty("--pointer-roll", roll);
  }

  function tick(time) {
    frame = 0;
    const dt = clamp((time - previousTime) / 1000, 0, .055);
    previousTime = time;
    const pixels = window.scrollY - start;
    const pinned = pixels <= travel;
    document.body.classList.toggle("showcase-pinned", pinned);
    if (!pinned) decorTargetX = decorTargetY = 0;
    const inView = pixels < travel + boardHeight;
    document.body.classList.toggle("in-showcase", inView);
    if (inView !== wheelListening) {
      wheelListening = inView;
      if (inView) window.addEventListener("wheel", wheelStep, { passive: false });
      else window.removeEventListener("wheel", wheelStep);
    }
    const target = indexAt(pixels);
    const oldPosition = position, oldX = aimX, oldY = aimY;
    const oldDecorX = decorX, oldDecorY = decorY;
    if (sync || reduced.matches || pixels > travel) {
      position = target;
      velocity = 0;
    } else {
      // Analytic critically damped response: independent of refresh rate, no bounce.
      const rate = 19;
      const error = position - target;
      const decay = Math.exp(-rate * dt);
      const carry = (velocity + rate * error) * dt;
      position = clamp(target + (error + carry) * decay, 0, last);
      velocity = (velocity - rate * carry) * decay;
      if (Math.abs(position - target) < .00015 && Math.abs(velocity) < .008) {
        position = target;
        velocity = 0;
      }
    }
    sync = false;
    const follow = 1 - Math.exp(-15 * dt);
    aimX = followPointer(aimX, pointerX, follow);
    aimY = followPointer(aimY, pointerY, follow);
    decorX = followPointer(decorX, decorTargetX, follow);
    decorY = followPointer(decorY, decorTargetY, follow);
    const openingTime = openingAt === null ? 1 : clamp((time - openingAt) / 740);
    const opening = 1 - (1 - openingTime) ** 3;
    if (dirty || position !== oldPosition || aimX !== oldX || aimY !== oldY || openingAt !== null) draw(opening);
    if (dirty || oldDecorX !== decorX || oldDecorY !== decorY) moveProps();
    dirty = false;
    if (openingTime === 1) openingAt = null;
    if (inView && (position !== target || velocity || aimX !== pointerX || aimY !== pointerY || decorX !== decorTargetX || decorY !== decorTargetY || openingAt !== null)) queue();
    else previousTime = 0;
  }

  function queue() {
    if (frame) return;
    if (!previousTime) previousTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function indexAt(pixels) {
    return clamp(Math.round(pixels / stride), 0, last);
  }

  function onStage() {
    const pixels = window.scrollY - start;
    return pixels >= -.5 && pixels <= travel + .5 && !document.querySelector("dialog[open], .shop-menu[open]");
  }

  function goTo(index) {
    // The document lands on the stop now. The renderer eases the gifts into place.
    window.scrollTo({ top: start + clamp(index, 0, last) * stride, behavior: "instant" });
    queue();
  }

  function wheelStep(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || !event.cancelable || document.querySelector("dialog[open], .shop-menu[open]")) return;
    const pixels = window.scrollY - start;
    if (pixels < -.5) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? boardHeight : 1;
    const returning = pixels > travel;
    if (returning && (event.deltaY >= 0 || pixels + event.deltaY * unit > travel)) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    const delta = horizontal ? event.deltaX : event.deltaY;
    if (!delta) return;
    const direction = Math.sign(delta);
    const gap = event.timeStamp - lastWheelTime;
    const magnitude = Math.abs(delta) * unit;
    const previousMagnitude = Math.abs(lastWheelDelta);
    // A mouse can send distinct, identical notches. A trackpad usually leaves a decaying tail.
    const notch = gap >= 70 && magnitude >= 40 && magnitude === previousMagnitude;
    const freshImpulse = event.timeStamp - wheelStarted > 230 && previousMagnitude <= 10 && magnitude >= 3 * previousMagnitude + 16;
    const fading = magnitude < previousMagnitude || (wheelFading && magnitude === previousMagnitude);
    const tail = fading && (wheelFading || (gap < 260 && magnitude >= previousMagnitude * .35));
    const sameBurst = gap < 180 || (tail && gap < 420);
    const newAxis = horizontal !== lastWheelHorizontal && gap > 65;
    const continued = !returning && direction === Math.sign(lastWheelDelta) && sameBurst && !notch && !freshImpulse && !newAxis;
    wheelFading = continued && fading;
    lastWheelHorizontal = horizontal;
    lastWheelTime = event.timeStamp;
    lastWheelDelta = delta * unit;
    const next = returning ? last : indexAt(pixels) + direction;
    if (!continued) {
      wheelStarted = lastWheelTime;
      wheelCaptured = next >= 0 && next <= last;
    }
    if (!wheelCaptured) return;
    // Momentum from the same gesture must not advance again or push the last gift offscreen.
    event.preventDefault();
    if (!continued) goTo(next);
  }

  function startSwipe(event) {
    swipe = null;
    ignoreClickUntil = 0;
    if (event.touches.length !== 1 || !onStage()) return;
    const finger = event.touches[0];
    swipe = { x: finger.clientX, y: finger.clientY, index: indexAt(window.scrollY - start), stepped: false };
  }

  function moveSwipe(event) {
    if (!swipe || event.touches.length !== 1 || !event.cancelable) return;
    if (swipe.stepped) { event.preventDefault(); return; }
    const finger = event.touches[0];
    const dx = swipe.x - finger.clientX, dy = swipe.y - finger.clientY;
    const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(delta) < 8) return;
    const next = swipe.index + Math.sign(delta);
    if (next < 0 || next > last) { swipe = null; return; }
    event.preventDefault();
    swipe.stepped = true;
    goTo(next);
  }

  function endSwipe() {
    if (swipe?.stepped) ignoreClickUntil = performance.now() + 350;
    swipe = null;
  }

  gifts.forEach(({ link }, i) => {
    link.addEventListener("click", event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.detail && performance.now() < ignoreClickUntil) {
        event.preventDefault();
      } else if (i !== active || Math.abs(position - i) > .13) {
        event.preventDefault();
        goTo(i);
      }
    });
  });
  window.addEventListener("keydown", event => {
    const forward = ["ArrowRight", "ArrowDown", "PageDown"].includes(event.key);
    const back = ["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key);
    if (!forward && !back && event.key !== " ") return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !onStage()) return;
    if (event.target.closest?.("input, textarea, select, button, summary, [contenteditable=true]")) return;
    const direction = back || (event.key === " " && event.shiftKey) ? -1 : 1;
    const next = indexAt(window.scrollY - start) + direction;
    if (next < 0 || next > last) return;
    event.preventDefault();
    goTo(next);
  });
  function aimProps(event) {
    if (reduced.matches || !fine.matches || event.pointerType === "touch" || !document.body.classList.contains("showcase-pinned")) return;
    decorTargetX = clamp(event.clientX / width * 2 - 1, -1, 1);
    decorTargetY = clamp(event.clientY / boardHeight * 2 - 1, -1, 1);
    queue();
  }
  function restProps(event) {
    if (event.relatedTarget instanceof Node && (board.contains(event.relatedTarget) || masthead.contains(event.relatedTarget))) return;
    decorTargetX = decorTargetY = 0;
    queue();
  }
  for (const surface of [board, masthead]) {
    surface.addEventListener("pointermove", aimProps);
    surface.addEventListener("pointerleave", restProps);
    surface.addEventListener("touchstart", startSwipe, { passive: true });
    surface.addEventListener("touchmove", moveSwipe, { passive: false });
    surface.addEventListener("touchend", endSwipe);
    surface.addEventListener("touchcancel", endSwipe);
  }
  rail.addEventListener("pointermove", event => {
    if (reduced.matches || !fine.matches || event.pointerType === "touch") return;
    pointerX = clamp(event.clientX / width * 2 - 1, -1, 1);
    pointerY = clamp((event.clientY - railTop) / height * 2 - 1, -1, 1);
    queue();
  });
  rail.addEventListener("pointerleave", () => { pointerX = pointerY = 0; queue(); });

  const restored = performance.getEntriesByType("navigation")[0]?.type === "back_forward";
  const arrive = !reduced.matches && !restored && window.scrollY === 0 && (!location.hash || location.hash === "#inicio");
  if (!arrive) board.removeAttribute("data-arrival");
  board.addEventListener("animationend", event => {
    if (event.animationName === "unwrap-set") board.removeAttribute("data-arrival");
  });
  if (arrive) openingAt = performance.now();
  gifts.forEach(gift => {
    gift.canvas?.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      gift.model = null;
      gift.link.classList.remove("has-model");
      dirty = true; queue();
    });
    gift.canvas?.addEventListener("webglcontextrestored", () => {
      gift.modelRequested = false; paintedPosition = -1; dirty = true; queue();
    });
  });

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", measure);
  window.addEventListener("pageshow", event => {
    if (event.persisted || window.scrollY !== 0) {
      openingAt = null;
      board.removeAttribute("data-arrival");
      sync = dirty = true;
      measure();
    }
  });
  function resetPointer() {
    pointerX = pointerY = aimX = aimY = 0;
    decorTargetX = decorTargetY = decorX = decorY = 0;
    dirty = true; queue();
  }
  fine.addEventListener("change", resetPointer);
  reduced.addEventListener("change", () => {
    resetPointer();
    openingAt = null;
    paintedPosition = -1;
    board.removeAttribute("data-arrival");
    sync = dirty = true;
    queue();
  });
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    observer.observe(masthead);
  }
  measure();
})();
