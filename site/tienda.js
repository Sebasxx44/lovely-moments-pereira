(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const cash = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const base = "/";
  const products = new Map((window.LovelyInventory || []).map(([slug, name, price]) => [slug, { slug, name, price }]));
  const cards = all(".product");
  const alias = {
    "amor-infinito": "caja-de-bombones-amor-infinito-caja-de-chocolates-pereira",
    arcoiris: "bouquet-arcoiris-bouquet-de-flores-a-domicilio-en-pereira",
    "abrazo-matutino": "abrazo-matutino-desayuno-sorpresa-a-domicilio-desayuno-sorpresa-de-lujo-para-mujeres-pereira",
    bombonita: "caja-de-fresas-recubiertas-con-chocolate-bombonita-regalos-a-pereira-desde-espana",
    "girasoles-honey": "bouquet-de-girasoles-pereira",
    "corazon-sorpresa": "corazon-sorpresa-de-chocolate-regalos-de-aniversario-pereira-dosquebradas",
    "ancheta-deluxe": "anchetas-de-frutas-pereira-dosquebradas",
  };
  const canonical = key => alias[key] || key;
  const filters = all("[data-filter]");
  filters.forEach(button => button.addEventListener("click", () => {
    filters.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    for (const card of cards) card.hidden = button.dataset.filter !== "todo" && card.dataset.category !== button.dataset.filter;
    $(".result-count").textContent = cards.filter(card => !card.hidden).length + " regalos";
  }));

  const bag = $("#bag-dialog");
  const trigger = $("[data-open-bag]");
  const count = $(".bag-count", trigger);
  const unitTemplate = $("#quantity-button", bag).content.firstElementChild;
  const icons = "/assets/iconos.svg#";
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const flights = new Map();
  let burst = null;
  const storageKey = "lovely-moments/selection/v1";
  function read() {
    const selection = new Map();
    try {
      for (const [key, n] of Object.entries(JSON.parse(localStorage.getItem(storageKey) || "{}") || {})) {
        const id = canonical(key);
        if (products.has(id) && Number.isInteger(n) && n > 0) selection.set(id, Math.min(99, n + (selection.get(id) || 0)));
      }
    } catch {
      // Private browsing can keep the selection in memory.
    }
    return selection;
  }
  let selection = read();
  let timer;
  function change(id, delta) {
    if (!products.has(id)) return 0;
    const previous = selection.get(id) || 0;
    const n = Math.max(0, Math.min(99, previous + delta));
    if (n === previous) return n;
    if (n) selection.set(id,n); else selection.delete(id);
    try { localStorage.setItem(storageKey,JSON.stringify(Object.fromEntries(selection))); } catch {
      // The in-memory selection still works when storage is unavailable.
    }
    showCount(n > previous);
    return n;
  }
  function showCount(added = false) {
    const n = [...selection.values()].reduce((sum, i) => sum + i, 0);
    count.replaceChildren(element("span", n, added ? "count-in" : undefined));
    trigger.setAttribute("aria-label",`Mi selección, ${n} ${n === 1 ? "regalo" : "regalos"}`);
  }
  function announce(message, visible = true) {
    const status = $(".notice");
    status.textContent = message;
    status.classList.toggle("show", visible);
    clearTimeout(timer);
    timer=setTimeout(()=>status.classList.remove("show"),2200);
  }
  function endFlights() {
    for (const animation of flights.values()) animation.cancel();
    burst?.remove();
    burst = null;
  }
  function popAtBag(target, layer) {
    if (motion.matches || !target.isConnected || (bag.open && layer !== bag)) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || rect.bottom < 0 || rect.top > innerHeight) return;
    burst?.remove();
    const pop = element("span", undefined, "bag-pop");
    pop.setAttribute("aria-hidden","true");
    pop.style.left = (rect.left + rect.width / 2) + "px";
    pop.style.top = (rect.top + rect.height / 2) + "px";
    for (const [i,angle] of [-113,-52,10,65,132,182].entries()) {
      const drop = element("i");
      drop.style.setProperty("--angle", angle + "deg");
      drop.style.setProperty("--reach", (i % 2 ? 24 : 30) + "px");
      pop.append(drop);
    }
    burst = pop;
    layer.append(pop);
    pop.addEventListener("animationend", event => {
      if (event.animationName !== "bag-ripple") return;
      pop.remove();
      if (burst === pop) burst = null;
    }, {capture: true});
  }
  function flyToBag(button, photo, target, layer) {
    if (motion.matches || !button.animate || !photo?.src || (photo.complete && !photo.naturalWidth)) return false;
    const from = button.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const startX = from.left + from.width / 2, startY = from.top + from.height / 2;
    const endX = to.left + to.width / 2, endY = to.top + to.height / 2;
    if (endY < 0 || endY > innerHeight || !to.width) return false;
    if (flights.size >= 3) {
      const [oldBubble, oldFlight] = flights.entries().next().value;
      oldFlight.cancel();
      oldBubble.remove();
      flights.delete(oldBubble);
    }
    const bubble = element("span", undefined, "bag-flight");
    bubble.setAttribute("aria-hidden", "true");
    const img = element("img");
    img.alt = "";
    img.src = photo.currentSrc || photo.src;
    bubble.append(img);
    const size = Math.min(78, Math.max(58, innerWidth * .062));
    bubble.style.width = bubble.style.height = size + "px";
    const dx = endX - startX, dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const bendX = dx * .26 - Math.min(62, distance * .13);
    const bendY = Math.min(-36, dy * .82);
    const frames = Array.from({ length: 19 }, (_, i) => {
      const progress = i / 18;
      const t = Math.max(0, (progress - .08) / .92), arc = 2 * t * (1 - t);
      const x = startX + arc * bendX + t * t * dx - size / 2;
      const y = startY + arc * bendY + t * t * dy - size / 2;
      const inflate = progress < .17 ? .76 + .30 * Math.sin(progress / .17 * Math.PI / 2) : 1.06;
      const scale = inflate - .91 * t * t;
      return { offset: progress, transform: `translate3d(${x}px,${y}px,0) scale(${scale})`, opacity: Math.min(1, (1 - t) * 6) };
    });
    layer.append(bubble);
    const animation = bubble.animate(frames, {
      duration: Math.min(1020, 705 + distance * .31), easing: "cubic-bezier(.33,.06,.49,.98)", fill: "both"
    });
    flights.set(bubble, animation);
    let timeout;
    const remove = () => { clearTimeout(timeout); bubble.remove(); flights.delete(bubble); };
    animation.onfinish = () => { remove(); popAtBag(target,layer); };
    animation.oncancel = remove;
    if (!photo.complete) {
      bubble.style.visibility = "hidden";
      animation.pause();
      timeout = setTimeout(() => animation.cancel(), 900);
      img.decode().then(() => {
        if (animation.playState === "idle") return;
        clearTimeout(timeout);
        bubble.style.visibility = "";
        animation.play();
      }).catch(() => animation.cancel());
    }
    return true;
  }
  function add(button) {
    const card = button.closest(".product,.s-card");
    const id = canonical(button.dataset.add || card?.dataset.slug || card?.dataset.id);
    const product = products.get(id);
    if (!product) return;
    if (selection.get(id) === 99) {
      announce("Ya tienes 99 unidades de este regalo en tu selección.");
      return;
    }

    const quantity = change(id, 1);
    const photo = card ? $("figure img", card) : $("#full-product-photo");
    const flying = flyToBag(button, photo, $(".ui-icon", trigger), document.body);
    announce(`${product.name} · ${quantity} en tu selección`, !flying);
  }
  function element(tag, text, className) {
    const node=document.createElement(tag);
    if (text !== undefined) node.textContent=text;
    if (className) node.className=className;
    return node;
  }
  function unit(id, delta, name) {
    const button = unitTemplate.cloneNode(true);
    $("use", button).setAttribute("href", icons + (delta < 0 ? "minus" : "plus"));
    button.dataset.id=id;
    button.dataset.by=delta;
    button.disabled=delta>0 && selection.get(id)===99;
    button.setAttribute("aria-label",(delta<0?"Quitar una unidad de ":"Añadir una unidad de ")+name);
    return button;
  }
  function renderBag(addedId) {
    const lines = $("#bag-lines"), frag=document.createDocumentFragment();
    const message=["Hola, Lovely Moments. Quisiera consultar por estos regalos:", ""];
    let total=0;
    for(const [id,n] of selection) {
      const {name,price}=products.get(id);
      const line=element("div",undefined,"bag-line");
      const img=element("img"); img.src=base+"media/"+id+".webp"; img.alt="";
      const copy=element("div",undefined,"line-copy"), link=element("a",name);
      link.href=base+id+"/";
      copy.append(link,element("small",typeof price==="number" ? cash.format(price)+" por unidad" : "Precio a consultar"));
      const stepper=element("div",undefined,"quantity");
      stepper.append(unit(id,-1,name),element("output",n,id === addedId ? "count-in" : undefined),unit(id,1,name));
      line.append(img,copy,stepper); frag.append(line);
      total+=n*(price||0);
      message.push(`${n} × ${name}`);
    }
    if(!selection.size) frag.append(element("p","Tu selección está vacía."));
    lines.replaceChildren(frag);
    $(".bag-summary").hidden=!selection.size;
    $("#subtotal").textContent=cash.format(total);
    message.push("", "Subtotal de referencia: "+cash.format(total)+" COP.", "¿Me confirman disponibilidad y costo del domicilio?");
    $("#bag-inquiry").href="https://wa.me/573213920327?text="+encodeURIComponent(message.join("\n"));
  }
  document.addEventListener("click",event=>{
    const addButton=event.target.closest("[data-add],.quick-add");
    if (addButton) add(addButton);
  });
  $("#bag-lines").addEventListener("click",event=>{
    const control=event.target.closest("button[data-by]");
    if (!control) return;
    const delta = Number(control.dataset.by);
    if (delta > 0) flyToBag(control, $("img", control.closest(".bag-line")), $("#bag-title .ui-icon", bag), bag);
    change(control.dataset.id,delta);
    renderBag(delta > 0 ? control.dataset.id : undefined);
    const next=all("button[data-by]",bag).find(el=>!el.disabled && el.dataset.id===control.dataset.id && el.dataset.by===control.dataset.by);
    (next || $("[data-close]",bag)).focus({preventScroll:true});
  });
  trigger.addEventListener("click",()=>{ endFlights(); renderBag(); bag.showModal(); });
  bag.addEventListener("close", endFlights);
  window.addEventListener("pagehide", endFlights);
  window.addEventListener("resize", endFlights);
  motion.addEventListener("change", endFlights);
  all("[data-close]",bag).forEach(button=>button.addEventListener("click",()=>bag.close()));
  bag.addEventListener("click",e=>{
    const r=bag.getBoundingClientRect();
    if(e.target===bag && (e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)) bag.close();
  });
  window.addEventListener("storage",event=>{
    if(event.key!==storageKey && event.key!==null) return;
    selection=read(); showCount(); if(bag.open) renderBag();
  });
  const menu=$(".shop-menu");
  if (menu) {
    document.addEventListener("click",e=>{ if(menu.open && !menu.contains(e.target)) menu.open=false; });
    document.addEventListener("keydown",e=>{ if(menu.open && e.key==="Escape"){ menu.open=false; $("summary",menu).focus(); } });
  }
  document.documentElement.classList.add("has-js");
  showCount();
})();
