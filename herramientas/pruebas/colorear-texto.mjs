// Herramienta Texto de Colorear (pedido 2026-10-23): escribir con un toque,
// seleccionar, arrastrar, dos toques para editar, color al seleccionado,
// deshacer, pintar a traves del texto, guardado, imprimir, repeticion y
// borrar con confirmacion. Con toques de tablet (CDP).
import { abrirLaminaColorear, espera, paginaNueva, pintado, viewportDe } from './comun.mjs';

export async function probarColorearTexto(browser, carpeta, chequear) {
  const p = await paginaNueva(browser, chequear, viewportDe(800, 1180), 'colorear texto');
  await abrirLaminaColorear(p, carpeta, { limpiarColorear: true });
  const cdp = await p.createCDPSession();
  const tocar = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const arrastrar = async (x0, y0, x1, y1) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0, id: 0 }] });
    for (let k = 1; k <= 10; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k / 10, y: y0 + (y1 - y0) * k / 10, id: 0 }] });
      await espera(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const textos = () => p.$$eval('.colorear-texto', (gs) => gs.map((g) => `${g.getAttribute('transform')} "${g.textContent}" ${g.querySelector('text').getAttribute('fill')}`));
  const m = await (await p.$('.colorear-hoja')).boundingBox();
  await p.click('.colorear-selector[aria-label="Texto"]');
  await espera(300);
  chequear('menú de texto con 4 letras', (await p.$$('.colorear-fuente')).length === 4);
  await p.$$eval('.colorear-fuente', (b) => b[2].click());
  await p.keyboard.press('Escape');
  await espera(200);
  await tocar(m.x + m.width * 0.5, m.y + m.height * 0.3);
  await espera(400);
  chequear('tocar la hoja abre el diálogo', await p.$('.colorear-texto-campo'));
  await p.type('.colorear-texto-campo', 'Hola Bruno');
  await p.click('.colorear-dialogo--texto button[type="submit"]');
  await espera(400);
  chequear('aparece el texto', (await textos()).length === 1, JSON.stringify(await textos()));
  chequear('queda seleccionado con botonera', await p.$('.colorear-texto-acciones') && await p.$('.colorear-texto-seleccion'));
  const antesMover = (await textos())[0];
  const caja = await (await p.$('.colorear-texto')).boundingBox();
  await arrastrar(caja.x + caja.width / 2, caja.y + caja.height / 2, caja.x + caja.width / 2 - 100, caja.y + caja.height / 2 + 300);
  await espera(300);
  chequear('arrastrar lo mueve', (await textos())[0].split('"')[0] !== antesMover.split('"')[0], (await textos())[0]);
  const c2 = await (await p.$('.colorear-texto')).boundingBox();
  await tocar(c2.x + c2.width / 2, c2.y + c2.height / 2);
  await espera(120);
  await tocar(c2.x + c2.width / 2, c2.y + c2.height / 2);
  await espera(400);
  chequear('dos toques abren la edición', await p.$eval('.colorear-texto-campo', (i) => i.value).catch(() => null) === 'Hola Bruno');
  await p.$eval('.colorear-texto-campo', (i) => i.select());
  await p.type('.colorear-texto-campo', 'Te quiero');
  await p.click('.colorear-dialogo--texto button[type="submit"]');
  await espera(300);
  chequear('editar cambia el texto', (await textos())[0].includes('Te quiero'));
  await p.click('.colorear-selector[aria-label="Texto"]');
  await espera(300);
  await p.$$eval('.colorear-desplegable--texto .colorear-color', (b) => b[6].click());
  await espera(200);
  await p.keyboard.press('Escape');
  await espera(200);
  chequear('el color se aplica al texto seleccionado', (await textos())[0].includes('rgb(30, 136, 229)'), (await textos())[0]);
  await p.click('[aria-label="Deshacer"]');
  await espera(200);
  chequear('deshacer vuelve el color anterior', (await textos())[0].includes('rgb(229, 57, 53)'), (await textos())[0]);
  await p.click('[aria-label="Rehacer"]');
  await espera(200);
  // pintar encima con el lapiz
  await p.click('.colorear-selector[aria-label^="Lápiz"]');
  await espera(200);
  await p.keyboard.press('Escape');
  await espera(200);
  const c3 = await (await p.$('.colorear-texto')).boundingBox();
  const antes = await pintado(p);
  await arrastrar(c3.x - 20, c3.y + c3.height / 2, c3.x + c3.width + 20, c3.y + c3.height / 2);
  await espera(300);
  chequear('con el lápiz se pinta a través del texto', (await pintado(p)) > antes);
  chequear('fuera de Texto no hay selección', !(await p.$('.colorear-texto-acciones')));
  await espera(1500);
  await p.reload();
  await espera(1500);
  await p.click('.memory-trigger-btn');
  await espera(500);
  await p.$eval('button[aria-label="Colorear"]', (el) => el.click());
  await espera(500);
  await p.$eval('button[aria-label="Mis dibujos"]', (el) => el.click());
  await espera(500);
  await p.click('button[aria-label="Seguir pintando"]');
  await espera(1500);
  chequear('el texto se guarda y vuelve', (await textos()).length === 1, JSON.stringify(await textos()));
  // El texto sale en la imagen para imprimir (vista previa sin marco).
  await p.click('[aria-label="Más opciones"]');
  await p.click('.colorear-mas-opcion[aria-label="Imprimir o guardar"]');
  await p.waitForFunction(() => document.querySelectorAll('.colorear-marco-vista img').length > 0 && document.querySelector('.colorear-marco-vista img').complete, { timeout: 8000 }).catch(() => {});
  await espera(300);
  const azules = await p.$eval('.colorear-marco-vista img', (img) => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 90 && d[i + 1] > 100 && d[i + 1] < 170 && d[i + 2] > 200) n++;
    return n;
  });
  chequear('el texto sale en la imagen para imprimir', azules > 30, `${azules} px azules`);
  await p.keyboard.press('Escape');
  await espera(300);
  await p.click('[aria-label="Más opciones"]');
  await p.click('.colorear-mas-opcion[aria-label="Ver cómo lo pinté"]');
  await p.waitForSelector('.colorear-dialogo--repetir');
  await p.$$eval('.colorear-dialogo--repetir button', (bs) => bs.find((b) => b.textContent.includes('Sí, ver')).click());
  await espera(300);
  const t0 = Date.now();
  while (Date.now() - t0 < 14000 && await p.$('.colorear-vista--repitiendo')) await espera(250);
  chequear('la repetición termina con el texto en su lugar', (await textos()).length === 1);
  // borrar
  await p.click('.colorear-selector[aria-label="Texto"]');
  await espera(200);
  await p.keyboard.press('Escape');
  await espera(200);
  const c4 = await (await p.$('.colorear-texto')).boundingBox();
  await tocar(c4.x + c4.width / 2, c4.y + c4.height / 2);
  await espera(300);
  await p.click('.colorear-texto-acciones button[aria-label="Borrar texto"]');
  await espera(300);
  chequear('borrar pide confirmación', await p.$('.colorear-dialogo'));
  await p.click('.colorear-dialogo-btn--peligro');
  await espera(300);
  chequear('borrar quita el texto', (await textos()).length === 0);
  await p.close();
}
