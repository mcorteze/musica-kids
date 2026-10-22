// Medicion de fluidez (npm run rendimiento): simula una tablet modesta
// (procesador LENTITUD veces mas lento, render por software del Chrome sin
// GPU dedicada) y mide cuadros por segundo y cuadros trabados (> 50 ms) en
// los juegos con mas efectos: Simon dice, Colorear y Rompecabezas.
//   node herramientas/pruebas/rendimiento.mjs [lentitud] [liviano]
// Con "liviano" fuerza el modo liviano (utils/rendimiento.js).
// Usa el build de produccion de comun.mjs (lo arma). Los numeros sirven para
// comparar antes/despues en esta misma maquina, no como valor absoluto.
import { abrirActividades, construir, espera, lanzar } from './comun.mjs';

const LENTITUD = Number(process.argv[2] ?? 4);
const LIVIANO = process.argv[3] === 'liviano';
const SEGUNDOS = 3;

// Cuenta cuadros con requestAnimationFrame mientras corre "accion".
async function medir(page, accion) {
  await page.evaluate(() => {
    window.__cuadros = [];
    window.__midiendo = true;
    const cuadro = (t) => {
      window.__cuadros.push(t);
      if (window.__midiendo) requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
  });
  const t0 = Date.now();
  await accion();
  const resto = SEGUNDOS * 1000 - (Date.now() - t0);
  if (resto > 0) await espera(resto);
  return page.evaluate(() => {
    window.__midiendo = false;
    const c = window.__cuadros;
    const dur = (c[c.length - 1] - c[0]) / 1000;
    const huecos = c.slice(1).map((t, i) => t - c[i]);
    return {
      fps: Math.round((c.length - 1) / dur),
      trabados: huecos.filter((h) => h > 50).length,
      peor: Math.round(Math.max(...huecos)),
    };
  });
}

async function nuevaPagina(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, hasTouch: true, isMobile: false });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTITUD });
  // Fija el modo (forzado) antes de que cargue la app: sin la medicion
  // automatica, que en la simulacion podria activarlo o no.
  await page.evaluateOnNewDocument((liviano) => {
    localStorage.setItem('musica-kids-modo-liviano-forzado', liviano ? '1' : '0');
  }, LIVIANO);
  return page;
}

const arrastrar = async (page, x0, y0, x1, y1, pasos) => {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let k = 1; k <= pasos; k++) {
    await page.mouse.move(x0 + ((x1 - x0) * k) / pasos, y0 + ((y1 - y0) * k) / pasos + Math.sin(k / 3) * 20);
  }
  await page.mouse.up();
};

const resultados = [];
const anotar = (escena, r) => {
  resultados.push({ escena, ...r });
  console.log(`${escena.padEnd(46)} ${String(r.fps).padStart(3)} fps · ${String(r.trabados).padStart(3)} trabados · peor ${r.peor} ms`);
};

const carpeta = construir('produccion');
const browser = await lanzar();
console.log(`Procesador ${LENTITUD}x mas lento · modo ${LIVIANO ? 'liviano' : 'normal'}\n`);
try {
  // ---------- Simon dice ----------
  for (const grupo of ['Frozen', 'Disney']) {
    const page = await nuevaPagina(browser, 1180, 820);
    await abrirActividades(page, carpeta, { modoDev: true });
    await page.$eval('button[aria-label="Simón dice"]', (el) => el.click());
    await espera(600);
    await page.$$eval('.simon-grupo-tile', (els, g) => els.find((e) => e.textContent.includes(g)).click(), grupo);
    await espera(1500);
    anotar(`Simón ${grupo}: esperando (fondo animado)`, await medir(page, async () => {}));
    await page.$eval('.simon-jugar', (b) => b.click()).catch(() => {});
    anotar(`Simón ${grupo}: mostrando la secuencia`, await medir(page, async () => {}));
    await page.close();
  }

  // ---------- Colorear ----------
  const p = await nuevaPagina(browser, 1180, 820);
  await abrirActividades(p, carpeta, { modoDev: true, limpiarColorear: true });
  await p.$eval('button[aria-label="Colorear"]', (el) => el.click());
  await espera(500);
  await p.$eval('button[aria-label="Hoja en blanco"]', (el) => el.click());
  await p.waitForSelector('.colorear-hoja:not([style*="hidden"])');
  await espera(800);
  const h = await (await p.$('.colorear-canvas')).boundingBox();
  const cx = (f) => h.x + h.width * f;
  const cy = (f) => h.y + h.height * f;
  anotar('Colorear: hoja quieta', await medir(p, async () => {}));
  anotar('Colorear: pintando con crayón', await medir(p, () => arrastrar(p, cx(0.1), cy(0.2), cx(0.9), cy(0.25), 60)));
  await p.click('.colorear-selector[aria-label^="Varita"]');
  await espera(200);
  await p.$$eval('.colorear-desplegable--varita .colorear-util', (els) => els.find((e) => e.textContent === 'Oro').click());
  await espera(200);
  anotar('Colorear: pintando con la varita', await medir(p, () => arrastrar(p, cx(0.1), cy(0.35), cx(0.9), cy(0.4), 60)));
  for (let i = 0; i < 6; i++) await arrastrar(p, cx(0.1), cy(0.45 + i * 0.04), cx(0.9), cy(0.45 + i * 0.04), 25);
  await espera(400);
  const titilan = await p.$$eval('.colorear-titila', (els) => els.length);
  anotar(`Colorear: hoja quieta con ${titilan} brillos titilando`, await medir(p, async () => {}));
  await p.click('.colorear-selector[aria-label^="Lápiz"]');
  await espera(200);
  await p.$$eval('.colorear-desplegable--lapices .colorear-util', (els) => els.find((e) => e.textContent === 'Neón').click());
  await espera(200);
  anotar('Colorear: trazo largo de neón', await medir(p, () => arrastrar(p, cx(0.1), cy(0.8), cx(0.9), cy(0.85), 140)));
  await p.mouse.move(cx(0.5), cy(0.5));
  anotar('Colorear: zoom con la rueda', await medir(p, async () => {
    for (let i = 0; i < 12; i++) await p.mouse.wheel({ deltaY: i < 6 ? -80 : 80 });
  }));
  await p.close();

  // ---------- Rompecabezas ----------
  const r = await nuevaPagina(browser, 1180, 820);
  await abrirActividades(r, carpeta);
  await r.$eval('button[aria-label="Rompecabezas"]', (el) => el.click());
  await espera(600);
  await r.$eval('.memory-picker-tile:not(.memory-solo-dev)', (el) => el.click());
  await r.waitForSelector('.romp-tray-pieza', { timeout: 10000 });
  await espera(1200);
  const pieza = await (await r.$('.romp-tray-pieza')).boundingBox();
  const tablero = await (await r.$('.romp-pieza-tablero, .romp-tablero, .romp-board')).boundingBox().catch(() => null);
  const destino = tablero ?? { x: 300, y: 200, width: 400, height: 400 };
  anotar('Rompecabezas: arrastrando una pieza', await medir(r, () => arrastrar(
    r,
    pieza.x + pieza.width / 2,
    pieza.y + pieza.height / 2,
    destino.x + destino.width * 0.7,
    destino.y + destino.height * 0.3,
    80,
  )));
  await r.close();
} finally {
  await browser.close();
}
