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
- `data/preguntas.json`: banco de preguntas de exámenes oficiales (Andalucía 2025-2026 y Baleares 2017-2026), generado con `npm run datos`. Tiene dos partes: `examenes` (comunidad, convocatoria, modelo y URL de cada examen) y `preguntas` (cada una con las apariciones en esos exámenes).
- `public/img/`: figuras de las preguntas recortadas de los PDF originales.
- `apuntes/utNN.md`: apuntes propios (no oficiales) de cada unidad, en Markdown sin HTML. Cada apartado del programa es un `## N.M Título` con el mismo título que en `programa.json`; un test comprueba que el índice coincide con el programa oficial.

### Pipeline de preguntas

Requiere `pdftotext` (poppler) y un entorno Python local para leer las plantillas escaneadas:

```bash
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements.txt
npm run datos
```

1. `scripts/fuentes.json`: exámenes de Andalucía, a mano (URL del cuestionario, de la plantilla y erratas oficiales).
2. `scripts/descubrir-baleares.mjs`: recorre las convocatorias de la web de la CAIB, descarga cada documento (caché en `fuentes/caib/`) y escribe `scripts/fuentes-baleares.json` con los exámenes completos del PER en castellano. Los documentos descartados (PNB, PER específico, versión en catalán, duplicados…) quedan listados con el motivo.
3. `scripts/descargar.mjs`: descarga a `fuentes/pdf/` y extrae el texto a `fuentes/txt/` (no versionados).
4. `scripts/analizar-pdfs.mjs`: lee por OMR las plantillas escaneadas de Andalucía (`fuentes/soluciones/`) y detecta figuras (`fuentes/figuras/`). Estos resultados sí se versionan para poder revisarlos.
5. `scripts/construir-preguntas.mjs`: parsea, aplica soluciones y erratas, valida cada examen contra el reparto oficial y agrupa la misma pregunta de todas las convocatorias:
   - **Respuesta**: todas las fuentes tienen que coincidir. Si no, el build falla hasta que se decida a mano en `scripts/revisiones.json` (con el motivo, que la app muestra).
   - **Unidad**: la de la cabecera de Andalucía si existe; si no, la mayoritaria por posición en el examen.
   - **Texto**: el de la versión más reciente; el `id` es el de la aparición más antigua, para que no cambie al añadir convocatorias.
   - **Figuras**: se recortan a `public/img/` con `scripts/recortar_figuras.py`. Las preguntas que piden una imagen que no se ha encontrado no salen en los tests.
   - Se excluyen las preguntas con varias respuestas correctas o con opciones repetidas en el original.

## Publicación

La app es estática (sin backend): el historial vive en el navegador de cada dispositivo (IndexedDB) y se pasa de uno a otro con exportar/importar en Estadísticas.

- Cada push a `main` ejecuta `.github/workflows/publicar.yml`, que pasa lint y tests, compila con `BASE_PATH=/<repo>/` y publica `dist/` en GitHub Pages.
- Para instalarla en el móvil: abrir la URL de GitHub Pages y usar «Añadir a pantalla de inicio» (Safari en iOS) o «Instalar app» (Chrome en Android). Después funciona sin conexión.
- Los iconos PNG se generan desde `public/icon-cuadrado.svg` con `npm run iconos`.
