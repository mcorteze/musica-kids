// Utilidades compartidas de las pruebas de interfaz (ver todas.mjs).
// Sin servidor: cada prueba arma un build con base relativa en una carpeta
// temporal y lo abre con file:// en Chrome (puppeteer-core del proyecto).
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// modo: 'produccion' | 'desarrollo'. El de desarrollo trae React de
// desarrollo (StrictMode monta, desmonta y vuelve a montar los efectos):
// ahi aparecen bugs de limpieza que en produccion no se ven.
export function construir(modo) {
  const salida = join(tmpdir(), 'musica-kids-pruebas', modo);
  mkdirSync(salida, { recursive: true });
  const dev = modo === 'desarrollo';
  execSync(`npx vite build --base ./ --outDir "${salida}" --emptyOutDir${dev ? ' --mode development' : ''}`, {
    cwd: RAIZ,
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: dev ? 'development' : 'production' },
  });
  return salida;
}

export function lanzar() {
  return puppeteer.launch({ executablePath: CHROME, args: ['--allow-file-access-from-files'] });
}

export const urlDe = (carpeta) => `file:///${carpeta.replace(/\\/g, '/')}/index.html`;

// Resultados: cada chequeo suma un ok o un fallo con su detalle.
export function crearInforme() {
  const resultados = [];
  const chequear = (nombre, ok, detalle = '') => {
    resultados.push({ nombre, ok: Boolean(ok), detalle });
    console.log(`${ok ? '  ok ' : '  MAL'} ${nombre}${detalle ? ` (${detalle})` : ''}`);
  };
  return { resultados, chequear };
}

// Pagina nueva con los errores de la app como fallos. La hora de dormir
// viene encendida: corriendo las pruebas de noche taparia todo, asi que se
// apaga (si nadie la configuro) salvo en su propia prueba (horaDormir).
export async function paginaNueva(browser, chequear, viewport, etiqueta, { horaDormir = false } = {}) {
  const page = await browser.newPage();
  if (!horaDormir) {
    await page.evaluateOnNewDocument(() => {
      try {
        if (!localStorage.getItem('musica-kids-hora-dormir')) {
          localStorage.setItem('musica-kids-hora-dormir', JSON.stringify({ activo: false }));
        }
      } catch {
        // about:blank y otros documentos sin localStorage.
      }
    });
  }
  page.on('pageerror', (e) => chequear(`sin errores de la app (${etiqueta})`, false, e.message));
  await page.setViewport(viewport);
  return page;
}

export async function abrirActividades(page, carpeta, { modoDev = false, limpiarColorear = false } = {}) {
  await page.goto(urlDe(carpeta));
  await page.evaluate(({ dev, limpiar }) => {
    localStorage.setItem('musica-kids-modo-desarrollador', dev ? '1' : '0');
    if (limpiar) indexedDB.deleteDatabase('musica-kids-colorear');
  }, { dev: modoDev, limpiar: limpiarColorear });
  await page.reload();
  await espera(800);
  await page.click('.memory-trigger-btn');
  await espera(500);
}

export async function abrirLaminaColorear(page, carpeta, opciones = {}) {
  await abrirActividades(page, carpeta, { modoDev: true, ...opciones });
  await page.$eval('button[aria-label="Colorear"]', (el) => el.click());
  await espera(500);
  await page.$eval('button[aria-label="Colorear Paw Patrol"]', (el) => el.click());
  await page.waitForSelector('.colorear-tarjeta img');
  await espera(400);
  await page.$eval('.colorear-tarjeta', (el) => el.click());
  await page.waitForSelector('.colorear-hoja:not([style*="hidden"])');
  await espera(700);
}

// Pixeles con color en la capa de pintura de Colorear.
export const pintado = (page) => page.evaluate(() => {
  const c = document.querySelector('.colorear-canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
});

export const escalaVista = (page) => page.$eval('.colorear-vista', (el) => {
  const m = (el.style.transform || '').match(/scale\(([\d.]+)\)/);
  return m ? Number(m[1]) : 1;
});

// Elementos que se salen de la pantalla (selector CSS).
export const fueraDePantalla = (page, selector) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => {
  const r = el.getBoundingClientRect();
  return r.bottom > innerHeight + 1 || r.right > innerWidth + 1 || r.left < -1 || r.top < -1;
}).map((el) => el.className.split(' ')[0]), selector);

export const PANTALLAS = [
  ['laptop', 1366, 768],
  ['laptop-baja', 1280, 600],
  ['tablet', 820, 1180],
  ['tablet-acostada', 1180, 820],
  ['celular', 390, 844],
  ['celular-acostado', 844, 390],
];

export const viewportDe = (w, h) => ({ width: w, height: h, hasTouch: w < 1200, isMobile: w < 900 });
