# Flujo activo — musica-kids
Actualizado: 2026-10-22

## PLANIFICADO — reestructuración (NO se hace por ahora, pedido 2026-10-22)
Dos cambios ligados; el 1 es requisito del 2.

### 1. Dividir MenuActividades.jsx
- Hoy: 4.895 líneas, 89 useState, 46 efectos, 53 useCallback; panel,
  menú, modo dev y el estado de 10 juegos (Memorice, Imprimir,
  Rompecabezas, Contar, Secuencias, Diferencias, Pintar descontinuado,
  Pintar por números, Simón, Colorear). Título/color/Volver salen de una
  cadena `if (vista === ...)` compartida (de ahí el bug del encabezado de
  Pintar por números, 2026-10-22). Cada cambio re-renderiza todo y choca
  con otras sesiones.
- Meta: un archivo por juego con su propio estado (juegos/XJuego.jsx, como
  SimonJuego/ColorearJuego); MenuActividades ~300-500 líneas (panel, menú,
  modo dev, qué juego mostrar). Cada juego informa título, color y acción
  de Volver con un mecanismo chico y común (sin la cadena de if).
- Cómo: un juego por paso y un commit por juego; primero los aislados
  (Imprimir, Colorear, Simón), al final los grandes (Rompecabezas, Pintar
  por números). Antes de mover cada juego, sumarle una prueba básica a
  herramientas/pruebas y correr `npm run pruebas` después de cada paso.
  Sin cambios visibles. Hacerlo sin otra sesión editando el archivo.

### 2. La app parte en el menú de aplicaciones; la música es una app más
- Al abrir, se ve directo el menú de aplicaciones (hoy: reproductor y el
  menú de Actividades en un drawer). La música aparece ahí como una
  aplicación más, junto a los juegos.
- La música se abre como drawer: se puede entrar a ella estando en un
  juego, sin cerrar ni reiniciar el juego.
- El reproductor flotante en miniatura (MiniPlayerFab):
  - se puede arrastrar a otra posición de la pantalla;
  - al tocarlo abre el drawer de música en el grupo exacto de la canción
    que suena, para cambiarla sin afectar el juego en curso.
- Implica: el estado del juego activo debe sobrevivir a abrir/cerrar la
  música (hoy cerrar el drawer de Actividades reinicia todo a 'menu');
  por eso va después de dividir MenuActividades.
- Por definir al retomar: qué pasa con el modo auto (DrivingMode) y la
  página de grupos (GroupMenuPage) en el nuevo arranque.

## Tarea actual
Juego "Pintar por números" publicado (commit + push 2026-10-20): 4 temas
jugables (Moana, Toy Story, Frozen, Paw Patrol), 13 láminas, 5 niveles
(14/20/28/36/44). De tablet para arriba. Láminas nuevas: skill
skills/agregar-pintar.md (por-asignar → Modo desarrollador → propuesta).

## Fluidez en tablets modestas (2026-10-22)
- Pedido: la tablet del niño (gráficos modestos) se traba; no exigir tanto
  en efectos. Medición: `npm run rendimiento [lentitud] [liviano]` (CPU
  4-6x más lenta en Chrome; mide cuadros/s, cuadros trabados y peor cuadro).
- Hallazgos (6x): 120 destellos titilando con drop-shadow animado = 30 fps
  con la hoja QUIETA (y frenaban todo lo demás); neón redibujaba el trazo
  entero (26 fps); tirón al primer trazo (texturas y AudioContext creados
  en el primer trazo; respaldo leído desde la GPU). Rompecabezas: React
  redibuja ~11 componentes por movimiento (normal); cada pieza pintaba la
  foto entera (hasta 1600 px) ampliada.
- Arreglos: destellos con brillo dibujado en el SVG (sin filtro) y máx 60;
  neón por tramos (capas halo/centro; brillo = halo con ctx.filter blur, así
  el arcoíris no queda en bloques); texturas y audio preparados al abrir la
  hoja; respaldo con willReadFrequently; Simón pausa el fondo animado
  mientras se juega; Rompecabezas con piezas recortadas (una imagen chica
  por pieza, del tamaño en que se ve).
- Modo liviano automático (utils/rendimiento.js): mide fps 2,5 s después de
  abrir; < 48 fps o > 4 cuadros lentos → clase "modo-liviano" en <html>:
  sin backdrop-filter, sin fondos animados ni pulsos de Simón, sin sombras
  luminosas, sin destellos que titilan ni estela, festejo con menos chispas,
  pegatinas sin sombra. Se recuerda (musica-kids-modo-liviano) y se vuelve
  a medir. Forzar a mano: localStorage musica-kids-modo-liviano-forzado
  '1'/'0' (no vence).
- Resultado (6x, modo normal): destellos quietos 30→59 fps, neón 26→49,
  zoom 28→59, primer trazo de varita 316→83 ms.
- Ojo: el desenfoque de las píldoras de Simón NUNCA se aplicaba en
  producción (el minificador deja solo -webkit-backdrop-filter y Chrome no
  lo toma). Se deja así a propósito (más liviano).
- Ojo: en MenuActividades `Image` es el de antd: usar
  document.createElement('img'), no `new Image()` (rompió los recortes).
- Pruebas: herramientas/pruebas/fluidez.mjs (135 chequeos en total).

## Colorear embellecido (2026-10-22, pedido: "implementar todo")
- Sellos: 30 figuras en 3 grupos con pestañas (utils/formasSello.js: capas
  SVG 100×100, 'base'/'oscuro'/'claro' o color fijo → mariquita, abeja,
  arcoíris...). Se estampan como PEGATINA (silueta blanca con sombra +
  reflejo). Surtido por grupo ('surtido:<grupo>'), con tamaño y giro
  variados. "Pop" al estampar (anillo, DOM) + sonido.
- Varita: botón propio (sale del panel de lápices) con 8 polvos (Mágico,
  Polvo de hada, Oro, Plata, Confeti, Corazoncitos, Estrellitas, Nieve);
  más denso si el dedo va lento; estela de partículas al moverse; algunos
  destellos quedan TITILANDO sobre la hoja (salen de la historia, máx 120).
- Lápices con patrón: Rayas, Puntitos, Cuadros, Estrellitas (tesela anclada
  a la hoja).
- Espejo (botón flotante arriba a la derecha + línea central): trazo gemelo
  reflejado con su propia semilla; neón redibuja ambos.
- Sonidos Web Audio (utils/sonidosColorear.js) por herramienta + pop +
  fanfarria + clic; botón de silencio (localStorage
  musica-kids-colorear-sonido).
- "¡Terminé!" (abajo a la izquierda): destellos + fanfarria al instante,
  guarda en paralelo; diálogo: Ver cómo lo pinté / Imprimir o guardar /
  Seguir pintando.
- Ver cómo lo pinté: historia de trazos guardada con el dibujo (IndexedDB,
  campo historia; tope 200 000 puntos). Todo el azar sale de la semilla de
  cada trazo (mulberry32) y los puntos se redondean a 0,1 → repetición fiel
  (~8 s, 1 punto/cuadro mínimo). Dibujos viejos sin historia: no se repiten.
- Imprimir o guardar: diálogo con 6 marcos (sin marco, arcoíris, estrellas,
  corazones, flores, lunares; utils/marcosColorear.js) con vista previa;
  "Guardar imagen" descarga PNG. Mis dibujos también tiene Guardar imagen.
- Hoja en blanco: tarjeta en el menú de Colorear (lámina blanca 1350×1800,
  id 'hoja-en-blanco').
- Íconos con vida: lo elegido se menea, el color salpica (sin animación con
  prefers-reduced-motion).
- Pruebas: herramientas/pruebas/colorear-extras.mjs (117 chequeos en total,
  prod + dev). Ojo: leer un canvas mientras se dibuja lo pasa de GPU a
  software y cambia el suavizado; la prueba de la repetición lee al final.
- Posible siguiente paso (no pedido): hoy las pegatinas quedan bajo la
  lámina (las líneas negras las cruzan); una capa de pegatinas sobre la
  lámina las dejaría "encima" como stickers reales.

## Caducidad por último uso (2026-10-22, pedido)
- localStorage vence a los 7 días SIN USO (leer o escribir cuenta), ya no
  a los 7 días de guardado. caducidad.js intercepta getItem/setItem/
  removeItem (solo claves musica-kids-) y guarda los usos en lotes
  (3 s, y al pasar a segundo plano o cerrar). Excepciones sin cambio.
  Colorear sigue en 48 h desde que se empieza. Prueba: caducidad.mjs.

## Colorear: ajustes (2026-10-22, pedido)
- Sello: un toque deja UNA figura aunque el dedo quieto mande
  "movimientos" (antes cada movimiento sin avance estampaba otra: la
  huellita se veía difusa). Fix en cadaPaso (marcoInicial).
- Zoom hasta 6x (antes 4x).
- Dibujos vencen a los 7 días SIN USO (antes 48 h desde que se empieza):
  campo `usado` en IndexedDB; abrirlo o pintarlo renueva el plazo.
- Botón "Guardar imagen" (descarga) visible en la barra, junto a
  "Imprimir o guardar"; sigue también en Mis dibujos y en el diálogo.
- Prueba: herramientas/pruebas/colorear-ajustes.mjs. Suite 149/149.
- Parpadeo/hoja cortada al estampar (visto en un celular potente, no
  es falta de potencia): sin errores JS ni recargas; el navegador
  rearmaba las capas en cada toque (la pintura pasaba a capa propia
  y cada "pop" agregaba/quitaba otra) y volvía a dibujar la lámina.
  Fix: will-change en canvas, lámina y contenedores de efectos (capas
  fijas desde que se abre). Verificado con LayerTree (CDP); falta
  confirmarlo en el celular real.
- Quitado "¡Terminé!" (pedido): fuera el botón, el festejo (chispas +
  fanfarria, sonidoFestejo) y su diálogo. "Ver cómo lo pinté" pasó a
  la barra (▶, deshabilitado sin trazos) con confirmación para el niño
  ("¿Vemos cómo lo pintaste?" — Ahora no / Sí, ver). En horizontal las
  6 acciones van 2 por fila (en una columna no cabían en laptop 768).
- Destellos que volvían al pintar encima de lo borrado: se mostraban los
  que tenían pintura debajo. Ahora la goma los apaga en su entrada de la
  historia (h.ap); vuelven solo si se deshace la goma.
- Descargas con nombre único: grupo-número_AAAA-MM-DD_HH-MM-SS.png
  (hoja en blanco: hoja-en-blanco_fecha.png). Suite 155/155.
- Sellos: patita de Paw Patrol = la MISMA de Simón dice (GiPawPrint
  llevado a la caja de 100, PATITA_PAW); la "Huellita" anterior pasó
  a llamarse "Patita de gato" (id 'huella' se conserva por las
  historias guardadas). 30 figuras.
- 2026-10-23: Colorear publicado (sin modo dev). Barra agrupada (pedido):
  acciones de menos uso en "Más" (⋯); sin botones de color ni tamaño:
  cada herramienta los trae en su menú (lápiz: tipos+colores+tamaño;
  sello: figuras+colores+tamaño; varita: polvos+colores+tamaño; goma:
  tamaño). Tamaño = solo la barra (sin vista previa ni atajos). Elegir
  dentro de un menú no lo cierra; la paleta completa vuelve al menú de
  origen. Menú con scroll interno si no cabe a lo alto.
- 2026-10-23: 8 marcos temáticos (Paw Patrol, Gatitos, Reino de hielo,
  Toy Story, Mar tropical, Princesas, Dinosaurios, Espacio); figuras solo
  de marcos en FORMAS_MARCO. Sin marco sugerido por temática (decisión).
- 2026-10-23: herramienta Texto (utils/textosColorear.js): objetos aparte
  (no pintura) encima de las líneas; tocar la hoja = escribir; tocar texto
  = seleccionar (arrastrar mueve, 2 toques o lápiz = editar, papelero =
  borrar con diálogo); menú: 4 letras (Fredoka, Patrick Hand, Chewy,
  Nunito), colores (arcoíris = letra por letra), tamaño. Deshacer, guardado
  (campo textos), imprimir/descargar/miniatura, Mis dibujos y repetición.
  La goma no borra textos. Prueba: colorear-texto.mjs.
- 2026-10-23: Texto se usa una vez (vuelve la herramienta anterior; texto
  queda seleccionado; tocar la hoja solo lo suelta). Herramienta elegida:
  fondo celeste + aro; las demás sin fondo. Dictado por voz en "Escribe tu
  texto" (micrófono a la derecha; SpeechRecognition es-CL; sin soporte no
  aparece). Con Texto activo, tocar un texto (todo su recuadro) lo edita.
  Ningún texto sale de la hoja (encajarTexto: se corre y, si es más ancho,
  se achica; los guardados se acomodan al abrir). Pintar con otra
  herramienta pasa por debajo del texto (decisión de diseño, se mantiene).
- PENDIENTE (propuesto, sin aprobar): mejoras de fluidez de la acuarela
  (guardado sin trabar, fundir solo la zona, pincel suave precalculado,
  capa del trazo fija). Medido a 6x: 201 ms al soltar y 504 ms al guardar.

## Oportunidades de mejora implementadas (2026-10-22)
- Bug: el encabezado de Pintar por números (vista 'pixel') lo pisaba una
  línea de 'pintar' → el juego se veía con fondo de menú. Corregido.
- Colorear: deshacer por zonas (respaldoRef + rectángulo del trazo, ~KB por
  paso en vez de la hoja entera); 25 pasos; resolución 1800 (antes 1200) y
  zoom máx. 4x; hasta 5 "Mi color" recientes.
- herramientas/pruebas/ + `npm run pruebas`: 69 chequeos en build de
  producción y de desarrollo (Colorear, festejo Memorice y Pintar por
  números, paletas). Todo ok.
- No hecho (requiere decisión o material): marcas de agua de las láminas,
  dividir MenuActividades.jsx, pares ΔE 9–12, imagen de la
  tarjeta en inglés, publicar Colorear/Simón.

## Pintar por números: colores repetidos (2026-10-22)
- Causa: los grupos se separaban por representantes (ΔE ≥ 12) pero el color
  final de cada grupo (el más común de sus celdas) no se volvía a comparar:
  8 láminas tenían dos números con el mismo tono (p. ej. Rubble n4/n5).
- Arreglo: DISTINTOS_MIN = 9 (Lab) en pintarPixel.js (juntarParecidos: al
  leer láminas y en la vista previa) y en pintar_desde_cuadricula.py. Gana
  el grupo con más celdas. Verificado con el lector real en Chrome sobre las
  37 láminas: ΔE mínimo ≥ 9 en todas; 8 láminas con un número menos. El
  avance guardado (índices de celdas) sigue sirviendo.
- Mensaje de victoria: 5 s (antes 3 s), pedido del usuario.

## Colorear — nuevo, solo modo desarrollador (2026-10-21)
- Pintar con PINCEL libre sobre las láminas de Imprimir (pedido explícito:
  sin balde, sin cerrar bordes, sin vectorizar). Lámina encima con
  mix-blend-mode multiply → la línea negra nunca se tapa.
- src/components/ColorearJuego.jsx + .css; utils/dibujosColorear.js
  (IndexedDB 'musica-kids-colorear'). Vista 'colorear' en MenuActividades,
  volver propio (volverColorear) para no tocar manejarVolver.
- Herramientas: 12 colores, 3 grosores, pincel/borrador, deshacer (12
  pasos), borrar todo, imprimir (lámina + color). "Mis dibujos": continuar,
  imprimir, borrar (doble toque), texto "Se borra en…".
- Guardado automático (0,8 s tras cada trazo y al salir). Cada dibujo se
  borra a las 48 h de EMPEZADO (no se renueva al seguir pintando); limpieza
  al abrir la app. Medido: ~53 KB capa + 23 KB miniatura por dibujo.
- Verificado con capturas del build (file://): laptop, tablet, tablet
  acostada, celular, celular acostado; recarga conserva; 49 h → se borra.
- Sin commit: otra sesión tenía cambios de Simón sin commitear en los mismos
  archivos (MenuActividades.jsx, este flujo).
- Rediseño preescolar (2026-10-21): bandeja de herramientas ilustradas
  (ColorearIconos.jsx: crayón con grano, plumón, pincel de borde suave,
  brillos, goma) + acciones aparte (deshacer, borrar todo con 2º toque en
  3 s, imprimir); bandeja de grosores + 17 colores en gotas (pieles, gris,
  blanco, arcoíris que cambia de tono en el trazo). Motor de trazos en
  utils/pincelesColorear.js. Horizontal: herramientas izq., colores der.;
  vertical: ambas bajo la hoja. Cursor en laptop (solo mouse): la
  herramienta dibujada con el color + anillo del grosor real.
- Zoom más liviano (2026-10-22, reclamo "pesado"): transform por rAF y
  `zoom` (botón %) solo al terminar el gesto; pellizco con 2 dedos SIEMPRE
  (si el 1er dedo alcanzó a pintar, el trazo se cancela); doble toque con
  la mano = 2,5x en ese punto / hoja entera; rueda 0.0028 (2x en 3 pasos),
  ctrl+rueda (touchpad) 0.012.
- Color (2026-10-22): sin botón "+". La rueda de colores ES el selector
  (abre la paleta completa); el arcoíris pasa a franjas para no confundirse
  con la rueda. El color elegido se suma a las opciones ("Mi color").
- Mano (2026-10-22): botón propio en la barra (tras la goma). Con la mano:
  1 dedo/mouse arrastra, 2 dedos pellizcan (1x–5x); rueda del mouse acerca
  siempre. La hoja es un marco fijo y .colorear-vista se transforma
  (translate+scale, origen 0 0) por estilo directo; la vista se limita para
  llenar siempre el marco. Botón "%" en la esquina vuelve a la hoja entera
  (también doble clic con la mano). Elegir herramienta/color apaga la mano.
  Grosor constante en pantalla (con zoom, más fino sobre la lámina).
  Verificado con toques CDP (pellizco y arrastre) en tablet.
- Destellos de festejo (2026-10-22): ExplosionChispas.jsx/.css (mismas
  chispas de Simón) al ganar Memorice, Rompecabezas, Contar, Secuencias,
  Diferencias y ambos Pintar por números (flag `celebrando` en
  MenuActividades). Verificado ganando un Memorice: 3 ráfagas.
- v5 (2026-10-22): goma y sello con botón propio en la barra (grupo
  herramientas: lápiz · sello · goma | estilo: color · tamaño | acciones).
  Panel de lápices = 10 lápices. Sello: panel de formas (Surtido = estado
  anterior, alterna todas; corazón, estrella, flor, huellita, círculo,
  nube, luna). Formas = trazados SVG 100×100 en FORMAS_SELLO, mismos para
  estampar (Path2D) e íconos. "En uso" (fondo + rayita) ≠ "abierto" (aro).
  Goma: 2º toque o elegir color vuelve a la última herramienta. Icono de
  tamaño = 3 trazos de grosor (el actual en color).
- v4 (2026-10-21, reclamo: tablet "atorado"): UNA barra compacta con 3
  selectores que muestran lo elegido (lápiz, color, tamaño) + deshacer/
  rehacer/borrar/imprimir. Cada selector despliega su panel sobre la hoja
  y se retrae al elegir, tocar fuera (ese toque no pinta) o Escape. "Más
  colores" vive dentro del panel de colores (con volver). Tamaño: vista,
  deslizador y 5 tamaños rápidos. Barra abajo en vertical, a la izquierda
  en horizontal. Hoja en tablet: 554×775 → 737×1032. Escape con panel o
  diálogo abierto ya no cierra el drawer (capaColorearAbiertaRef en
  MenuActividades, mismo patrón que panelAfinarRompAbiertoRef).
- v3 (2026-10-21, tras reclamo por falta de patrones): 12 herramientas
  (crayón, lápiz de color, plumón, pincel, acuarela, destacador, tiza,
  spray, neón, brillos, sellos corazón/estrella, goma). Acuarela, destacador
  y neón pintan en un canvas de trazo aparte y se funden al soltar (no se
  oscurecen sobre sí mismos). Tamaño = UN deslizador en cuña (6–60 px) para
  todas, con muestra del trazo real. "Más colores": diálogo con espectro
  12×6 + grises; el elegido queda como "Mi color" en la paleta. Borrar todo y
  borrar en Mis dibujos: diálogo de confirmación con miniatura (overlay
  .memory-victoria-overlay + .memory-niveles-modal, position fixed).
- Deshacer + Rehacer con flechas en gancho (LuUndo2/LuRedo2): la flecha
  circular parecía "recargar" (pedido). Trazo nuevo vacía Rehacer. 12 pasos.
- Simón: quitado el anillo blanco de 3 px por fuera del aro (pedido).
- Tarjeta: menu-general/colorear.avif (Skye pintando, Gemini), 640 px,
  16 KB, convertida con ffmpeg libaom-av1 crf 30 (PIL del sistema no trae AVIF).
- [ ] Usuario lo prueba en tablet (dedo real) y decide publicarlo.
- [x] Limpieza de 1 semana (2026-10-21): src/utils/caducidad.js, llamado en
  main.jsx antes de montar y al volver a primer plano. Todo "musica-kids-*"
  vence a 7 días de visto por primera vez, SALVO lista PERMANENTES: marcas
  de canciones (liked/loved/starred/unicorn) y modo desarrollador + sus
  borradores. Clave nueva que sea trabajo dev → agregarla a PERMANENTES.
  Verificado en Chrome (file://) simulando 8 días.

## Simón dice — nuevo, solo modo desarrollador (2026-10-21)
- src/components/SimonJuego.jsx + SimonJuego.css (CSS propio, no en App.css).
  Tarjeta `.memory-solo-dev` en Actividades; vista 'simon' en MenuActividades.
- Se elige un grupo de música: el fondo = gradient del tema, carcasa y centro =
  playerBg, anillo/brillos = accentColor. Los 4 botones (verde, rojo, azul,
  amarillo) son fijos. Grupos de fondo oscuro (listTextColor, Disney) ponen el
  header en blanco (.simon-fondo-oscuro).
- 10 niveles, 3 corazones (un error resta uno y repite la MISMA secuencia),
  récord por grupo en localStorage. Textos grandes animados: ¡Prepárate!,
  Nivel N, ¡Otra vez!, ¡Se acabó!. Sonido Web Audio (notas del Simon original).
- Verificado con capturas del build (file://, sin servidor) en laptop, tablet,
  tablet vertical, celular y celular acostado; partida completa hasta victoria.
- Commit + push 2026-10-21. Pendiente: que el usuario lo pruebe y decida publicarlo.
- 2026-10-21 (pedido): solo 5 grupos (SIMON_GRUPOS: Disney, Frozen, Moana, Paw
  Patrol, Toy Story) y "traje" por grupo en ESTILOS_GRUPO: aro con colores del
  personaje, carátula en el centro (Disney: cielo estrellado), píldoras/botones
  = cardBg/buttonPrimary, fondo animado (nieve, huellitas, olas+sol, nubes de
  Andy, destellos+estrella fugaz), motivo grabado en los botones (copo,
  huellita, ola, estrella de sheriff, destellos), chispas del motivo al acertar
  y al pasar de nivel, onda de luz al encender, "Nivel N" con el degradado del
  aro. Verificado con capturas en laptop, celular y celular acostado.
- Alerta (no tocado): en MenuActividades, rama `vista === 'pixel'` del título,
  la línea `colorHeader = devPin ? undefined : temaPin?.header;` pisa el header
  de pixel (parece pertenecer a la rama 'pintar').

## Tarjetas nuevas y título (2026-10-21)
- menu-general/pintar-numeros.avif y simon.avif (Skye, desde Gemini), 640 px.
  Conectadas: tarjeta oficial "Pintar por números" y "Simón dice" (se borró
  SimonMiniatura y su CSS, sin uso). El descontinuado sigue con pintar.avif.
  Título del tab sin emoji. Conexión de tarjetas: sin commit.

## Pintar: zoom, ayuda, progreso, stepper (2026-10-21)
- Celdas 52–80 px (antes 64–96), números sin 0, stepper en el header (celular:
  solo los cercanos), ayuda a los 15 s sin pintar, avance guardado por tema.
  Verificado (laptop y celular). Commit + push 2026-10-21.

## Favicon nuevo (2026-10-21)
- public/favicon.svg: corcheas blancas + estrella sobre degradado rosado de
  la app (reemplaza el rayo por defecto de Vite). Commit + push 2026-10-21.

## Celdas legibles para preescolares (2026-10-21)
- PintarJuego: mientras se pinta, celda mínima 64 px (número ~31 px), máx 96.
  El 3x relativo dejaba celdas chicas en láminas densas. Medido en 4 pantallas
  x 11 temas: 64–96 px. Commit + push 2026-10-21.

## Lote 5 (2026-10-21)
- OK: gato-negro, daisy-cara, donald-navidad. Cuadrícula descalzada (lámina
  quitada): minnie-mini, unicornio-cara, pooh-pensativo, pooh-sentado.
- Quitada la paleta de círculos bajo la lámina (pedido explícito).
- Zoom 3x confirmado en el juego oficial (build y versión publicada).
- Commit + push 2026-10-21.

## Pintar por números oficial = juego pixel (2026-10-21)
- Decisión del usuario: el juego de cuadrícula (interno "pixel") es el oficial,
  publicado como "Pintar por números"; el de niveles = "Pintar por números
  (descontinuado)", solo modo dev. Verificado en menú (móvil/laptop, con y sin dev).
- Casilla "Requiere limpieza" en Procesados (viaja en Copiar).
- Recreadas con cuadrícula corregida: anna-chibi, marciano, senor-cara-de-papa.
  Commit + push 2026-10-21.

## Descartar en Procesados + Rubble 40x30 (2026-10-21)
- Establecer cuadrícula: Descartar también en Procesados (borra original +
  lámina). Rubble recreada con 40x30.
- Pintar pixel art parte directo con lámina al azar pendiente (sin lista que
  muestre la figura); victoria "Te faltan N" + "Otra lámina". Verificado.
  Commit + push 2026-10-21.

## Pintar ampliado 3x (2026-10-21)
- PintarJuego (ambos juegos de pintar): celdas 3x (tope 96 px) mientras se
  pinta; 1 dedo pinta, 2 dedos desplazan (mouse: rueda/barras); auto-scroll
  a la primera celda del número nuevo si no se ve; al terminar vuelve a 1x.
  Verificado con capturas 1024x768. Commit + push 2026-10-21.

## Pintar pixel art: proceso nuevo + láminas Paw Patrol (2026-10-20)
- Recreación automática: ajuste de líneas a las reales + color dominante
  (script y vista previa idénticos, 0 celdas distintas verificado).
- Láminas creadas: paw-patrol/chase, rocky, ryder, skye (AVIF sin pérdida).
- Establecer cuadrícula: tabs En preparación / Procesados + Descartar
  (viaja en el texto de Copiar).
- [ ] frozen/elsa-chibi quedó con el proceso viejo: recrearla si el usuario quiere.
- Lote 2026-10-20 (26 cuadrículas): 16 láminas OK (incluida Rubble). 10 con
  cuadrícula descalzada → lámina quitada, vuelven a En preparación con su
  cuadrícula anotada: anna-cara, anna-chibi, elsa, olaf-cara, goofy-cara,
  pluto-cara, marciano, senor-cara-de-papa, pikachu, chase-cuerpo.
  Piglet: franja horizontal más clara a media altura (revisar).
- Lote 2 (16): 10 OK; 6 con cuadrícula descalzada (lámina quitada): arcoiris,
  mariposa, unicornio-pequeno, unicornio-perfil, dracula, fantasma-bruja.
- Portadas de los 8 temas propios reemplazadas por logos de internet
  (Commons, 1000logos; Halloween y Unicornios = emoji Noto). Regla en skill.
- Descartados y borrados: chase-casco, jessie, logo-toy-story.
- Commit + push 2026-10-21 (73058c6).

## Páginas del modo desarrollador compactas (2026-10-20)
- Bloque "VERSION COMPACTA" en App.css acotado a .dif-dev / .romp-catalogo
  (tabs, estado, botones, tarjetas). Editor de cuadrícula pixel: panel
  sticky con scroll propio, controles small, previa 220. Arreglado
  .dif-dev-acciones--fila (salía apilado). Verificado con capturas 1366x768
  y 1280x650. Sin capturar: drawer "afinar" y modal de propuesta de
  Rompecabezas (solo cambian sus botones). Commit + push 2026-10-21.

## Visibilidad de Actividades (2026-10-20)
- Ya no depende del responsive: publicados en todas las vistas (móvil
  incluido); no publicados (.memory-solo-dev / soloDev) y herramientas
  (.dif-dev-btn, .romp-catalogo-btn) solo con modo desarrollador. Build OK,
  sin captura. Commit + push 2026-10-21.

## Diferencias en vertical (2026-10-20)
- DiferenciasJuego calcula lado a lado vs apiladas y usa la que da
  imágenes más grandes (.dif-par--apiladas). Build OK, sin captura. Commit + push 2026-10-21.

## Pintar pixel art — carga masiva (2026-10-20)
- 72 originales nuevos recortados en pintar-pixel/<tema>/originales/ desde
  Downloads/"pixel art" (13 categorías). Temas nuevos en TEMAS_PIXEL_PROPIOS
  con portada.avif: hello-kitty, kpop, winnie-pooh, bluey, halloween,
  pokemon, sonic, unicornio. Frozen, Mickey, Moana, Paw Patrol y Toy Story
  usan su dorso del Memorice.
- Omitidos: Winnie "descarga (41)" (= 23), Mickey "descarga (30)" (= 24),
  Frozen "Image recherchée…" (= elsa-chibi ya cargada). Collage Mickey
  "descarga (6)" dividido en 6 (*-mini). Tapados íconos de Google Lens/flechas
  en anna-cara, unicornio-pony, elsa, hello-kitty; texto "27 x 21" en
  unicornio-arcoiris; firma en senor-cara-de-papa.
- winnie-pooh/igor es FOTO de un papel en perspectiva: la cuadrícula no es
  regular; probablemente no sirva.
- Portadas solo se ven en el selector cuando el tema tenga ≥1 lámina; hoy
  los temas nuevos aparecen únicamente en "Establecer cuadrícula".
- [ ] Usuario establece cuadrículas → recrear láminas (pintar_desde_cuadricula.py).
- [ ] Commit + push 2026-10-21.

## Decisiones Pintar por números (2026-10-19)
- Imágenes propias del juego (no se reusan las de Rompecabezas), en
  src/assets/pintar/<tema>/nivel-<n>/. Skill: skills/agregar-pintar.md.
- Niveles por tamaño de cuadrícula (valores iniciales; los vigentes en
  skills/agregar-pintar.md): 10/6, 14/8, 18/10, 24/12 (lado largo /
  tope de colores). Se desbloquea terminando todas las láminas del nivel.
- Orden obligado 01→02→03; se pinta tocando o arrastrando (trazo
  interpolado: Chrome agrupa los pointermove y dejaba huecos).
- Cuadrícula calculada en el navegador (k-means + mayoría por celda); números
  de más a menos celdas; transparente = celda vacía.
- Tarjeta del menú provisional: corazón pixel art hecho a mano
  (menu-general/pintar.avif). Las otras tarjetas son ilustraciones de Skye.
- Temas como en los demás juegos: card del selector = dorso del Memorice.
- Primera lámina: moana/nivel-4/maui-perfil.avif (desde Downloads
  "descarga (5).jpg"; misma imagen que el Memorice y moana_052, pedido
  explícito). Nivel 4 elegido por el usuario tras ver los 4 tamaños (en 1–2
  no se reconoce). Moana parte en "Nivel 4" mientras sea la única lámina.
- Script para ver una imagen en los 4 niveles antes de asignarla: el del
  scratchpad de la sesión 2026-10-19 (vista-niveles.mjs) inyecta
  utils/pintarNumeros.js en Chrome headless; reconstruirlo si hace falta.

## Decisiones tomadas esta sesión (2026-10-11 a 13)
- 2026-10-11 Catálogo de Rompecabezas y Modo desarrollador de Diferencias
  separan "Por afinar" / "Listos" (EstadoDevTabs). Diferencias: por afinar =
  par sin coordenadas. Rompecabezas: nuevos van en `porAfinar` del tema.
- 2026-10-11 Propuesta de asignación (RompecabezasPropuesta.jsx): panel lateral
  por imagen (12–42 piezas), en ambos tabs; botón "Propuesta N" al centro del
  header con Copiar/Vaciar. Imágenes en la propuesta = borde violeta.
- 2026-10-11 Niveles de 36 y 42 piezas declarados en los 3 temas.
- 2026-10-11 Modal "Reiniciar" del Rompecabezas: nivel → grilla de miniaturas
  (armados en color y rejugables, faltantes en gris). Registro de armados
  { desde, ids } se vacía solo a las 24 h; nivel máximo NO se reinicia.
- 2026-10-11 Excluidos al incorporar (duplicaban existentes): frozen d3d1768f…
  (= frozen_009), toy story d680fdad… (= toy_story_005).
- 2026-10-11 Desechados por el usuario (archivos borrados, códigos no se
  reutilizan): toy_story_031, paw_patrol_034, 037, 038, 042, 044.

- 2026-10-11 Fix: al ganar en un nivel ya superado con pendientes, saltaba al
  siguiente (Rompecabezas y Diferencias). Ahora se sigue en el nivel mientras
  falte alguno. Fix: grilla del modal Reiniciar se superponía en móvil
  (aspect-ratio → padding-bottom; la grilla scrollea).

- 2026-10-11 Memorice: temas nuevos Mickey (nombre fijo) y Moana (grupo moana),
  24 caras + dorso cada uno, en AVIF. Dorso de Mickey: se le borró un ícono
  de Google Lens del recorte. FALTA fondo.avif de ambos → "Muy pronto".
- 2026-10-11 Moana renovada por el usuario: salen 4 paisajes, entran 3
  (moana-palmera, moana-nadando, maui-y-moana) → 23 fotos (tope 42 cartas).
  El "24°" era un duplicado descargado en Downloads/ raíz.

- 2026-10-11 Memorice: fondo.avif pasa a ser OPCIONAL (pedido: "dejarlas
  disponibles"); sin él, el drawer usa fondoAlterno (degradado del tema).
  Mickey y Moana jugables. El selector muestra el dorso de todo tema con back.
- 2026-10-11 Rompecabezas: temas nuevos Mickey (34) y Moana (59) en porAfinar,
  códigos mickey_001–034 / moana_001–059. Excluidos: 2 = fotos del Memorice
  (mickey 21, moana 23), 2 iguales al Memorice por hash (moana 6, 7),
  2 duplicados internos (moana 19, 27). Se juegan cuando se asignen a niveles.

- 2026-10-12 Tabs de las páginas de trabajo renombrados: "En preparación" /
  "Procesados" (Rompecabezas y Diferencias). Texto de la Propuesta también.
- 2026-10-12 Diferencias por ZONA: { zona: [[x,y],...] } (libre o rectángulo
  en el Modo desarrollador); acierto = click dentro (+MARGEN_ZONA 1.5%); check
  en el centro del rectángulo que la encierra. Los puntos viejos siguen
  valiendo. Lógica en src/utils/zonasDiferencias.js.

- 2026-10-13 Fix Rompecabezas: al elegir otro rompecabezas justo después de
  ganar, el nuevo (sin hacer) quedaba marcado como armado. Ahora el tablero
  guarda su rompId y la victoria solo cuenta si coincide.
- 2026-10-13 Reinicio progresivo (reemplaza el vaciado cada 24 h): 7 días sin
  armar nada en el tema → se BLOQUEA el nivel más alto (+ armados de ese y del
  nuevo tope); luego 4, 2 y 1 día por nivel; el nivel 1 nunca se bloquea;
  armar uno reinicia el reloj. src/utils/desgasteRompecabezas.js.

- 2026-10-13 Acierto en Diferencias: la zona encontrada se ilumina (borde y
  relleno verdes, misma forma que en el Modo desarrollador) + check chico en
  su centro; reemplaza al círculo grande (que queda solo para puntos viejos).

- 2026-10-13 Fix Modo desarrollador Diferencias: la imagen saltaba al primer
  click de una zona (aparecían los botones Cerrar/Deshacer/Cancelar y la barra
  crecía). Ahora esos botones están siempre (deshabilitados) y la lectura de
  coordenadas tiene ancho fijo. Pendiente que el usuario confirme en pantalla.

## Pendiente
- [x] Primera lámina de Moana cargada (nivel 4). Faltan más láminas/temas.
- 2026-10-19 Maui DESECHADO (se perdía demasiado). Reemplazo:
  moana/nivel-4/moana-y-pua.avif (chibi, Downloads/pixel/1ba2a4f6….jpg).
- 2026-10-19 Niveles afinados: 12/18/24/32 (antes 10/14/18/24). Imagen
  original tenue detrás de las celdas sin pintar (opacidad 0.55 + celdas
  semitransparentes). "Revelar la imagen real" descartado por el usuario.
- 2026-10-19 Niveles otra vez un poco más finos: 14/20/28/36. Imagen de
  fondo más transparente (opacidad 0.3).
- 2026-10-19 TODOS los juegos: el modal de victoria aparece 3 s después de
  completar (clase .victoria en el overlay, retardo por CSS) para apreciar
  el resultado; el de "Elige un nivel" sigue inmediato. Emojis del modal
  (🎉🧩🏆🔢) reemplazados por iconos SVG de react-icons/gi: en la tablet
  salían como símbolo desconocido.
- 2026-10-19 Chibi moana-y-pua DESECHADO. Nuevas en
  moana/por-asignar/: maui, moana, moana-bebe (Downloads/pixel). Carpeta
  por-asignar = "En preparación" (no se juega).
- 2026-10-19 Modo desarrollador de Pintar (PintarDev.jsx): cada imagen en los
  4 niveles ya pintada + datos (cuadrícula, colores, celdas, % del 01).
- 2026-10-19 Modo desarrollador de Pintar: checkbox por nivel + Descartar
  (una elección por lámina), barra "Propuesta N" con Copiar/Vaciar
  (utils/propuestaPintar.js, guardada en localStorage). Formato del texto en
  skills/agregar-pintar.md.
- [x] Propuesta aplicada (2026-10-19): moana → nivel-3, moana-bebe →
      nivel-4, maui descartado (borrado). Moana jugable, parte en Nivel 3.
- 2026-10-19 Tanda 2 en por-asignar (12): moana/ maui-anzuelo,
  moana-perfil, moana-bebe-conchas, te-fiti, moana-retrato (Downloads/pixel);
  toy-story/ forky, rex, jessie, woody, marciano, woody-chibi, buzz-chibi
  (Downloads/toystory). Recortadas al personaje: jessie (sin marca de agua
  freesvgdownload), marciano, woody-chibi, buzz-chibi.
- [x] Propuesta Toy Story aplicada (2026-10-19): nivel-4 = buzz-chibi,
      forky, marciano, rex; descartados (borrados) jessie, woody, woody-chibi.
      Toy Story jugable, parte en Nivel 4.
- [x] Propuesta Moana tanda 2 aplicada (2026-10-19): nivel-4 = maui-anzuelo,
      moana-retrato, te-fiti; descartados (borrados) moana-bebe-conchas,
      moana-perfil. Estado: Moana = nivel 3 (1) + nivel 4 (4); Toy Story =
      nivel 4 (4). Nada en preparación.
- 2026-10-19 Frozen (tema nuevo en Pintar) en frozen/por-asignar/: olaf,
  elsa (recortada), elsa-trenza, anna, elsa-copo-3d, olaf-nieve-3d
  (Downloads/frozen). Propuesta aplicada: anna → nivel-3 (Frozen jugable).
  Las otras 5 siguen en por-asignar (no descartadas).
- 2026-10-19 Conclusión del usuario: "no es lo mismo pixelear una imagen
  que tener una imagen creada como pixel art". Prototipo v2 (contornos +
  fondo vacío + Lab, scratchpad algoritmo-v2.js) dio poca mejora a 36; a 64
  mejora pero ~2300 celdas + zoom. Propuesto (sin respuesta): detectar la
  cuadrícula nativa de imágenes pixel art (perler/hama beads, pixel art)
  → 1 cuadro = 1 celda, color exacto.
- 2026-10-19 Nivel 5 agregado a Pintar: 44 celdas lado largo, 14 colores.
  Sin láminas todavía (no aparece en el juego hasta que tenga alguna).
- 2026-10-20 Frozen: descartados (borrados) elsa, elsa-copo-3d, elsa-trenza,
  olaf. Queda olaf-nieve-3d en por-asignar (no venía en la propuesta).
- 2026-10-20 Paw Patrol en paw-patrol/por-asignar/ (9, Downloads/pawpatrol):
  everest, everest-cara, rocky, ryder, skye, rubble, skye-cara, marshall-cara,
  chase-cara. Rótulo "Easy Drawing Guides" tapado con blanco puro (ffmpeg:
  format=rgb24 ANTES de drawbox; sin eso el parche sale gris 235) en everest,
  rocky, ryder, skye, rubble. marshall-cara recortado al personaje.
  Propuesta aplicada: nivel-4 = everest-cara, rubble, skye-cara; nivel-5 =
  rocky; descartados (borrados) marshall-cara, ryder. Siguen en por-asignar:
  chase-cara, everest, skye.
- 2026-10-20 Pintar por números habilitado de tablet para arriba
  (.memory-solo-tablet). Modo desarrollador sigue solo laptop.
- 2026-10-20 Propuesta Paw Patrol 2: chase-cara → nivel-4; descartados
  everest, skye. Paw Patrol sin nada en preparación. (Sin commit todavía.)
- 2026-10-20 PRUEBA pixel art con patrón (Downloads/descarga (1).jpg, Elsa
  con grilla dibujada): extractor Python en scratchpad (extraer_patron4.py:
  área del patrón → período de la grilla por autocorrelación → pixel más
  claro del centro de cada celda → paleta Lab ΔE14 + limpieza de raros).
  Resultado nítido, 15 colores, pero 86×108 = 9.288 celdas (inviable en
  tablet). Reducido a la mitad (43×54 = 2.322) se reconoce, contornos más
  gruesos.
- 2026-10-20 IMPLEMENTADO modo pixel art nativo: archivos <nombre>.pixel.avif
  (cada cuadro = bloque 8×8), cuadricularPixelArt en utils/pintarNumeros.js,
  extractor en herramientas/extraer_pixel_art.py. Verificado: el juego lee
  el AVIF 1 a 1 con el patrón (15/15 colores, 0 mezclas). Usuario aclaró que
  la idea era respetar las líneas del patrón → Elsa cargada a tamaño
  completo: frozen/por-asignar/elsa-patron.pixel.avif (86×108).
  [ ] Revisar en el Modo desarrollador y en tablet (9.288 celdas). Commit + push 2026-10-21.
- 2026-10-20 Usuario: "no entendí; no veo la cuadrícula; debería verse la
  imagen original dividida en la grid en posición exacta". Hecho: extractor
  guarda <nombre>.patron.avif (recorte desde la 1ª línea); Modo
  desarrollador muestra patrón original + cuadrícula del juego (tenue) +
  LUPA 16×16 que sigue al mouse + "En el juego" con líneas de celda.
  Bug corregido: fila y columna falsas sobre el marco/numeración (ahora
  solo cuadros completos) → Elsa 85×107 = 9.095 celdas.
- 2026-10-20 Usuario: "no funciona, es una mierda" → DESCARTADA la detección
  automática (borrados herramientas/extraer_pixel_art.py y los .pixel/.patron).
  NUEVO: cuadrícula ajustada a mano. Modo desarrollador con 2 pestañas:
  "Asignar niveles" (página ORIGINAL intacta: 5 niveles + Descartar +
  propuesta Copiar/Vaciar — el usuario exigió no tocarla) y "Establecer
  cuadrícula" (elige lámina → PintarCuadriculaEditor: marcar esquinas +
  columnas/filas, arrastrar, números, zoom, vista en vivo → Guardar en
  navegador → "Copiar cuadrículas" → anotar en src/data/pintarCuadriculas.js,
  clave <tema>/<nombre>). Juego: cuadricularConGrilla (percentil 75 del
  centro, MISMO_COLOR 5500, raros al frecuente). Elsa original en
  frozen/por-asignar/elsa-patron.cuadricula.avif. [ ] Usuario ajusta y pega.
  Commit + push 2026-10-21.
- 2026-10-20 Agregada frozen/por-asignar/elsa-chibi.cuadricula.avif (pixel art
  ~23×28 con cuadrícula, Downloads/"Image recherchée visuellement.jpg").
  Descartados (borrados) elsa-patron.cuadricula y olaf-nieve-3d.
  [x] Usuario ajustó la cuadrícula de elsa-chibi (24×29 sobre el original).
- 2026-10-20 DECISIÓN del usuario: con la cuadrícula, dibujar la lámina DESDE
  CERO (no leer el original en cada partida). herramientas/pintar_desde_cuadricula.py
  → elsa-chibi.cuadricula.avif reemplazada por la lámina limpia 24×29 (AVIF
  sin pérdida, 2 KB, 9 colores, verificada pixel a pixel) + cuadrícula 1 px
  en src/data/pintarCuadriculas.js. Juego lee colores exactos (limpia =
  sin fusionar). Fix: muestreo con cuadros de 1 px tomaba el vecino.
- 2026-10-20 CORRECCIÓN DEL USUARIO (no se había entendido): el método de
  cuadrícula es un JUEGO APARTE "Pintar pixel art", experimental, solo
  laptop; después decide si unificar o quedarse con uno. "Pintar por números"
  RESTAURADO idéntico al commit 78c787d (MenuActividades parte Pintar,
  PintarDev, PintarJuego, pintarNumeros, App.css) + PintarJuego con 2 props
  opcionales (calcular, nitida) que el juego viejo no usa.
  Juego nuevo: src/assets/pintar-pixel/<tema>/{originales,laminas}/,
  PintarPixelDev ("Establecer cuadrícula"), utils/pintarPixel.js
  (recrearConGrilla = vista previa, laminaDePixelArt = juego), sin niveles,
  la cuadrícula manda, máx. 15 colores. Primera lámina: frozen/elsa-chibi
  (24×29, 9 colores), verificada jugando completa sin servidor.
  [ ] Siguiente imagen del usuario. Commit + push 2026-10-21.
- 2026-10-20 DECISIÓN: "Pintar pixel art" es la opción que se queda (mucho
  mejor). Pero "Pintar por números" NO se quita todavía: está en uso. Plan:
  1) crear más láminas pixel art (sigue experimental, solo laptop);
  2) recién entonces lanzarla (habilitar en tablet) y decidir el retiro del
  juego antiguo. No adelantar ninguno de esos pasos sin orden del usuario.
- 2026-10-20 "Establecer cuadrícula" muestra SOLO imágenes <nombre>.cuadricula.avif
  (las láminas del método normal no se repiten ahí). "Asignar niveles" sigue
  mostrando todo (página original intacta).
- Verificación SIN servidor del build: scratchpad vv-sin-servidor.mjs
  (puppeteer intercepta http://local.test/musica-kids/ y sirve dist/).
- 2026-10-20 Memoria nueva: no levantar ni detener servidores sin permiso.
  Verificación de láminas SIN servidor: scratchpad vista-tema.mjs (inyecta
  pintarNumeros.js en Chrome headless, lee NIVELES_PINTAR del menú).
- Nota: en nivel 4 con imagen casi cuadrada (33×36) la celda queda ~15 px
  en laptop y el número en 8 px; vigilar legibilidad en la tablet.
- [ ] Ofrecido, sin respuesta: fondo blanco = 01 con 426 de 736 celdas
      (58%); propuesta de dejarlo como celdas vacías (relleno desde los bordes).
- [ ] Pintar por números: ¿tarjeta del menú definitiva (estilo Skye)?
- [x] Pintar por números: commit + push a main (2026-10-20, pedido explícito).
- 2026-10-12 Los 5 pares de Diferencias pasados a "En preparación" (mapa de
  diferencias.js vacío; descripciones de cada par conservadas como comentario).
  El juego queda "Muy pronto" hasta que se peguen las zonas.
- [x] Usuario re-marca los 5 pares como zonas (2026-10-13): los 5 procesados
      (paw-patrol 001–004, toy-story 001). Diferencias sin nada en preparación.
- [x] Usuario asigna niveles a Mickey/Moana en el catálogo (Propuesta) → muevo códigos.
      Hecho 1ª tanda Mickey (12) y Moana (16), 2026-10-11: ambos jugables.
      2ª tanda Mickey (12): nivel 6 (42 piezas) abierto en Mickey.
      2ª tanda Moana (8).
      3ª tanda Mickey (8).
      3ª tanda Moana (8).
      Desechados mickey_005 y mickey_026 (archivos borrados, códigos no se
      reutilizan): Mickey sin por afinar.
      4ª tanda Moana (20) y 5ª (4). Desechados moana_029, 041, 057.
      Rompecabezas sin nada por afinar: 210 listos en 5 temas.
- [x] Fondo Memorice Mickey agregado (centrado abajo: fondoPosicion). Moana
      queda SIN fondo a propósito (decisión del usuario).
- 2026-10-11 Memorice Moana completo (24): maui-perfil.avif. Es la MISMA imagen
  que el rompecabezas moana_052; el usuario autorizó usarla en los dos juegos
  (excepción puntual a la regla de no reciclar).
- [x] Commit 629f8a8 en main y push (2026-10-11): Memorice + rompecabezas Mickey/Moana.
- [ ] Revisar en pantalla: catálogo (tabs, panel lateral, Propuesta) y grilla
      del modal Reiniciar (móvil/tablet/laptop/desktop).
- [ ] paw_patrol_035 y paw_patrol_045 (mismo dibujo) están ambos en 18 piezas:
      el usuario decide si saca uno.
- [x] Commit fdb2896 en main y push (2026-10-11): dispara el deploy automático.

## Contexto crítico
- Script de asignación usado: mueve códigos de porAfinar a su nivel dentro
  de TEMAS_ROMPECABEZAS_META (ojo: TEMAS_META del Memorice repite los ids de tema).
