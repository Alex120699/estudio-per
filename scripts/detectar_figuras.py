"""Detecta qué preguntas de un cuestionario PDF llevan figura (dibujo vectorial o
imagen) para marcarlas con `requiereImagen`.

Para cada página (salvo la portada, con --portada) busca objetos gráficos de tamaño apreciable
fuera de la cabecera y los asigna a la pregunta cuyo número («N.» a principio de
línea) aparece más cerca por encima, en la misma página.

Uso:  .venv/Scripts/python -I scripts/detectar_figuras.py examen.pdf [--portada]
      --portada: la 1.ª página es una portada sin preguntas (Andalucía) y se ignora.
Salida: JSON {"preguntas": [19, ...], "detalle": [{"pregunta": 19, "pagina": 6, "caja": [...]}]}
"""

import json
import re
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as R

MIN_LADO = 12      # puntos: ignora líneas finas y viñetas
CABECERA = 110     # puntos desde arriba: logo de la página
PIE = 40           # puntos desde abajo: numeración
MARGEN_IZQ = 80    # puntos: objetos que acaban antes son adornos del margen
MAX_FRACCION = 0.5 # objetos de más de media página son marcos, no figuras


def inicios_pregunta(pagina):
    """[(numero, y_desde_arriba)] de las preguntas que empiezan en la página."""
    tp = pagina.get_textpage()
    texto = tp.get_text_range()
    alto = pagina.get_height()
    res = []
    for m in re.finditer(r'(?m)^\s*(\d{1,2})\.\s', texto):
        i = m.start(1)
        _, _, _, top = tp.get_charbox(i)
        res.append((int(m.group(1)), alto - top))
    return res


def figuras(pagina):
    alto = pagina.get_height()
    cajas = []
    for o in pagina.get_objects(max_depth=3):
        if o.type not in (R.FPDF_PAGEOBJ_PATH, R.FPDF_PAGEOBJ_IMAGE):
            continue
        l, b, r, t = o.get_bounds()
        if r - l < MIN_LADO or t - b < MIN_LADO:
            continue
        y_sup, y_inf = alto - t, alto - b
        if y_inf < CABECERA or y_sup > alto - PIE:
            continue
        if r < MARGEN_IZQ:  # adornos de la esquina de página
            continue
        if (r - l) * (t - b) > MAX_FRACCION * pagina.get_width() * alto:  # marco de página
            continue
        cajas.append([round(l), round(y_sup), round(r), round(y_inf)])
    return cajas


def detectar(ruta, portada=False):
    pdf = pdfium.PdfDocument(ruta)
    detalle = []
    ultima_pregunta = None
    for num_pag, pagina in enumerate(pdf, start=1):
        inicios = inicios_pregunta(pagina)
        if num_pag > 1 or not portada:
            for caja in figuras(pagina):
                previas = [n for n, y in inicios if y <= caja[1] + 5]
                pregunta = max(previas) if previas else ultima_pregunta
                if pregunta is not None:
                    detalle.append({'pregunta': pregunta, 'pagina': num_pag, 'caja': caja})
        if inicios:
            ultima_pregunta = max(n for n, _ in inicios)
    return {'preguntas': sorted({d['pregunta'] for d in detalle}), 'detalle': detalle}


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(detectar(sys.argv[1], '--portada' in sys.argv[2:]), ensure_ascii=False))
