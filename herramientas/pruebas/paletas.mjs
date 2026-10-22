// Pruebas de las láminas de Pintar por números: con el lector real
// (laminaDePixelArt de src/utils/pintarPixel.js) ninguna lámina tiene dos
// números con un tono que se vea igual (dE Lab < 9) ni números sin celdas.
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RAIZ, espera, paginaNueva } from './comun.mjs';

const DISTINTOS_MIN = 9;

export async function probarPaletas(browser, chequear) {
  const base = join(RAIZ, 'src', 'assets', 'pintar-pixel');
  const rutas = readdirSync(base).flatMap((tema) => {
    try {
      return readdirSync(join(base, tema, 'laminas')).filter((f) => f.endsWith('.avif')).map((f) => `${tema}/laminas/${f}`);
    } catch {
      return [];
    }
  });
  const dir = join(tmpdir(), 'musica-kids-pruebas');
  mkdirSync(dir, { recursive: true });
  const html = join(dir, 'paletas.html');
  const aUrl = (ruta) => `file:///${ruta.replace(/\\/g, '/')}`;
  writeFileSync(html, `<!doctype html><meta charset="utf-8"><script type="module">
import { laminaDePixelArt } from '${aUrl(join(RAIZ, 'src', 'utils', 'pintarPixel.js'))}';
window.laminaDePixelArt = laminaDePixelArt;
window.listo = true;
</script>`);
  const page = await paginaNueva(browser, chequear, { width: 800, height: 600 }, 'paletas');
  await page.goto(aUrl(html));
  await page.waitForFunction('window.listo === true');
  const resultados = await page.evaluate(async (lista, carpeta) => {
    const lab = ([r, g, b]) => {
      const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const R = lin(r), G = lin(g), B = lin(b);
      const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
      const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
      const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
      return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
    };
    const salida = [];
    for (const ruta of lista) {
      const img = new Image();
      img.src = `${carpeta}/${ruta}`;
      await img.decode();
      const l = window.laminaDePixelArt(img);
      const ls = l.paleta.map((h) => lab([1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))));
      let min = Infinity;
      for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) min = Math.min(min, Math.hypot(...ls[i].map((v, k) => v - ls[j][k])));
      const sinCeldas = l.paleta.filter((_, n) => !l.celdas.includes(n + 1)).length;
      salida.push({ ruta, min, sinCeldas });
    }
    return salida;
  }, rutas, aUrl(base));
  const malas = resultados.filter((r) => r.min < DISTINTOS_MIN || r.sinCeldas);
  chequear(
    `${resultados.length} láminas sin tonos repetidos ni números vacíos`,
    resultados.length > 0 && malas.length === 0,
    malas.map((r) => `${r.ruta}: dE ${r.min.toFixed(1)}${r.sinCeldas ? `, ${r.sinCeldas} vacíos` : ''}`).join('; '),
  );
  await espera(100);
  await page.close();
}
