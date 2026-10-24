// Hora de dormir (2026-10-23/24): la tarjeta del panel solo con el modo
// desarrollador; vistas previas; avisos fijos que se encienden/apagan;
// pregunta de adulto;
// horario real por dia de la semana (aviso, pantalla de dormir, prorroga
// que sobrevive a recargar) y que nada se salga de la pantalla. Con
// CAPTURAS=<carpeta> guarda capturas.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, PANTALLAS, abrirActividades, espera, fueraDePantalla, paginaNueva, urlDe, viewportDe } from './comun.mjs';

const CLAVE = 'musica-kids-hora-dormir';
// El boton de volver a escuchar sale solo si esta el audio.
const hayAudio = (nombre) => existsSync(join(RAIZ, 'src', 'assets', 'hora-dormir', `${nombre}.mp3`));
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

  const interruptores = await p.$$eval('.hd-panel-bloque:nth-child(3) .ant-switch', (els) => els.map((e) => `${e.getAttribute('aria-label')}:${e.getAttribute('aria-checked')}`).join());
  chequear('avisos 30, 15 y 5 encendidos por defecto', interruptores === 'Aviso 30 minutos antes:true,Aviso 15 minutos antes:true,Aviso 5 minutos antes:true', interruptores);
  chequear('por defecto: lunes 19:45, sábado 20:30, domingo 20:00', (await p.$$eval('.hd-panel-bloque:nth-child(2) .hd-panel-hora', (els) => els.map((e) => e.value).join())) === '19:45,19:45,19:45,19:45,19:45,20:30,20:00,07:00');

  await clicTexto(p, '.hd-panel .hd-btn', 'Aviso 15 min');
  await espera(600);
  chequear('vista previa: aparece el aviso', (await p.$eval('.hd-aviso-titulo', (el) => el.textContent).catch(() => '')) === 'Ve terminando tu juego');
  chequear('vista previa: aparece la luna con el tiempo', await visible(p, '.hd-reloj'));
  chequear(`aviso: botón de volver a escuchar ${hayAudio('aviso-15') ? 'visible (hay audio)' : 'oculto (falta el audio)'}`,
    (await visible(p, '.hd-aviso .hd-escuchar')) === hayAudio('aviso-15'));
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
  chequear(`noche: botón de volver a escuchar ${hayAudio('buenas-noches') ? 'visible (hay audio)' : 'oculto (falta el audio)'}`,
    (await visible(p, '.hd-noche .hd-escuchar')) === hayAudio('buenas-noches'));
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

  // Apagar el aviso de 15 min se guarda (se prueba su efecto mas abajo).
  await p.$eval('.ant-switch[aria-label="Aviso 15 minutos antes"]', (b) => b.click());
  await espera(200);
  const guardado = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).avisosActivos.join(), CLAVE);
  chequear('apagar un aviso se guarda', guardado === 'true,false,true', guardado);
  await p.evaluate((clave) => localStorage.removeItem(clave), CLAVE);
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
  // Solo el dia de HOY lleva la hora cercana: asi se prueba que se usa la
  // del dia que corresponde.
  const dias = async (minutos) => {
    const hoy = await r.evaluate(() => new Date().getDay());
    const lejos = await horaEn(r, 180);
    const cerca = await horaEn(r, minutos);
    return Array.from({ length: 7 }, (_, d) => (d === hoy ? cerca : lejos));
  };
  await guardar({ activo: true, dias: await dias(10), despertar: await horaEn(r, -60) });
  chequear('a 10 min de la hora de hoy: aviso «Ve terminando tu juego»', (await r.$eval('.hd-aviso-titulo', (el) => el.textContent).catch(() => '')) === 'Ve terminando tu juego');
  chequear('a 10 min: no se avisa también lo de 30 min', (await r.$$('.hd-aviso')).length === 1);

  await guardar({ activo: true, dias: await dias(10), despertar: await horaEn(r, -60), avisosActivos: [true, false, true] });
  chequear('aviso de 15 min apagado: sin tarjeta, pero con la luna', !(await visible(r, '.hd-aviso')) && await visible(r, '.hd-reloj'));

  await guardar({ activo: true, dias: await dias(40), despertar: await horaEn(r, -60) });
  chequear('a 40 min: todavía no aparece la luna', !(await visible(r, '.hd-reloj')));

  await guardar({ activo: true, dias: await dias(-1), despertar: await horaEn(r, 60) });
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

  await guardar({ activo: false, dias: await dias(-1), despertar: await horaEn(r, 60) });
  chequear('apagado: no aparece nada', !(await visible(r, '.hd-noche')) && !(await visible(r, '.hd-reloj')));
  await r.evaluate((clave) => localStorage.removeItem(clave), CLAVE);
  await r.close();

  // ---------- Nada se sale de la pantalla ----------
  for (const [nombre, w, h] of PANTALLAS) {
    const v = await paginaNueva(browser, chequear, viewportDe(w, h), `hora de dormir ${nombre}`);
    await abrirActividades(v, carpeta, { modoDev: true });
    await v.$eval('button[aria-label="Hora de dormir"]', (b) => b.click());
    await espera(300);
    await clicTexto(v, '.hd-panel .hd-btn', 'Aviso 5 min');
    await espera(700);
    const fueraAviso = await fueraDePantalla(v, '.hd-aviso, .hd-aviso-ok, .hd-escuchar, .hd-reloj, .hd-prueba-cerrar');
    await capturar(v, `aviso5-${nombre}`);
    await clicTexto(v, '.hd-panel .hd-btn', 'Pantalla de dormir');
    await espera(1400);
    const fueraNoche = await fueraDePantalla(v, '.hd-noche-centro, .hd-escuchar, .hd-adulto-btn');
    await capturar(v, `noche-${nombre}`);
    chequear(`${nombre}: avisos y pantalla de dormir caben`, !fueraAviso.length && !fueraNoche.length, [...fueraAviso, ...fueraNoche].join(', '));
    await v.close();
  }
}
