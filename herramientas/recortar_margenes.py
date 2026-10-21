"""Recorte de márgenes muertos para láminas de pixel art.
Fondo = color dominante de los bordes; la máscara (pixeles lejos del fondo) se
"abre" (MinFilter→MaxFilter) para borrar líneas de cuadrícula y aros de beads;
lo que queda es la figura. Overrides por imagen en AJUSTES (zona útil, tapar
íconos, forzar fondo, recorte manual)."""
import sys, os, json
from collections import Counter
from PIL import Image, ImageChops, ImageDraw, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
AJUSTES = json.load(open(sys.argv[3], encoding='utf-8')) if len(sys.argv) > 3 else {}
os.makedirs(OUT, exist_ok=True)


def color_fondo(img):
    w, h = img.size
    px = img.load()
    borde = []
    for b in range(3, max(4, min(w, h) // 25)):
        for x in range(0, w, 2):
            borde += [px[x, b], px[x, h - 1 - b]]
        for y in range(0, h, 2):
            borde += [px[b, y], px[w - 1 - b, y]]
    c = Counter((r // 12, g // 12, bb // 12) for r, g, bb in borde)
    q = c.most_common(1)[0][0]
    cand = [p for p in borde if (p[0] // 12, p[1] // 12, p[2] // 12) == q]
    fondo = tuple(sorted(v[i] for v in cand)[len(cand) // 2] for i in range(3))
    # segundo color del borde = líneas de la cuadrícula (si es frecuente)
    lejos = [p for p in borde if sum(abs(p[i] - fondo[i]) for i in range(3)) > 45]
    linea = None
    if len(lejos) > len(borde) * 0.08:
        c2 = Counter((r // 24, g // 24, bb // 24) for r, g, bb in lejos)
        q2 = c2.most_common(1)[0][0]
        cand2 = [p for p in lejos if (p[0] // 24, p[1] // 24, p[2] // 24) == q2]
        if len(cand2) > len(borde) * 0.05:
            linea = tuple(sorted(v[i] for v in cand2)[len(cand2) // 2] for i in range(3))
            # una línea muy distinta del fondo (ej. negra sobre blanco) se
            # confunde con los contornos de la figura: no se descarta
            if sum(abs(linea[i] - fondo[i]) for i in range(3)) > 250:
                linea = None
    return fondo, linea


def lejos_de(img, color, umbral):
    dif = ImageChops.difference(img, Image.new('RGB', img.size, color))
    r, g, b = dif.split()
    suma = ImageChops.add(ImageChops.add(r, g), b)  # satura a 255
    return suma.point(lambda v: 255 if v > umbral else 0)


def mascara(img, fondo, umbral=60, k=None, linea=None):
    m = lejos_de(img, fondo, umbral)
    if linea:
        m = ImageChops.multiply(m, lejos_de(img, linea, umbral))
    k = k or max(5, (min(img.size) // 55) | 1)
    return m.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k))


def tramos(perfil, gap):
    """Tramos de índices con contenido, unidos si el hueco entre ellos < gap."""
    out, ini, vacio = [], None, 0
    for i, v in enumerate(perfil):
        if v:
            if ini is None:
                ini = i
            elif vacio >= gap:
                out.append([ini, fin])
                ini = i
            fin, vacio = i, 0
        elif ini is not None:
            vacio += 1
    if ini is not None:
        out.append([ini, fin])
    return out


def principal(perfil, gap):
    ts = tramos(perfil, gap)
    if not ts:
        return None
    masa = [sum(perfil[a:b + 1]) for a, b in ts]
    top = max(masa)
    # se queda con el tramo más pesado y los que pesan al menos 25% de él
    keep = [t for t, ms in zip(ts, masa) if ms >= top * 0.25]
    return keep[0][0], keep[-1][1]


def cuerpo(m):
    w, h = m.size
    px = m.load()
    x0, y0, x1, y1 = 0, 0, w - 1, h - 1
    for _ in range(3):
        filas = [sum(1 for x in range(x0, x1 + 1, 2) if px[x, y]) for y in range(h)]
        r = principal(filas, max(4, h // 45))
        if not r:
            return None
        y0, y1 = r
        cols = [sum(1 for y in range(y0, y1 + 1, 2) if px[x, y]) for x in range(w)]
        r = principal(cols, max(4, w // 45))
        if not r:
            return None
        x0, x1 = r
    return (x0, y0, x1 + 1, y1 + 1)


res = {}
for tema in sorted(os.listdir(SRC)):
    d = os.path.join(SRC, tema)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        clave = f'{tema}/{f}'
        aj = AJUSTES.get(clave, {})
        if aj.get('omitir'):
            continue
        img = Image.open(os.path.join(d, f)).convert('RGB')
        fondo, linea = color_fondo(img)
        if 'fondo' in aj:
            fondo = tuple(aj['fondo'])
        if aj.get('sin_linea'):
            linea = None
        if 'recorte' in aj:
            bb = tuple(aj['recorte'])
        else:
            m = mascara(img, fondo, aj.get('umbral', 60), aj.get('k'), linea)
            if 'zona' in aj:  # solo se busca la figura dentro de la zona útil
                z = Image.new('L', img.size, 0)
                ImageDraw.Draw(z).rectangle(aj['zona'], fill=255)
                m = ImageChops.multiply(m, z)
            bb = cuerpo(m) or (0, 0, *img.size)
            pad = aj.get('pad', max(4, round(min(img.size) * 0.02)))
            lim = aj.get('zona', (0, 0, img.width, img.height))
            bb = (max(lim[0], bb[0] - pad), max(lim[1], bb[1] - pad),
                  min(lim[2], bb[2] + pad), min(lim[3], bb[3] + pad))
        res[clave] = {'fondo': fondo, 'linea': linea, 'bbox': bb, 'size': img.size}
        print(f'{clave}: {img.size} fondo={fondo} linea={linea} bbox={bb}')

json.dump(res, open(os.path.join(OUT, 'recortes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

T = 330
temas = sorted({k.split('/')[0] for k in res})
for tema in temas:
    items = [(k, v) for k, v in res.items() if k.split('/')[0] == tema]
    cols = 4
    rows = (len(items) + cols - 1) // cols
    hoja = Image.new('RGB', (cols * (T + 10), rows * (T + 24)), (60, 60, 60))
    dr = ImageDraw.Draw(hoja)
    for i, (k, v) in enumerate(items):
        img = Image.open(os.path.join(SRC, k)).convert('RGB')
        ImageDraw.Draw(img).rectangle(v['bbox'], outline=(255, 0, 255), width=max(3, img.width // 120))
        img.thumbnail((T, T))
        x, y = (i % cols) * (T + 10), (i // cols) * (T + 24)
        hoja.paste(img, (x, y))
        dr.text((x + 2, y + T + 4), f'{i}: ' + k.split('/', 1)[1][:40], fill=(255, 255, 255))
    hoja.save(os.path.join(OUT, f'hoja-{tema}.png'))
