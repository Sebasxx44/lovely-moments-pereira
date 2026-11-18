import { base, esc, image, safeExternal } from "./templates.mjs";

export function courseForm(page) {
  const options=page.eventOptions || [];
  return `<section class="contact-layout wrap" id="registro"><div class="contact-methods"><h2>Preinscripción</h2><p>Elige las áreas que quieres estudiar y prepara tu consulta para el equipo de Lovely Moments.</p><a href="https://lovelymoments.com.co/cursos-de-emprendimiento#registro" target="_blank" rel="noopener">Formulario oficial de preinscripción ↗</a></div>
  <form class="contact-form enhanced" data-inquiry="Hola, Lovely Moments. Me gustaría recibir información de sus cursos.">
    <div class="form-pair"><label>Nombre<input name="nombre" autocomplete="given-name" required maxlength="80"></label><label>Apellidos<input name="apellido" autocomplete="family-name" required maxlength="80"></label></div>
    <div class="form-pair"><label>Correo electrónico<input type="email" name="correo" autocomplete="email" required maxlength="150"></label><label>Teléfono o WhatsApp<input type="tel" name="telefono" autocomplete="tel" required maxlength="40"></label></div>
    <label>Ciudad y país<input name="ciudad" required maxlength="140"></label>
    <fieldset><legend>Áreas de interés</legend>${options.map(option=>`<label><input type="checkbox" name="tema" value="${esc(option)}"> ${esc(option)}</label>`).join("")}</fieldset>
    <button type="submit" class="primary">Preparar en WhatsApp <span aria-hidden="true">↗</span></button><p>Podrás revisar tu consulta antes de enviarla.</p></form></section>`;
}
export function filmStrip(videos) {
  if (!videos.length) return "";
  return videos.map(v=>`<div class="video-shop"><button type="button" class="enhanced" data-film="${esc(v.embed)}" aria-label="Reproducir vídeo de Lovely Moments">${image(base+v.poster,"",'width="192" height="108" loading="lazy"')}<span>Reproducir vídeo de la tienda</span></button><a class="text-link" href="${esc(v.source)}" target="_blank" rel="noopener">Ver en YouTube ↗</a></div>`).join("");
}
export function externalLinks(page) {
  const rows=(page.externalLinks || []).filter(l=>l.label && safeExternal(l.url));
  if(!rows.length) return "";
  return `<div class="wrap page-more"><div class="s-related-links">${rows.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div></div>`;
}
export function leadTime(hours) {
  if(!Number.isFinite(hours) || hours<=0) return "";
  return hours<48 || hours%24 ? `Anticipación que indica la tienda: ${hours} horas.` : `Anticipación que indica la tienda: ${hours/24} días.`;
}
