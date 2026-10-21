# Juego "Pintar pixel art" (experimental): RECREA desde cero una lámina a
# partir de una imagen original y la cuadrícula que el usuario estableció en su
# Modo desarrollador ("Establecer cuadrícula" → "Copiar cuadrículas").
#
# La cuadrícula manda: cada celda pasa a ser UN pixel de la lámina nueva,
# pintado con un color plano rescatado del original. Sin líneas del patrón ni
# ruido de compresión; paleta consolidada de MAX_COLORES colores como máximo.
# Se guarda en AVIF sin pérdida (los colores llegan exactos al juego).
#
# Uso:
#   py herramientas/pintar_desde_cuadricula.py <original> <salida.png> \
#      --x 0 --y 0 --ancho 23.29 --alto 23.48 --columnas 24 --filas 29 \
#      [--vista vista.png]
#   ffmpeg -i salida.png -c:v libaom-av1 -still-picture 1 -aom-params lossless=1 \
#      -pix_fmt gbrp src/assets/pintar-pixel/<tema>/laminas/<nombre>.avif
#
# Color de cada cuadro: percentil 75 por luminosidad de su zona central (las
# líneas del patrón solo oscurecen; un cuadro negro es negro entero).
# Paleta: los colores frecuentes son los reales y absorben a los parecidos
# (distancia Lab < DELTA_E); los muy raros pasan al frecuente más cercano.
import argparse
from collections import Counter
from PIL import Image

DELTA_E = 12
MAX_COLORES = 15
MARGEN = 0.3
RARO = 0.004

ap = argparse.ArgumentParser()
ap.add_argument('original')
ap.add_argument('salida')
for campo in ('x', 'y', 'ancho', 'alto'):
    ap.add_argument(f'--{campo}', type=float, required=True)
ap.add_argument('--columnas', type=int, required=True)
ap.add_argument('--filas', type=int, required=True)
ap.add_argument('--vista')
a = ap.parse_args()

im = Image.open(a.original).convert('RGB')
W, H = im.size
px = im.load()
lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

celdas = []
for f in range(a.filas):
    for c in range(a.columnas):
        x0 = max(0, int(a.x + (c + MARGEN) * a.ancho))
        x1 = min(W - 1, int(a.x + (c + 1 - MARGEN) * a.ancho))
        y0 = max(0, int(a.y + (f + MARGEN) * a.alto))
        y1 = min(H - 1, int(a.y + (f + 1 - MARGEN) * a.alto))
        m = sorted((px[x, y] for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)), key=lum)
        celdas.append(m[int((len(m) - 1) * 0.75)])


def lab(c):
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = map(lin, c)
    x = (r * .4124 + g * .3576 + b * .1805) / .95047
    y = r * .2126 + g * .7152 + b * .0722
    z = (r * .0193 + g * .1192 + b * .9505) / 1.08883
    fn = lambda t: t ** (1 / 3) if t > .008856 else 7.787 * t + 16 / 116
    x, y, z = fn(x), fn(y), fn(z)
    return (116 * y - 16, 500 * (x - y), 200 * (y - z))


d2 = lambda p, q: sum((u - v) ** 2 for u, v in zip(p, q))
labs = [lab(c) for c in celdas]
frecuencia = Counter((c[0] // 8, c[1] // 8, c[2] // 8) for c in celdas).most_common()


def paleta(delta):
    # Colores por frecuencia (cuantizados a 8 niveles por canal): los
    # frecuentes son los reales y absorben a los parecidos (Lab < delta).
    reps = []
    for clave, _ in frecuencia:
        L = lab(tuple(v * 8 + 4 for v in clave))
        if all(d2(L, r) >= delta ** 2 for r in reps):
            reps.append(L)
    asig = [min(range(len(reps)), key=lambda i: d2(L, reps[i])) for L in labs]
    # Raros → frecuente más cercano.
    cuenta = Counter(asig)
    minimo = max(2, round(len(celdas) * RARO))
    frecuentes = [i for i, n in cuenta.items() if n >= minimo]
    return [g if cuenta[g] >= minimo else min(frecuentes, key=lambda i: d2(labs[k], reps[i])) for k, g in enumerate(asig)]


# Tope de colores: si quedan más, se junta un poco más (tolerancia mayor).
delta = DELTA_E
asig = paleta(delta)
while len(set(asig)) > MAX_COLORES:
    delta += 2
    asig = paleta(delta)
print(f'tolerancia final (delta E Lab): {delta}')

# Color final de cada grupo: el más común real de sus cuadros (no un promedio
# que invente un tono).
grupos = {}
for c, g in zip(celdas, asig):
    grupos.setdefault(g, []).append(c)
color = {g: Counter(l).most_common(1)[0][0] for g, l in grupos.items()}

out = Image.new('RGB', (a.columnas, a.filas))
out.putdata([color[g] for g in asig])
out.save(a.salida)
cuenta = Counter(asig)
print(f'{a.columnas}x{a.filas} = {len(celdas)} cuadros · {len(cuenta)} colores')
for g, n in cuenta.most_common():
    print('  #%02x%02x%02x  %d' % (*color[g], n))
if a.vista:
    out.resize((a.columnas * 20, a.filas * 20), Image.NEAREST).save(a.vista)
