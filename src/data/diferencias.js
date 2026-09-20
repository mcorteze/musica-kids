// ============================================
// DIFERENCIAS - COORDENADAS - EDITAR AQUI
// ============================================
// Juego "Encuentra las diferencias": cada nivel es un PAR de imagenes y aqui
// se anota DONDE esta cada diferencia.
//
// Como se agrega un par nuevo:
//  1. Poner las dos imagenes (en AVIF) en
//       src/assets/diferencias/<tema>/<nivel>/original.avif
//       src/assets/diferencias/<tema>/<nivel>/modificada.avif
//     La segunda ("modificada") es SIEMPRE la que lleva las diferencias.
//     <tema> es el id del tema del Memorice (paw-patrol, toy-story, frozen,
//     munecas) y <nivel> un nombre que ordene bien (nivel-1, nivel-2...).
//  2. Abrir el "Modo desarrollador" (boton en el selector del juego, solo
//     laptop). Muestra las dos imagenes con una cuadricula sobre la segunda,
//     las coordenadas del cursor, y permite dejar marcas con click; el boton
//     "Copiar" arma el texto listo para pegar aqui abajo.
//  3. Pegar las coordenadas en el mapa de abajo, bajo la clave
//     "<tema>/<nivel>". Un nivel sin coordenadas aparece en el Modo
//     desarrollador pero todavia no se puede jugar.
//
// Las coordenadas son PORCENTAJES (0 a 100) medidos desde la esquina
// superior izquierda de la imagen: x sobre el ANCHO, y sobre el ALTO. Como
// son relativas, valen para cualquier tamaño en que se muestre la imagen.
// Cada diferencia puede llevar su propio radio "r" (en % del ancho) si
// alguna necesita mas o menos margen que el general.
// ============================================

// Margen de acierto por defecto: un click a esta distancia (o menos) del
// centro de una diferencia cuenta como acierto. Es un % del ANCHO de la
// imagen (5 = un circulo de ~30px en una imagen de 600px de ancho).
export const RADIO_ACIERTO = 5;

const diferencias = {
  // Ejemplo (borrar cuando haya datos reales):
  // 'paw-patrol/nivel-1': [
  //   { x: 42.5, y: 61 },
  //   { x: 18, y: 27.5, r: 6 },
  // ],
};

export default diferencias;
