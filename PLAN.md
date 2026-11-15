# App de estudio PER — Plan del proyecto

App web personal (tipo app, usable en el móvil) para preparar el examen teórico del **Patrón de Embarcaciones de Recreo (PER)** en la Comunitat Valenciana. Pensada para hacer tests cortos muchas veces al día, **sin límite de tiempo**, guardando el historial de aciertos y fallos.

> Este archivo es la especificación para Claude Code. Guárdalo en la raíz del proyecto (o renómbralo a `CLAUDE.md` para que Claude Code lo lea siempre).

---

## 1. Funciones de la primera versión

### 1.1 Simulacro tipo examen (sin tiempo)
- 45 preguntas con el **mismo reparto por unidades que el examen real** (ver §3).
- Sin cronómetro. Se puede pausar y continuar más tarde (el progreso del simulacro en curso se guarda).
- Corrección con los **criterios oficiales**:
  - Aprobado con **≥ 32 aciertos** de 45.
  - Y además, como máximo: **5 errores** en Reglamento (RIPA), **2 errores** en Balizamiento, **2 errores** en Carta de navegación.
  - Mostrar claramente si el suspenso es por nota global o por superar los errores de una materia.
- Modo opcional **PER complementario** (para quien ya tiene el PNB): unidades 7 a 11, 18 preguntas.
- Al terminar: resultado, repaso pregunta a pregunta (tu respuesta, la correcta, explicación si existe y fuente oficial).

### 1.2 Tests por tema
- Elegir una o varias unidades y el número de preguntas (10 / 20 / todas).
- Opciones: «solo preguntas no vistas», «solo falladas», «aleatorias».
- Corrección inmediata tras cada pregunta (modo estudio) o al final (modo test). Lo elige el usuario.

### 1.3 Repaso de fallos
- Cada pregunta fallada entra en la **caja de fallos**.
- Sale de la caja tras **acertarla 2 veces seguidas** en días distintos (repetición espaciada sencilla).
- Botón visible en la portada: «Repasar fallos (N pendientes)».

### 1.4 Historial y estadísticas
- Por pregunta: veces vista, aciertos, fallos, última respuesta, fecha.
- Por unidad: % de acierto, evolución en el tiempo y preguntas pendientes en la caja de fallos.
- Lista de sesiones (fecha, tipo, resultado) y gráfico de los simulacros (aciertos y apto/no apto).
- Indicador «¿Estoy listo?»: % de los últimos 5 simulacros aprobados con los criterios oficiales.
- **Exportar e importar** el historial en JSON, como copia de seguridad y para pasarlo entre dispositivos.

### 1.5 Apuntes por tema
- Una página de teoría por unidad, en Markdown, con el programa oficial como índice.
- Resúmenes breves, tablas (luces y marcas, balizamiento, reglas de rumbo, escala Beaufort…) y trucos para memorizar.
- Desde cada pregunta fallada, enlace a la sección de apuntes de su unidad.
- Avisar en la app de que los apuntes son material propio y no oficial.

---

## 2. Stack técnico (propuesta)

- **Vite + React + TypeScript**, sin backend.
- Datos de preguntas en archivos **JSON estáticos** dentro del repo (`/data`).
- Historial en el navegador con **IndexedDB** (p. ej. con `dexie`), más export/import en JSON.
- **PWA** (manifest + service worker, p. ej. `vite-plugin-pwa`) para instalarla en el móvil y usarla sin conexión.
- Diseño móvil primero: botones de respuesta grandes y una pregunta por pantalla.
- Despliegue gratuito opcional en GitHub Pages, Netlify o Vercel.
- Tests con **Vitest**, sobre todo para la lógica de corrección del simulacro y el reparto de preguntas.

---

## 3. Estructura del examen PER (verificar contra el Anexo II del RD 875/2014)

Las 45 preguntas tienen 4 opciones y solo una es correcta. El reparto por unidad teórica es este:

| UT | Unidad | Preguntas | Bloque |
|----|--------|-----------|--------|
| 1 | Nomenclatura náutica | 4 | PNB |
| 2 | Elementos de amarre y fondeo | 2 | PNB |
| 3 | Seguridad | 4 | PNB |
| 4 | Legislación | 2 | PNB |
| 5 | Balizamiento | 5 | PNB (máx. 2 errores) |
| 6 | Reglamento (RIPA) | 10 | PNB (máx. 5 errores) |
| 7 | Maniobra y navegación | 2 | PER |
| 8 | Emergencias en la mar | 3 | PER |
| 9 | Meteorología | 4 | PER |
| 10 | Teoría de navegación | 5 | PER |
| 11 | Carta de navegación | 4 | PER (máx. 2 errores) |

- Las UT 1–6 forman el PNB (27 preguntas) y las UT 7–11 el PER complementario (18 preguntas).
- **Tarea 0 para Claude Code:** descargar el texto consolidado del RD 875/2014 (BOE-A-2014-10344), comprobar los nombres, el reparto y el programa detallado de cada unidad del Anexo II, y guardarlo en `/data/programa.json`.
- Balizamiento: las preguntas de marcas laterales se refieren a la **Región A** (IALA).

---

## 4. Contenido: de dónde sacar las preguntas

Usar **solo fuentes oficiales y públicas**: exámenes publicados por las administraciones. No copiar preguntas de academias ni de webs comerciales de tests.

| Fuente | Qué publica | Notas |
|--------|-------------|-------|
| Junta de Andalucía | Exámenes PER (modelos A/B) y PER reducido, en PDF, de varios años | Fuente principal. Las soluciones van en plantillas aparte |
| Govern de les Illes Balears (CAIB) | Exámenes PER con la respuesta correcta en cada pregunta | Formato muy fácil de parsear |
| Xunta de Galicia | «Exame e respostas» del PER | En gallego: traducir al castellano y revisar |
| Generalitat Valenciana (Actividades Náuticas) | Plantillas de respuestas de sus convocatorias | Comprobar si publica también los enunciados |
| Dirección General de la Marina Mercante | Exámenes de sus convocatorias | Comprobar disponibilidad |

**Ojo con la Carta de navegación (UT 11):** se resuelve sobre la carta de prácticas del Estrecho de Gibraltar con escuadra, cartabón y compás. La app puede mostrar la pregunta y las opciones, pero para resolverla hace falta la carta en papel. Marcar estas preguntas con `requiereCarta: true` y permitir:
- responderlas igualmente (habiendo trabajado sobre la carta física), o
- excluirlas de un test rápido en el móvil.

### Pipeline de datos (scripts en `/scripts`)
1. `fuentes.json`: lista de URLs de PDFs oficiales (examen y plantilla) con comunidad, convocatoria y modelo.
2. Descargar a `/fuentes/pdf/` (carpeta en `.gitignore`).
3. Extraer el texto con `pdftotext -layout`.
4. Parsear a JSON: detectar «UNIDAD TEÓRICA N», numeración de preguntas y opciones a)–d).
5. Cruzar con la plantilla de soluciones para fijar la respuesta correcta.
6. **Validación automática**: 4 opciones, una correcta, unidad 1–11 y un reparto por unidad que cuadre con §3.
7. **Deduplicar**: muchas preguntas se repiten entre convocatorias y comunidades. Normalizar el texto y fusionarlas, guardando todas las fuentes.
8. Revisión manual de las preguntas con imágenes (luces, marcas, banderas). Recortar la imagen del PDF a `/public/img/` o marcarla como `requiereImagen`.

### Esquema de pregunta (`/data/preguntas.json`)
```json
{
  "id": "and-2026-2c-A-17",
  "unidad": 6,
  "enunciado": "…",
  "opciones": ["…", "…", "…", "…"],
  "correcta": 2,
  "explicacion": "…",
  "imagen": "img/and-2026-2c-A-17.png",
  "requiereCarta": false,
  "fuentes": [
    { "comunidad": "Andalucía", "convocatoria": "2026-2", "modelo": "A", "numero": 17, "url": "…" }
  ]
}
```
- `correcta` es el índice 0–3.
- `explicacion` es opcional: se puede ir añadiendo poco a poco, empezando por las preguntas más falladas.

### Esquema del historial (IndexedDB)
- `respuestas`: `{ preguntaId, fecha, elegida, acierto, modo, sesionId }`
- `sesiones`: `{ id, tipo: "simulacro"|"tema"|"repaso", inicio, fin, preguntas[], resultado }`
- `cajaFallos`: `{ preguntaId, aciertosSeguidos, ultimoAcierto }`

---

## 5. Fases de trabajo con Claude Code

1. **Fase 0. Base:** crear el proyecto Vite + React + TS + PWA y el `programa.json` verificado contra el BOE.
2. **Fase 1. Datos piloto:** pipeline con 3–4 exámenes (Andalucía + Baleares) y unas 150–200 preguntas validadas.
3. **Fase 2. Núcleo:** test por tema y simulacro con corrección oficial (con tests unitarios de la corrección).
4. **Fase 3. Historial:** IndexedDB, estadísticas, caja de fallos y export/import.
5. **Fase 4. Apuntes:** una página Markdown por unidad, enlazada desde las preguntas.
6. **Fase 5. Más contenido:** ampliar el banco con todas las convocatorias disponibles, deduplicar y añadir imágenes.
7. **Fase 6. Publicar:** desplegar e instalar como app en el móvil.

---

## 6. Criterios de calidad

- No dar por buena ninguna pregunta sin su respuesta contrastada con la plantilla oficial.
- Guardar siempre la fuente (comunidad, convocatoria, número) para poder comprobarla.
- Lógica de corrección del simulacro cubierta por tests: aprobado justo con 32, suspenso con 6 errores en RIPA aunque haya 40 aciertos, etc.
- La app debe funcionar sin conexión una vez instalada.
