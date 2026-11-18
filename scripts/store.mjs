import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { paths, base, esc, url, peso, fold, photo, sectionLink, image, crumbs, searchForm, shellParts, layout, card, grid, pageTiles, linkList, textBlocks, banner } from "./templates.mjs";
import { courseForm, filmStrip, externalLinks, leadTime } from "./extras.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = path.join(here, "data");
const publicShop = path.join(here, "../site");
const json = file => JSON.parse(fs.readFileSync(path.join(data, file + ".json"), "utf8").replace(/^\uFEFF/,""));
const types = ["chocolates-pereira","bouquets-de-flores-en-pereira","desayunos-sorpresa-a-domicilio-en-pereira","anchetas-pereira","fresas-con-chocolate-en-pereira","arreglos-florales-a-domicilio-en-pereira-colombia"];
const aliases = { catalogo: paths.catalog, "cursos-y-capacitaciones": "cursos-de-emprendimiento", inicio: "" };
const wam = message => "https://wa.me/573213920327?text=" + encodeURIComponent(message);
const makeSlug = str => fold(str).replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const imagePage = slug => base + "media/pagina-" + slug + ".webp";
const gallery = (slug, i) => base + "media/galeria/" + slug + "-" + (i+1) + ".webp";
const groupLinks = rows => `<div class="s-related-links">${rows.map(row=>`<a href="${url(row.slug)}">${esc(row.title)}</a>`).join("")}</div>`;
const collectionKind = p => ["collection", "category", "occasion"].includes(p.kind);
const articleKind = p => ["article","post"].includes(p.kind);
const decoration = slug => /chocolate|fresas|bombon|san-valentin|amor/.test(slug) ? "cocoa" : /flor|bouquet|girasol|etern|rosa/.test(slug) ? "leaf" : "rose";
function bagFacts(status) {
  if (status === "InStock") return "La tienda indica disponibilidad. Confirma la fecha y el domicilio antes de reservar.";
  if (status === "OutOfStock") return "Agotado en el catálogo de la tienda. Puedes consultar si volverá a estar disponible.";
  return "Consulta la disponibilidad para tu fecha de entrega.";
}
function contactForm() {
  return `<div class="contact-layout wrap"><section class="contact-methods"><h2>Hablemos</h2><a href="tel:+573213920327">+57 321 392 0327</a><a href="mailto:detalles@lovelymoments.com.co">detalles@lovelymoments.com.co</a><a href="https://www.instagram.com/bylovelymoments/">Instagram @ByLovelyMoments</a><p>Pereira, Dosquebradas y Santa Rosa de Cabal.</p></section><form class="contact-form" data-contact><h2>Escribe tu consulta</h2><div class="form-pair"><label>Nombre<input name="nombre" autocomplete="given-name" required maxlength="80"></label><label>Apellido (opcional)<input name="apellido" autocomplete="family-name" maxlength="80"></label></div><div class="form-pair"><label>Teléfono<input type="tel" name="telefono" autocomplete="tel" required maxlength="40"></label><label>Correo<input type="email" name="correo" autocomplete="email" required maxlength="150"></label></div><label>Mensaje<textarea name="mensaje" rows="4" required maxlength="2000" placeholder="Cuéntanos qué quieres regalar y para cuándo"></textarea></label><button type="submit" class="primary enhanced">Preparar en WhatsApp <span aria-hidden="true">↗</span></button><p>Se abrirá WhatsApp con tu consulta lista para revisar y enviar.</p><noscript><a href="https://wa.me/573213920327">Abrir WhatsApp</a></noscript></form></div>`;
}
function productView(item, collectionLinks, matches) {
  const group = collectionLinks[0];
  const original = i => i === 0 && item.localHd ? item.localHd : item.photos[i];
  const firstPhoto = original(0);
  const stock = bagFacts(item.availability);
  const thumbButtons = item.photos.map((_, i)=>`<a class="photo-choice" href="${esc(original(i))}" data-view="${esc(gallery(item.slug,i))}" data-original="${esc(original(i))}" data-alt="${esc(item.name)} · Foto ${i+1}" aria-label="Ver foto ${i+1} de ${esc(item.name)}"${i===0 ? ' aria-current="true"' : ""}>${image(i===0 ? item.thumb : gallery(item.slug,i),"",'width="82" height="100" loading="lazy"')}</a>`).join("");
  return `<div class="wrap">${crumbs([[paths.catalog,"Catálogo"],...(group ? [[group.slug,group.title]] : []),[null,item.name]])}</div>
    <section class="product-layout wrap"><div class="product-gallery">
      <figure class="product-plate">${image(gallery(item.slug,0),item.name,'id="full-product-photo" width="825" height="1050" fetchpriority="high"')}<a class="photo-full" id="full-product-link" href="${esc(firstPhoto)}" target="_blank" rel="noopener">Ampliar foto ↗</a></figure>
      ${item.photos.length>1 ? `<nav class="product-thumbs" aria-label="Fotografías de ${esc(item.name)}">${thumbButtons}</nav>` : ""}
      ${filmStrip(item.films)}
    </div><div class="product-notes">
      ${group ? `<a class="product-family" href="${url(group.slug)}">${esc(group.title)}</a>` : ""}
      <h1>${esc(item.name)}</h1><p class="product-amount">${peso(item.price)} <span>COP</span></p>
      <p class="product-story">${esc(item.description)}</p>
      ${item.includesDedicationCard && !/tarjeta/i.test(item.description) ? '<p class="dedication">Incluye tarjeta con dedicatoria.</p>' : ""}
      <p class="stock-note">${esc(stock)}</p>
      <button class="primary enhanced" type="button" data-add="${esc(item.slug)}">Guardar en mi selección <span aria-hidden="true">+</span></button>
      ${item.purchasable && item.availability==="InStock" ? `<a class="text-link product-ask" href="${esc(item.url)}" target="_blank" rel="noopener">Comprar en la tienda oficial <span aria-hidden="true">↗</span></a>` : ""}
      <a class="product-ask text-link" href="${esc(wam("Hola, Lovely Moments. Quisiera consultar por "+item.name+". "+item.url))}" target="_blank" rel="noopener">Consultar este regalo <span aria-hidden="true">↗</span></a>
      <details class="product-delivery"><summary>Entrega y reserva</summary><p>${esc(leadTime(item.minimumLeadHours))} Lovely Moments coordina los pedidos en Pereira, Dosquebradas y Santa Rosa de Cabal. El domicilio se cotiza por separado.</p>${sectionLink(paths.contact,"Contactar con la tienda")}</details>
      ${collectionLinks.length ? `<div class="product-collections"><p>Colecciones</p>${groupLinks(collectionLinks)}</div>` : ""}
    </div></section>
    ${matches.length ? `<section class="more-products wrap"><div class="directory-head"><h2>También puede gustarte</h2>${sectionLink(paths.all,"Ver todos los regalos")}</div><div class="s-grid">${matches.map(card).join("")}</div></section>` : ""}`;
}
function redirect(slug) {
  const dest = url(slug);
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${dest}"><title>Lovely Moments</title><a href="${dest}">Continuar a Lovely Moments</a></html>`;
}
export function prepare() {
  const home = fs.readFileSync(path.join(publicShop,"index.html"),"utf8");
  const parts = shellParts(home);
  const films=json("videos");
  const featured=new Map([...home.matchAll(/<article class="product" data-id="([^"]+)"[^>]*>\s*<a class="product-link" href="\/([^/"]+)\/"/g)].map(m=>[m[2],m[1]]));
  const items = json("productos").map(item=>({...item,thumb:photo(item.slug),films:films.filter(v=>v.slug===item.slug), localHd:featured.has(item.slug) ? base+"assets/catalogo-hd/"+featured.get(item.slug)+".webp" : ""}));
  const originals = json("paginas").filter(page=>page.slug && !["inicio","search","/"].includes(page.slug));
  const memberships = json("colecciones-pagina");
  const allGroups = json("colecciones");
  const covers = new Map(json("editorial-images").map(row=>[row.slug,row]));
  const itemBySlug = new Map(items.map(r=>[r.slug,r]));
  const pages = new Map(originals.map(page=>[page.slug,{...page,categoryIds:memberships[page.slug] || page.categoryIds || []}]));
  const byGroup = new Map();
  for (const item of items) for (const id of item.categories) {
    if (!byGroup.has(id)) byGroup.set(id,[]);
    byGroup.get(id).push(item);
  }
  for (const [id,list] of byGroup) list.sort((a,b)=>(a.collectionOrder?.[id] ?? Infinity)-(b.collectionOrder?.[id] ?? Infinity));
  const groupPage = new Map();
  for (const page of [...pages.values()].sort((a,b)=>Number(collectionKind(b))-Number(collectionKind(a)))) {
    for (const id of page.categoryIds) if (!groupPage.has(id)) groupPage.set(id,page);
  }
  for (const g of allGroups) {
    if (groupPage.has(g.id) || !byGroup.get(g.id)?.length) continue;
    const slug = "coleccion-"+makeSlug(g.name);
    const page = pages.get(slug) || {slug,title:g.name[0].toLocaleUpperCase("es")+g.name.slice(1),kind:"collection",categoryIds:[],intro:"",sections:[]};
    page.categoryIds.push(g.id);
    pages.set(slug,page);
    groupPage.set(g.id,page);
  }
  for (const page of pages.values()) {
    const ordered = (page.productSlugs || []).map(slug=>itemBySlug.get(slug)).filter(Boolean);
    const categoryItems = page.categoryIds.flatMap(id=>byGroup.get(id) || []);
    page.items = [...new Set([...ordered,...categoryItems])];
    const originalImage = covers.get(page.slug);
    page.cover = originalImage && fs.existsSync(path.join(publicShop,"media","pagina-"+page.slug+".webp"))
      ? imagePage(page.slug) : (page.items[0]?.thumb || "");
    page.imageAlt = originalImage?.alt || "";
  }
  const articles = [...pages.values()].filter(articleKind);
  const collectionPages = [...pages.values()].filter(p=>collectionKind(p) || (p.categoryIds.length && !["location","city","landing"].includes(p.kind)));
  const misc = [...pages.values()].filter(p=>!collectionPages.includes(p) && !articles.includes(p));
  const known = new Set([...pages.keys(),...itemBySlug.keys(),...Object.values(paths),"inicio"]);
  const inventory = items.map(i=>[i.slug,i.name,i.price, i.categories.map(id=>allGroups.find(g=>g.id===id)?.name).filter(Boolean).join(" "),i.description]);
  const supported = new Set([...known,...Object.keys(aliases)]);
  function renderPage(slug) {
    if (Object.hasOwn(aliases,slug)) return redirect(aliases[slug]);
    if (slug === paths.map) {
      const main=`<div class="map-page wrap">${crumbs([[null,"Mapa de la tienda"]])}<h1>Mapa de la tienda</h1>${linkList(misc,"La tienda y sus entregas")}${linkList(collectionPages,"Colecciones y ocasiones")}${linkList(articles,"Guías y artículos")}<details class="map-products"><summary>Todos los productos (${items.length})</summary>${linkList(items.map(i=>({slug:i.slug,title:i.name})),"Fichas de producto")}</details></div>`;
      return layout(parts,"Mapa de la tienda","Directorio de páginas y fichas de Lovely Moments.",main);
    }
    if (slug===paths.search) {
      const main = `<div class="search-intro wrap">${crumbs([[null,"Buscar"]])}<h1>Buscar un regalo</h1>${searchForm()}</div>${grid(items,"Resultados",false)}`;
      return layout(parts,"Buscar un regalo","Encuentra flores, chocolates y regalos de Lovely Moments.",main);
    }
    if (slug===paths.collections) {
      const first = types.map(s=>pages.get(s)).filter(Boolean);
      const rest = collectionPages.filter(p=>!first.includes(p));
      const main=`<div class="search-intro wrap">${crumbs([[null,"Colecciones"]])}<h1>Colecciones</h1><p>Explora por tipo de regalo o por la ocasión que quieres celebrar.</p></div>${pageTiles(first,"Por tipo de regalo")}<div class="map-page wrap">${linkList(rest,"Más colecciones y ocasiones")}</div>`;
      return layout(parts,"Colecciones","Flores, chocolates y regalos agrupados por ocasión.",main);
    }
    const item = itemBySlug.get(slug);
    if (item) {
      const linkPages = [...new Set(item.categories.map(id=>groupPage.get(id)).filter(Boolean))];
      const related = [...new Set(item.categories.flatMap(id=>byGroup.get(id) || []))].filter(i=>i!==item).slice(0,4);
      return layout(parts,item.name,item.description,productView(item,linkPages,related),decoration(slug));
    }
    const page = pages.get(slug);
    if (!page) return null;
    let main;
    if (slug===paths.catalog) {
      const useful = types.map(s=>pages.get(s)).filter(Boolean);
      main = banner({...page,title:"El catálogo"},"Catálogo",searchForm())+pageTiles(useful,"Por tipo de regalo",sectionLink(paths.collections,"Todas las colecciones"))+`<div class="directory-cta wrap">${sectionLink(paths.all,"Ver los "+items.length+" regalos")}</div>`;
      const occasions = collectionPages.filter(p=>/navidad|amor-y-amistad|cumpleanos|para-ninos|halloween|dia-del-padre$/.test(p.slug)).slice(0,6);
      main += pageTiles(occasions,"Por ocasión")+`<div class="map-page wrap">${linkList(collectionPages.filter(p=>!useful.includes(p)&&!occasions.includes(p)),"Explorar el catálogo")}</div>`;
    } else if (slug === paths.all) {
      main = banner({...page,title:"Todos los regalos"},"Catálogo",sectionLink(paths.collections,"Explorar colecciones"))+grid(items,"Elige tu regalo");
    } else if (slug === paths.blog) {
      main = banner(page,"Blog")+pageTiles(articles,"Guías de flores y regalos");
    } else if (slug === paths.contact) {
      main = banner(page,"Contacto")+contactForm()+`<div class="reading wrap">${textBlocks(page,known)}</div>`+externalLinks({...page,externalLinks:[...(page.externalLinks || []),{label:"Formulario oficial de contacto",url:page.source}]});
    } else {
      const label=articleKind(page) ? "Blog" : slug === paths.about ? "Nosotros" : page.items.length || collectionKind(page) ? "Colección" : "La tienda";
      main = banner(page,label);
      if (articleKind(page) && page.date) {
        const published = new Intl.DateTimeFormat("es-CO",{dateStyle:"long",timeZone:"UTC"}).format(new Date(page.date+"T12:00:00Z"));
        main += `<p class="article-by wrap">${esc(page.author)} · <time datetime="${esc(page.date)}">${esc(published)}</time></p>`;
      }
      if (page.items.length) main += grid(page.items,"Regalos de esta colección");
      const editorial = textBlocks(page,known);
      if (editorial) main += `<div class="reading wrap">${editorial}</div>`;
      const linked = new Set((page.sections || []).flatMap(s=>(s.links || []).map(l=>l.slug)));
      const others=(page.links || []).filter(l=>known.has(l.slug) && !linked.has(l.slug)).map(l=>({slug:l.slug,title:l.label || pages.get(l.slug)?.title}));
      if (others.length) main += `<div class="wrap page-more">${groupLinks(others)}</div>`;
      if (page.kind==="course") main += courseForm(page);
      else main += externalLinks(page);
      if (articleKind(page)) main += pageTiles(articles.filter(p=>p!==page),"Más del blog");
    }
    return layout(parts,page.title,page.intro,main,decoration(slug));
  }
  return { supported, renderPage, js:"window.LovelyInventory="+JSON.stringify(inventory).replace(/</g,"\\u003c")+";\n" };
}
