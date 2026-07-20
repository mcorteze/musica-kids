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
    token: {
      colorPrimary: '#4A90D9',
      colorBgContainer: '#EAF4FD',
      colorBgLayout: '#D6ECFA',
      colorText: '#1E2A3A',
      colorTextSecondary: '#5A7A9A',
      colorBorder: '#B8D8F0',
      borderRadius: 18,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #D6ECFA 0%, #C2E0F6 40%, #E8F4FD 100%)',
    playerBg: 'linear-gradient(165deg, #2B4A7A 0%, #1A2E4D 55%, #10192B 100%)',
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
    token: {
      colorPrimary: '#D63384',
      colorBgContainer: '#FFF0F6',
      colorBgLayout: '#FFE4EF',
      colorText: '#4A1942',
      colorTextSecondary: '#9B4D8A',
      colorBorder: '#F5B8D4',
      borderRadius: 18,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #FFE4EF 0%, #FFD6E8 40%, #FFF0F6 100%)',
    playerBg: 'linear-gradient(165deg, #7A1F52 0%, #4D1233 55%, #240A18 100%)',
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
    token: {
      colorPrimary: '#E67E22',
      colorBgContainer: '#FFF5E6',
      colorBgLayout: '#FFE8CC',
      colorText: '#3E2723',
      colorTextSecondary: '#8D6E63',
      colorBorder: '#F0C89A',
      borderRadius: 22,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #FFE8CC 0%, #FFD9B3 40%, #FFF5E6 100%)',
    playerBg: 'linear-gradient(165deg, #7A3D10 0%, #4D2608 55%, #241005 100%)',
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
    token: {
      colorPrimary: '#A855F7',
      colorBgContainer: '#F5EEFF',
      colorBgLayout: '#EDE0FF',
      colorText: '#3B1F6E',
      colorTextSecondary: '#8B6AAF',
      colorBorder: '#D4B8F0',
      borderRadius: 20,
      fontFamily: "'Fredoka', 'Nunito', sans-serif",
    },
    gradient: 'linear-gradient(160deg, #EDE0FF 0%, #F0E4FF 40%, #F5EEFF 100%)',
    playerBg: 'linear-gradient(165deg, #4A1878 0%, #2E0F4D 55%, #150824 100%)',
    playerOverlayRgb: '74, 24, 120',
    cardBg: 'rgba(245, 238, 255, 0.92)',
    accentColor: '#2DD4BF',
    accentRgb: '45, 212, 191',
    headerStyle: {
      background: 'linear-gradient(90deg, #A855F7, #CE93D8)',
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
