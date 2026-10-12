# Flujo activo — musica-kids
Actualizado: 2026-10-11

## Tarea actual
Rompecabezas nuevos: incorporación terminada. 61 nuevos asignados a niveles,
6 desechados, nada por afinar. Falta revisión en pantalla y commit.

## Decisiones tomadas esta sesión
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

## Pendiente
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
- [ ] Commit de todo lo de Memorice + rompecabezas nuevos (no comiteado aún).
- [ ] Revisar en pantalla: catálogo (tabs, panel lateral, Propuesta) y grilla
      del modal Reiniciar (móvil/tablet/laptop/desktop).
- [ ] paw_patrol_035 y paw_patrol_045 (mismo dibujo) están ambos en 18 piezas:
      el usuario decide si saca uno.
- [x] Commit fdb2896 en main y push (2026-10-11): dispara el deploy automático.

## Contexto crítico
- Script de asignación usado: mueve códigos de porAfinar a su nivel dentro
  de TEMAS_ROMPECABEZAS_META (ojo: TEMAS_META del Memorice repite los ids de tema).
