// Worker de utils/codificarPng.js: convierte la capa de Colorear en PNG
// fuera del hilo principal (en la tablet, hacerlo en la pagina la congelaba
// hasta 300 ms en cada guardado).
self.onmessage = async ({ data: { n, imagen } }) => {
  try {
    const lienzo = new OffscreenCanvas(imagen.width, imagen.height);
    lienzo.getContext('2d').drawImage(imagen, 0, 0);
    imagen.close();
    const blob = await lienzo.convertToBlob({ type: 'image/png' });
    self.postMessage({ n, blob });
  } catch (e) {
    self.postMessage({ n, error: String(e) });
  }
};
