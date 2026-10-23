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
  // Texto se usa una vez: tras escribir pasa al Puntero (pedido explicito).
  chequear('tras escribir, Texto se desmarca y queda el Puntero', !(await p.$('.colorear-selector--en-uso[aria-label="Texto"]')) && await p.$('.colorear-selector--en-uso[aria-label^="Puntero"]'));
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
  // Con un texto seleccionado, tocar la hoja solo lo suelta: ni escribe ni pinta.
  const antesSoltar = await pintado(p);
  await tocar(m.x + m.width * 0.85, m.y + m.height * 0.15);
  await espera(400);
  chequear('tocar la hoja suelta el texto sin escribir ni pintar', !(await p.$('.colorear-texto-campo')) && !(await p.$('.colorear-texto-acciones')) && (await pintado(p)) === antesSoltar);
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
  await espera(400);
  // Con Texto activo el toque abre la edicion; al cancelar, el texto queda
  // seleccionado con su botonera.
  await p.click('.colorear-dialogo--texto button[type="button"]:not(.colorear-texto-mic)');
  await espera(300);
  chequear('al cancelar la edición el texto queda seleccionado', await p.$('.colorear-texto-acciones'));
  await p.click('.colorear-texto-acciones button[aria-label="Borrar texto"]');
  await espera(300);
  chequear('borrar pide confirmación', await p.$('.colorear-dialogo'));
  await p.click('.colorear-dialogo-btn--peligro');
  await espera(300);
  chequear('borrar quita el texto', (await textos()).length === 0);

  // Texto largo escrito junto al borde: queda entero dentro de la hoja.
  await p.click('.colorear-selector[aria-label="Texto"]');
  await espera(200);
  await p.keyboard.press('Escape');
  await espera(200);
  await tocar(m.x + m.width * 0.95, m.y + m.height * 0.5);
  await espera(400);
  await p.type('.colorear-texto-campo', 'Este es un texto muy muy largo');
  await p.click('.colorear-dialogo--texto button[type="submit"]');
  await espera(400);
  const hoja = await (await p.$('.colorear-hoja')).boundingBox();
  const largo = await (await p.$('.colorear-texto text')).boundingBox();
  chequear('un texto largo queda entero dentro de la hoja', largo.x >= hoja.x - 1 && largo.x + largo.width <= hoja.x + hoja.width + 1, `${Math.round(largo.x)}-${Math.round(largo.x + largo.width)} en ${Math.round(hoja.x)}-${Math.round(hoja.x + hoja.width)}`);
  // Con Texto activo, tocar el recuadro del texto (aunque sea entre letras,
  // arriba a la izquierda) lo edita en vez de escribir uno nuevo.
  await tocar(m.x + m.width * 0.5, m.y + m.height * 0.9);
  await espera(300);
  await p.click('.colorear-selector[aria-label="Texto"]');
  await espera(200);
  await p.keyboard.press('Escape');
  await espera(200);
  await tocar(largo.x + 3, largo.y + 3);
  await espera(400);
  chequear('con Texto, tocar un texto lo edita (no escribe otro)', (await p.$eval('.colorear-texto-campo', (i) => i.value).catch(() => null)) === 'Este es un texto muy muy largo');
  await p.click('.colorear-dialogo--texto button[type="button"]:not(.colorear-texto-mic)');
  await espera(300);
  chequear('sigue habiendo un solo texto', (await textos()).length === 1);
  await p.close();

  // Dictado por voz: el reconocimiento del navegador se simula (en la prueba
  // no hay microfono ni servicio). Dice "hola" y despues "mamá".
  const v = await paginaNueva(browser, chequear, viewportDe(800, 1180), 'colorear dictado');
  await v.evaluateOnNewDocument(() => {
    window.__permiso = true;
    const Falso = class {
      start() {
        setTimeout(() => {
          if (!window.__permiso) {
            this.onerror?.({ error: 'not-allowed' });
            this.onend?.();
            return;
          }
          const r = (t, final) => Object.assign([{ transcript: t }], { isFinal: final });
          this.onresult?.({ results: [r('hola', false)] });
          setTimeout(() => {
            this.onresult?.({ results: [r('hola mamá', true)] });
            this.onend?.();
          }, 150);
        }, 100);
      }
      stop() { this.onend?.(); }
      abort() {}
    };
    // Chrome trae el suyo (con y sin prefijo): se reemplazan los dos.
    for (const nombre of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, nombre, { value: Falso, configurable: true, writable: true });
    }
  });
  await abrirLaminaColorear(v, carpeta, { limpiarColorear: true });
  const mv = await (await v.$('.colorear-hoja')).boundingBox();
  await v.click('.colorear-selector[aria-label="Texto"]');
  await espera(200);
  await v.keyboard.press('Escape');
  await espera(200);
  await v.mouse.click(mv.x + mv.width * 0.5, mv.y + mv.height * 0.4);
  await espera(400);
  chequear('el diálogo trae el micrófono a la derecha del campo', await v.$('.colorear-texto-fila .colorear-texto-mic'));
  await v.type('.colorear-texto-campo', 'Te quiero');
  await v.click('.colorear-texto-mic');
  await espera(150);
  chequear('el micrófono se marca mientras escucha', await v.$('.colorear-texto-mic--escuchando'));
  await espera(500);
  chequear('lo dictado se suma a lo escrito', (await v.$eval('.colorear-texto-campo', (i) => i.value)) === 'Te quiero hola mamá', await v.$eval('.colorear-texto-campo', (i) => i.value));
  chequear('al terminar deja de escuchar', !(await v.$('.colorear-texto-mic--escuchando')));
  await v.evaluate(() => { window.__permiso = false; });
  await v.click('.colorear-texto-mic');
  await espera(400);
  chequear('sin permiso avisa cómo dictar', (await v.$eval('.colorear-texto-aviso', (e) => e.textContent).catch(() => '')).includes('micrófono'));
  await v.close();
}
