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

## Pendiente
- [ ] Revisar en pantalla: catálogo (tabs, panel lateral, Propuesta) y grilla
      del modal Reiniciar (móvil/tablet/laptop/desktop).
- [ ] paw_patrol_035 y paw_patrol_045 (mismo dibujo) están ambos en 18 piezas:
      el usuario decide si saca uno.
- [x] Commit fdb2896 en main y push (2026-10-11): dispara el deploy automático.

## Contexto crítico
- Script de asignación usado: mueve códigos de porAfinar a su nivel dentro
  de TEMAS_ROMPECABEZAS_META (ojo: TEMAS_META del Memorice repite los ids de tema).
