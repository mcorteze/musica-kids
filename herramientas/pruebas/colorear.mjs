// Pruebas de Colorear: barra y paneles, pintar, deshacer/rehacer, borrar con
// dialogo, zoom (pellizco, doble toque, rueda), mano, colores propios y que
// todo quepa en cada pantalla.
import {
  PANTALLAS,
  abrirLaminaColorear,
  escalaVista,
  espera,
  fueraDePantalla,
  paginaNueva,
  pintado,
  viewportDe,
} from './comun.mjs';

export async function probarColorear(browser, carpeta, chequear) {
  // ---------- Laptop: pintar, deshacer, borrar, colores ----------
  const page = await paginaNueva(browser, chequear, { width: 1366, height: 768 }, 'colorear laptop');
  await abrirLaminaColorear(page, carpeta, { limpiarColorear: true });
  const hoja = await (await page.$('.colorear-canvas')).boundingBox();
  const linea = async (y) => {
    await page.mouse.move(hoja.x + hoja.width * 0.15, hoja.y + hoja.height * y);
    await page.mouse.down();
    for (let k = 1; k <= 15; k++) await page.mouse.move(hoja.x + hoja.width * (0.15 + 0.7 * k / 15), hoja.y + hoja.height * y);
    await page.mouse.up();
  };

  await page.click('.colorear-selector[aria-label^="Lápiz"]');
  await espera(200);
  chequear('el lápiz despliega su panel', await page.$('.colorear-desplegable--lapices'));
  await page.click('.colorear-util:nth-child(3)');
  await espera(200);
  // Color y tamaño viven en el mismo menu: elegir un lapiz no lo cierra.
  chequear('el menú del lápiz trae tipos, colores y tamaño', await page.$('.colorear-desplegable--lapices .colorear-colores') && await page.$('.colorear-desplegable--lapices input[type="range"]'));
  chequear('el tamaño es solo la barra (sin vista previa ni atajos)', !(await page.$('.colorear-tamano-vista, .colorear-tamano-rapido')));
  chequear('la barra ya no tiene botones de color ni tamaño', !(await page.$('.colorear-barra > .colorear-barra-grupo .colorear-selector[aria-label="Color"], .colorear-selector[aria-label="Tamaño"]')));
  await page.keyboard.press('Escape');
  await espera(150);

  await linea(0.3);
  const uno = await pintado(page);
  await linea(0.6);
  const dos = await pintado(page);
  chequear('pinta con el mouse', uno > 0 && dos > uno, `${uno} -> ${dos} px`);
  await page.click('[aria-label="Deshacer"]');
  chequear('deshacer quita el último trazo', (await pintado(page)) === uno);
  await page.click('[aria-label="Deshacer"]');
  chequear('deshacer otra vez deja la hoja en blanco', (await pintado(page)) === 0);
  await page.click('[aria-label="Rehacer"]');
  await page.click('[aria-label="Rehacer"]');
  chequear('rehacer recupera ambos trazos exactos', (await pintado(page)) === dos);
  await page.click('[aria-label="Deshacer"]');
  await linea(0.8);
  chequear('un trazo nuevo vacía rehacer', await page.$eval('[aria-label="Rehacer"]', (b) => b.disabled));

  const antesBorrar = await pintado(page);
  await page.click('[aria-label="Más opciones"]');
  await page.click('.colorear-mas-opcion[aria-label="Borrar todo"]');
  await espera(400);
  chequear('borrar todo pide confirmación', await page.$('.colorear-dialogo'));
  await page.click('.colorear-dialogo-btn:not(.colorear-dialogo-btn--peligro)');
  await espera(200);
  chequear('"No, volver" conserva el dibujo', (await pintado(page)) === antesBorrar);
  await page.click('[aria-label="Más opciones"]');
  await page.click('.colorear-mas-opcion[aria-label="Borrar todo"]');
  await espera(300);
  await page.click('.colorear-dialogo-btn--peligro');
  await espera(300);
  chequear('"Sí, borrar" deja la hoja en blanco', (await pintado(page)) === 0);
  await page.click('[aria-label="Deshacer"]');
  chequear('deshacer recupera lo borrado', (await pintado(page)) === antesBorrar);

  // Colores propios: dos elegidos en la paleta completa quedan en la paleta.
  // La paleta completa vuelve al menu desde el que se abrio.
  await page.click('.colorear-selector[aria-label^="Lápiz"]');
  await espera(200);
  for (const celda of [12 + 5, 24 + 9]) {
    await page.click('.colorear-rueda');
    await espera(200);
    const celdas = await page.$$('.colorear-espectro-celda');
    await celdas[celda].click();
    await espera(200);
  }
  chequear('la paleta completa vuelve al menú del lápiz', await page.$('.colorear-desplegable--lapices'));
  chequear('los colores elegidos quedan en la paleta', (await page.$$('[aria-label="Mi color"]')).length === 2);
  chequear('no hay botón +', await page.$$eval('.colorear-colores button', (bs) => bs.every((b) => b.textContent.trim() !== '+')));
  await page.keyboard.press('Escape');
  await espera(200);
  chequear('Escape cierra el panel sin cerrar Actividades', !(await page.$('.colorear-desplegable')) && await page.$('.colorear-barra'));

  // Rueda del mouse.
  await page.mouse.move(hoja.x + hoja.width / 2, hoja.y + hoja.height / 2);
  let pasos = 0;
  while (pasos < 20 && (await escalaVista(page)) < 2) {
    await page.mouse.wheel({ deltaY: -100 });
    pasos += 1;
    await espera(40);
  }
  chequear('la rueda acerca (2x en pocos pasos)', pasos <= 5, `${pasos} pasos`);
  await espera(300);
  chequear('aparece el botón de porcentaje', await page.$('.colorear-zoom'));
  await page.click('.colorear-zoom');
  await espera(200);
  chequear('el botón de porcentaje vuelve a la hoja entera', (await escalaVista(page)) === 1);
  await espera(1200);
  await page.close();

  // ---------- Tablet: gestos con toques reales ----------
  const t = await paginaNueva(browser, chequear, viewportDe(820, 1180), 'colorear tablet');
  await abrirLaminaColorear(t, carpeta, { limpiarColorear: true });
  const cdp = await t.createCDPSession();
  const m = await (await t.$('.colorear-hoja')).boundingBox();
  const c = [m.x + m.width / 2, m.y + m.height / 2];
  const toque = (type, puntos) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos.map(([x, y], id) => ({ x, y, id })) });
  await toque('touchStart', [[c[0] - 40, c[1]]]);
  await toque('touchMove', [[c[0] - 30, c[1] + 5]]);
  await toque('touchMove', [[c[0] - 20, c[1] + 10]]);
  const alcanzo = await pintado(t);
  await toque('touchStart', [[c[0] - 20, c[1] + 10], [c[0] + 40, c[1]]]);
  for (let k = 1; k <= 12; k++) {
    await toque('touchMove', [[c[0] - 20 - k * 12, c[1] + 10], [c[0] + 40 + k * 12, c[1]]]);
    await espera(16);
  }
  await toque('touchEnd', []);
  await espera(300);
  chequear('el pellizco acerca con cualquier herramienta', (await escalaVista(t)) > 2, `x${(await escalaVista(t)).toFixed(2)}`);
  chequear('el pellizco cancela lo que pintó el primer dedo', alcanzo > 0 && (await pintado(t)) === 0, `${alcanzo} -> ${await pintado(t)} px`);
  await toque('touchStart', [[c[0] - 100, c[1] + 80]]);
  for (let k = 1; k <= 10; k++) {
    await toque('touchMove', [[c[0] - 100 + k * 18, c[1] + 80]]);
    await espera(16);
  }
  await toque('touchEnd', []);
  await espera(200);
  chequear('un dedo pinta con zoom', (await pintado(t)) > 0);
  await t.$eval('.colorear-zoom', (b) => b.click());
  await espera(200);
  await t.$eval('.colorear-selector--mano', (b) => b.click());
  await espera(200);
  const conMano = await pintado(t);
  const tap = async () => {
    await toque('touchStart', [[c[0], c[1]]]);
    await toque('touchEnd', []);
  };
  await tap();
  await espera(120);
  await tap();
  await espera(300);
  chequear('doble toque con la mano acerca', Math.abs((await escalaVista(t)) - 2.5) < 0.01);
  await toque('touchStart', [[c[0], c[1]]]);
  for (let k = 1; k <= 8; k++) {
    await toque('touchMove', [[c[0] - k * 15, c[1] - k * 12]]);
    await espera(16);
  }
  await toque('touchEnd', []);
  await espera(200);
  chequear('con la mano un dedo mueve sin pintar', (await pintado(t)) === conMano);
  await tap();
  await espera(120);
  await tap();
  await espera(300);
  chequear('otro doble toque vuelve a la hoja entera', (await escalaVista(t)) === 1);
  await espera(1200);
  await t.close();

  // ---------- Cada pantalla: barra y paneles caben ----------
  for (const [nombre, w, h] of PANTALLAS) {
    const p = await paginaNueva(browser, chequear, viewportDe(w, h), `colorear ${nombre}`);
    await abrirLaminaColorear(p, carpeta);
    const problemas = [];
    for (const sel of ['.colorear-selector[aria-label^="Lápiz"]', '.colorear-selector[aria-label^="Sello"]', '.colorear-selector[aria-label^="Varita"]', '.colorear-selector[aria-label="Goma"]']) {
      await p.click(sel);
      await espera(250);
      problemas.push(...await fueraDePantalla(p, '.colorear-barra, .colorear-hoja, .colorear-desplegable'));
      await p.keyboard.press('Escape');
      await espera(200);
    }
    chequear(`todo cabe en ${nombre}`, problemas.length === 0, problemas.join(', '));
    await p.close();
  }
}
