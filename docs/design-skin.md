# Design Skin — Mi Musica Kids

> Sistema de diseño completo basado en 5 iteraciones de investigación:
> competencia, tendencias UI 2025-2026, psicología del color infantil,
> marketing y UX para apps de niños.

---

## 1. Filosofía de Diseño

### Principios Fundamentales

1. **Claridad sobre decoración** — Los padres priorizan "claridad de diseño" como feature #1 (Broekman et al., University of Amsterdam). Cada elemento debe tener un propósito visible.

2. **Seguridad como ventaja competitiva** — La confianza del cuidador es el gateway para que el niño use la app. Señales de confianza visibles: "Sin anuncios, sin compras", candado visible, controles parentales accesibles.

3. **Dualidad de usuarios** — El niño navega, el padre controla. Dos experiencias separadas conectadas por un "conector" (el candado/PIN).

4. **Profundidad táctil** — Los niños responden a elementos que parecen tocables. Claymorphism en botones, glassmorphism en contenedores de información.

5. **Color como herramienta, no como adorno** — Los colores dirigen la atención (niños 3-5 son 27% más propensos a fijarse en elementos de alto contraste). Usar saturación alta para interacción, pastel para fondo.

---

## 2. Estilo Visual: Claymorphism + Glassmorphism Híbrido

### Por qué este híbrido

| Elemento | Estilo | Razón |
|----------|--------|-------|
| Botones principales | **Claymorphism** | Cream "deseo de tocar" — reduce carga cognitiva (Fogg Behavior Model) |
| Cards de contenido | **Glassmorphism** | Crea jerarquía espacial sin perder contexto — el niño sabe dónde está |
| Header | **Glassmorphism** | Wayfinding — mantiene orientación |
| Playlist items | **Claymorphism ligero** | Cada canción se siente como un objeto tangible |
| Modal PIN | **Glassmorphism** | Overlay que no destruye el contexto subyacente |

### Recetas CSS

#### Claymorphism (Botones, Items)
```css
/* Botón claymorphic */
.clay-button {
  border-radius: 20px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    inset -3px -3px 8px rgba(0, 0, 0, 0.15),
    inset 3px 3px 8px rgba(255, 255, 255, 0.3),
    6px 6px 16px rgba(0, 0, 0, 0.12),
    -2px -2px 8px rgba(255, 255, 255, 0.1);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.clay-button:active {
  transform: scale(0.95);
  box-shadow:
    inset 3px 3px 8px rgba(0, 0, 0, 0.2),
    inset -3px -3px 8px rgba(255, 255, 255, 0.15),
    2px 2px 8px rgba(0, 0, 0, 0.08);
}
```

#### Glassmorphism (Cards, Header)
```css
/* Card glassmorphic */
.glass-card {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}
```

---

## 3. Paleta de Colores por Tema

### Principios de Color Infantil (Investigación)

- **Preferencias 3-6 años**: Amarillo > Verde > Naranja > Rojo > Azul
- **Saturación**: Apps infantiles usan saturación más alta que apps de adultos
- **Brillo**: Colores más brillantes atraen más atención en niños
- **Género**: Niñas prefieren amarillo, niños prefieren verde (diferencia significativa, p<0.01)
- **Reconocimiento**: Rojo (80-85% a 3 años), Amarillo (75-82%), Azul (58-65%), Verde (55-63%)

### Bluey

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#4A90D9` | Acciones principales, acento primario |
| `primaryLight` | `#88CAFC` | Superficies glass, hover states |
| `primaryDark` | `#2B4A7A` | Gradientes del player |
| `accent` | `#EDCC6F` | Botones, badges, highlights |
| `accentRgb` | `237, 204, 111` | Para rgba() dinámico |
| `surface` | `#EAF4FD` | Fondo de cards |
| `surfaceTinted` | `rgba(234, 244, 253, 0.85)` | Glass con tinte |
| `text` | `#1E2A3A` | Texto principal |
| `textSecondary` | `#5A7A9A` | Texto secundario |
| `playerGradient` | `linear-gradient(180deg, #88CAFC 0%, #4A90D9 50%, #2B4A7A 100%)` | Player card |
| `headerGradient` | `linear-gradient(90deg, #4A90D9, #88CAFC)` | Header |
| `pageGradient` | `linear-gradient(160deg, #D6ECFA 0%, #C2E0F6 40%, #E8F4FD 100%)` | Background |

### Sky (Paw Patrol)

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#D63384` | Acciones principales |
| `primaryLight` | `#F06292` | Superficies glass |
| `primaryDark` | `#9C2060` | Gradientes del player |
| `accent` | `#FFB300` | Botones, badges |
| `accentRgb` | `255, 179, 0` | Para rgba() dinámico |
| `surface` | `#FFF0F6` | Fondo de cards |
| `surfaceTinted` | `rgba(255, 240, 246, 0.85)` | Glass con tinte |
| `text` | `#4A1942` | Texto principal |
| `textSecondary` | `#9B4D8A` | Texto secundario |
| `playerGradient` | `linear-gradient(180deg, #F06292 0%, #D63384 50%, #9C2060 100%)` | Player card |
| `headerGradient` | `linear-gradient(90deg, #D63384, #F06292)` | Header |
| `pageGradient` | `linear-gradient(160deg, #FFE4EF 0%, #FFD6E8 40%, #FFF0F6 100%)` | Background |

### 31 Minutos

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#E67E22` | Acciones principales |
| `primaryLight` | `#F39C12` | Superficies glass |
| `primaryDark` | `#BF5600` | Gradientes del player |
| `accent` | `#C0392B` | Botones, badges |
| `accentRgb` | `192, 57, 43` | Para rgba() dinámico |
| `surface` | `#FFF5E6` | Fondo de cards |
| `surfaceTinted` | `rgba(255, 245, 230, 0.85)` | Glass con tinte |
| `text` | `#3E2723` | Texto principal |
| `textSecondary` | `#8D6E63` | Texto secundario |
| `playerGradient` | `linear-gradient(180deg, #FF9800 0%, #E67E22 50%, #BF5600 100%)` | Player card |
| `headerGradient` | `linear-gradient(90deg, #E67E22, #F39C12)` | Header |
| `pageGradient` | `linear-gradient(160deg, #FFE8CC 0%, #FFD9B3 40%, #FFF5E6 100%)` | Background |

### Casa de Munecas

| Token | Valor | Uso |
|-------|-------|-----|
| `primary` | `#A855F7` | Acciones principales |
| `primaryLight` | `#CE93D8` | Superficies glass |
| `primaryDark` | `#7B1FA2` | Gradientes del player |
| `accent` | `#2DD4BF` | Botones, badges |
| `accentRgb` | `45, 212, 191` | Para rgba() dinámico |
| `surface` | `#F5EEFF` | Fondo de cards |
| `surfaceTinted` | `rgba(245, 238, 255, 0.85)` | Glass con tinte |
| `text` | `#3B1F6E` | Texto principal |
| `textSecondary` | `#8B6AAF` | Texto secundario |
| `playerGradient` | `linear-gradient(180deg, #CE93D8 0%, #A855F7 50%, #7B1FA2 100%)` | Player card |
| `headerGradient` | `linear-gradient(90deg, #A855F7, #CE93D8)` | Header |
| `pageGradient` | `linear-gradient(160deg, #EDE0FF 0%, #F0E4FF 40%, #F5EEFF 100%)` | Background |

---

## 4. Tipografía

### Fuentes

| Fuente | Peso | Uso | Por qué |
|--------|------|-----|---------|
| **Fredoka** | 600-700 | Títulos, botones principales | Redondeada, juguetona, legible |
| **Nunito** | 400-600 | Body text, descripciones | Redondeada, limpia, buena legibilidad |
| **Comic Neue** | 400-700 | Fallback / alternativa | similar a Fredoka, amplia disponibilidad |

### Escala de Tamaños

| Elemento | Tamaño | Peso | Line-height |
|----------|--------|------|-------------|
| Header title | `clamp(18px, 4vw, 24px)` | 700 | 1.2 |
| Card title | `clamp(16px, 3vw, 20px)` | 700 | 1.3 |
| Song title | `clamp(14px, 2.5vw, 18px)` | 600 | 1.3 |
| Body text | `clamp(13px, 2vw, 16px)` | 400 | 1.5 |
| Small / labels | `clamp(11px, 1.8vw, 13px)` | 400 | 1.4 |
| Time labels | `12px` | 400 | 1.0 |

### Reglas
- Nunca usar fuentes con serif en interfaces infantiles
- Letter-spacing: `0.02em` en body, `0.01em` en títulos
- Texto oscuro en fondos claros (WCAG AA mínimo 4.5:1)

---

## 5. Spacing y Layout

### Grid

| Breakpoint | Columns | Gap | Max-width |
|------------|---------|-----|-----------|
| Mobile (≤640px) | 1 (stacked) | 10-12px | 100% |
| Tablet (641-1024px) | 2 (side-by-side) | 16px | 960px |
| Desktop (≥1025px) | 2 (side-by-side) | 20px | 960px |

### Espaciado base: 4px

| Múltiplo | Valor | Uso |
|----------|-------|-----|
| 1x | 4px | Gap mínimo entre elementos hermanos |
| 2x | 8px | Padding interno de items pequeños |
| 3x | 12px | Gap entre secciones en mobile |
| 4x | 16px | Padding de cards, gap en tablet |
| 5x | 20px | Padding de header, secciones |
| 6x | 24px | Padding de modales |
| 8x | 32px | Secciones grandes |

### Border Radius

| Elemento | Radius | Estilo |
|----------|--------|--------|
| Cards | `24px` | Claymorphism / Glassmorphism |
| Botones principales | `20px` | Claymorphism |
| Botones secundarios | `14px` | Claymorphism ligero |
| Items de playlist | `14px` | Hover clay |
| Avatar / Cover | `20px` | Coherente con cards |
| Modal | `28px` | Glass overlay |
| Inputs | `16px` | Soft, touchable |

---

## 6. Componentes

### Header

```
┌─────────────────────────────────────────────────┐
│  🎵 Mi Musica              [🎨] [🔓]           │
│  ═══════════════════════════════════════════════  │
│  ← border-bottom: 3px solid accent              │
└─────────────────────────────────────────────────┘
```

- Glass background: `backdrop-filter: blur(16px)`, `rgba(255,255,255,0.1)`
- Border bottom: `3px solid {accent}`
- Botones: icon-only, 40x40px, `border-radius: 12px`, hover `rgba(255,255,255,0.18)`
- Title: Fredoka 700, `clamp(18px, 4vw, 24px)`, color `#fff`

### Player Card

```
┌───────────────────────────────┐
│      ┌──────────────┐         │
│      │  Cover Art   │         │  ← borderRadius: 24px
│      │  120-200px   │         │  ← shadow: 0 8px 32px rgba(0,0,0,0.2)
│      └──────────────┘         │
│                               │
│       Song Title              │  ← Fredoka 700
│       Artist Name             │  ← Nunito 400, opacity 0.8
│                               │
│  0:00 ════════════ 3:45       │  ← slider con track blanco semitransparente
│                               │
│    [🔀] [⏮] [▶️] [⏭] [🔁]   │  ← play btn: 64px, claymorphism
│                               │
│    🔊 ════════                 │  ← volumen: max-width 180px
└───────────────────────────────┘
```

- Background: `playerGradient` del tema
- Glass overlay sutil: `::before` con `rgba(255,255,255,0.05)`
- Play button: claymorphism completo, `scale(1.08)` en hover, `scale(0.95)` en active
- Control buttons: `rgba(255,255,255,0.8)`, hover `rgba(255,255,255,0.15)`
- Cover art: `box-shadow: 0 8px 32px rgba(0,0,0,0.25)`, pulsing animation cuando play

### Playlist Card

```
┌───────────────────────────────┐
│  Canciones (1)                │  ← card title
├───────────────────────────────┤
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  │ [Cover] Title      [▶️] │  │  ← item: claymorphism ligero
│  │          Artist         │  │  ← hover: scale(1.01), bg tinted
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │  ← active: accent border-left
└───────────────────────────────┘
```

- Background: `surface` del tema (light)
- Items: padding `12px 16px`, `border-radius: 14px`
- Hover: `background: rgba(accent-rgb, 0.06)`, `transform: scale(1.01)`
- Active: `border-left: 3px solid {accent}`, `background: rgba(accent-rgb, 0.12)`
- Cover avatar: `48x48px`, `border-radius: 10px`

### Theme Selector (Drawer)

```
┌──────────────────┐
│  Elegir tema    ✕ │
├──────────────────┤
│  [🐕] Bluey      │  ← active: border-left accent
│  [🐾] Sky        │
│  [🎤] 31 Minutos │
│  [🐱] Munecas    │
└──────────────────┘
```

- Drawer width: `280px`
- Items: padding `14px 20px`, hover subtle
- Active: `border-left: 4px solid {primary}`, background tinted
- Icon avatars: `40x40px`, `border-radius: 12px`, background `{primary}`

### Child Lock Modal

```
┌───────────────────────────────┐
│        🔓 (icono)             │
│                               │
│    Modo Parental              │  ← Fredoka 700, 22px
│    Ingresa el codigo          │  ← Nunito, opacity 0.55
│                               │
│    [ _ ] [ _ ] [ _ ] [ _ ]   │  ← inputs: 52x60px
│                               │
│    Codigo incorrecto          │  ← error: shake + rojo
│                               │
│  ┌─────────────────────────┐  │
│  │     Desbloquear         │  │  ← gradiente indigo→violeta
│  └─────────────────────────┘  │
└───────────────────────────────┘
```

- Overlay: `rgba(0,0,0,0.65)` + `backdrop-filter: blur(8px)`
- Modal: glass dark, `border-radius: 28px`, `padding: 36px 32px`
- Inputs: `background: rgba(255,255,255,0.12)`, `border: 2.5px solid rgba(255,255,255,0.3)`
- Focus: `border-color: rgba(255,255,255,0.7)`
- Error: shake animation (0.5s, translateX ±8px → ±5px)
- Botón: `linear-gradient(135deg, #6366f1, #8b5cf6)`, `border-radius: 14px`

---

## 7. Animaciones y Micro-interacciones

### Timing Functions

| Tipo | Easing | Duración | Uso |
|------|--------|----------|-----|
| Spring | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 200ms | Botones, hover |
| Smooth | `ease-out` | 300ms | Transiciones de estado |
| Bounce | `cubic-bezier(0.68, -0.55, 0.265, 1.55)` | 400ms | Celebration, success |
| Slide | `ease` | 250ms | Drawer, modales |

### Micro-interacciones

| Elemento | Trigger | Animación |
|----------|---------|-----------|
| Play button | hover | `scale(1.08)` + shadow lift |
| Play button | active | `scale(0.95)` + shadow tighten |
| Control buttons | hover | `scale(1.1)` + bg `rgba(255,255,255,0.15)` |
| Playlist item | hover | `scale(1.01)` + bg tinted |
| Playlist item | active | `scale(0.98)` |
| Cover art | playing | `pulse 2s infinite` (scale 1→1.03→1) |
| PIN input | focus | border glow + bg lighten |
| PIN error | shake | translateX ±8px (0.5s) |
| Modal | enter | slide up + fade (250ms) |
| Drawer | enter | slide right (300ms) |

### Transiciones de Tema

- Cambiar tema: transición suave de colores (300ms ease)
- CSS custom properties se actualizan via `useEffect`
- No flash de colores intermedios

---

## 8. Accesibilidad

### Contraste

| Elemento | Ratio mínimo | Método |
|----------|-------------|--------|
| Texto en fondo claro | 4.5:1 (WCAG AA) | Texto oscuro sobre pastel |
| Texto en player (fondo oscuro) | 4.5:1 | Blanco sobre gradiente oscuro |
| Iconos interactivos | 3:1 | Blanco semitransparente sobre oscuro |
| Estados hover/active | visual + scale | No depender solo de color |

### Touch Targets

| Elemento | Tamaño mínimo | Tamaño real |
|----------|--------------|-------------|
| Botones de control | 44x44px | 48x48px |
| Play button | 44x44px | 64x64px |
| Playlist items | 44px height | 56-64px |
| Theme selector | 44x44px | 40x40px (icon) |
| PIN inputs | 44x44px | 52x60px |

### Preferencias

- `prefers-reduced-motion`: deshabilitar pulse, scale animations
- `prefers-color-scheme`: no aplicable (temas manuales)
- `user-select: none` en toda la app
- `touch-action: manipulation` (sin zoom)

---

## 9. Señales de Confianza (Marketing)

### Para Padres

1. **Badge visible**: "Sin anuncios · Sin compras" en somewhere accesible
2. **Candado visible**: Siempre presente en el header
3. **PIN simple**: "0000" hardcoded — fácil de recordar, difícil de descubrir para niños
4. **Fullscreen mode**: El niño no puede salir de la app
5. **Bloqueo de teclado**: No hay forma de acceder al navegador
6. **PWA**: Se instala como app, se siente nativa

### Para Niños

1. **Colores vibrantes**: Amarillo, verde, naranja, rojo — los preferidos por 3-6 años
2. **Elementos tocables**: Botones que parecen juguetes (claymorphism)
3. **Feedback inmediato**: Animación en cada interacción
4. **Cover art grande**: La imagen es lo primero que ven
5. **Navegación simple**: Solo 2 pantallas (player + playlist)

---

## 10. Checklist de Diagnóstico

Usar este checklist para auditar cada componente:

### Header
- [ ] Glass background con blur
- [ ] Border bottom con accent color
- [ ] Botones SVG inline (no Ant Design icons)
- [ ] Title con Fredoka 700
- [ ] ThemeSelector oculto en child mode
- [ ] ChildLock con SVG icons

### Player Card
- [ ] Gradient de tema (no color sólido)
- [ ] Glass overlay sutil
- [ ] Cover art con shadow profundo
- [ ] Cover art con pulse animation
- [ ] Song title con Fredoka
- [ ] Artist con Nunito opacity 0.8
- [ ] Progress slider con track blanco
- [ ] Play button con claymorphism
- [ ] Control buttons con hover feedback
- [ ] Volume slider responsive

### Playlist Card
- [ ] Background del tema (light)
- [ ] Items con border-radius 14px
- [ ] Hover con scale + bg tinted
- [ ] Active con border-left accent
- [ ] Cover avatar 48x48
- [ ] Scroll suave

### Theme Selector
- [ ] Drawer slide right
- [ ] Items con icon avatar
- [ ] Active state con border-left
- [ ] Hover subtle

### Child Lock
- [ ] SVG icons inline (kid-friendly)
- [ ] Modal glass dark
- [ ] PIN inputs con focus glow
- [ ] Error shake animation
- [ ] Botón con gradiente
- [ ] Overlay con blur

### Responsive
- [ ] Mobile: stacked layout, scroll natural
- [ ] Tablet: side-by-side
- [ ] Desktop: side-by-side, más espacio
- [ ] Cover art con `clamp()` size
- [ ] Touch targets ≥44px

### Animaciones
- [ ] Play button spring en hover
- [ ] Playlist items scale en hover/active
- [ ] Cover art pulse en playing
- [ ] PIN error shake
- [ ] Modal slide up
- [ ] Drawer slide right

### Accesibilidad
- [ ] Contraste ≥4.5:1 en texto
- [ ] Touch targets ≥44px
- [ ] user-select: none
- [ ] touch-action: manipulation
- [ ] prefers-reduced-motion respetado

---

## 11. Referencias

### Fuentes de Investigación

1. **Bluey.tv** — Estructura de sitio infantil: navigación simple, personajes prominentes, juegos interactivos
2. **Nickelodeon/Paw Patrol** — Colores vibrantes, cards grandes, personajes como avatares
3. **Spotify Kids** — Large touch targets, very little text, core feature set, voice search, fullscreen album art
4. **KKBOX Kids** — Calming blue + energetic orange, illustrations, parental controls
5. **Songbyrd** — Bright/lively appearance, mascot, PIN-based parental controls
6. **Blueberry Music** — Advanced filtering, parent-managed content
7. **Netflix Playground** — Safety by design, session limits, no ads/purchases

### Artículos Clave

- "Claymorphism vs Glassmorphism: The 2026 Battle for UI Dominance" — Timothy Graf
- "Claymorphism UI design: recipe, examples, AI guidelines" — SetProduct
- "Glassmorphism App Design 2026: The Frosted UI Revival" — Launchpad Design
- "Color design in application interfaces for children" — Lyu, Wiley 2022
- "Color Preferences for 7-8 Years Old" — IJRCom 2024
- "Preschool Color Preferences" — Wang, 2024
- "Kids UX Best Practices: Safety by Design for Parents" — video-game.pro 2026
- "Don't forget the parents when designing for young children" — Dina Zuko, UX Collective
