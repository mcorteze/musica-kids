// Pruebas de festejo al ganar: los destellos (ExplosionChispas) salen al
// completar el juego y el mensaje de victoria aparece a los 5 s.
// Juegos que se ganan aqui: Memorice (se emparejan las cartas leyendo sus
// caras del DOM) y Pintar por numeros (Halloween, la lamina mas chica: se
// pinta celda por celda, numero por numero).
import { abrirActividades, espera, paginaNueva } from './comun.mjs';

const RETARDO_VICTORIA_S = 5;

// Desde que el juego se gana: destellos y momento en que el mensaje se ve.
async function festejo(page, chequear, juego) {
  await page.waitForSelector('.memory-victoria-overlay.victoria', { timeout: 15000 });
  const t0 = Date.now();
  let chispas = 0;
  let visibleA = null;
  while (Date.now() - t0 < (RETARDO_VICTORIA_S + 2) * 1000) {
    chispas = Math.max(chispas, (await page.$$('.explosion-chispa')).length);
    const vis = await page.$eval('.memory-victoria-overlay.victoria', (o) => getComputedStyle(o).visibility);
    if (vis === 'visible' && visibleA === null) visibleA = (Date.now() - t0) / 1000;
    if (visibleA !== null && chispas) break;
    await espera(50);
  }
  chequear(`${juego}: salen los destellos al ganar`, chispas > 0, `${chispas} chispas`);
  chequear(
    `${juego}: el mensaje de victoria aparece a los ${RETARDO_VICTORIA_S} s`,
    visibleA !== null && Math.abs(visibleA - RETARDO_VICTORIA_S) < 0.5,
    visibleA === null ? 'no apareció' : `${visibleA.toFixed(1)} s`,
  );
}

export async function probarJuegos(browser, carpeta, chequear) {
  // ---------- Memorice ----------
  const page = await paginaNueva(browser, chequear, { width: 1180, height: 820 }, 'memorice');
  await abrirActividades(page, carpeta);
  await page.$eval('button[aria-label="Jugar Memorice"]', (el) => el.click());
  await espera(600);
  await page.$eval('.memory-picker-tile:not(.memory-solo-dev)', (el) => el.click());
  await page.waitForSelector('.memory-card');
  await espera(1200);
  const caras = await page.$$eval('.memory-card .memory-card-front img', (els) => els.map((e) => e.getAttribute('src')));
  const pares = {};
  caras.forEach((s, i) => (pares[s] ??= []).push(i));
  const lista = Object.values(pares);
  for (let k = 0; k < lista.length; k++) {
    const cartas = await page.$$('.memory-card');
    await cartas[lista[k][0]].click();
    await espera(250);
    await cartas[lista[k][1]].click();
    if (k < lista.length - 1) await espera(900);
  }
  await festejo(page, chequear, 'Memorice');
  await page.close();

  // ---------- Pintar por números (Halloween) ----------
  const p = await paginaNueva(browser, chequear, { width: 1180, height: 820 }, 'pintar por números');
  await abrirActividades(p, carpeta);
  await p.$eval('button[aria-label="Pintar por números"]', (el) => el.click());
  await espera(500);
  await p.$eval('button[aria-label="Pintar con Halloween"]', (el) => el.click());
  await p.waitForSelector('.pintar-celda');
  await espera(600);
  // Con un tema elegido el drawer NO lleva el fondo pastel de los menus
  // (bug 2026-10-22: el color del encabezado de "pixel" lo pisaba una linea
  // que era de "pintar", y el juego se veia como menu).
  chequear(
    'Pintar por números: con tema elegido no usa el fondo de menú',
    await p.$eval('.memory-drawer', (d) => d.style.background === '' && d.style.backgroundImage === ''),
  );  // Toca cada celda del número en curso (eventos de puntero sobre el
  // tablero, en el centro de la celda) hasta que no quede ninguna.
  for (let vuelta = 0; vuelta < 40; vuelta++) {
    const quedan = await p.evaluate(() => {
      const tablero = document.querySelector('.pintar-tablero');
      const celdas = [...document.querySelectorAll('.pintar-celda.actual')];
      celdas.forEach((celda, i) => {
        const r = celda.getBoundingClientRect();
        const datos = { bubbles: true, pointerId: 100 + i, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'mouse' };
        tablero.dispatchEvent(new PointerEvent('pointerdown', datos));
        tablero.dispatchEvent(new PointerEvent('pointerup', datos));
      });
      return celdas.length;
    });
    if (!quedan) break;
    await espera(80);
  }
  await festejo(p, chequear, 'Pintar por números');
  await p.close();
}
