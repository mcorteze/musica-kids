// Geometria de las diferencias de "Encuentra las diferencias"
// (src/data/diferencias.js). Cada diferencia es:
//   - una ZONA: { zona: [[x, y], [x, y], ...] } — poligono (libre o
//     rectangulo) en % de la imagen; se acierta clickeando DENTRO de ella.
//   - o un PUNTO (formato anterior): { x, y, r? } — se acierta clickeando a
//     menos de r (o del radio general) de ese punto.
// El check de acierto va en el CENTRO de la zona: el punto medio entre su
// x minima y maxima y entre su y minima y maxima (pedido explicito: depender
// de clickear un punto exacto era dificil cuando la zona es amplia).

// Margen alrededor de una zona que todavia cuenta como acierto, en % del
// ANCHO de la imagen (un dedo no es exacto en el borde).
export const MARGEN_ZONA = 1.5;

export function esZona(d) {
  return Array.isArray(d?.zona) && d.zona.length >= 3;
}

// Centro (en %) donde se dibuja el check y el numero de la diferencia.
export function centroDe(d) {
  if (!esZona(d)) return { x: d.x, y: d.y };
  const xs = d.zona.map((p) => p[0]);
  const ys = d.zona.map((p) => p[1]);
  return {
    x: Math.round(((Math.min(...xs) + Math.max(...xs)) / 2) * 10) / 10,
    y: Math.round(((Math.min(...ys) + Math.max(...ys)) / 2) * 10) / 10,
  };
}

// Punto dentro del poligono (ray casting). Funciona en % aunque la imagen
// no sea cuadrada: estar adentro no cambia al escalar los ejes.
function dentroDelPoligono(x, y, poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

// Distancia en pixeles de (px, py) al segmento a-b (todo en pixeles).
function distanciaASegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Que tan lejos (en pixeles) quedo un click (x, y en %) de una diferencia:
// 0 si cae dentro de la zona; null si no cuenta como acierto. Sirve para
// quedarse con la diferencia mas cercana cuando el click toca dos.
// ancho/alto: tamaño real de la imagen en pantalla, en pixeles.
export function distanciaDeAcierto(d, x, y, ancho, alto, radio) {
  if (!esZona(d)) {
    const dist = Math.hypot(((x - d.x) * ancho) / 100, ((y - d.y) * alto) / 100);
    return dist <= ((d.r ?? radio) * ancho) / 100 ? dist : null;
  }
  if (dentroDelPoligono(x, y, d.zona)) return 0;
  const px = (x * ancho) / 100;
  const py = (y * alto) / 100;
  let minimo = Infinity;
  d.zona.forEach(([ax, ay], i) => {
    const [bx, by] = d.zona[(i + 1) % d.zona.length];
    minimo = Math.min(minimo, distanciaASegmento(px, py, (ax * ancho) / 100, (ay * alto) / 100, (bx * ancho) / 100, (by * alto) / 100));
  });
  return minimo <= (MARGEN_ZONA * ancho) / 100 ? minimo : null;
}
