// Prueba de la caducidad del localStorage (src/utils/caducidad.js): vence a
// los 7 dias SIN USO (leer o escribir cuenta como uso); las excepciones y las
// claves de otros proyectos no se tocan. El paso de los dias se simula
// corriendo hacia atras las fechas guardadas en musica-kids-fechas.
import { espera, paginaNueva, urlDe } from './comun.mjs';

const DIA = 24 * 3600 * 1000;
const USADA = 'musica-kids-memorice-nivel-moana';
const SIN_USO = 'musica-kids-simon-record-frozen';
const CANCIONES = 'musica-kids-liked-songs';
const AJENA = 'otro-proyecto-dato';

export async function probarCaducidad(browser, carpeta, chequear) {
  const page = await paginaNueva(browser, chequear, { width: 1180, height: 820 }, 'caducidad');
  await page.goto(urlDe(carpeta));
  await page.evaluate((claves) => {
    localStorage.clear();
    for (const c of claves) localStorage.setItem(c, '1');
  }, [USADA, SIN_USO, CANCIONES, AJENA]);
  await page.reload();
  await espera(600);

  // Ambas llevan 6 dias sin uso.
  const correrDias = (dias) => page.evaluate((ms) => {
    const f = JSON.parse(localStorage.getItem('musica-kids-fechas'));
    for (const k in f) f[k] -= ms;
    localStorage.setItem('musica-kids-fechas', JSON.stringify(f));
  }, dias * DIA);
  await correrDias(6);
  await page.reload();
  await espera(600);
  // "in" mira si la clave existe SIN contar como uso (getItem si contaria).
  chequear('con 6 días sin uso no se borra nada', await page.evaluate((a, b) => a in localStorage && b in localStorage, USADA, SIN_USO));

  // La app lee una de ellas (uso) y los usos se guardan (pasar a segundo plano).
  await page.evaluate((clave) => {
    localStorage.getItem(clave);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, USADA);
  await espera(200);

  // Pasan 2 dias mas: la usada lleva 2 dias, la otra 8.
  await correrDias(2);
  await page.reload();
  await espera(600);
  const quedan = await page.evaluate((claves) => Object.fromEntries(claves.map((c) => [c, c in localStorage])), [USADA, SIN_USO, CANCIONES, AJENA]);
  chequear('la clave usada hace 2 días sigue', quedan[USADA]);
  chequear('la clave sin uso por 8 días se borra', !quedan[SIN_USO]);
  chequear('las marcas de canciones no vencen', quedan[CANCIONES]);
  chequear('las claves de otros proyectos no se tocan', quedan[AJENA]);
  await page.close();
}
