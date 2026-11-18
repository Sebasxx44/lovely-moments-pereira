(() => {
  "use strict";

  const runway = document.querySelector(".showcase-runway");
  const board = runway.querySelector(".showcase-board");
  const rail = board.querySelector(".product-rail");
  const backdrop = board.querySelector(".set-backdrop");
  const masthead = document.querySelector(".masthead");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const detail = board.querySelector("[data-hero-detail]");
  const hint = board.querySelector(".scroll-caption");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const gifts = [...rail.querySelectorAll(".rail-object")].map((button, index) => {
    const card = document.querySelector('.product[data-id="' + button.dataset.id + '"]');
    const wash = backdrop.querySelector('[data-scene="' + button.dataset.id + '"]');
    const props = board.querySelector('[data-props="' + button.dataset.id + '"]');
    const paper = button.dataset.paper;
    wash.style.setProperty("--set-paper", paper);
    wash.style.setProperty("--set-light", button.dataset.light);
    return {
      button, wash, props, paper, prepared: index === 0,
      photo: button.querySelector(".object-figure > img"),
      figure: button.querySelector(".object-figure"),
      title: button.dataset.title,
      description: card.querySelector(".product-description").textContent,
      link: card.querySelector("a").href
    };
  });
  const last = gifts.length - 1;
  const heartIndex = gifts.findIndex(gift => gift.button.dataset.id === "corazon-sorpresa");
  const heartFigure = gifts[heartIndex].figure;
  const heartImage = heartFigure.querySelector("img");
  const heartAspect = Number(heartImage.getAttribute("width")) / Number(heartImage.getAttribute("height"));
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = value => value * value * (3 - 2 * value);

  // Stacked lines reserve the same space for all four gifts, even when text wraps.
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
    hint.textContent = index === last ? "Sigue al catálogo" : "Desliza para recorrer";
    detail.dataset.heroDetail = gift.button.dataset.id;
    detail.href = gift.link;
    detail.setAttribute("aria-label", "Ver el regalo: " + gift.title);
    gifts.forEach(({ button, title }, i) => {
      button.tabIndex = i === index ? 0 : -1;
      button.setAttribute("aria-label", (i === index ? "Ver detalle de " : "Centrar ") + title);
      for (const line of [titles[i], descriptions[i]]) {
        line.setAttribute("aria-hidden", String(i !== index));
        line.toggleAttribute("data-past", i < index);
      }
    });
    if (hasRailFocus) gift.button.focus({ preventScroll: true });
  }

  let start = 0, travel = 0, stride = 1, spacing = 0;
  let width = 0, height = 0, boardHeight = 0, railTop = 0;
  let heartBoost = 0, paintedPosition = -1;
  let position = 0, velocity = 0;
  let aimX = 0, aimY = 0, pointerX = 0, pointerY = 0;
  let frame = 0, previousTime = 0;
  let sync = true, dirty = true;
  let openingAt = null;
  let swipe = null;
  let ignoreClickUntil = 0;
  const box = window.LovelyBox?.mount(board.querySelector("#hero-box"));

  function measure() {
    const head = masthead.offsetHeight;
    start = runway.getBoundingClientRect().top + window.scrollY - head;
    boardHeight = board.offsetHeight;
    travel = Math.max(1, runway.offsetHeight - boardHeight);
    // Give the last gift room to settle before native scrolling releases the stage.
    stride = (travel - Math.min(120, travel * .08)) / last;
    width = rail.clientWidth;
    height = rail.clientHeight;
    railTop = head + rail.parentElement.offsetTop;
    spacing = width * parseFloat(getComputedStyle(runway).getPropertyValue("--gift-spacing"));
    // Size the actual cutout, including its bow, against the space above the title.
    const imageWidth = Math.max(1, Math.min(heartFigure.clientWidth, heartFigure.clientHeight * heartAspect));
    const roomAboveTitle = height + Math.min(28, height * .09);
    heartBoost = clamp(Math.min(width * .94, roomAboveTitle * heartAspect) / imageWidth - 1, 0, .34);
    dirty = true;
    queue();
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
      if (!gift.prepared && Math.abs(offset) < 1) prepareArt(gift);
      const alpha = i === lower ? 1 : i === upper ? mix : 0;
      gift.wash.style.opacity = alpha.toFixed(3);
      gift.props.style.opacity = focus.toFixed(3);
      gift.props.toggleAttribute("data-floating", focus > .01);
      if (focus) gift.props.style.transform = reduced.matches ? "none"
        : `translate3d(${(offset * 6).toFixed(2)}%, ${((1 - focus) * 10).toFixed(2)}px, 0)`;
    }
    masthead.style.setProperty("--set-paper", mix
      ? `color-mix(in srgb, ${gifts[upper].paper} ${(mix * 100).toFixed(2)}%, ${gifts[lower].paper})`
      : gifts[lower].paper);
  }

  function draw(opening) {
    if (Math.abs(position - active) > .54) select(Math.round(position));
    const heartFocus = 1 - smoothstep(clamp(Math.abs(position - heartIndex)));
    lightSet();
    gifts.forEach(({ button, figure }, index) => {
      // The side gifts exchange edges only after they have completely faded out.
      const count = gifts.length;
      const offset = (index - position + count * 1.5) % count - count / 2;
      const distance = Math.abs(offset);
      const squared = distance * distance;
      const depth = squared / (.68 + squared);
      const focus = 1 - smoothstep(Math.min(1, distance));
      const isHeart = index === heartIndex;
      const opacity = (.16 + .84 * focus) * (1 - smoothstep(clamp((distance - 1.17) / .48)));
      button.style.opacity = opacity.toFixed(3);
      button.style.pointerEvents = opacity > .05 ? "auto" : "none";
      if (opacity === 0) return;

      const x = offset * spacing + aimX * focus * 3;
      const lift = isHeart ? Math.min(18, height * .035) * heartFocus : 0;
      const y = depth * Math.min(height * .105, 58) + aimY * focus * 2 - lift;
      const scale = (1 - depth * .50) * (isHeart ? 1 + heartBoost * heartFocus : 1);
      button.style.transform = "translate(-50%, -50%) translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + scale.toFixed(4) + ")";
      button.style.zIndex = String(10 - Math.round(distance * 4));
      const turn = -offset * 10 + aimX * focus * 3;
      const pitch = -aimY * focus * 2;
      const roll = offset * 3.2 - aimX * focus;
      figure.style.transform = "perspective(1200px) rotateY(" + turn.toFixed(2) + "deg) rotateX(" + pitch.toFixed(2) + "deg) rotateZ(" + roll.toFixed(2) + "deg)";
    });

    if (box && position < 1.65) {
      const focus = 1 - smoothstep(Math.min(1, position));
      const lift = reduced.matches ? 0 : .03 + .27 * opening + .46 * (1 - focus);
      box.update(+lift.toFixed(3), +(aimX * focus).toFixed(3), +(aimY * focus).toFixed(3));
    }
  }

  function tick(time) {
    frame = 0;
    const dt = clamp((time - previousTime) / 1000, 0, .055);
    previousTime = time;
    const pixels = window.scrollY - start;
    const inView = pixels < travel + boardHeight;
    document.body.classList.toggle("in-showcase", inView);
    const raw = clamp(pixels / stride, 0, last);
    const fraction = raw % 1;
    const target = reduced.matches ? Math.round(raw) : Math.floor(raw) + .52 * fraction + .48 * smoothstep(fraction);
    const oldPosition = position, oldX = aimX, oldY = aimY;
    if (sync || reduced.matches || pixels >= travel || swipe?.horizontal) {
      position = target;
      velocity = 0;
    } else {
      // Analytic critically damped response: independent of refresh rate, no bounce.
      const rate = 28;
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
    aimX += (pointerX - aimX) * follow;
    aimY += (pointerY - aimY) * follow;
    if (Math.abs(pointerX - aimX) < .002) aimX = pointerX;
    if (Math.abs(pointerY - aimY) < .002) aimY = pointerY;
    const openingTime = openingAt === null ? 1 : clamp((time - openingAt) / 740);
    const opening = 1 - (1 - openingTime) ** 3;
    if (dirty || position !== oldPosition || aimX !== oldX || aimY !== oldY || openingAt !== null) draw(opening);
    dirty = false;
    if (openingTime === 1) openingAt = null;
    if (inView && (position !== target || velocity || aimX !== pointerX || aimY !== pointerY || openingAt !== null)) queue();
    else previousTime = 0;
  }

  function queue() {
    if (frame) return;
    if (!previousTime) previousTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function goTo(index) {
    window.scrollTo({ top: start + clamp(index, 0, last) * stride, behavior: reduced.matches ? "instant" : "smooth" });
  }

  gifts.forEach(({ button }, i) => {
    button.addEventListener("click", event => {
      if (event.detail && performance.now() < ignoreClickUntil) return;
      if (i !== active || Math.abs(position - i) > .13) goTo(i);
      else detail.click();
    });
  });
  board.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    goTo(active + (event.key === "ArrowRight" ? 1 : -1));
  });
  rail.addEventListener("pointermove", event => {
    if (reduced.matches || !fine.matches || event.pointerType === "touch") return;
    pointerX = clamp(event.clientX / width * 2 - 1, -1, 1);
    pointerY = clamp((event.clientY - railTop) / height * 2 - 1, -1, 1);
    queue();
  });
  rail.addEventListener("pointerleave", () => { pointerX = pointerY = 0; queue(); });

  rail.addEventListener("touchstart", event => {
    swipe = null;
    ignoreClickUntil = 0;
    if (event.touches.length !== 1) return;
    const finger = event.touches[0];
    swipe = { x: finger.clientX, y: finger.clientY, pageY: window.scrollY, time: event.timeStamp, horizontal: false };
  }, { passive: true });
  rail.addEventListener("touchmove", event => {
    if (!swipe || event.touches.length !== 1) return;
    const dx = swipe.x - event.touches[0].clientX;
    const dy = swipe.y - event.touches[0].clientY;
    if (!swipe.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.4) { swipe = null; return; }
      swipe.horizontal = true;
    }
    const top = clamp(swipe.pageY + dx / spacing * stride, start, start + last * stride);
    window.scrollTo({ top, behavior: "instant" });
  }, { passive: true });
  rail.addEventListener("touchend", event => {
    if (swipe?.horizontal) {
      const dx = swipe.x - event.changedTouches[0].clientX;
      const raw = clamp((swipe.pageY - start) / stride + dx / spacing, 0, last);
      const speed = Math.abs(dx) / Math.max(1, event.timeStamp - swipe.time);
      const flick = speed > .4 && Math.abs(dx) > 32;
      const index = flick ? (dx > 0 ? Math.ceil(raw) : Math.floor(raw)) : Math.round(raw);
      ignoreClickUntil = performance.now() + 350;
      goTo(index);
    }
    swipe = null;
    queue();
  }, { passive: true });
  rail.addEventListener("touchcancel", () => { swipe = null; });

  const restored = performance.getEntriesByType("navigation")[0]?.type === "back_forward";
  const arrive = !reduced.matches && !restored && window.scrollY === 0 && (!location.hash || location.hash === "#inicio");
  if (!arrive) board.removeAttribute("data-arrival");
  board.addEventListener("animationend", event => {
    if (event.animationName === "unwrap-set") board.removeAttribute("data-arrival");
  });
  box?.ready.then(() => {
    gifts[0].button.classList.add("has-model");
    if (arrive && !reduced.matches && window.scrollY <= start + 2) openingAt = performance.now();
    dirty = true;
    queue();
  }).catch(() => { /* Keep the product photograph if the 3D textures cannot load. */ });

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
  reduced.addEventListener("change", () => {
    pointerX = pointerY = aimX = aimY = 0;
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
