// ============================================
// DIFERENCIAS - COORDENADAS - EDITAR AQUI
// ============================================
// Juego "Encuentra las diferencias": cada juego es un PAR de imagenes y aqui
// se anota DONDE esta cada diferencia.
//
// Vocabulario del usuario: "imagen a" = la correcta (original.avif) e
// "imagen b" = la que lleva las diferencias (modificada.avif).
//
// Los NIVELES no se declaran: se arman solos agrupando los pares por la
// CANTIDAD de diferencias anotadas aqui (todos los de 5 diferencias son un
// nivel, los de 7 otro...), de menos a mas. El numero del nivel ES esa
// cantidad: si lo minimo que hay son juegos de 3 diferencias, se parte en el
// "Nivel 3" (y despues "Nivel 4", "Nivel 5"...). Al empezar un nivel se
// sortea un par al azar y hay que resolver TODOS los del nivel para abrir el
// siguiente.
//
// Como se agrega un par nuevo:
//  1. Poner las dos imagenes (en AVIF, del mismo tamaño y proporcion) en
//       src/assets/diferencias/<tema>/<par>/original.avif      (imagen a)
//       src/assets/diferencias/<tema>/<par>/modificada.avif    (imagen b)
//     <tema> es el id del tema del Memorice (paw-patrol, toy-story, frozen,
//     munecas) y <par> un nombre correlativo por tema (par-001, par-002...),
//     permanente: no se reutiliza ni se renumera. La b idealmente es la a con
//     SOLO esos cambios (misma composicion): si el resto de la escena
//     tambien cambia, la jugadora ve diferencias que no cuentan.
//  2. Abrir el "Modo desarrollador" (boton en el selector del juego, solo
//     laptop). Muestra las dos imagenes con una cuadricula sobre la segunda
//     y las coordenadas del cursor. Cada diferencia se marca como una ZONA:
//     "Zona libre" (un click por vertice; se cierra tocando el primero) o
//     "Rectangulo" (arrastrando). Un panel a la derecha (siempre a la vista)
//     lista las marcas de cada par, que se guardan solas en el navegador;
//     "Copiar este par" o "Copiar todos" arman el texto listo para pegar
//     aqui abajo.
//  3. Pegar las marcas en el mapa de abajo, bajo la clave "<tema>/<par>".
//     Un par sin diferencias anotadas todavia no se puede jugar y en el
//     Modo desarrollador sale en el tab "En preparacion"; al pegarle sus
//     diferencias pasa al juego y al tab "Procesados".
//
// Las coordenadas son PORCENTAJES (0 a 100) medidos desde la esquina
// superior izquierda de la imagen: x sobre el ANCHO, y sobre el ALTO. Como
// son relativas, valen para cualquier tamaño en que se muestre la imagen.
// Cada diferencia es:
//   - una ZONA (forma actual): { zona: [[x, y], [x, y], ...] } — se acierta
//     clickeando dentro (con un margen chico, MARGEN_ZONA) y el check
//     aparece en su centro (punto medio de su x y su y minimas y maximas).
//   - o un PUNTO (forma anterior, sigue valiendo): { x, y } — se acierta a
//     menos de RADIO_ACIERTO del punto, o de "r" si la diferencia lo trae.
// Toda la geometria vive en src/utils/zonasDiferencias.js.
// ============================================

// Margen de acierto de las diferencias anotadas como PUNTO: un click a esta
// distancia (o menos) del punto cuenta como acierto. Tambien fija el tamaño
// del circulo del check. Es un % del ANCHO de la
// imagen (5 = un circulo de ~30px en una imagen de 600px de ancho).
export const RADIO_ACIERTO = 5;

// 2026-10-12/13: los pares se volvieron a marcar como ZONAS con el Modo
// desarrollador (antes eran puntos).
const diferencias = {
  // Skye (a: casco con gafas y boca cerrada; b: gorro de lana y boca
  // abierta). 4 zonas: gorro, boca, punta izquierda del ala y punta derecha
  // del ala.
  'paw-patrol/par-001': [
    { zona: [[33.3, 19.6], [38.3, 14.2], [49.5, 15.3], [49.5, 15.3], [64.5, 24.9], [72.1, 34.6], [75, 42.2], [82.8, 26.5], [78.2, 8.8], [61.5, 2.1], [42.5, 6.5], [37.5, 10.1]] },
    { zona: [[50.1, 46.4], [50.1, 46.4], [30.7, 40.8], [32.5, 47.6], [42.7, 50.5]] },
    { zona: [[10.2, 49.1], [10.2, 49.1], [6.4, 45.3], [3.8, 48.2], [8.6, 59.9], [10.8, 59.3]] },
    { zona: [[90.8, 69.1], [95.6, 71.1], [96.4, 79.7], [94.6, 85.9], [92.6, 83.2], [89, 71.3]] },
  ],
  // Liberty (a: casco coral, boca abierta; b: casco lila, boca cerrada,
  // orejas volando). 4 zonas: casco, oreja izquierda, oreja derecha y boca.
  'paw-patrol/par-002': [
    { zona: [[29.9, 43.9], [28.7, 38.8], [30.3, 25], [37.1, 21.2], [49.3, 19.4], [57.1, 22.6], [60.5, 40.2], [62.5, 41.4], [63.1, 38.8], [61.7, 26.4], [56.3, 13.6], [46.3, 11.4], [35.7, 13.4], [29.1, 21.4], [27.1, 26], [27.1, 40.2]] },
    { zona: [[31.1, 17.2], [27.1, 25.6], [27.3, 32.4], [22.8, 32.4], [14.6, 36.2], [6.8, 33.4], [6.6, 21], [15.2, 26], [21.6, 24.6], [25.3, 17.6]] },
    { zona: [[56.5, 13.4], [62.5, 14.4], [69.5, 20.6], [87.4, 25.6], [96.6, 23.8], [90, 33.8], [79.2, 36.4], [66.5, 32.8], [62.3, 26.6]] },
    { zona: [[33.7, 44.3], [40.3, 43.9], [47.1, 42], [52.3, 38.6], [47.3, 44.3], [37.1, 46.1]] },
  ],
  // Skye en el laboratorio (edicion exacta de la a). 3 zonas: boton celeste,
  // hombrera plateada y pez en la ventana.
  'paw-patrol/par-003': [
    { zona: [[26.7, 80], [25.5, 83.2], [28.5, 85.2], [31.1, 85], [30.5, 80.6]] },
    { zona: [[48.5, 65.2], [52.1, 60.9], [59.3, 60.9], [62.9, 66], [60.1, 71], [56.5, 72], [53.5, 71]] },
    { zona: [[74.3, 12.8], [81.6, 18.2], [90.4, 18.2], [93.2, 14.6], [92.8, 6.6], [87.6, 4.4], [81, 4]] },
  ],
  // "Amigas de Skye" / "Amigas de Everest" (edicion exacta de la a). 4 zonas:
  // gorro de Everest, corazon de la D, titulo y corazon de abajo.
  'paw-patrol/par-004': [
    { zona: [[62.1, 46.3], [62.3, 48.1], [68.1, 46.9], [74.3, 47.7], [74.1, 45.7], [67.9, 44.7]] },
    { zona: [[46.3, 8.2], [46.3, 10.6], [47.7, 12.4], [49.3, 10.8], [49.3, 7.8]] },
    { zona: [[56.9, 5], [56.3, 16.8], [71.5, 18.4], [91.4, 23.6], [91.2, 11.6], [71.3, 6.4]] },
    { zona: [[49.7, 79.3], [52.9, 83.1], [56.5, 79.7], [57.9, 81.5], [55.5, 87.7], [52.5, 91.3], [47.9, 82.5]] },
  ],
  // Niño con casco de carton (Buzz en la a, Woody en la b). 5 zonas:
  // estrella de la caja, texto de la caja, juguete en la mano, polera y
  // shorts.
  'toy-story/par-001': [
    { zona: [[34.5, 22.2], [39.1, 18.4], [41.3, 29.2], [36.1, 32.2]] },
    { zona: [[44.7, 34.6], [46.5, 39.2], [59.5, 38], [57.7, 32.8]] },
    { zona: [[63.9, 11.4], [75.4, 32.6], [86.4, 27.8], [73.7, 5.6]] },
    { zona: [[46.7, 41.6], [47.7, 57.3], [57.7, 58.1], [55.7, 40.8]] },
    { zona: [[43.9, 58.5], [40.7, 72.5], [49.5, 73.9], [50.7, 66.3], [52.1, 66.5], [52.5, 73.9], [61.7, 72.5], [58.3, 59.5]] },
  ],
};

export default diferencias;
