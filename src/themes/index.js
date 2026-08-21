/*
 * PALETAS REFINADAS — 5 iteraciones de autocritica por tema
 *
 * Iteracion 1: Colores base del show
 * Iteracion 2: Ajuste de contraste y legibilidad
 * Iteracion 3: Coherencia visual entre gradientes y cards
 * Iteracion 4: Refinamiento de acentos para botones/interactivos
 * Iteracion 5: Balance final — inmersivo pero funcional
 */

const themes = {
  // ========== BLUEY ==========
  // Investigacion: Paleta oficial extraida de blueycolors (R package)
  // Bluey: #88cafc (cuerpo), #d2ebff (panza), #404066 (sombras), #2b2c41 (bordes), #edcc6f (acento cálido)
  // Ambiente: cielo australiano, calidez familiar, tonos pastel cálidos
  bluey: {
    name: 'Bluey',
    icon: '🐕',
    cover: 'theme-covers/bluey.avif',
    token: {
      colorPrimary: '#3E8FE0',
      colorBgContainer: '#EAF4FD',
      colorBgLayout: '#D6ECFA',
      colorText: '#2B2C41',
      colorTextSecondary: '#5A7A9A',
      colorBorder: '#B8D8F0',
      borderRadius: 24,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(165deg, #94D2FB 0%, #C5E8FC 32%, #D2EFBE 78%, #E3F3C8 100%)',
    playerBg: 'linear-gradient(165deg, #4A82C4 0%, #2B4A7A 30%, #223D57 55%, #1A2E4D 78%, #10192B 100%)',
    playerOverlayRgb: '52, 88, 138',
    cardBg: 'rgba(234, 244, 253, 0.92)',
    accentColor: '#F2A65A',
    accentRgb: '242, 166, 90',
    accentInk: '#14141C',
    scrollbarRgb: '46, 110, 194',
    headerStyle: {
      background: 'linear-gradient(90deg, #3E8FE0, #7EC5FB)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #3E8FE0, #2B6CB0)',
      borderColor: '#3A7BC8',
      boxShadow: '0 4px 12px rgba(62, 143, 224, 0.4)',
    },
    cardStyle: {
      borderColor: '#B8D8F0',
      borderWidth: 2,
    },
  },

  // ========== SKYE (Paw Patrol) ==========
  // Investigacion: Skye usa rosa hot, magenta, crema dorada
  // Colores oficiales Paw Patrol: red #BD221F, blue #099EDA, yellow #FEE301
  // Skye especifico: rosa dominante, acordeos dorados, feminidad sin ser suave
  sky: {
    name: 'Sky - Paw Patrol',
    icon: '🐾',
    cover: 'theme-covers/sky.avif',
    token: {
      colorPrimary: '#E0298C',
      colorBgContainer: '#FFF0F6',
      colorBgLayout: '#FFE4EF',
      colorText: '#5C1642',
      colorTextSecondary: '#A94D82',
      colorBorder: '#F5B8D4',
      borderRadius: 20,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #FF9EC9 0%, #FFB8D8 25%, #FFCFDA 50%, #FFDFD3 75%, #FFF1E4 100%)',
    playerBg: 'linear-gradient(165deg, #C43D8C 0%, #A32E72 28%, #7A1F52 55%, #4D1233 78%, #240A18 100%)',
    playerOverlayRgb: '135, 34, 92',
    cardBg: 'rgba(255, 240, 246, 0.92)',
    accentColor: '#F5A623',
    accentRgb: '245, 166, 35',
    accentInk: '#14141C',
    scrollbarRgb: '224, 41, 140',
    headerStyle: {
      background: 'linear-gradient(90deg, #E0298C, #F0559E)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #E0298C, #AD1457)',
      borderColor: '#C2185B',
      boxShadow: '0 4px 12px rgba(224, 41, 140, 0.4)',
    },
    cardStyle: {
      borderColor: '#F5B8D4',
      borderWidth: 2,
    },
  },

  // ========== 31 MINUTOS ==========
  // Investigacion: Estetica artesanal, punk-craft, caotica pero disenada
  // Tulio: beige #E8D5B7, chaleco rayas cafe/naranja/negro
  // Bodoque: rojo #C0392B, ojos asimetricos
  // Ambiente: carton pintado, utileria, colores calidos y saturados
  trece: {
    name: '31 Minutos',
    icon: '🎤',
    cover: 'theme-covers/trece.avif',
    token: {
      colorPrimary: '#E67E22',
      colorBgContainer: '#FFF5E6',
      colorBgLayout: '#FFE8CC',
      colorText: '#3E2723',
      colorTextSecondary: '#A6621F',
      colorBorder: '#F0C89A',
      borderRadius: 22,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #FFC96B 0%, #FFDA94 30%, #FFEBC2 65%, #FFF6E6 100%)',
    playerBg: 'linear-gradient(165deg, #A85A16 0%, #7A3D10 35%, #4D2608 70%, #241005 100%)',
    playerOverlayRgb: '122, 61, 16',
    cardBg: 'rgba(255, 245, 230, 0.92)',
    accentColor: '#C0392B',
    accentRgb: '192, 57, 43',
    accentInk: '#FFFFFF',
    scrollbarRgb: '192, 57, 43',
    headerStyle: {
      background: 'linear-gradient(90deg, #E67E22, #F39C12)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #E67E22, #D35400)',
      borderColor: '#D4720A',
      boxShadow: '0 4px 12px rgba(230, 126, 34, 0.4)',
    },
    cardStyle: {
      borderColor: '#F0C89A',
      borderWidth: 2,
    },
  },

  // ========== GABBY'S DOLLHOUSE (La Casa de Munecas) ==========
  // Investigacion: Pastel arcoiris, purpurina, gatitos
  // Paleta dominante: rosa, lila, turquesa, verde menta
  // MerCat: turquesa, DJ Catnip: lavanda/rosa, Kitty Fairy: rosa/verde
  // Ambiente: magia, brillo, juguete, fantasia
  munecas: {
    name: 'Casa de Munecas',
    icon: '🐱',
    cover: 'theme-covers/munecas.avif',
    token: {
      colorPrimary: '#B84FDB',
      colorBgContainer: '#FBF3FF',
      colorBgLayout: '#F5E4FA',
      colorText: '#3B1F6E',
      colorTextSecondary: '#93589E',
      colorBorder: '#E8B8E0',
      borderRadius: 24,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #F3D9FF 0%, #F6D8EC 35%, #FDE3D4 70%, #FFF3E0 100%)',
    playerBg: 'linear-gradient(165deg, #6B2A9E 0%, #4A1878 35%, #2E0F4D 70%, #1A0A2E 100%)',
    playerOverlayRgb: '90, 32, 140',
    cardBg: 'rgba(245, 238, 255, 0.92)',
    accentColor: '#FFB4D8',
    accentRgb: '255, 180, 216',
    accentInk: '#14141C',
    scrollbarRgb: '184, 79, 219',
    headerStyle: {
      background: 'linear-gradient(90deg, #B04FCB, #E85FB8)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
      borderColor: '#9333EA',
      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
    },
    cardStyle: {
      borderColor: '#D4B8F0',
      borderWidth: 2,
    },
  },

  // ========== EFECTO N ==========
  // Investigacion: caratula real (theme-covers/efecto-n.jpg) — fondo amarillo
  // saturado con rayos tipo sunburst, tipografia comic con relieve negro,
  // globo de dialogo magenta con la "N", detalles de canal (dino, trofeo, risa).
  // Ambiente: pop-art / meme viral, alta energia, humor internet.
  'efecto-n': {
    name: 'Efecto N',
    icon: '⚡',
    cover: 'theme-covers/efecto-n.jpg',
    token: {
      colorPrimary: '#C98A00',
      colorBgContainer: '#FFFBEA',
      colorBgLayout: '#FFF3C4',
      colorText: '#3D2B00',
      colorTextSecondary: '#8A6A1F',
      colorBorder: '#F7D774',
      borderRadius: 22,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #FFD93B 0%, #FFC247 28%, #FF9BC8 62%, #FFD9E8 85%, #FFF6E0 100%)',
    playerBg: 'linear-gradient(165deg, #8A5C00 0%, #6B4300 30%, #4A2E1E 55%, #3A1B30 78%, #1F0F1F 100%)',
    playerOverlayRgb: '107, 67, 0',
    cardBg: 'rgba(255, 251, 234, 0.92)',
    accentColor: '#FF6FA8',
    accentRgb: '255, 111, 168',
    accentInk: '#14141C',
    scrollbarRgb: '201, 138, 0',
    headerStyle: {
      background: 'linear-gradient(90deg, #C98A00, #F2A900)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #C98A00, #9C6B00)',
      borderColor: '#B37A00',
      boxShadow: '0 4px 12px rgba(201, 138, 0, 0.4)',
    },
    cardStyle: {
      borderColor: '#F7D774',
      borderWidth: 2,
    },
  },

  // ========== PAPELINA Y PAPELON ==========
  // Investigacion: caratula real (theme-covers/papelina.jpg) — sombrero rojo
  // intenso, cuello y botones mostaza, vestido negro, telon azul y cesped
  // verde con flores rojas. Ambiente: teatro infantil artesanal, calido y craft.
  papelina: {
    name: 'Papelina y Papelón',
    icon: '🎩',
    cover: 'theme-covers/papelina.jpg',
    token: {
      colorPrimary: '#B0202E',
      colorBgContainer: '#FFF3E8',
      colorBgLayout: '#FCE3C7',
      colorText: '#3A1414',
      colorTextSecondary: '#8C4A3E',
      colorBorder: '#F0C68A',
      borderRadius: 22,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #FFD98A 0%, #FFB65E 30%, #F0794F 60%, #C23B4A 85%, #7A1F30 100%)',
    playerBg: 'linear-gradient(165deg, #7A1F2A 0%, #591722 30%, #3A1018 55%, #240A10 78%, #150609 100%)',
    playerOverlayRgb: '89, 23, 34',
    cardBg: 'rgba(255, 243, 232, 0.92)',
    accentColor: '#E8A63C',
    accentRgb: '232, 166, 60',
    accentInk: '#14141C',
    scrollbarRgb: '176, 32, 46',
    headerStyle: {
      background: 'linear-gradient(90deg, #B0202E, #D9483F)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #B0202E, #7A141F)',
      borderColor: '#8C1826',
      boxShadow: '0 4px 12px rgba(176, 32, 46, 0.4)',
    },
    cardStyle: {
      borderColor: '#F0C68A',
      borderWidth: 2,
    },
  },

  // ========== GUAYPES CLUB ==========
  // Investigacion: caratula real (theme-covers/guaypes-club.jpg) — logo
  // magenta/lima/celeste tipo parche de sticker, gorros pastel a cuadros,
  // titulo rojo tipo marcador. Ambiente: patchwork de colores candy, alegre.
  'guaypes-club': {
    name: 'Guaypes Club',
    icon: '🎤',
    cover: 'theme-covers/guaypes-club.jpg',
    token: {
      colorPrimary: '#0C8797',
      colorBgContainer: '#EAFBFC',
      colorBgLayout: '#D3F3F3',
      colorText: '#0C3B42',
      colorTextSecondary: '#3E8A93',
      colorBorder: '#A8E6E6',
      borderRadius: 24,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #6EE7E0 0%, #8CE0F0 28%, #F5A8D0 62%, #FFD9EC 85%, #FFF6F0 100%)',
    playerBg: 'linear-gradient(165deg, #0C6674 0%, #0A4C58 30%, #123240 55%, #142338 78%, #0D1420 100%)',
    playerOverlayRgb: '10, 76, 88',
    cardBg: 'rgba(234, 251, 252, 0.92)',
    accentColor: '#8BC63F',
    accentRgb: '139, 198, 63',
    accentInk: '#14141C',
    scrollbarRgb: '12, 135, 151',
    headerStyle: {
      background: 'linear-gradient(90deg, #0C8797, #12B4C7)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #0C8797, #086673)',
      borderColor: '#0A7684',
      boxShadow: '0 4px 12px rgba(12, 135, 151, 0.4)',
    },
    cardStyle: {
      borderColor: '#A8E6E6',
      borderWidth: 2,
    },
  },

  // ========== RUEDAS Y AVENTURAS ==========
  // Investigacion: caratula real (theme-covers/ruedas.jpg) — cielo celeste,
  // cascos verdes de proteccion, chaquetas rosa/verde, escena de patinaje
  // al aire libre. Ambiente: activo, deportivo, salida al parque.
  ruedas: {
    name: 'Ruedas y Aventuras',
    icon: '🛼',
    cover: 'theme-covers/ruedas.jpg',
    token: {
      colorPrimary: '#2E9E4F',
      colorBgContainer: '#EAFBF0',
      colorBgLayout: '#D2F3DE',
      colorText: '#123420',
      colorTextSecondary: '#3E7A57',
      colorBorder: '#A8E0BC',
      borderRadius: 20,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #7FE3F0 0%, #9FE8D8 30%, #B8EFAE 60%, #FFE7A8 85%, #FFF6E0 100%)',
    playerBg: 'linear-gradient(165deg, #1F6B48 0%, #144D36 30%, #123A2E 55%, #142B2E 78%, #0D1A1D 100%)',
    playerOverlayRgb: '20, 77, 54',
    cardBg: 'rgba(234, 251, 240, 0.92)',
    accentColor: '#FF7BA6',
    accentRgb: '255, 123, 166',
    accentInk: '#14141C',
    scrollbarRgb: '46, 158, 79',
    headerStyle: {
      background: 'linear-gradient(90deg, #2E9E4F, #57C27A)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #2E9E4F, #1F7A3A)',
      borderColor: '#268A42',
      boxShadow: '0 4px 12px rgba(46, 158, 79, 0.4)',
    },
    cardStyle: {
      borderColor: '#A8E0BC',
      borderWidth: 2,
    },
  },

  // ========== GUMMIBAR ==========
  // Investigacion: caratula real (theme-covers/gummibar.jpg) — oso gomita
  // verde brillante tipo caramelo, wordmark rosa chicle en relieve glossy,
  // fondo celeste con remolino. Ambiente: candy-glossy, brillante y elastico.
  gummibar: {
    name: 'Gummibär',
    icon: '🐻',
    cover: 'theme-covers/gummibar.jpg',
    token: {
      colorPrimary: '#0E9E5C',
      colorBgContainer: '#EFFCF7',
      colorBgLayout: '#D6F5E8',
      colorText: '#0A3B2C',
      colorTextSecondary: '#2E8A6A',
      colorBorder: '#9FE8CE',
      borderRadius: 26,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #9FF0E0 0%, #7EE0D8 25%, #FF9EC9 65%, #FFC9E0 85%, #FFF3F8 100%)',
    playerBg: 'linear-gradient(165deg, #0C7A48 0%, #0A5A38 30%, #163038 55%, #241A38 78%, #150E24 100%)',
    playerOverlayRgb: '10, 90, 56',
    cardBg: 'rgba(239, 252, 247, 0.92)',
    accentColor: '#FF7AC6',
    accentRgb: '255, 122, 198',
    accentInk: '#14141C',
    scrollbarRgb: '14, 158, 92',
    headerStyle: {
      background: 'linear-gradient(90deg, #0E9E5C, #3FCB8C)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #0E9E5C, #0A7A46)',
      borderColor: '#0C8F52',
      boxShadow: '0 4px 12px rgba(14, 158, 92, 0.4)',
    },
    cardStyle: {
      borderColor: '#9FE8CE',
      borderWidth: 2,
    },
  },

  // ========== GIMNASIA ==========
  // Investigacion: imagen provista por el usuario (theme-covers/gimnasia.avif) —
  // gimnasta ilustrada con maillot violeta intenso y panel celeste-lavanda,
  // mono de pelo rosa, fondo blanco limpio. Ambiente: deportivo, energico,
  // violeta mas profundo y "grape" que el lila de munecas — sin invadir su paleta.
  gimnasia: {
    name: 'Gimnasia',
    icon: '🤸',
    cover: 'theme-covers/gimnasia.avif',
    token: {
      colorPrimary: '#7C3AED',
      colorBgContainer: '#F5F0FF',
      colorBgLayout: '#E8DCFF',
      colorText: '#2A1552',
      colorTextSecondary: '#6B4FA0',
      colorBorder: '#D4C0F5',
      borderRadius: 20,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #C9B3FF 0%, #B8A0F5 28%, #FFC9B0 65%, #FFE0CC 85%, #FFF6EE 100%)',
    playerBg: 'linear-gradient(165deg, #4C1D95 0%, #3B1670 30%, #2A1050 55%, #1A0A38 78%, #0F051F 100%)',
    playerOverlayRgb: '59, 22, 112',
    cardBg: 'rgba(245, 240, 255, 0.92)',
    accentColor: '#FF8A65',
    accentRgb: '255, 138, 101',
    accentInk: '#14141C',
    scrollbarRgb: '124, 58, 237',
    headerStyle: {
      background: 'linear-gradient(90deg, #7C3AED, #A374F5)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
      borderColor: '#6D28D9',
      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
    },
    cardStyle: {
      borderColor: '#D4C0F5',
      borderWidth: 2,
    },
  },

  // ========== TOY STORY ==========
  // Investigacion: caratula real (theme-covers/toy-story.jpg) — piernas de
  // Buzz (blanco/verde/morado), rostro de Woody asomando, insignia roja
  // "STORY", texto dorado "TOY", cielo azul, piso de tablones dorados.
  // Ambiente: aventura de juguetes, calido, nostalgico, madera de juguetero.
  'toy-story': {
    name: 'Toy Story',
    icon: '🤠',
    cover: 'theme-covers/toy-story.jpg',
    token: {
      colorPrimary: '#A9631E',
      colorBgContainer: '#FFF6E6',
      colorBgLayout: '#FCE6C0',
      colorText: '#3A2410',
      colorTextSecondary: '#8A6238',
      colorBorder: '#F0CE94',
      borderRadius: 20,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #7FC4E8 0%, #A8DCEF 25%, #FFD98A 55%, #FFB65E 80%, #E8934A 100%)',
    playerBg: 'linear-gradient(165deg, #6B4318 0%, #4D2E10 30%, #33200E 55%, #241608 78%, #140B04 100%)',
    playerOverlayRgb: '77, 46, 16',
    cardBg: 'rgba(255, 246, 230, 0.92)',
    accentColor: '#5FA968',
    accentRgb: '95, 169, 104',
    accentInk: '#14141C',
    scrollbarRgb: '169, 99, 30',
    headerStyle: {
      background: 'linear-gradient(90deg, #A9631E, #C97F2E)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #A9631E, #7A4712)',
      borderColor: '#8C5216',
      boxShadow: '0 4px 12px rgba(169, 99, 30, 0.4)',
    },
    cardStyle: {
      borderColor: '#F0CE94',
      borderWidth: 2,
    },
  },

  // ========== DISNEY ==========
  // Pedido explicito del usuario (2026-08-20): alusivo a azul, noche y
  // estrellas — no al arcoiris de 4 cuadrantes de la caratula. El gradient
  // principal queda 100% en familia azul (medianoche -> periwinkle claro) y
  // se le suman estrellas reales via radial-gradient (sin agregar elementos
  // nuevos al layout, solo pintura extra en el mismo fondo). El dorado del
  // accent queda como el "deseo/estrella" de contraste sobre el azul.
  disney: {
    name: 'Disney',
    icon: '✨',
    cover: 'theme-covers/disney.jpg',
    token: {
      colorPrimary: '#2A4FC9',
      colorBgContainer: '#EEF1FF',
      colorBgLayout: '#DCE3FF',
      colorText: '#151C42',
      colorTextSecondary: '#4A5590',
      colorBorder: '#B8C4F0',
      borderRadius: 24,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: `radial-gradient(1.5px 1.5px at 10% 12%, rgba(255,255,255,0.9), transparent),
      radial-gradient(1px 1px at 24% 6%, rgba(255,255,255,0.7), transparent),
      radial-gradient(2px 2px at 38% 18%, rgba(255,255,255,0.85), transparent),
      radial-gradient(1px 1px at 52% 5%, rgba(255,255,255,0.6), transparent),
      radial-gradient(1.5px 1.5px at 68% 10%, rgba(255,255,255,0.9), transparent),
      radial-gradient(1px 1px at 82% 4%, rgba(255,255,255,0.7), transparent),
      radial-gradient(2px 2px at 92% 16%, rgba(255,255,255,0.85), transparent),
      radial-gradient(1px 1px at 16% 30%, rgba(255,255,255,0.55), transparent),
      radial-gradient(1.5px 1.5px at 46% 25%, rgba(255,255,255,0.6), transparent),
      radial-gradient(1px 1px at 76% 28%, rgba(255,255,255,0.5), transparent),
      linear-gradient(165deg, #0F1B4D 0%, #1E2F72 25%, #3550A0 50%, #6B85C9 75%, #B8C8ED 100%)`,
    playerBg: 'linear-gradient(165deg, #1E3A8A 0%, #172B66 28%, #141B38 55%, #0D1230 78%, #05070F 100%)',
    playerOverlayRgb: '23, 43, 102',
    cardBg: 'rgba(238, 241, 255, 0.92)',
    accentColor: '#FFB020',
    accentRgb: '255, 176, 32',
    accentInk: '#14141C',
    scrollbarRgb: '42, 79, 201',
    headerStyle: {
      background: 'linear-gradient(90deg, #2A4FC9, #5A7AE0)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #2A4FC9, #1C3894)',
      borderColor: '#2141AC',
      boxShadow: '0 4px 12px rgba(42, 79, 201, 0.4)',
    },
    cardStyle: {
      borderColor: '#B8C4F0',
      borderWidth: 2,
    },
  },
};

export default themes;
