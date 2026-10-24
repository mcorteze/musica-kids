// Hora de dormir (2026-10-23): la tarjeta del panel solo con el modo
// desarrollador; vistas previas; pregunta de adulto; horario real (aviso a
// 5 min, pantalla de dormir, prorroga que sobrevive a recargar) y que nada
// se salga de la pantalla. Con CAPTURAS=<carpeta> guarda capturas.
import { join } from 'node:path';
import { PANTALLAS, abrirActividades, espera, fueraDePantalla, paginaNueva, urlDe, viewportDe } from './comun.mjs';

const CLAVE = 'musica-kids-hora-dormir';
const capturas = process.env.CAPTURAS;
const capturar = (page, nombre) => capturas && page.screenshot({ path: join(capturas, `${nombre}.png`) });

// "HH:MM" a minutos de ahora (hora local de la pagina).
const horaEn = (page, minutos) => page.evaluate((m) => {
  const d = new Date(Date.now() + m * 60000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}, minutos);

const visible = (page, sel) => page.$eval(sel, (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}).catch(() => false);

const clicTexto = (page, sel, texto) => page.$$eval(sel, (els, t) => els.find((e) => e.textContent.trim() === t).click(), texto);

// Responde la pregunta de adulto (bien o mal).
async function responder(page, bien) {
  const [a, b] = await page.$eval('.hd-puerta-pregunta', (el) => el.textContent.match(/\d+/g).map(Number));
  await page.type('#hd-respuesta', String(bien ? a * b : a * b + 1));
  await page.$eval('.hd-puerta form', (f) => f.requestSubmit());
  await espera(200);
}

export async function probarHoraDormir(browser, carpeta, chequear) {
  // ---------- Sin modo desarrollador no hay tarjeta ----------
  const p = await paginaNueva(browser, chequear, viewportDe(820, 1180), 'hora de dormir');
  await abrirActividades(p, carpeta);
  chequear('sin modo desarrollador no se ve la tarjeta Hora de dormir', !(await visible(p, 'button[aria-label="Hora de dormir"]')));

  // ---------- Panel y vistas previas ----------
  await abrirActividades(p, carpeta, { modoDev: true });
  await p.$eval('button[aria-label="Hora de dormir"]', (b) => b.click());
  await espera(300);
  chequear('el panel se abre desde la tarjeta', await visible(p, '.hd-panel'));
  chequear('viene apagado', (await p.$eval('.hd-panel-estado', (el) => el.textContent)).includes('Apagado'));
  await capturar(p, 'panel-tablet');

  await clicTexto(p, '.hd-panel .hd-btn', 'Aviso 10 min');
  await espera(600);
  chequear('vista previa: aparece el aviso', (await p.$eval('.hd-aviso-titulo', (el) => el.textContent).catch(() => '')) === 'Ve terminando tu juego');
  chequear('vista previa: aparece la luna con el tiempo', await visible(p, '.hd-reloj'));
  await capturar(p, 'aviso10-tablet');
  await p.$eval('.hd-aviso-ok', (b) => b.click());
  await espera(200);
  chequear('«¡Ya voy!» cierra el aviso y deja la luna', !(await visible(p, '.hd-aviso')) && await visible(p, '.hd-reloj'));
  await p.$eval('.hd-reloj', (b) => b.click());
  await espera(300);
  chequear('tocar la luna vuelve a mostrar el aviso', await visible(p, '.hd-aviso'));

  await clicTexto(p, '.hd-panel .hd-btn', 'Pantalla de dormir');
  await espera(1400);
  const tapa = await p.evaluate(() => Boolean(document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.hd-noche')));
  chequear('la pantalla de dormir tapa todo (también el drawer)', tapa);
  await capturar(p, 'noche-tablet');
  await p.$eval('.hd-adulto-btn', (b) => b.click());
  await espera(200);
  await responder(p, false);
  chequear('respuesta incorrecta: sigue la pregunta con aviso', await visible(p, '.hd-puerta-error'));
  await responder(p, true);
  await capturar(p, 'puerta-tablet');
  await clicTexto(p, '.hd-puerta .hd-btn', 'Terminar prueba');
  await espera(300);
  chequear('«Terminar prueba» cierra la pantalla de dormir', !(await visible(p, '.hd-noche')));

  await clicTexto(p, '.hd-panel .hd-btn', 'Ensayo de un minuto');
  await espera(1500);
  chequear('el ensayo parte con el aviso de 30 min', (await p.$eval('.hd-aviso-titulo', (el) => el.textContent).catch(() => '')).startsWith('En un ratito'));
  await p.$eval('.hd-prueba-cerrar', (b) => b.click());
  await espera(200);
  chequear('«Terminar prueba» corta el ensayo', !(await visible(p, '.hd-reloj')));
  await p.close();

  // ---------- Horario real, sin modo desarrollador ----------
  const r = await paginaNueva(browser, chequear, viewportDe(1180, 820), 'hora de dormir real');
  await r.goto(urlDe(carpeta));
  const guardar = async (cfg) => {
    await r.evaluate((c, clave) => {
      localStorage.setItem('musica-kids-modo-desarrollador', '0');
      localStorage.setItem(clave, JSON.stringify(c));
    }, cfg, CLAVE);
    await r.reload();
    await espera(1500);
  };
  await guardar({ activo: true, dormir: await horaEn(r, 5), despertar: await horaEn(r, -60) });
  chequear('a 5 min de la hora: aviso «Ve terminando tu juego»', (await r.$eval('.hd-aviso-titulo', (el) => el.textContent).catch(() => '')) === 'Ve terminando tu juego');
  chequear('a 5 min de la hora: no se avisa también lo de 30 min', (await r.$$('.hd-aviso')).length === 1);

  await guardar({ activo: true, dormir: await horaEn(r, -1), despertar: await horaEn(r, 60) });
  chequear('pasada la hora: pantalla de dormir sin modo desarrollador', await visible(r, '.hd-noche'));
  await r.$eval('.hd-adulto-btn', (b) => b.click());
  await espera(200);
  await responder(r, true);
  await clicTexto(r, '.hd-puerta .hd-btn', '15 minutos más');
  await espera(1200);
  chequear('«15 minutos más» quita la pantalla y deja la luna', !(await visible(r, '.hd-noche')) && await visible(r, '.hd-reloj'));
  await r.reload();
  await espera(1500);
  chequear('la prórroga sigue al recargar', !(await visible(r, '.hd-noche')));

  await guardar({ activo: false, dormir: await horaEn(r, -1), despertar: await horaEn(r, 60) });
  chequear('apagado: no aparece nada', !(await visible(r, '.hd-noche')) && !(await visible(r, '.hd-reloj')));
  await r.evaluate((clave) => localStorage.removeItem(clave), CLAVE);
  await r.close();

  // ---------- Nada se sale de la pantalla ----------
  for (const [nombre, w, h] of PANTALLAS) {
    const v = await paginaNueva(browser, chequear, viewportDe(w, h), `hora de dormir ${nombre}`);
    await abrirActividades(v, carpeta, { modoDev: true });
    await v.$eval('button[aria-label="Hora de dormir"]', (b) => b.click());
    await espera(300);
    await clicTexto(v, '.hd-panel .hd-btn', 'Aviso 2 min');
    await espera(700);
    const fueraAviso = await fueraDePantalla(v, '.hd-aviso, .hd-reloj, .hd-prueba-cerrar');
    await capturar(v, `aviso2-${nombre}`);
    await clicTexto(v, '.hd-panel .hd-btn', 'Pantalla de dormir');
    await espera(1400);
    const fueraNoche = await fueraDePantalla(v, '.hd-noche-centro, .hd-adulto-btn');
    await capturar(v, `noche-${nombre}`);
    chequear(`${nombre}: avisos y pantalla de dormir caben`, !fueraAviso.length && !fueraNoche.length, [...fueraAviso, ...fueraNoche].join(', '));
    await v.close();
  }
}
