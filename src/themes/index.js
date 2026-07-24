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
};

export default themes;
