/* Lovely Moments. Photographic planes from the Amor Infinito catalogue. */
(function () {
  'use strict';
  const assets = new URL('.', document.currentScript.src);

  function part(name, parent, tag = 'div') {
    const el = document.createElement(tag);
    el.className = 'lovely-box__' + name;
    parent.appendChild(el);
    return el;
  }

  function solid(parent, kind) {
    const block = part('object', parent);
    block.classList.add('lovely-box__' + kind);
    for (const side of ['bottom', 'back', 'left', 'right', 'front', 'top']) {
      part('face', block).classList.add('lovely-box__' + side);
    }
    return block;
  }

  function addTexture(block, name) {
    const photo = document.createElement('img');
    photo.alt = '';
    photo.decoding = 'async';
    photo.sizes = '(max-width: 650px) 80vw, (min-width: 2000px) min(45vw, 1450px), 52vw';
    photo.srcset = new URL(name + '-1200.webp', assets).href + ' 1200w, ' + new URL(name + '.webp', assets).href + ' 2120w';
    photo.src = new URL(name + '.webp', assets).href;
    block.querySelector('.lovely-box__top').append(photo);
    return photo;
  }

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n) || 0));
  const decimal = n => n.toFixed(2);
  const translation = (x,y,z) => `translate3d(${decimal(x)}px,${decimal(y)}px,${decimal(z)}px)`;

  function mount(host) {
    if (!host || typeof host.appendChild !== 'function') throw new TypeError('A host element is required');
    const scene = document.createElement('div');
    scene.className = 'lovely-box';
    scene.setAttribute('aria-hidden', 'true');
    host.appendChild(scene);
    const frame = part('frame', scene);
    const world = part('world', frame);
    const trayShadow = part('shadow', world);
    trayShadow.classList.add('lovely-box__shadow--tray');
    const lidShadow = part('shadow', world);
    lidShadow.classList.add('lovely-box__shadow--lid');
    const tray = solid(world, 'tray');
    const lid = solid(world, 'lid');
    const photos = [addTexture(tray, 'tray'), addTexture(lid, 'lid')];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let last = [0, 0, 0];
    let width = 0, height = 0;
    let spread = 0;

    function fit() {
      width = scene.clientWidth;
      height = scene.clientHeight;
      if (!width || !height) return;
      spread = clamp((width / height - 1.22) / .68, 0, 1);
      // Choose a supersampling level when the surface resizes, not during the
      // animation. Large/Retina screens get the full 2120-pixel photographs;
      // small phones get enough samples for print and a stable, quiet edge.
      const physical = Math.min(width, height * 1.75) * (window.devicePixelRatio || 1);
      const samplesX = Math.min(2120, Math.max(480, Math.ceil(physical / 64) * 64));
      const samplesY = Math.round(samplesX * 1400 / 2120);
      frame.style.setProperty('--lb-texture-width', samplesX + 'px');
      frame.style.setProperty('--lb-texture-height', samplesY + 'px');
      frame.style.setProperty('--lb-texture-x', String(354.1 / samplesX));
      frame.style.setProperty('--lb-texture-y', String(234.08 / samplesY));
      render();
    }

    // Frame the projected edges of both solids. This keeps the raised lid inside
    // short windows without reading rendered faces during scroll or pointer input.
    function frameObjects() {
      if (!width || !height) return;
      const view = new DOMMatrix(world.style.transform);
      let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
      for (const [solid, depth] of [[tray,13],[lid,9.5]]) {
        const model = view.multiply(new DOMMatrix(solid.style.transform));
        for (const x of [-177,177]) for (const y of [-117,117]) for (const z of [-depth,depth]) {
          const q = model.transformPoint({x, y, z});
          const perspective = 1400 / (1400 - q.z);
          const screenX = q.x * perspective, screenY = (q.y + 14) * perspective;
          xMin = Math.min(xMin,screenX); xMax = Math.max(xMax,screenX);
          yMin = Math.min(yMin,screenY); yMax = Math.max(yMax,screenY);
        }
      }
      const scale = Math.min(width * .93 / (xMax - xMin), height * .88 / (yMax - yMin));
      const cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2 + 2;
      frame.style.transform = `translate(-50%,-50%) scale(${scale.toFixed(4)}) translate(${decimal(-cx)}px,${decimal(-cy)}px)`;
    }

    function render() {
      const [p, tiltX, tiltY] = reduce.matches ? [0, 0, 0] : last;
      // The rise is heaviest at the start, like lifting a removable paperboard lid.
      const lift = Math.sin(p * Math.PI / 2);
      world.style.transform = `translateY(${decimal(23*p)}px) scale(${decimal(1 - .14*p)}) rotateX(${decimal(45 - 8*p - 3*tiltY)}deg) rotateY(${decimal(-6 + 3*p + 4*tiltX)}deg) rotateZ(${decimal(7 - 8*p + tiltX)}deg)`;
      const trayX = 30 + 11*p + spread*(23 + 22*p);
      const trayY = 64 + 5*p - 12*spread;
      tray.style.transform = translation(trayX, trayY, 10 + 3*p);
      const lidX = -38 - 19*lift - spread*(39 + 74*lift);
      const lidY = -81 - 28*lift + spread*(23 + 34*lift);
      const lidZ = 65 + 65*lift - spread*(8 + 28*lift);
      lid.style.transform = `${translation(lidX,lidY,lidZ)} rotateZ(${decimal(-19 + 21*lift)}deg) rotateY(${decimal(-13*lift)}deg) rotateX(${decimal(6 + 11*lift)}deg)`;
      trayShadow.style.transform = translation(trayX + 12, trayY + 22, -9);
      lidShadow.style.transform = `${translation(lidX + 23, lidY + 31, -11)} rotateZ(-19deg) scale(${decimal(1.03 + .1*lift)})`;
      lidShadow.style.opacity = decimal(.8 - .35*lift);
      tray.style.setProperty('--lb-cast', decimal(.36 - .23*lift));
      frameObjects();
    }

    function update(progress = 0, tiltX = 0, tiltY = 0) {
      const next = [clamp(progress,0,1), clamp(tiltX,-1,1), clamp(tiltY,-1,1)];
      if (next.every((value, index) => value === last[index])) return;
      last = next;
      render();
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    if (observer) observer.observe(scene);
    else window.addEventListener('resize', fit);
    reduce.addEventListener('change', render);
    fit();
    return {
      ready: Promise.all(photos.map(photo => photo.decode())),
      update,
      destroy() {
        if (observer) observer.disconnect();
        else window.removeEventListener('resize', fit);
        reduce.removeEventListener('change', render);
        scene.remove();
      }
    };
  }

  window.LovelyBox = { mount };
})();
