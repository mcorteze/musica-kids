// Pruebas de lo que embellece Colorear: sellos con figuras y pegatinas,
// varita con polvos (estela y brillos que titilan), lapices con patron,
// espejo, sonido, "Ver cómo lo pinté" (boton de la barra con confirmacion;
// repite el dibujo identico), imprimir/guardar con marcos y la hoja en blanco.
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirActividades, abrirLaminaColorear, espera, paginaNueva, pintado } from './comun.mjs';

const FIGURAS_ESPERADAS = 30;

export async function probarColorearExtras(browser, carpeta, chequear) {
  const page = await paginaNueva(browser, chequear, { width: 1366, height: 768 }, 'colorear extras');
  await abrirLaminaColorear(page, carpeta, { limpiarColorear: true });
  const hoja = await (await page.$('.colorear-canvas')).boundingBox();
  const linea = async (x0, y0, x1, y1, pasos = 14) => {
    await page.mouse.move(hoja.x + hoja.width * x0, hoja.y + hoja.height * y0);
    await page.mouse.down();
    for (let k = 1; k <= pasos; k++) {
      await page.mouse.move(hoja.x + hoja.width * (x0 + ((x1 - x0) * k) / pasos), hoja.y + hoja.height * (y0 + ((y1 - y0) * k) / pasos));
      await espera(12);
    }
    await page.mouse.up();
  };

  // ---------- Sellos: pestañas y figuras ----------
  await page.click('.colorear-selector[aria-label^="Sello"]');
  await espera(250);
  const pestanas = await page.$$('.colorear-pestana');
  let figuras = 0;
  for (const p of pestanas) {
    await p.click();
    await espera(150);
    // -1: la primera de cada pestaña es "Surtido".
    figuras += (await page.$$('.colorear-desplegable--sellos .colorear-util')).length - 1;
  }
  chequear(`los sellos tienen ${FIGURAS_ESPERADAS} figuras en ${pestanas.length} grupos`, figuras === FIGURAS_ESPERADAS && pestanas.length === 3, `${figuras} figuras`);
  await page.click('.colorear-pestana:nth-child(2)');
  await espera(150);
  await page.$$eval('.colorear-desplegable--sellos .colorear-util', (els) => els.find((e) => e.textContent === 'Mariquita').click());
  await espera(200);
  chequear('el botón del sello muestra la figura elegida', (await page.$eval('.colorear-selector[aria-label^="Sello"]', (b) => b.getAttribute('aria-label'))) === 'Sello: Mariquita');
  await page.mouse.move(hoja.x + hoja.width * 0.3, hoja.y + hoja.height * 0.15);
  await page.mouse.down();
  await espera(60);
  const pops = (await page.$$('.colorear-pop')).length;
  await page.mouse.up();
  chequear('estampar deja la figura y hace "pop"', (await pintado(page)) > 0 && pops > 0, `${pops} pop`);

  // ---------- Varita: polvos, estela y brillos que titilan ----------
  await page.click('.colorear-selector[aria-label^="Varita"]');
  await espera(250);
  chequear('la varita ofrece 8 polvos', (await page.$$('.colorear-desplegable--varita .colorear-util')).length === 8);
  await page.$$eval('.colorear-desplegable--varita .colorear-util', (els) => els.find((e) => e.textContent === 'Oro').click());
  await espera(200);
  await page.mouse.move(hoja.x + hoja.width * 0.1, hoja.y + hoja.height * 0.35);
  await page.mouse.down();
  let estela = 0;
  for (let k = 1; k <= 16; k++) {
    await page.mouse.move(hoja.x + hoja.width * (0.1 + 0.05 * k), hoja.y + hoja.height * 0.35);
    await espera(30);
    estela = Math.max(estela, (await page.$$('.colorear-estela')).length);
  }
  await page.mouse.up();
  for (let i = 0; i < 3; i++) await linea(0.1, 0.42 + i * 0.04, 0.9, 0.42 + i * 0.04);
  await espera(300);
  chequear('la varita deja estela al moverse', estela > 0, `${estela} partículas`);
  chequear('quedan brillos que titilan', (await page.$$('.colorear-titila')).length > 0, `${(await page.$$('.colorear-titila')).length}`);

  // La goma tambien se lleva los brillos que titilan (y deshacer los devuelve).
  const contarTitilan = () => page.$$eval('.colorear-titila', (els) => els.length);
  const antesGoma = await contarTitilan();
  await page.click('.colorear-selector[aria-label="Goma"]');
  await page.click('.colorear-selector[aria-label="Tamaño"]');
  await espera(150);
  await page.click('.colorear-tamano-rapido:nth-child(5)');
  await page.keyboard.press('Escape');
  await espera(150);
  for (let i = 0; i <= 14; i++) await linea(0.03, 0.3 + i * 0.016, 0.97, 0.3 + i * 0.016, 20);
  await espera(300);
  const conGoma = await contarTitilan();
  chequear('la goma borra los brillos que titilan', antesGoma > 0 && conGoma === 0, `${antesGoma} -> ${conGoma}`);
  // Pintar de nuevo donde paso la goma no los trae de vuelta (antes si: se
  // mostraban los que tenian pintura debajo).
  await page.click('.colorear-selector[aria-label^="Lápiz"]');
  await espera(200);
  await page.$$eval('.colorear-desplegable--lapices .colorear-util', (els) => els.find((e) => e.textContent === 'Destacador').click());
  await espera(150);
  for (let i = 0; i < 4; i++) await linea(0.05, 0.33 + i * 0.04, 0.95, 0.33 + i * 0.04);
  await espera(300);
  chequear('pintar encima de lo borrado no devuelve los brillos', (await contarTitilan()) === 0, `${await contarTitilan()}`);
  // 4 trazos de destacador y 15 pasadas de goma: deshacer las 19 deja todo como antes.
  for (let i = 0; i < 19; i++) await page.click('[aria-label="Deshacer"]');
  await espera(300);
  chequear('deshacer la goma devuelve los brillos que titilan', (await contarTitilan()) === antesGoma, `${await contarTitilan()} de ${antesGoma}`);
  await page.click('.colorear-selector[aria-label="Goma"]');
  await page.click('.colorear-selector[aria-label="Tamaño"]');
  await espera(150);
  await page.click('.colorear-tamano-rapido:nth-child(3)');
  await page.keyboard.press('Escape');
  await espera(150);

  // ---------- Lapices con patron ----------
  await page.click('.colorear-selector[aria-label^="Lápiz"]');
  await espera(200);
  const nombres = await page.$$eval('.colorear-desplegable--lapices .colorear-util-nombre', (els) => els.map((e) => e.textContent));
  chequear('los lápices traen rayas, puntitos, cuadros y estrellitas', ['Rayas', 'Puntitos', 'Cuadros', 'Estrellitas'].every((n) => nombres.includes(n)));
  await page.$$eval('.colorear-desplegable--lapices .colorear-util', (els) => els.find((e) => e.textContent === 'Rayas').click());
  await espera(150);
  const antesRayas = await pintado(page);
  await linea(0.1, 0.6, 0.9, 0.6);
  chequear('el lápiz de rayas pinta', (await pintado(page)) > antesRayas);

  // ---------- Espejo ----------
  await page.click('.colorear-flotante[aria-label^="Espejo"]');
  await espera(150);
  chequear('el espejo muestra la línea del centro', await page.$('.colorear-eje'));
  await page.click('.colorear-selector[aria-label^="Lápiz"]');
  await espera(150);
  await page.click('.colorear-util:nth-child(3)');
  await espera(150);
  await linea(0.1, 0.78, 0.25, 0.78);
  const reflejo = await page.evaluate(() => {
    const c = document.querySelector('.colorear-canvas');
    const ctx = c.getContext('2d');
    const y = Math.round(c.height * 0.78);
    const alfa = (x) => ctx.getImageData(Math.round(x), y, 1, 1).data[3];
    return { izquierda: alfa(c.width * 0.18), derecha: alfa(c.width * 0.82) };
  });
  chequear('con espejo el trazo aparece reflejado al otro lado', reflejo.izquierda > 0 && reflejo.derecha > 0, JSON.stringify(reflejo));
  await page.click('.colorear-flotante[aria-label^="Espejo"]');

  // ---------- Sonido ----------
  await page.click('.colorear-flotante[aria-label="Silenciar sonidos"]');
  await espera(150);
  chequear('el sonido se silencia y se recuerda', await page.evaluate(() => localStorage.getItem('musica-kids-colorear-sonido') === '0'));
  await page.click('.colorear-flotante[aria-label="Activar sonidos"]');

  // ---------- Ver cómo lo pinté (barra, con confirmacion) ----------
  const final = await pintado(page);
  chequear('ya no está el botón "¡Terminé!"', !(await page.$('[aria-label="¡Terminé!"]')));
  await page.click('.colorear-accion[aria-label="Ver cómo lo pinté"]');
  await page.waitForSelector('.colorear-dialogo--repetir', { timeout: 4000 });
  chequear('"Ver cómo lo pinté" pregunta antes de empezar', !(await page.$('.colorear-vista--repitiendo')));
  await page.$$eval('.colorear-dialogo--repetir button', (bs) => bs.find((b) => b.textContent.includes('Ahora no')).click());
  await espera(200);
  chequear('"Ahora no" cierra sin repetir', !(await page.$('.colorear-dialogo--repetir')) && !(await page.$('.colorear-vista--repitiendo')));
  await page.click('.colorear-accion[aria-label="Ver cómo lo pinté"]');
  await page.waitForSelector('.colorear-dialogo--repetir', { timeout: 4000 });
  await page.$$eval('.colorear-dialogo--repetir button', (bs) => bs.find((b) => b.textContent.includes('Sí, ver')).click());
  await espera(300);
  chequear('la repetición empieza', await page.$('.colorear-vista--repitiendo'));
  // Mismo azar y mismos puntos: al terminar, el dibujo repetido es identico.
  // El canvas de la repeticion se lee UNA vez, al final: leerlo mientras se
  // dibuja hace que Chrome lo pase de la GPU a software a mitad de camino y
  // cambia el suavizado de las chispas chicas (la prueba se media sola).
  const t0 = Date.now();
  while (Date.now() - t0 < 14000 && await page.$('.colorear-vista--repitiendo')) await espera(250);
  chequear('la repetición termina sola', !(await page.$('.colorear-vista--repitiendo')));
  const repetido = await page.evaluate(() => {
    const c = document.querySelector('.colorear-canvas-repeticion');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  // Tolerancia de 0,1 %: el canvas de pintar se lee seguido (deshacer) y
  // Chrome lo dibuja por software; el de la repeticion va por la GPU, que
  // suaviza los bordes apenas distinto (unos pocos px en cientos de miles).
  chequear('la repetición queda igual al dibujo', final > 0 && Math.abs(repetido - final) / final < 0.001, `${repetido} vs ${final} px`);

  // ---------- Imprimir o guardar con marcos ----------
  const descargas = join(tmpdir(), 'musica-kids-pruebas', 'descargas');
  rmSync(descargas, { recursive: true, force: true });
  mkdirSync(descargas, { recursive: true });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: descargas });
  await page.click('.colorear-accion[aria-label="Imprimir o guardar"]');
  await page.waitForSelector('.colorear-dialogo--imprimir');
  await espera(1200);
  chequear('imprimir/guardar ofrece 6 marcos con vista previa', (await page.$$('.colorear-marco')).length === 6 && (await page.$$('.colorear-marco-vista img')).length === 6);
  await page.click('.colorear-marco:nth-child(3)');
  await page.$$eval('.colorear-dialogo--imprimir button', (bs) => bs.find((b) => b.textContent.includes('Guardar imagen')).click());
  let archivo = null;
  for (let i = 0; i < 30 && !archivo; i++) {
    await espera(200);
    archivo = readdirSync(descargas).find((f) => f.endsWith('.png'));
  }
  chequear('"Guardar imagen" descarga el dibujo', archivo && existsSync(join(descargas, archivo)), archivo ?? 'sin archivo');
  await espera(1200);
  await page.close();

  // ---------- Hoja en blanco ----------
  const p = await paginaNueva(browser, chequear, { width: 1180, height: 820 }, 'hoja en blanco');
  await abrirActividades(p, carpeta, { modoDev: true });
  await p.$eval('button[aria-label="Colorear"]', (el) => el.click());
  await espera(400);
  await p.$eval('button[aria-label="Hoja en blanco"]', (el) => el.click());
  await p.waitForSelector('.colorear-hoja:not([style*="hidden"])', { timeout: 5000 });
  const tam = await p.$eval('.colorear-canvas', (c) => [c.width, c.height]);
  chequear('la hoja en blanco abre el lienzo', tam[0] > 0 && tam[1] > tam[0], tam.join('x'));
  await p.close();
}
