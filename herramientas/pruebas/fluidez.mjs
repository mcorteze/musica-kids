// Pruebas de lo hecho para tablets modestas (2026-10-22): modo liviano
// (utils/rendimiento.js) y piezas recortadas del Rompecabezas. La medicion
// de cuadros por segundo va aparte (rendimiento.mjs): depende de la maquina.
import { abrirActividades, espera, paginaNueva } from './comun.mjs';

async function conModo(browser, chequear, liviano, etiqueta) {
  const page = await paginaNueva(browser, chequear, { width: 1180, height: 820 }, etiqueta);
  await page.evaluateOnNewDocument((v) => localStorage.setItem('musica-kids-modo-liviano-forzado', v ? '1' : '0'), liviano);
  return page;
}

export async function probarFluidez(browser, carpeta, chequear) {
  for (const liviano of [true, false]) {
    const nombre = liviano ? 'modo liviano' : 'modo normal';
    const page = await conModo(browser, chequear, liviano, nombre);
    await abrirActividades(page, carpeta, { modoDev: true, limpiarColorear: true });
    chequear(`${nombre}: la clase del modo está ${liviano ? 'puesta' : 'quitada'}`, (await page.evaluate(() => document.documentElement.classList.contains('modo-liviano'))) === liviano);

    // Simon: el fondo animado (copos de Frozen) queda quieto en liviano.
    // (El desenfoque de las pildoras no se puede mirar: el build deja solo
    // -webkit-backdrop-filter y Chrome ya no lo aplicaba; ver flujo activo.)
    await page.$eval('button[aria-label="Simón dice"]', (el) => el.click());
    await espera(500);
    await page.$$eval('.simon-grupo-tile', (els) => els.find((e) => e.textContent.includes('Frozen')).click());
    await espera(800);
    const animacion = await page.$eval('.simon-copo', (el) => getComputedStyle(el).animationName);
    chequear(`${nombre}: fondo de Simón ${liviano ? 'quieto' : 'animado'}`, liviano ? animacion === 'none' : animacion !== 'none', animacion);
    await page.click('.memory-volver-btn');
    await espera(300);
    await page.click('.memory-volver-btn');
    await espera(300);

    // Colorear: los brillos que titilan no se muestran en liviano.
    await page.$eval('button[aria-label="Colorear"]', (el) => el.click());
    await espera(400);
    await page.$eval('button[aria-label="Hoja en blanco"]', (el) => el.click());
    await page.waitForSelector('.colorear-hoja:not([style*="hidden"])');
    await espera(500);
    await page.click('.colorear-selector[aria-label^="Varita"]');
    await espera(200);
    await page.$$eval('.colorear-desplegable--varita .colorear-util', (els) => els.find((e) => e.textContent === 'Oro').click());
    await espera(150);
    const h = await (await page.$('.colorear-canvas')).boundingBox();
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(h.x + h.width * 0.1, h.y + h.height * (0.3 + i * 0.1));
      await page.mouse.down();
      for (let k = 1; k <= 14; k++) await page.mouse.move(h.x + h.width * (0.1 + 0.06 * k), h.y + h.height * (0.3 + i * 0.1));
      await page.mouse.up();
    }
    await espera(400);
    const visibles = await page.$$eval('.colorear-titila', (els) => els.filter((e) => e.getBoundingClientRect().width > 0).length);
    chequear(`${nombre}: brillos que titilan ${liviano ? 'ocultos' : 'visibles'}`, liviano ? visibles === 0 : visibles > 0, `${visibles}`);
    await espera(1000);
    await page.close();
  }

  // Rompecabezas: cada pieza usa su propio recorte (imagen chica).
  const r = await paginaNueva(browser, chequear, { width: 1180, height: 820 }, 'rompecabezas');
  await abrirActividades(r, carpeta);
  await r.$eval('button[aria-label="Rompecabezas"]', (el) => el.click());
  await espera(500);
  await r.$eval('.memory-picker-tile:not(.memory-solo-dev)', (el) => el.click());
  await r.waitForSelector('.romp-tray-pieza');
  let fondos = [];
  for (let i = 0; i < 20; i++) {
    await espera(200);
    fondos = await r.$$eval('.romp-tray-pieza', (els) => els.map((e) => e.style.backgroundImage));
    if (fondos.length && fondos.every((f) => f.includes('blob:'))) break;
  }
  chequear('Rompecabezas: cada pieza usa su propio recorte', fondos.length > 0 && fondos.every((f) => f.includes('blob:')) && new Set(fondos).size === fondos.length, `${fondos.length} piezas`);
  await r.close();
}
