// Ajustes de Colorear (2026-10-22): un toque del sello deja UNA figura aunque
// el dedo quieto mande "movimientos"; zoom hasta 6x; boton de descarga en la
// barra; los dibujos vencen a los 7 dias SIN USO (abrirlos renueva).
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirActividades, abrirLaminaColorear, escalaVista, espera, paginaNueva, tocarZoom, viewportDe } from './comun.mjs';

const DIA = 24 * 3600 * 1000;

// Pixeles pintados en una franja vertical de la hoja (de x0 a x1, en fraccion).
const pintadoEn = (page, x0, x1) => page.evaluate((a, b) => {
  const c = document.querySelector('.colorear-canvas');
  const d = c.getContext('2d').getImageData(Math.round(c.width * a), 0, Math.round(c.width * (b - a)), c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
}, x0, x1);

export async function probarColorearAjustes(browser, carpeta, chequear) {
  // ---------- Sello con el dedo quieto ----------
  const t = await paginaNueva(browser, chequear, viewportDe(820, 1180), 'sello tactil');
  await abrirLaminaColorear(t, carpeta, { limpiarColorear: true });
  await t.$eval('.colorear-selector[aria-label^="Sello"]', (b) => b.click());
  await espera(200);
  await t.$$eval('.colorear-pestana', (els) => els.find((e) => e.textContent === 'Animales').click());
  await espera(150);
  await t.$$eval('.colorear-desplegable--sellos .colorear-util', (els) => els.find((e) => e.textContent === 'Patita de gato').click());
  await t.keyboard.press('Escape');
  await espera(200);
  const cdp = await t.createCDPSession();
  const m = await (await t.$('.colorear-hoja')).boundingBox();
  const toque = (type, puntos) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: puntos.map(([x, y], id) => ({ x, y, id, force: 0.5 })) });
  // Izquierda: 6 toques limpios. Derecha: 6 toques iguales, cada uno con 8
  // "movimientos" sin moverse. Cada huellita varia un poco de tamaño y giro
  // (es parte del diseño), por eso se compara el promedio de 6: con una
  // sola figura por toque el area da parecida; con varias encima (el error)
  // daba ~1,4 veces.
  const lugares = [[0.12, 0.3], [0.27, 0.3], [0.42, 0.3], [0.12, 0.6], [0.27, 0.6], [0.42, 0.6]];
  for (const [fx, fy] of lugares) {
    await toque('touchStart', [[m.x + m.width * fx, m.y + m.height * fy]]);
    await toque('touchEnd', []);
    await espera(120);
  }
  for (const [fx, fy] of lugares) {
    const p = [m.x + m.width * (fx + 0.45), m.y + m.height * fy];
    await toque('touchStart', [p]);
    for (let i = 0; i < 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0], y: p[1], id: 0, force: 0.3 + i * 0.05 }] });
      await espera(15);
    }
    await toque('touchEnd', []);
    await espera(120);
  }
  await espera(300);
  const limpio = await pintadoEn(t, 0, 0.5);
  const quieto = await pintadoEn(t, 0.5, 1);
  chequear('un toque del sello deja una sola figura aunque el dedo quede quieto', limpio > 0 && quieto / limpio < 1.15, `${limpio} vs ${quieto} px`);
  await espera(1000);
  await t.close();

  // ---------- Pintura plana: pasar dos veces no oscurece ----------
  const pl = await paginaNueva(browser, chequear, { width: 1366, height: 768 }, 'pintura plana');
  await abrirLaminaColorear(pl, carpeta, { limpiarColorear: true });
  const hp = await (await pl.$('.colorear-canvas')).boundingBox();
  const sumaAlfa = () => pl.evaluate(() => {
    const c = document.querySelector('.colorear-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) n += d[i];
    return n;
  });
  const pasada = async (y) => {
    await pl.mouse.move(hp.x + hp.width * 0.15, hp.y + hp.height * y);
    await pl.mouse.down();
    for (let k = 1; k <= 14; k++) await pl.mouse.move(hp.x + hp.width * (0.15 + 0.05 * k), hp.y + hp.height * y);
    await pl.mouse.up();
    await espera(150);
  };
  const malos = [];
  let fila = 0;
  for (const nombre of ['Crayón', 'Lápiz de color', 'Tiza', 'Pincel', 'Acuarela', 'Destacador']) {
    await pl.click('.colorear-selector[aria-label^="Lápiz"]');
    await espera(200);
    await pl.$$eval('.colorear-desplegable--lapices .colorear-util', (els, n) => els.find((e) => e.textContent === n).click(), nombre);
    await pl.keyboard.press('Escape');
    await espera(150);
    const y = 0.12 + fila * 0.13;
    fila += 1;
    const antes = await sumaAlfa();
    await pasada(y);
    const uno = (await sumaAlfa()) - antes;
    await pasada(y);
    const dos = (await sumaAlfa()) - antes;
    if (!(uno > 0 && dos / uno < 1.06)) malos.push(`${nombre} ${(dos / uno).toFixed(2)}`);
  }
  chequear('pasar dos veces por el mismo lugar no oscurece (pintura plana)', malos.length === 0, malos.join(', ') || 'crayón, lápiz, tiza, pincel, acuarela, destacador');
  await pl.close();

  // ---------- Zoom 6x, descarga en la barra y vencimiento ----------
  const page = await paginaNueva(browser, chequear, { width: 1366, height: 768 }, 'colorear ajustes');
  await abrirLaminaColorear(page, carpeta, { limpiarColorear: true });
  const hoja = await (await page.$('.colorear-hoja')).boundingBox();
  await page.mouse.move(hoja.x + hoja.width / 2, hoja.y + hoja.height / 2);
  for (let i = 0; i < 40; i++) await page.mouse.wheel({ deltaY: -150 });
  await espera(300);
  chequear('el zoom llega a 6x', Math.abs((await escalaVista(page)) - 6) < 0.01, `x${await escalaVista(page)}`);
  await tocarZoom(page, '.colorear-flecha--centro');
  const lienzo = await (await page.$('.colorear-canvas')).boundingBox();
  await page.mouse.move(lienzo.x + 100, lienzo.y + 100);
  await page.mouse.down();
  await page.mouse.move(lienzo.x + 300, lienzo.y + 200, { steps: 10 });
  await page.mouse.up();
  await espera(1200);

  const descargas = join(tmpdir(), 'musica-kids-pruebas', 'descargas-barra');
  rmSync(descargas, { recursive: true, force: true });
  mkdirSync(descargas, { recursive: true });
  const cdp2 = await page.createCDPSession();
  await cdp2.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: descargas });
  await page.click('[aria-label="Más opciones"]');
  await page.click('.colorear-mas-opcion[aria-label="Guardar imagen"]');
  let archivo = null;
  for (let i = 0; i < 30 && !archivo; i++) {
    await espera(200);
    archivo = readdirSync(descargas).find((f) => f.endsWith('.png'));
  }
  chequear('el botón de descarga de la barra guarda el dibujo', archivo && existsSync(join(descargas, archivo)), archivo ?? 'sin archivo');
  chequear('el archivo lleva grupo, número y fecha y hora', /^paw-patrol-\d+_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/.test(archivo ?? ''), archivo ?? '');

  // Vencimiento: se corre "usado" hacia atras en IndexedDB.
  const correrUso = (dias) => page.evaluate((ms) => new Promise((res) => {
    const p = indexedDB.open('musica-kids-colorear');
    p.onsuccess = () => {
      const tx = p.result.transaction('dibujos', 'readwrite');
      const st = tx.objectStore('dibujos');
      const g = st.getAll();
      g.onsuccess = () => {
        g.result.forEach((r) => st.put({ ...r, usado: Date.now() - ms, actualizado: Date.now() - ms }));
        tx.oncomplete = () => res(g.result.length);
      };
    };
  }), dias * DIA);
  const cantidad = () => page.evaluate(() => new Promise((res) => {
    const p = indexedDB.open('musica-kids-colorear');
    p.onsuccess = () => {
      const g = p.result.transaction('dibujos').objectStore('dibujos').getAll();
      g.onsuccess = () => res(g.result);
    };
  }));
  // El guardado llega 2 s despues de dejar de pintar (ESPERA_GUARDADO_MS).
  await espera(2500);
  await correrUso(6);
  await page.reload();
  await espera(1200);
  chequear('un dibujo con 6 días sin uso sigue guardado', (await cantidad()).length === 1);
  // Abrirlo (Mis dibujos -> seguir pintando) renueva el plazo.
  await page.click('.memory-trigger-btn');
  await espera(500);
  await page.$eval('button[aria-label="Colorear"]', (el) => el.click());
  await espera(500);
  await page.$eval('button[aria-label="Mis dibujos"]', (el) => el.click());
  await espera(500);
  await page.click('button[aria-label="Seguir pintando"]');
  await page.waitForSelector('.colorear-hoja:not([style*="hidden"])');
  await espera(800);
  const tras = await cantidad();
  chequear('abrir el dibujo renueva sus 7 días', tras.length === 1 && Date.now() - tras[0].usado < 60000);
  await correrUso(8);
  await page.reload();
  await espera(1500);
  chequear('un dibujo con 8 días sin uso se borra', (await cantidad()).length === 0);
  await page.close();

  // Mis dibujos sin dibujos tras vencer: la tarjeta no aparece.
  const p = await paginaNueva(browser, chequear, { width: 1180, height: 820 }, 'mis dibujos vencidos');
  await abrirActividades(p, carpeta, { modoDev: true });
  await p.$eval('button[aria-label="Colorear"]', (el) => el.click());
  await espera(500);
  chequear('sin dibujos vigentes no aparece "Mis dibujos"', !(await p.$('button[aria-label="Mis dibujos"]')));
  await p.close();

  // Publicado (2026-10-23): se ve y se abre sin el modo desarrollador.
  const pub = await paginaNueva(browser, chequear, { width: 390, height: 844 }, 'colorear publicado');
  await abrirActividades(pub, carpeta, { modoDev: false });
  const tarjeta = await pub.$('.memory-picker-tile[aria-label="Colorear"]');
  const visible = tarjeta && await tarjeta.evaluate((el) => el.getBoundingClientRect().width > 0);
  chequear('Colorear se ve sin el modo desarrollador', visible);
  if (visible) {
    await tarjeta.click();
    await espera(500);
    chequear('Colorear se abre sin el modo desarrollador', await pub.$('button[aria-label="Colorear Paw Patrol"]'));
  }
  await pub.close();
}
