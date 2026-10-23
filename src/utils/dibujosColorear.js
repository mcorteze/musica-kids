// Dibujos de "Colorear" guardados en ESTE dispositivo (IndexedDB: guarda
// imagenes como Blob y tiene espacio de sobra; localStorage no alcanza, ~5 MB).
// Se guarda solo la capa de color (PNG con transparencia), no la lamina: la
// lamina ya viene con la app. Mas una miniatura chica (JPEG) para las grillas.
//
// Vencimiento: cada dibujo se borra a los 7 dias SIN USO — sin abrirlo ni
// pintarlo — (pedido explicito 2026-10-22; antes eran 48 h desde que se
// empezaba). Igual que el resto de lo guardado en el navegador
// (utils/caducidad.js): lo que el niño retoma no se pierde, lo abandonado
// se va. Lo vencido no se muestra nunca y se elimina al abrir la app
// (limpiarDibujosVencidos) y cada vez que se leen los dibujos.
//
// Registro: { id, creado, actualizado, usado, capa: Blob, miniatura: Blob,
//   historia: [trazos y borrados, para "Ver cómo lo pinté"] (puede faltar en
//   dibujos viejos) }. usado = ultima vez que se abrio o pinto.
// id = ruta de la lamina dentro de src/assets (ej. "paw-patrol-gallery/01-paw-patrol.jpg").

const DB_NOMBRE = 'musica-kids-colorear';
const STORE = 'dibujos';
export const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

let dbPromesa = null;

function abrir() {
  if (!dbPromesa) {
    dbPromesa = new Promise((resolve, reject) => {
      const pedido = indexedDB.open(DB_NOMBRE, 1);
      pedido.onupgradeneeded = () => {
        pedido.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
    }).catch((e) => {
      // Sin IndexedDB (modo privado estricto, etc.): se pinta igual, sin guardar.
      dbPromesa = null;
      throw e;
    });
  }
  return dbPromesa;
}

function operar(modo, fn) {
  return abrir().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modo);
    const resultado = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(resultado?.result);
    tx.onerror = () => reject(tx.error);
  }));
}

// Ultimo uso (los guardados antes de 'usado' cuentan desde su ultimo guardado).
export const ultimoUso = (registro) => registro.usado ?? registro.actualizado ?? registro.creado;
const vencido = (registro) => Date.now() - ultimoUso(registro) > VIGENCIA_MS;

// Todos los dibujos vigentes, el mas reciente primero. Borra los vencidos.
export async function leerDibujos() {
  try {
    const todos = await operar('readonly', (store) => store.getAll()) ?? [];
    const vencidos = todos.filter(vencido);
    if (vencidos.length) {
      await operar('readwrite', (store) => vencidos.forEach((r) => store.delete(r.id)));
    }
    return todos.filter((r) => !vencido(r)).sort((a, b) => b.actualizado - a.actualizado);
  } catch {
    return [];
  }
}

// Abrir un dibujo cuenta como uso: se anota (y renueva sus 7 dias).
export async function leerDibujo(id) {
  try {
    const registro = await operar('readonly', (store) => store.get(id));
    if (!registro) return null;
    if (vencido(registro)) {
      await borrarDibujo(id);
      return null;
    }
    const usado = { ...registro, usado: Date.now() };
    await operar('readwrite', (store) => store.put(usado));
    return usado;
  } catch {
    return null;
  }
}

// textos: los de la herramienta Texto (objetos, no pintura; ver textosColorear.js).
export async function guardarDibujo(id, capa, miniatura, historia = null, textos = []) {
  try {
    const anterior = await operar('readonly', (store) => store.get(id));
    const ahora = Date.now();
    const creado = anterior && !vencido(anterior) ? anterior.creado : ahora;
    await operar('readwrite', (store) => store.put({ id, creado, actualizado: ahora, usado: ahora, capa, miniatura, historia, textos }));
  } catch {
    // Sin espacio o sin IndexedDB: el dibujo sigue en pantalla, solo no se guarda.
  }
}

export async function borrarDibujo(id) {
  try {
    await operar('readwrite', (store) => store.delete(id));
  } catch {
    // nada que hacer
  }
}

export function limpiarDibujosVencidos() {
  return leerDibujos();
}
