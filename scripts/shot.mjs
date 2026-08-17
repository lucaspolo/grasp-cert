// Converte uma captura de tela em imagem do manual (`public/ajuda/*.webp`).
//
//   node scripts/shot.mjs <origem> <nome> [left top width height]
//
// A origem é o .jpg que a extensão do Chrome salva em
// /tmp/claude-chrome-screenshots-*/ (o caminho vem no resultado da captura),
// ou qualquer PNG — o certificado, por exemplo, é baixado direto do endpoint
// público em vez de fotografado.
//
// Sem as coordenadas de recorte a imagem é convertida inteira. Com elas,
// recorta antes de converter: quase toda captura tem área morta embaixo, e
// painéis isolados (formulário de QSO, resultado do ADIF) rendem imagem muito
// mais legível que a tela inteira encolhida.
//
// Imprime as dimensões finais — são elas que vão para `width`/`height` em
// `src/app/ajuda/content.ts`, e `next/image` exige que batam com o arquivo.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const [src, name, left, top, width, height] = process.argv.slice(2);

if (!src || !name) {
  console.error("uso: node scripts/shot.mjs <origem> <nome> [left top width height]");
  process.exit(1);
}

mkdirSync("public/ajuda", { recursive: true });

let img = sharp(src);
if (left !== undefined) {
  img = img.extract({
    left: Number(left),
    top: Number(top),
    width: Number(width),
    height: Number(height),
  });
}

const out = `public/ajuda/${name}.webp`;
const info = await img.webp({ quality: 90 }).toFile(out);

console.log(`${out}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
