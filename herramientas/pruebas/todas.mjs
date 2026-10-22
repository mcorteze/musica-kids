// Pruebas de interfaz de musica-kids (npm run pruebas). Sin servidor: arma un
// build de PRODUCCION y uno de DESARROLLO en una carpeta temporal y prueba
// los dos con Chrome: Colorear, festejo al ganar, caducidad, modo liviano y
// paletas (cuadros por segundo: npm run rendimiento). El de
// desarrollo atrapa bugs que solo salen con StrictMode, como el zoom muerto
// de Colorear del 2026-10-22.
//   node herramientas/pruebas/todas.mjs [produccion|desarrollo]
// Chrome: C:/Program Files/Google/Chrome/Application/chrome.exe, o la
// variable CHROME_PATH. Sale con codigo 1 si algun chequeo falla.
import { construir, crearInforme, lanzar } from './comun.mjs';
import { probarColorear } from './colorear.mjs';
import { probarColorearExtras } from './colorear-extras.mjs';
import { probarJuegos } from './juegos.mjs';
import { probarPaletas } from './paletas.mjs';
import { probarCaducidad } from './caducidad.mjs';
import { probarFluidez } from './fluidez.mjs';

const modos = process.argv[2] ? [process.argv[2]] : ['produccion', 'desarrollo'];
const { resultados, chequear } = crearInforme();
const browser = await lanzar();
try {
  console.log('\n== Láminas de Pintar por números ==');
  await probarPaletas(browser, chequear);
  for (const modo of modos) {
    console.log(`\n== Build de ${modo} ==`);
    const carpeta = construir(modo);
    console.log('-- Colorear');
    await probarColorear(browser, carpeta, chequear);
    console.log('-- Colorear: sellos, varita, espejo, terminé, marcos');
    await probarColorearExtras(browser, carpeta, chequear);
    console.log('-- Festejo al ganar');
    await probarJuegos(browser, carpeta, chequear);
    console.log('-- Caducidad del guardado');
    await probarCaducidad(browser, carpeta, chequear);
    console.log('-- Fluidez: modo liviano y piezas recortadas');
    await probarFluidez(browser, carpeta, chequear);
  }
} catch (e) {
  chequear('la prueba terminó sin caerse', false, e.message);
} finally {
  await browser.close();
}
const malos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - malos.length}/${resultados.length} chequeos ok`);
if (malos.length) {
  console.log('Fallaron:');
  malos.forEach((r) => console.log(`  - ${r.nombre}${r.detalle ? ` (${r.detalle})` : ''}`));
  process.exit(1);
}
