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
      colorPrimary: '#4A90D9',
      colorBgContainer: '#EAF4FD',
      colorBgLayout: '#D6ECFA',
      colorText: '#2B2C41',
      colorTextSecondary: '#5A7A9A',
      colorBorder: '#B8D8F0',
      borderRadius: 22,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(165deg, #BFE3FB 0%, #D6ECFA 30%, #EAF6E8 75%, #F3F9E4 100%)',
    playerBg: 'linear-gradient(165deg, #3D6FAE 0%, #2B4A7A 35%, #1A2E4D 70%, #10192B 100%)',
    playerOverlayRgb: '43, 74, 122',
    cardBg: 'rgba(234, 244, 253, 0.92)',
    accentColor: '#EDCC6F',
    accentRgb: '237, 204, 111',
    headerStyle: {
      background: 'linear-gradient(90deg, #4A90D9, #88CAFC)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #4A90D9, #2B6CB0)',
      borderColor: '#3A7BC8',
      boxShadow: '0 4px 12px rgba(74, 144, 217, 0.4)',
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
      colorPrimary: '#D63384',
      colorBgContainer: '#FFF0F6',
      colorBgLayout: '#FFE4EF',
      colorText: '#5C1642',
      colorTextSecondary: '#A94D82',
      colorBorder: '#F5B8D4',
      borderRadius: 20,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #FFD9EC 0%, #FFCCE3 30%, #FFE0D9 65%, #FFF3E8 100%)',
    playerBg: 'linear-gradient(165deg, #A32E72 0%, #7A1F52 35%, #4D1233 70%, #240A18 100%)',
    playerOverlayRgb: '122, 31, 82',
    cardBg: 'rgba(255, 240, 246, 0.92)',
    accentColor: '#FFB300',
    accentRgb: '255, 179, 0',
    headerStyle: {
      background: 'linear-gradient(90deg, #D63384, #F06292)',
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #D63384, #AD1457)',
      borderColor: '#C2185B',
      boxShadow: '0 4px 12px rgba(214, 51, 132, 0.4)',
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
