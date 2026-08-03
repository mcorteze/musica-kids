// ============================================
// CONVERSACIONES DE LOS JUGUETES - EDITAR AQUI
// ============================================
// Reglas de escritura (importan mas que el codigo):
// 1. Los mensajes van en PASADO. Son el registro de lo que paso mientras ella
//    no estaba, no un chat en vivo.
// 2. Los juguetes nunca suenan asustados, tristes ni abandonados.
//    Aburridos, impacientes o chistosos, si.
// 3. Pocos mensajes: 3 o 4 y se cierra. No todos los juguetes participan.
//
// VENTANA DE DISPONIBILIDAD (todo opcional; lo que se omite no se evalua)
//   desde / hasta          -> fechas 'AAAA-MM-DD'
//   desdeHora / hastaHora  -> horas 'HH:MM' en 24h, hora local
// Fuera de la ventana el boton no aparece. Se revisa cada 30 segundos, asi
// que si la app ya esta abierta el boton aparece solo al entrar la ventana.
//
// persistente: true  -> dentro de su ventana NO se oculta nunca, aunque ya la
//                       haya leido. Se puede abrir todas las veces que quiera.
// persistente: false -> se marca leida al cerrarla y desaparece (comportamiento
//                       normal para las conversaciones de una sola vez).
//
// respuestas: propias de cada conversacion. Si no se define, usa las genericas.
// ============================================

// EN DESARROLLO: el boton no se oculta nunca. Poner en false para el
// comportamiento real. Ojo: esto NO salta la ventana de fecha/hora.
export const SIEMPRE_VISIBLE = true;

// "lado" es de que lado del chat aparece cada juguete. Repartirlos entre
// izquierda y derecha es lo que hace que se lea como conversacion y no como
// una lista. Ella siempre va a la derecha, en verde.
export const personajes = {
  'gato-loco': { nombre: 'Gato Loco', avatar: 'juguetes/gato-loco.png', lado: 'izq' },
  muneca: { nombre: 'Muñeca', avatar: 'juguetes/muneca.png', lado: 'der' },
  raton: { nombre: 'Ratón', avatar: 'juguetes/raton.png', lado: 'izq' },
  turtle: { nombre: 'Turtle', avatar: 'juguetes/turtle.png', lado: 'der' },
};

// Respuestas genericas, para las conversaciones que no traen las suyas.
// Sin teclado a proposito.
export const respuestas = [
  '¡Ya llegué!',
  'Los extrañé',
  'Estaba donde mi abuela',
];

// Cuando ella contesta, los juguetes se dan cuenta de que los esta leyendo y
// se quedan tiesos, como en la pelicula. Es lo ultimo del hilo: despues de
// esto no hablan mas. Se elige una al azar y queda guardada, asi que si
// vuelve a abrir la conversacion ve exactamente la misma.
export const escondidas = [
  { de: 'raton', texto: '¡Shhhh! ¡Nos está leyendo!' },
  { de: 'gato-loco', texto: '¡Shhhh! Todos quietos.' },
  { de: 'turtle', texto: '¡Shhhh! Nadie se mueva.' },
  { de: 'muneca', texto: '¡Shhhh! Hagan como que no pasó nada.' },
];

const conversaciones = [
  {
    id: 'enferma-doctora',
    activa: true,
    persistente: true,
    desde: '2026-08-03',
    hasta: '2026-08-03',
    desdeHora: '15:00',
    hastaHora: '21:00',
    mensajes: [
      { de: 'gato-loco', texto: 'La escuché toser toda la mañana.' },
      { de: 'turtle', texto: 'Por eso la llevaron donde la doctora.' },
      { de: 'raton', texto: '¿Y a qué hora vuelve?' },
      { de: 'turtle', texto: 'Cuando salga de la consulta. Hoy jugamos bajito.' },
    ],
    respuestas: [
      'Ya me tomé el remedio',
      'Todavía toso',
      'Estoy mejor',
    ],
  },

  // Plantilla de referencia. Desactivada: sirve de ejemplo para escribir otras.
  {
    id: 'prueba-1',
    activa: false,
    persistente: false,
    desde: null,
    hasta: null,
    desdeHora: null,
    hastaHora: null,
    mensajes: [
      { de: 'raton', texto: '¿Alguien la vio salir?' },
      { de: 'turtle', texto: 'Yo la vi. Llevaba la mochila.' },
      { de: 'raton', texto: 'Entonces la esperamos aquí. Yo me pido la ventana.' },
    ],
  },
];

export default conversaciones;
