(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const fold = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const entries = new Map((window.LovelyInventory || []).map(([slug,name,price,categories,description])=>[slug,{
    name, price, words: fold([name,categories,description].join(" ")),
  }]));
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const globalSearch = $("[data-search-results] form[role=search]");
  if (globalSearch) globalSearch.elements.q.value = params.get("q") || "";
  const list = $("[data-browse]");
  if (list) {
    const root = $("[data-products]",list);
    const controls = $("[data-pagination]",list);
    const count = $("[data-count]",list);
    const input = $("[data-filter-products]",list) || globalSearch?.elements.q;
    const sort = $("[data-sort]",list);
    const cards = [...root.children];
    const perPage = 20;
    let pageNumber;
    function draw() {
      const words = fold(input?.value).trim().split(/\s+/).filter(Boolean);
      const matches = cards.filter(card => {
        const wordsForCard = entries.get(card.dataset.slug)?.words || fold(card.textContent);
        return words.every(word=>wordsForCard.includes(word));
      });
      if (sort.value !== "featured") matches.sort((a,b)=>{
        const left=entries.get(a.dataset.slug), right=entries.get(b.dataset.slug);
        if (sort.value === "name") return left.name.localeCompare(right.name,"es");
        return sort.value === "low" ? left.price-right.price : right.price-left.price;
      });
      const last = Math.max(1,Math.ceil(matches.length/perPage));
      pageNumber = Math.max(1,Math.min(Number.parseInt(pageNumber,10) || 1,last));
      const start=(pageNumber-1)*perPage;
      root.replaceChildren(...matches.slice(start,start+perPage));
      count.textContent=matches.length;
      $("[data-no-results]",list).hidden=Boolean(matches.length);
      controls.hidden=last<=1;
      $("[data-prev]",controls).disabled=pageNumber===1;
      $("[data-next]",controls).disabled=pageNumber===last;
      $("[data-range]",controls).textContent=`${start+1}–${Math.min(start+perPage,matches.length)} de ${matches.length}`;
    }
    function saveView() {
      const next = new URL(location.href);
      for (const [key,value] of [["q",input?.value.trim()],["orden",sort.value === "featured" ? "" : sort.value],["pagina",pageNumber>1 ? pageNumber : ""]]) {
        if (value) next.searchParams.set(key,value); else next.searchParams.delete(key);
      }
      history.replaceState(null,"",next);
    }
    function restore() {
      const state=new URLSearchParams(location.search);
      if(input) input.value=state.get("q") || "";
      const order=state.get("orden");
      sort.value=["low","high","name"].includes(order) ? order : "featured";
      pageNumber=state.get("pagina") || 1;
      draw();
    }
    function refine() { pageNumber=1; draw(); saveView(); }
    input?.addEventListener("input",refine);
    sort.addEventListener("change",refine);
    globalSearch?.addEventListener("submit",event=>{ event.preventDefault(); refine(); list.scrollIntoView({behavior:"instant"}); });
    for (const [selector,delta] of [["[data-prev]",-1],["[data-next]",1]]) {
      $(selector,controls).addEventListener("click",()=>{
        pageNumber+=delta; draw(); saveView(); list.scrollIntoView({behavior:"instant"});
        const first=$(".s-card a",list); if(first) first.focus({preventScroll:true});
      });
    }
    window.addEventListener("popstate",restore);
    restore();
  }
  const mainPhoto=$("#full-product-photo");
  if (mainPhoto) {
    const choices=[...document.querySelectorAll(".photo-choice")];
    choices.forEach(choice=>choice.addEventListener("click",event=>{
      if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      mainPhoto.src=choice.dataset.view;
      mainPhoto.alt=choice.dataset.alt;
      if (!reduced.matches) mainPhoto.animate([{opacity:.65,transform:"scale(1.014)"},{opacity:1,transform:"scale(1)"}],{duration:260,easing:"ease-out"});
      $("#full-product-link").href=choice.dataset.original;
      choices.forEach(button=>{
        if(button===choice) button.setAttribute("aria-current","true"); else button.removeAttribute("aria-current");
      });
    }));
  }
  document.querySelectorAll("[data-film]").forEach(button=>button.addEventListener("click",()=>{
    const frame=document.createElement("iframe");
    frame.src=button.dataset.film+"?autoplay=1";
    frame.title="Vídeo de Lovely Moments";
    frame.allow="autoplay; encrypted-media; picture-in-picture";
    frame.allowFullscreen=true;
    button.replaceWith(frame);
  }));
  document.querySelectorAll("form[data-inquiry],form[data-contact]").forEach(form=>{
    const topics=[...form.querySelectorAll('input[name="tema"]')];
    function checkTopics(){
      if(topics.length) topics[0].setCustomValidity(topics.some(box=>box.checked) ? "" : "Selecciona al menos un área de interés.");
    }
    topics.forEach(box=>box.addEventListener("change",checkTopics));
    checkTopics();
    form.addEventListener("submit",event=>{
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values=new FormData(form);
      const message=[form.dataset.inquiry || "Hola, Lovely Moments. Quisiera hacer una consulta."];
      const fields={nombre:"Nombre",apellido:"Apellido",telefono:"Teléfono",correo:"Correo",ciudad:"Ciudad y país",tema:"Temas de interés",mensaje:"Mensaje"};
      for(const [key,label] of Object.entries(fields)) {
        const answer=values.getAll(key).map(String).map(t=>t.trim()).filter(Boolean).join(", ");
        if(answer) message.push(label+": "+answer);
      }
      location.assign("https://wa.me/573213920327?text="+encodeURIComponent(message.join("\n")));
    });
  });
})();
