const art = "/assets/escenas/";
const hero = "/assets/hero/";

function cutout(alt, size, sources) {
  return { alt, width: size[0], height: size[1], src: sources[0][0],
    srcset: sources.map(([url, width]) => url + " " + width + "w").join(", ") };
}

const bouquet = cutout("Bouquet Arcoíris de rosas durazno y fresas decoradas en papel de floristería", [2870,2928],
  [720,1440,2160].map(w => [art + "arcoiris-" + w + ".webp", w]));
const breakfast = cutout("Caja redonda de desayuno Abrazo Matutino con un lazo dorado", [3076,2687],
  [720,1440,2160].map(w => [art + "abrazo-matutino-" + w + ".webp", w]));
const basket = cutout("Ancheta Deluxe de Lovely Moments con rosas rojas, fresas, fruta y vino", [2846,3393],
  [[hero+"ancheta-deluxe-900.webp",755],[art+"ancheta-deluxe-1440.webp",1440],[hero+"ancheta-deluxe-hd.webp",2846]]);
const bonbons = cutout("Estuche Amor Infinito con bombones de ganache en forma de corazón", [2790,2463],
  [[hero+"amor-infinito-900.webp",900],[art+"amor-infinito-1440.webp",1440],[hero+"amor-infinito-hd.webp",2790]]);
const heart = cutout("Corazón facetado de chocolate rojo con llave y cinta dorada", [2875,2009],
  [[hero+"corazon-sorpresa-900.webp",900],[art+"corazon-sorpresa-1440.webp",1440],[hero+"corazon-sorpresa-hd.webp",2875]]);
const berries = cutout("Tres fresas Bombonita bañadas en chocolate cobre, rojo y marfil", [1092,820],
  [[hero+"bombonita-900.webp",900],[hero+"bombonita-hd.webp",1092]]);

// Art-direct each photographic still life. Other collections use their own editorial print.
const scenes = new Map([
  ["flores-pereira-a-domicilio", [basket, "petalo"]],
  ["floristeria-a-domicilio-en-pereira", [bouquet, "salvia"]],
  ["colecciones", [heart, "miel"]],
  ["search", [bonbons, "marfil"]],
  ["mapa-de-la-tienda", [bouquet, "marfil"]],
  ["floristerias-a-domicilio-en-pereira", [bouquet, "petalo"]],
  ["chocolates-pereira", [heart, "vino"]],
  ["bombones-de-chocolate-en-pereira", [bonbons, "miel"]],
  ["fresas-con-chocolate-en-pereira", [berries, "petalo"]],
  ["anchetas-pereira", [basket, "miel"]],
  ["desayunos-sorpresa-a-domicilio-en-pereira", [breakfast, "miel"]],
  ["bouquets-de-flores-en-pereira", [bouquet, "salvia"]],
  ["regalos-de-san-valentin-en-pereira-dosquebradas-y-santa-rosa-de-cabal", [heart, "petalo"]],
  ["regalos-de-amor-y-amistad-en-pereira-dosquebradas-y-santa-rosa-de-cabal", [bonbons, "vino"]]
]);

export function sceneFor(page, theme) {
  const still = scenes.get(page.slug);
  if (still) return { mode: "objeto", tone: still[1], photo: still[0] };
  const src = page.editorialCover || page.cover;
  if (!src) return { mode: "objeto", tone: "salvia", photo: bouquet };
  const tone = page.kind === "article" || page.kind === "blog" ? "marfil"
    : theme === "leaf" ? "salvia" : theme === "cocoa" ? "miel" : "petalo";
  return { mode: "postal", tone, photo: { src, alt: page.imageAlt || page.title } };
}
