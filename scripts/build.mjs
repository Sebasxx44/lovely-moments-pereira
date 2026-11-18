import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepare } from "./store.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const compiled = path.join(root, "dist");
const staging = mkdtempSync(path.join(root, ".lovely-build-"));

try {
  const shop = prepare();
  cpSync(path.join(root, "site"), staging, { recursive: true });
  writeFileSync(path.join(staging, "inventario.js"), shop.js);
  let pages = 1;
  for (const slug of shop.supported) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("Ruta inválida: " + slug);
    const html = shop.renderPage(slug);
    if (!html) throw new Error("Página sin contenido: " + slug);
    const target = path.join(staging, slug);
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, "index.html"), html);
    pages += 1;
  }
  if (existsSync(compiled)) rmSync(compiled, { recursive: true, force: true });
  renameSync(staging, compiled);
  console.log(`Lovely Moments · ${pages} páginas en dist/`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
