# Juego "Pintar pixel art" (oficial, "Pintar por números" en el menú): RECREA desde cero una lámina a
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
# 1. Ajuste de líneas: cada línea INTERIOR de la cuadrícula se acerca (hasta
#    AJUSTE de cuadro) a la línea real más marcada de la imagen (perfil de
#    bordes); sin una línea clara ahí, se respeta la del usuario. Corrige el
#    corrimiento de 1-2 px que traen las fotos/escalados. Los bordes no se mueven.
# 2. Color de cada cuadro: el color DOMINANTE de su zona central (el pixel con
#    más vecinos parecidos, promediado con ellos). Las líneas del patrón (claras
#    u oscuras) y los agujeros de los beads son minoría y no ganan.
# Paleta: los colores frecuentes son los reales y absorben a los parecidos
# (distancia Lab < DELTA_E); los muy raros pasan al frecuente más cercano.
import argparse
import math
from collections import Counter
from PIL import Image

DELTA_E = 12
MAX_COLORES = 15
# Colores FINALES a menos de esto (Lab) se ven iguales: un solo número (igual
# que DISTINTOS_MIN en src/utils/pintarPixel.js).
DISTINTOS_MIN = 9
MARGEN = 0.25
RARO = 0.004
AJUSTE = 0.25
# Muestras por lado de la zona central y distancia RGB para "parecido".
MUESTRAS = 8
PARECIDO = 40

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


def ajustar(inicio, paso, n, largo, borde):
    # borde(i) = fuerza del borde entre los pixeles i-1 e i, sumada a lo largo
    # de toda la cuadrícula; suavizada en 3 (una línea de 1-2 px = 2 bordes).
    perfil = [0] * (largo + 1)
    for i in range(1, largo):
        perfil[i] = borde(i)
    suave = [perfil[i - 1] + perfil[i] + perfil[i + 1] if 0 < i < largo else 0 for i in range(largo + 1)]
    lineas = [inicio + k * paso for k in range(n + 1)]
    for k in range(1, n):
        e = lineas[k]
        r = range(max(1, redondear(e - AJUSTE * paso)), min(largo - 1, redondear(e + AJUSTE * paso)) + 1)
        if not r:
            continue
        valores = sorted(suave[i] for i in r)
        mejor = max(r, key=lambda i: suave[i])
        if suave[mejor] > 1.5 * valores[len(valores) // 2] and mejor > lineas[k - 1] + paso / 2:
            lineas[k] = float(mejor)
    return lineas


# Redondeo como Math.round de JS (round() de Python redondea .5 al par):
# así la vista previa del editor da exactamente lo mismo.
redondear = lambda v: math.floor(v + 0.5)
dif = lambda p, q: abs(p[0] - q[0]) + abs(p[1] - q[1]) + abs(p[2] - q[2])
fy = range(max(0, int(a.y)), min(H, int(a.y + a.filas * a.alto)))
fx = range(max(0, int(a.x)), min(W, int(a.x + a.columnas * a.ancho)))
xs = ajustar(a.x, a.ancho, a.columnas, W, lambda i: sum(dif(px[i, y], px[i - 1, y]) for y in fy))
ys = ajustar(a.y, a.alto, a.filas, H, lambda i: sum(dif(px[x, i], px[x, i - 1]) for x in fx))


def dominante(muestras):
    t2 = PARECIDO * PARECIDO
    d = lambda p, q: (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
    vecinos = [[q for q in muestras if d(p, q) <= t2] for p in muestras]
    mejor = max(vecinos, key=len)
    return tuple(redondear(sum(q[j] for q in mejor) / len(mejor)) for j in range(3))


def rango(a0, a1, limite):
    m = MARGEN * (a1 - a0)
    i0, i1 = a0 + m, a1 - m
    return sorted({min(limite - 1, max(0, int(i0 + (i1 - i0) * (k + 0.5) / MUESTRAS))) for k in range(MUESTRAS)})


celdas = []
for f in range(a.filas):
    for c in range(a.columnas):
        celdas.append(dominante([px[x, y] for y in rango(ys[f], ys[f + 1], H) for x in rango(xs[c], xs[c + 1], W)]))


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
    minimo = max(2, redondear(len(celdas) * RARO))
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

# Dos grupos pueden terminar con colores finales casi iguales: el de menos
# cuadros pasa al de más (gana su color).
quedan = []
destino = {}
for g, _ in Counter(asig).most_common():
    L = lab(color[g])
    igual = next((q for q, Lq in quedan if d2(L, Lq) < DISTINTOS_MIN ** 2), None)
    if igual is None:
        quedan.append((g, L))
    else:
        destino[g] = igual
asig = [destino.get(g, g) for g in asig]

out = Image.new('RGB', (a.columnas, a.filas))
out.putdata([color[g] for g in asig])
out.save(a.salida)
cuenta = Counter(asig)
print(f'{a.columnas}x{a.filas} = {len(celdas)} cuadros · {len(cuenta)} colores')
for g, n in cuenta.most_common():
    print('  #%02x%02x%02x  %d' % (*color[g], n))
if a.vista:
    out.resize((a.columnas * 20, a.filas * 20), Image.NEAREST).save(a.vista)
