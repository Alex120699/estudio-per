"""Lectura óptica de las plantillas de soluciones escaneadas de Andalucía.

Las plantillas son escaneos (sin texto) donde las burbujas rellenas aparecen como
manchas grises. Este script:
  1. renderiza la página (pypdfium2 + Pillow, en .venv),
  2. localiza los 5 bordes verticales de la tabla de respuestas (4 columnas:
     preguntas 1-25, 26-50, 51-75 y 76-100),
  3. calibra la altura de las filas con las manchas de la 1ª columna,
  4. mide la oscuridad de las 4 burbujas de cada fila y elige la más oscura,
     avisando si hay dudas (dos burbujas parecidas o ninguna clara).

Uso:  .venv/Scripts/python -I scripts/leer_plantilla.py fichero.plantilla.pdf [--n 45] [--debug salida.png]
Salida: JSON {"respuestas": {"1": "c", ...}, "avisos": [...], "confianzaMinima": x}
"""

import json
import sys

import pypdfium2 as pdfium
from PIL import ImageDraw

# Geometría relativa al ancho de una columna de la tabla (medida en las plantillas 2025-2026).
POS_A = 0.385      # centro de la burbuja A
PASO_OPC = 0.125   # distancia entre burbujas
PASO_FILA = 0.1037  # distancia entre filas
FILAS = 25


def imagen_pagina(ruta):
    """Renderiza la 1ª página a 1240 px de ancho (≈150 ppp en A4). Hace falta renderizar
    y no solo extraer la imagen de fondo: con la compresión MRC algunas marcas quedan
    en las capas de máscara en lugar del fondo."""
    pdf = pdfium.PdfDocument(ruta)
    pagina = pdf[0]
    escala = 1240 / pagina.get_width()
    return pagina.render(scale=escala).to_pil().convert('RGB')


def oscuridad(p):
    """0 (blanco o color de la plantilla impresa) .. 255 (negro). El naranja impreso
    tiene mucho croma, así que se descuenta para no confundirlo con lápiz."""
    r, g, b = p
    croma = max(p) - min(p)
    lum = (r + g + b) / 3
    return max(0.0, 255 - lum - max(0, croma - 40) * 2)


def lineas_tabla(img, y0, y1):
    """Bordes verticales de la tabla: columnas algo más oscuras que sus vecinas a lo
    largo de toda la altura. Se buscan 5 bordes equiespaciados."""
    px = img.load()
    w = img.size[0]
    ys = range(y0, y1, 3)
    brillo = [sum(sum(px[x, y]) for y in ys) / len(ys) for x in range(w)]
    valle = [0.0] * w
    for x in range(6, w - 6):
        vecinas = (sum(brillo[x - 6:x - 2]) + sum(brillo[x + 3:x + 7])) / 8
        valle[x] = vecinas - brillo[x]
    candidatos = sorted(range(w), key=lambda x: -valle[x])[:40]
    mejor = None
    for a in candidatos:
        for b in candidatos:
            paso = b - a
            if not 200 < paso < 300 or a + 4 * paso + 7 >= w:
                continue
            xs = [a]
            for k in range(1, 5):
                c = round(a + k * paso)
                xs.append(max(range(c - 6, c + 7), key=lambda x: valle[x]))
            puntos = sum(valle[x] for x in xs)
            if mejor is None or puntos > mejor[0]:
                mejor = (puntos, xs)
    if not mejor:
        raise SystemExit('no encuentro los bordes de la tabla de respuestas')
    return mejor[1]


def media_oscuridad(px, cx, cy, r=5):
    vals = [oscuridad(px[x, y]) for x in range(round(cx) - r, round(cx) + r + 1)
            for y in range(round(cy) - r, round(cy) + r + 1)]
    return sum(vals) / len(vals)


def calibrar_filas(px, bordes, y0, y1):
    """Devuelve (y de la fila 1, paso entre filas). Usa el perfil vertical de oscuridad
    sobre las 4 burbujas de la 1ª columna: cada fila marcada produce un pico."""
    ancho = bordes[1] - bordes[0]
    paso = ancho * PASO_FILA
    xs = [bordes[0] + ancho * (POS_A + k * PASO_OPC) for k in range(4)]
    perfil = {y: max(media_oscuridad(px, x, y, 3) for x in xs) for y in range(y0, y1)}
    # Fase: el desplazamiento que maximiza la oscuridad acumulada en 25 filas.
    mejor = max(
        (sum(perfil.get(round(y_ini + i * paso), 0) for i in range(FILAS)), y_ini)
        for y_ini in range(y0, int(y1 - paso * (FILAS - 1)))
    )
    return mejor[1], paso


def leer(ruta, n=None, debug=None):
    img = imagen_pagina(ruta)
    W, H = img.size
    px = img.load()
    y0, y1 = int(H * 0.56), int(H * 0.95)
    bordes = lineas_tabla(img, y0 + 40, y1 - 60)
    y_fila1, paso = calibrar_filas(px, bordes, y0, y1)

    respuestas, avisos, confianza, centros = {}, [], {}, []
    for bloque in range(4):
        ancho = bordes[bloque + 1] - bordes[bloque]
        for fila in range(FILAS):
            numero = bloque * FILAS + fila + 1
            if n and numero > n:
                break
            cy = y_fila1 + fila * paso
            valores = [media_oscuridad(px, bordes[bloque] + ancho * (POS_A + k * PASO_OPC), cy) for k in range(4)]
            orden = sorted(range(4), key=lambda k: -valores[k])
            mejor, segundo = valores[orden[0]], valores[orden[1]]
            if mejor < 40:
                if n:
                    avisos.append(f'pregunta {numero}: sin marca clara ({[round(v) for v in valores]})')
                continue
            if segundo > mejor * 0.6:
                avisos.append(f'pregunta {numero}: dos burbujas parecidas ({[round(v) for v in valores]})')
            letra = 'abcd'[orden[0]]
            respuestas[numero] = letra
            confianza[numero] = round(mejor / max(segundo, 1), 1)
            centros.append((bordes[bloque] + ancho * (POS_A + orden[0] * PASO_OPC), cy, f'{numero}{letra}'))

    if n:
        sobran = [k for k in respuestas if k > n]
        if sobran:
            avisos.append(f'marcas más allá de la pregunta {n}: {sobran}')

    if debug:
        d = ImageDraw.Draw(img)
        for b in bordes:
            d.line([(b, y0), (b, y1)], fill=(0, 0, 255), width=1)
        for cx, cy, t in centros:
            d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline=(255, 0, 0), width=2)
            d.text((cx + 12, cy - 6), t, fill=(255, 0, 0))
        img.crop((0, y0, W, y1)).save(debug)

    return {
        'respuestas': {str(k): respuestas[k] for k in sorted(respuestas)},
        'avisos': avisos,
        'confianzaMinima': min(confianza.values()) if confianza else None,
    }


if __name__ == '__main__':
    args = sys.argv[1:]
    opciones = {}
    for flag in ('--debug', '--n'):
        if flag in args:
            i = args.index(flag)
            opciones[flag] = args[i + 1]
            del args[i:i + 2]
    res = leer(args[0], int(opciones['--n']) if '--n' in opciones else None, opciones.get('--debug'))
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(res, ensure_ascii=False))
