// Estado que muestran las paginas de trabajo (ver EstadoDevTabs): el elegido
// a mano o, si no se eligio ninguno, "En preparacion" cuando hay algo
// pendiente y "Procesados" cuando no.
export function elegirEstadoDev(elegido, hayPorAfinar) {
  return elegido ?? (hayPorAfinar ? 'afinar' : 'listos');
}
