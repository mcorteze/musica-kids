// Dibujos de "Colorear" guardados en ESTE dispositivo (IndexedDB: guarda
// imagenes como Blob y tiene espacio de sobra; localStorage no alcanza, ~5 MB).
// Se guarda solo la capa de color (PNG con transparencia), no la lamina: la
// lamina ya viene con la app. Mas una miniatura chica (JPEG) para las grillas.
//
// Vencimiento (pedido explicito): cada dibujo se borra a las 48 horas de
// haberlo EMPEZADO (no se renueva al seguir pintando), asi nada queda mas de
// dos dias. Lo vencido no se muestra nunca y se elimina al abrir la app
// (limpiarDibujosVencidos) y cada vez que se leen los dibujos.
//
// Registro: { id, creado, actualizado, capa: Blob, miniatura: Blob }
// id = ruta de la lamina dentro de src/assets (ej. "paw-patrol-gallery/01-paw-patrol.jpg").

const DB_NOMBRE = 'musica-kids-colorear';
const STORE = 'dibujos';
export const VIGENCIA_MS = 48 * 60 * 60 * 1000;

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

const vencido = (registro) => Date.now() - registro.creado > VIGENCIA_MS;

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

export async function leerDibujo(id) {
  try {
    const registro = await operar('readonly', (store) => store.get(id));
    if (!registro) return null;
    if (vencido(registro)) {
      await borrarDibujo(id);
      return null;
    }
    return registro;
  } catch {
    return null;
  }
}

// Conserva la fecha de creacion original (el plazo de 48 h no se renueva).
export async function guardarDibujo(id, capa, miniatura) {
  try {
    const anterior = await operar('readonly', (store) => store.get(id));
    const ahora = Date.now();
    const creado = anterior && !vencido(anterior) ? anterior.creado : ahora;
    await operar('readwrite', (store) => store.put({ id, creado, actualizado: ahora, capa, miniatura }));
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
