const base = "/";
export const paths = {
  catalog: "floristeria-a-domicilio-en-pereira",
  about: "floristeria-pereira",
  contact: "floristerias-a-domicilio-en-pereira",
  blog: "flores-en-pereira",
  all: "flores-pereira-a-domicilio",
  collections: "colecciones",
  map: "mapa-de-la-tienda",
  search: "search",
};
export { base };
export const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
export const url = slug => slug && slug !== "inicio" ? base + slug + "/" : base;
export const peso = value => typeof value === "number" && Number.isFinite(value) ? "$" + new Intl.NumberFormat("es-CO").format(value) : "Consultar precio";
export const fold = text => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export const photo = s => base + "media/" + s + ".webp";
export const safeExternal = link => /^(https?:\/\/|tel:|mailto:)/.test(link ?? "") ? link : "";
export const sectionLink = (slug, label) => `<a class="text-link" href="${url(slug)}">${esc(label)} <span aria-hidden="true">↗</span></a>`;
export const image = (src, alt, attrs = "") => src ? `<img src="${esc(src)}" alt="${esc(alt)}" decoding="async" ${attrs}>` : "";
export const crumbs = items => `<nav class="crumbs" aria-label="Ruta de navegación"><a href="${url("")}">Inicio</a>${items.map(([slug,label])=>`<span aria-hidden="true">/</span>${slug ? `<a href="${url(slug)}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}`).join("")}</nav>`;
export const searchForm = (label="Buscar un regalo", placeholder="Fresas, rosas, desayunos…") => `<form class="shop-search" role="search" action="${url(paths.search)}" method="get"><label><span class="sr">${esc(label)}</span><input type="search" name="q" placeholder="${esc(placeholder)}" autocomplete="off"></label><button type="submit">Buscar</button></form>`;
export function shellParts(home) {
  const find = pattern => { const match = home.match(pattern); if (!match) throw new Error("Falta una plantilla de la portada"); return match[0]; };
  return {
    header: find(/<header class="masthead">[\s\S]*?<\/header>/),
    footer: find(/<footer class="shop-footer">[\s\S]*?<\/footer>/),
    bag: find(/<dialog id="bag-dialog"[\s\S]*?<\/dialog>/),
  };
}
export function layout(parts, title, desc, main, theme = "rose") {
  return `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#fcf9f3"><title>${esc(title)} · Lovely Moments</title><meta name="description" content="${esc(desc)}"><link rel="icon" href="${base}assets/sello.webp"><link rel="preload" href="${base}fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="${base}tienda.css"><link rel="stylesheet" href="${base}escaparate.css"><link rel="stylesheet" href="${base}interiores.css"><script src="${base}inventario.js" defer></script><script src="${base}tienda.js" defer></script><script src="${base}interiores.js" defer></script></head><body class="store-interior theme-${theme}"><a class="skip" href="#contenido">Saltar al contenido</a>${parts.header}<main id="contenido">${main}</main>${parts.footer}${parts.bag}<p class="notice" role="status" aria-live="polite"></p></body></html>`;
}
export function card(item) {
  return `<article class="s-card" data-slug="${esc(item.slug)}"><a href="${url(item.slug)}"><figure>${image(item.thumb,item.name,'width="384" height="480" loading="lazy"')}</figure><div class="s-card-copy"><h3>${esc(item.name)}</h3><span>${peso(item.price)}</span></div></a></article>`;
}
export function grid(items, label = "Regalos", withSearch = true) {
  if (!items.length) return "";
  return `<section class="browse wrap" data-browse aria-label="${esc(label)}">
    <div class="browse-head"><h2>${esc(label)}</h2><p class="browse-count" aria-live="polite"><span data-count>${items.length}</span> regalos</p></div>
    <div class="browse-tools enhanced">
      ${withSearch ? `<label class="browse-filter">Buscar en esta selección<input type="search" data-filter-products placeholder="Nombre del regalo" autocomplete="off"></label>` : ""}
      <label class="browse-sort">Ordenar por<select data-sort><option value="featured">Selección de la tienda</option><option value="low">Menor precio</option><option value="high">Mayor precio</option><option value="name">Nombre de A a Z</option></select></label>
    </div>
    <div class="s-grid" data-products>${items.map(card).join("")}</div>
    <p class="browse-empty" data-no-results hidden>No encontramos regalos con esas palabras. Prueba con otro nombre.</p>
    <div class="browse-paging enhanced" data-pagination hidden><button type="button" data-prev>Anterior</button><span data-range aria-live="polite"></span><button type="button" data-next>Siguiente</button></div>
  </section>`;
}
export function pageTiles(pages, title, extra = "") {
  if (!pages.length) return "";
  return `<section class="directory-section wrap"><div class="directory-head"><h2>${esc(title)}</h2>${extra}</div><div class="tile-grid">${pages.map(item => `<a class="page-tile" href="${url(item.slug)}">${image(item.cover, "", 'width="600" height="420" loading="lazy"')}<span>${esc(item.title)} <b aria-hidden="true">↗</b></span></a>`).join("")}</div></section>`;
}
export function linkList(pages, title) {
  if (!pages.length) return "";
  return `<section class="link-journal"><h2>${esc(title)}</h2><ul>${pages.map(p=>`<li><a href="${url(p.slug)}">${esc(p.title)} <span aria-hidden="true">↗</span></a></li>`).join("")}</ul></section>`;
}
export function textBlocks(page, known) {
  const blocks = (page.sections || []).filter(s=>s.heading || s.text || s.links?.length);
  if (!blocks.length) return "";
  return `<div class="editorial-prose">${blocks.map(s=>{
    const links=(s.links||[]).map(l=>{
      const dest = l.slug && known.has(l.slug) ? url(l.slug) : safeExternal(l.url || l.href);
      return dest && l.label ? `<a class="inline-link" href="${esc(dest)}">${esc(l.label)}</a>` : "";
    }).filter(Boolean);
    const texts = Array.isArray(s.text) ? s.text : String(s.text || "").split(/\n+/);
    return `<section>${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${texts.filter(Boolean).map(t=>`<p>${esc(t)}</p>`).join("")}${links.length ? `<div class="prose-links">${links.join("")}</div>` : ""}</section>`;
  }).join("")}</div>`;
}
export function banner(page, kindLabel, tools = "") {
  return `<section class="s-banner"><div class="banner-grid wrap"><div class="banner-copy">${crumbs([[null,kindLabel]])}<h1>${esc(page.title)}</h1><p>${esc(page.intro)}</p>${tools}</div>${page.cover ? `<figure class="banner-photo">${image(page.cover,page.imageAlt || "",'width="950" height="680" fetchpriority="high"')}</figure>` : ""}</div></section>`;
}
