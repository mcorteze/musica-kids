// Carga una imagen desde un loader de import.meta.glob (() => Promise<{ default: url }>)
// y de paso mide sus dimensiones reales: los juegos necesitan la proporcion
// (ancho/alto) para no deformar la foto al armar tableros o paneles.
//
// Se crea con document.createElement('img') y NO con "new Image()": en los
// archivos que importan el componente Image de antd, ese nombre deja de ser
// el constructor del navegador y "new Image()" no cargaria nada.
export function cargarImagenConAspecto(cargar) {
  return cargar().then((m) => {
    const src = m.default;
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => resolve({
        src,
        aspecto: img.naturalWidth / img.naturalHeight || 16 / 9,
        ancho: img.naturalWidth,
        alto: img.naturalHeight,
      });
      img.onerror = () => resolve({ src, aspecto: 16 / 9, ancho: 0, alto: 0 });
      img.src = src;
    });
  });
}
