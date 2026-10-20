# Flujo activo — musica-kids
Actualizado: 2026-10-20

## Tarea actual
Juego "Pintar por números" publicado (commit + push 2026-10-20): 4 temas
jugables (Moana, Toy Story, Frozen, Paw Patrol), 13 láminas, 5 niveles
(14/20/28/36/44). De tablet para arriba. Láminas nuevas: skill
skills/agregar-pintar.md (por-asignar → Modo desarrollador → propuesta).

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
