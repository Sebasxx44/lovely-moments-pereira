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
  const confirmationTimers = new WeakMap();
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
  function announce(message) {
    const status = $(".notice");
    status.textContent = message;
    status.classList.add("show");
    clearTimeout(timer);
    timer=setTimeout(()=>status.classList.remove("show"),2200);
  }
  function add(button) {
    const id = canonical(button.dataset.add || button.closest(".product").dataset.id);
    const product = products.get(id);
    if (!product) return;
    if (selection.get(id) === 99) {
      announce("Ya tienes 99 unidades de este regalo en tu selección.");
      return;
    }

    const quantity = change(id, 1);
    announce(`${product.name} · ${quantity} en tu selección`);
    const glyph = $("use", button);
    glyph.setAttribute("href", icons + "check");
    button.classList.add("is-added");
    clearTimeout(confirmationTimers.get(button));
    confirmationTimers.set(button, setTimeout(() => {
      button.classList.remove("is-added");
      glyph.setAttribute("href", icons + "plus");
      confirmationTimers.delete(button);
    }, 1200));
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
    change(control.dataset.id,delta);
    renderBag(delta > 0 ? control.dataset.id : undefined);
    const next=all("button[data-by]",bag).find(el=>!el.disabled && el.dataset.id===control.dataset.id && el.dataset.by===control.dataset.by);
    (next || $("[data-close]",bag)).focus({preventScroll:true});
  });
  trigger.addEventListener("click",()=>{ renderBag(); bag.showModal(); });
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
