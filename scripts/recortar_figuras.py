"""Recorta de un cuestionario PDF la figura de una pregunta y la guarda como imagen (WebP o PNG, según la extensión del destino).

Une todas las cajas que `detectar_figuras.py` asignó a esa pregunta en la misma
página, añade un margen y renderiza solo ese trozo a 2x.

Uso:  .venv/Scripts/python -I scripts/recortar_figuras.py examen.pdf figuras.json pregunta destino.webp
Salida: JSON {"ancho": px, "alto": px}
"""

import json
import sys

import pypdfium2 as pdfium

ESCALA = 2
MARGEN = 6  # puntos alrededor de la figura


def recortar(ruta_pdf, detalle, pregunta, destino):
    cajas = [d for d in detalle if d['pregunta'] == pregunta]
    if not cajas:
        raise SystemExit(f'La pregunta {pregunta} no tiene figura detectada')
    num_pag = cajas[0]['pagina']
    cajas = [d['caja'] for d in cajas if d['pagina'] == num_pag]
    l = min(c[0] for c in cajas) - MARGEN
    t = min(c[1] for c in cajas) - MARGEN
    r = max(c[2] for c in cajas) + MARGEN
    b = max(c[3] for c in cajas) + MARGEN

    pagina = pdfium.PdfDocument(ruta_pdf)[num_pag - 1]
    ancho, alto = pagina.get_width(), pagina.get_height()
    l, t = max(0, l), max(0, t)
    r, b = min(ancho, r), min(alto, b)
    # crop = (izquierda, abajo, derecha, arriba) en puntos recortados desde cada borde.
    img = pagina.render(scale=ESCALA, crop=(l, alto - b, ancho - r, t)).to_pil()
    if destino.endswith('.webp'):
        img.save(destino, quality=80, method=6)
    else:
        img.save(destino, optimize=True)
    return {'ancho': img.width, 'alto': img.height}


if __name__ == '__main__':
    ruta_pdf, ruta_json, pregunta, destino = sys.argv[1:5]
    with open(ruta_json, encoding='utf-8') as f:
        detalle = json.load(f)['detalle']
    print(json.dumps(recortar(ruta_pdf, detalle, int(pregunta), destino)))
