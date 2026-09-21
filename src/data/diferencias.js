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
//     laptop). Muestra las dos imagenes con una cuadricula sobre la segunda,
//     las coordenadas del cursor, y permite dejar marcas con click. Un panel
//     a la derecha (siempre a la vista) lista las marcas de cada par, que se
//     guardan solas en el navegador; "Copiar este par" o "Copiar todos" arman
//     el texto listo para pegar aqui abajo.
//  3. Pegar las coordenadas en el mapa de abajo, bajo la clave
//     "<tema>/<par>". Un par sin coordenadas aparece en el Modo
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
  // Skye (a: casco con gafas y boca cerrada; b: gorro de lana y boca abierta).
  // Las 4: punta izquierda del ala, punta derecha del ala, boca y gorro.
  'paw-patrol/par-001': [
    { x: 7.4, y: 51 },
    { x: 93.4, y: 76 },
    { x: 37.1, y: 46.5 },
    { x: 64.3, y: 11.5 },
  ],
  // Liberty (a: casco coral, boca abierta; b: casco lila, boca cerrada, orejas
  // volando). Por su posicion en la b, las 4 son: boca, oreja izquierda,
  // oreja derecha y casco, en el orden en que se marcaron.
  'paw-patrol/par-002': [
    { x: 42.9, y: 44.2 },
    { x: 19.4, y: 28.9 },
    { x: 74.9, y: 27.9 },
    { x: 50.9, y: 16.7 },
  ],
  // Skye en el laboratorio (edicion exacta de la a). Por su posicion en la b,
  // las 3 son: pez en la ventana, hombrera plateada y boton celeste.
  'paw-patrol/par-003': [
    { x: 84.6, y: 11.3 },
    { x: 56.3, y: 65.5 },
    { x: 27.7, y: 82.3 },
  ],
  // "Amigas de Skye" / "Amigas de Everest" (edicion exacta de la a). Por su
  // posicion en la b, las 4 son: titulo, corazon de la D, corazon de abajo y
  // gorro de Everest.
  'paw-patrol/par-004': [
    { x: 72.9, y: 12.9 },
    { x: 47.5, y: 10.1 },
    { x: 53.1, y: 85.5 },
    { x: 67.7, y: 46.2 },
  ],
  // Niño con casco de cartón (Buzz en la a, Woody en la b). Las 5: polera,
  // texto de la caja, estrella de la caja, juguete en la mano y shorts.
  'toy-story/par-001': [
    { x: 52.1, y: 48.8 },
    { x: 52.1, y: 36 },
    { x: 37.9, y: 26.7 },
    { x: 74.3, y: 18.7 },
    { x: 51.1, y: 66.4 },
  ],
};

export default diferencias;
