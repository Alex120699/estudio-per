# Estudio PER

App web personal (PWA) para preparar el examen teórico del Patrón de Embarcaciones de Recreo. Especificación completa en [PLAN.md](PLAN.md).

## Comandos

```bash
npm install
npm run dev        # desarrollo
npm test           # tests (Vitest)
npm run build      # build de producción con service worker
npm run preview    # servir el build
npm run programa   # regenerar data/programa.json desde el BOE
```

## Datos

- `data/programa.json`: temario, reparto de preguntas y criterios de aprobado del PER, extraídos del Anexo II del RD 875/2014 (BOE-A-2014-10344, texto consolidado) con `scripts/programa-boe.mjs`.
- `data/preguntas.json`: banco de preguntas de exámenes oficiales, generado con `npm run datos`.

### Pipeline de preguntas

Requiere `pdftotext` (poppler) y un entorno Python local para leer las plantillas escaneadas:

```bash
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements.txt
npm run datos
```

1. `scripts/fuentes.json`: exámenes oficiales (URL del cuestionario, de la plantilla y erratas oficiales).
2. `scripts/descargar.mjs`: descarga a `fuentes/pdf/` y extrae el texto a `fuentes/txt/` (no versionados).
3. `scripts/analizar-pdfs.mjs`: lee por OMR las plantillas escaneadas de Andalucía (`fuentes/soluciones/`) y detecta figuras (`fuentes/figuras/`). Estos resultados sí se versionan para poder revisarlos.
4. `scripts/construir-preguntas.mjs`: parsea, aplica soluciones y erratas, valida cada examen contra el reparto oficial, deduplica comprobando que la respuesta coincide entre fuentes y escribe `data/preguntas.json`.
