Audios de la Hora de dormir (voz grabada, ElevenLabs). Formato mp3.
Nombres exactos (si falta uno, ese momento suena solo con la campanita y
no aparece el boton de volver a escuchar):

  aviso-30.mp3       30 minutos antes
  aviso-15.mp3       15 minutos antes
  aviso-5.mp3         5 minutos antes
  buenas-noches.mp3  al llegar la hora (pantalla de buenas noches)

Textos (2026-10-24; deben decir el tiempo que falta):

  aviso-30       ¡Mira, la luna se está asomando! Faltan treinta minutos para
                 dormir. Todavía puedes jugar un ratito más.
  aviso-15       La luna ya subió al cielo. Faltan quince minutos para dormir.
                 Ve terminando tu juego.
  aviso-5        ¡Faltan cinco minutos! Es tu último juego. Cuando termines,
                 guardamos todo y a la camita.
  buenas-noches  Ya es hora de dormir. Jugaste muy bien hoy. Buenas noches,
                 que sueñes bonito. Mañana seguimos jugando.

Ilustraciones de Skye (una por aviso): aviso-30.avif, aviso-15.avif,
aviso-5.avif. Fondo plano #15214D (el de la tarjeta, --hd-aviso-fondo en
HoraDormir.css). Se convierten a 480 px de ancho:
  ffmpeg -i entrada.jpg -vf "scale=480:-2:flags=lanczos,format=yuv420p" -c:v libaom-av1 -still-picture 1 -crf 28 aviso-30.avif

Se prueban en Actividades > Hora de dormir (modo desarrollador).
