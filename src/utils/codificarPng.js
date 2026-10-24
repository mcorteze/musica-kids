// PNG de un canvas sin trabar la pantalla: la copia (createImageBitmap) es
// rapida y la codificacion, que es lo caro, la hace un worker. Si el equipo
// no tiene worker con OffscreenCanvas (o falla), se usa canvas.toBlob como
// antes. Pedido 2026-10-24: Colorear se trababa en la tablet al guardar.

let worker = null;
let sinWorker = typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined';
let siguiente = 0;
const pendientes = new Map();

function abrirWorker() {
  if (worker || sinWorker) return worker;
  try {
    worker = new Worker(new URL('./codificarPng.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data: { n, blob, error } }) => {
      const p = pendientes.get(n);
      pendientes.delete(n);
      if (p) p(error ? null : blob);
    };
    worker.onerror = () => {
      // No cargo (ej. abierto desde file://): todo lo pendiente va por toBlob.
      sinWorker = true;
      worker = null;
      pendientes.forEach((p) => p(null));
      pendientes.clear();
    };
  } catch {
    sinWorker = true;
    worker = null;
  }
  return worker;
}

const conToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

export async function canvasAPng(canvas) {
  const w = abrirWorker();
  if (!w) return conToBlob(canvas);
  try {
    const imagen = await createImageBitmap(canvas);
    const n = ++siguiente;
    const blob = await new Promise((resolve) => {
      pendientes.set(n, resolve);
      w.postMessage({ n, imagen }, [imagen]);
    });
    return blob ?? conToBlob(canvas);
  } catch {
    return conToBlob(canvas);
  }
}
