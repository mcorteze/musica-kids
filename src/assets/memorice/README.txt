El Memorice tiene TEMAS (Paw Patrol, Toy Story, Casa de Muñecas por
ahora — se agregan mas editando TEMAS_META en MemoryGame.jsx).

paw-patrol/ es el set completo (24 fotos + fondo + dorso): con luz verde,
listo para jugar hasta el tablero maximo de 48 cartas. toy-story/ y
munecas/ siguen en espera de imagenes (ver el README.txt de cada una).

Cada tema es una carpeta acá adentro con esta forma:

  <tema>/
    ui/
      fondo.avif   -> fondo del drawer completo (paisaje)
      back.avif    -> dorso de las cartas, boca abajo (logo/escudo)
    caras/
      *.avif       -> una foto por personaje/carta

- Cualquier nombre de archivo sirve dentro de caras/, no hay que tocar
  código. fondo.avif y back.avif SI tienen que llamarse asi (son los
  unicos dos nombres que el juego busca en ui/).
- Formatos aceptados: .png .jpg .jpeg .webp .avif — pero conviene subir
  todo en .avif (mucho mas liviano, sin perder calidad visible). Si el
  original es .jpg/.png pesado, convertirlo asi antes de copiarlo:
  ffmpeg -i original.jpg -vf "scale='min(640,iw)':'min(640,ih)':force_original_aspect_ratio=decrease" -pix_fmt yuv420p -c:v libaom-av1 -still-picture 1 -crf 28 -cpu-used 6 nombre.avif
  (el fondo, al ser mas grande, conviene con scale a 1600 en vez de 640 —
  ver paw-patrol/ui/fondo.avif como referencia de los parametros usados).
- Cada archivo de caras/ es UN personaje: el juego arma la pareja solo,
  duplicando esa misma foto. No hace falta subir la imagen dos veces.
- Un tema queda "listo para jugar" recien cuando tiene fondo.avif +
  back.avif + al menos 2 fotos en caras/ (el tablero minimo son 4 cartas
  = 2 parejas). Mientras le falte algo de eso, aparece en el selector de
  temas marcado "Muy pronto" y no se puede elegir — no hay que tocar
  código para habilitarlo, con completar la carpeta alcanza.
- Los tableros de ESE tema (4, 8, 12... hasta 48 cartas) se habilitan
  solos segun cuantas fotos tenga: hacen falta al menos la mitad de fotos
  que cartas (ej. para el tablero de 16 hacen falta 8 fotos distintas).
  El maximo (48 cartas) pide 24 fotos distintas.
- Conviene que las fotos de un mismo tema sean mas o menos parecidas en
  proporcion/encuadre (cara o cuerpo completo, no las dos mezcladas) para
  que el tablero se vea parejo.

Después de agregar o completar una carpeta, hay que volver a compilar
(vite build) para que aparezca.
