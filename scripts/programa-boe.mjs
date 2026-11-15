// Genera data/programa.json a partir del texto consolidado del RD 875/2014
// (BOE-A-2014-10344), Anexo II, apartado 3 «Patrón de Embarcaciones de Recreo».
//
// Uso:  node scripts/programa-boe.mjs [ruta-html-local]
// Sin argumento descarga el texto consolidado de boe.es.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const URL_BOE = 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-10344';
const SEP = '\u0001'; // separador de celdas de tabla

async function cargarHtml() {
  const local = process.argv[2];
  if (local) return readFile(local, 'utf8');
  const res = await fetch(URL_BOE, { headers: { 'User-Agent': 'Mozilla/5.0 (app-per)' } });
  if (!res.ok) throw new Error(`BOE respondió ${res.status}`);
  return res.text();
}

function decodificar(s) {
  const ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', shy: '' };
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ent[n.toLowerCase()] ?? m);
}

function aTexto(html) {
  let s = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(br|\/p|\/h\d|\/li|\/tr|\/div)[^>]*>/gi, '\n');
  s = s.replace(/<td[^>]*>/gi, `\n${SEP}\n`);
  s = s.replace(/<[^>]+>/g, '');
  s = decodificar(s).replace(/­/g, '');
  return s
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && l !== '|')
    .join('\n');
}

/** Devuelve el texto entre dos marcas (la primera aparición tras `desde`). */
function cortar(texto, inicio, fin, desde = 0) {
  const i = texto.indexOf(inicio, desde);
  if (i < 0) throw new Error(`No encuentro «${inicio}»`);
  const j = texto.indexOf(fin, i + inicio.length);
  if (j < 0) throw new Error(`No encuentro «${fin}»`);
  return { texto: texto.slice(i, j), fin: j };
}

const NIVEL = { '–': 1, '●': 2, '▪': 3 };

/** Convierte las líneas de una celda de contenido en una lista anidada. */
function contenido(lineas) {
  const raiz = [];
  const pila = [{ nivel: 0, hijos: raiz }];
  for (const l of lineas) {
    const marca = l[0];
    // Las líneas sin viñeta van en la raíz (nivel 0.5); si acaban en «:» introducen las viñetas siguientes.
    const nivel = NIVEL[marca] ?? 0.5;
    const texto = NIVEL[marca] ? l.slice(1).trim() : l;
    const nodo = { texto };
    while (pila.at(-1).nivel >= nivel) pila.pop();
    pila.at(-1).hijos.push(nodo);
    if (NIVEL[marca] || texto.endsWith(':')) {
      nodo.sub = [];
      pila.push({ nivel, hijos: nodo.sub });
    }
  }
  const limpiar = (ns) => ns.map((n) => (n.sub?.length ? { texto: n.texto, sub: limpiar(n.sub) } : { texto: n.texto }));
  return limpiar(raiz);
}

function parsearUnidad(bloque) {
  const cab = bloque.match(/^Unidad Teórica (\d+)\. (.+?)\.?$/m);
  const numero = Number(cab[1]);
  const nombre = cab[2].replace(/\.$/, '');

  let cuerpo = bloque.slice(cab.index + cab[0].length);
  let excluido = [];
  const iEx = cuerpo.indexOf('Queda expresamente excluido:');
  if (iEx >= 0) {
    excluido = cuerpo
      .slice(iEx + 'Queda expresamente excluido:'.length)
      .split(/\n/)
      .map((l) => l.replace(SEP, '').trim())
      .filter(Boolean);
    cuerpo = cuerpo.slice(0, iEx);
  }

  const celdas = cuerpo
    .split(SEP)
    .map((c) => c.split('\n').map((l) => l.trim()).filter(Boolean));

  const apartados = [];
  let notas = [];
  for (let k = 0; k < celdas.length; k++) {
    if (celdas[k].length === 1 && /^\d+\.\d+$/.test(celdas[k][0])) {
      const codigo = celdas[k][0];
      const titulo = celdas[k + 1].join(' ').replace(/\.$/, '');
      const lineas = celdas[k + 2] ?? [];
      // La nota de convocatorias del 5.1 viene pegada al contenido.
      const iNota = lineas.findIndex((l) => l.startsWith('En cada Resolución'));
      if (iNota >= 0) notas = notas.concat(lineas.splice(iNota));
      apartados.push({ codigo, titulo, contenido: contenido(lineas) });
      k += 2;
    }
  }
  if (!apartados.length) throw new Error(`UT${numero}: sin apartados`);
  return { numero, nombre, apartados, excluido, notas };
}

function parsearCuadro(examen) {
  const t = cortar(examen, '3. La distribución', 'Total examen').texto;
  const lineas = t.split('\n').filter((l) => l !== SEP);
  const filas = [];
  for (let k = 0; k < lineas.length; k++) {
    if (/^\d+$/.test(lineas[k]) && Number(lineas[k]) >= 1 && Number(lineas[k]) <= 11 && !/^\d/.test(lineas[k + 1])) {
      const v = lineas.slice(k + 2, k + 7).map((x) => (/^\d+$/.test(x) ? Number(x) : null));
      filas.push({ ut: Number(lineas[k]), nombreCuadro: lineas[k + 1].replace(/\.$/, ''), v });
      k += 6;
    }
  }
  const tot = examen.slice(examen.indexOf('Total examen')).split('\n').filter((l) => l !== SEP).slice(1, 6).map(Number);
  return { filas, tot };
}

function texto(rx, s) {
  const m = s.match(rx);
  if (!m) throw new Error(`No encuentro ${rx}`);
  return m;
}

async function main() {
  const html = await cargarHtml();
  const actualizacion = html.match(/Última actualización publicada el (\d{2}\/\d{2}\/\d{4})/)?.[1] ?? null;
  const txt = aTexto(html);

  // El índice del anexo repite los títulos: buscar el cuerpo tras «2. Patrón para Navegación Básica (PNB)».
  const iPnb = txt.indexOf('2. Patrón para Navegación Básica (PNB)');
  const per = cortar(txt, '3. Patrón de Embarcaciones de Recreo (PER)', '4. Patrón de Yate', iPnb).texto;
  const iExamen = per.indexOf('Examen teórico');
  const temario = per.slice(0, iExamen);
  const examen = per.slice(iExamen);

  const bloques = temario.split(/(?=^Unidad Teórica \d+\.)/m).filter((b) => b.startsWith('Unidad Teórica'));
  const unidades = bloques.map(parsearUnidad);
  if (unidades.length !== 11) throw new Error(`Esperaba 11 unidades, hay ${unidades.length}`);

  const { filas, tot } = parsearCuadro(examen);
  if (filas.length !== 11) throw new Error(`Cuadro de examen: ${filas.length} filas`);

  const preguntas = Number(texto(/compondrá de (\d+) preguntas/, examen)[1]);
  const minAciertos = Number(texto(/mínimo de (\d+) preguntas/, examen)[1]);
  const duracion = texto(/duración máxima de ([^.]+)\./, examen)[1];

  const bloquePnb = new Set([1, 2, 3, 4, 5, 6]);
  for (const u of unidades) {
    const f = filas.find((x) => x.ut === u.numero);
    const [n, maxErr, minOk, maxErrComp, minOkComp] = f.v;
    u.nombreCuadro = f.nombreCuadro;
    u.bloque = bloquePnb.has(u.numero) ? 'PNB' : 'PER';
    u.preguntas = n;
    u.maxErrores = maxErr;
    u.minAciertos = minOk;
    u.maxErroresComplementario = maxErrComp;
    u.minAciertosComplementario = minOkComp;
  }

  const suma = (xs) => xs.reduce((a, b) => a + b, 0);
  const totalPreg = suma(unidades.map((u) => u.preguntas));
  const compl = unidades.filter((u) => u.numero >= 7);
  const totalCompl = suma(compl.map((u) => u.preguntas));

  // Comprobaciones de coherencia con el propio BOE.
  const errores = [];
  if (totalPreg !== preguntas) errores.push(`Suma por UT ${totalPreg} ≠ ${preguntas}`);
  if (tot[0] !== preguntas) errores.push(`Total cuadro ${tot[0]} ≠ ${preguntas}`);
  if (tot[2] !== minAciertos) errores.push(`Mínimo cuadro ${tot[2]} ≠ ${minAciertos}`);
  for (const u of unidades) {
    if (u.maxErrores != null && u.preguntas - u.maxErrores !== u.minAciertos) errores.push(`UT${u.numero}: errores/aciertos incoherentes`);
  }
  if (errores.length) throw new Error(errores.join('\n'));

  const programa = {
    fuente: {
      norma: 'Real Decreto 875/2014, de 10 de octubre, por el que se regulan las titulaciones náuticas para el gobierno de las embarcaciones de recreo',
      id: 'BOE-A-2014-10344',
      url: URL_BOE,
      apartado: 'Anexo II, 3. Patrón de Embarcaciones de Recreo (PER)',
      redaccionAnexoII: 'Modificado por el art. 3.13 del Real Decreto 238/2019, de 5 de abril (BOE-A-2019-6481), en vigor desde el 01/07/2019',
      ultimaActualizacionConsolidado: actualizacion,
      generado: new Date().toISOString().slice(0, 10),
    },
    examen: {
      completo: {
        preguntas,
        opcionesPorPregunta: 4,
        duracion,
        minAciertos,
        maxErroresPorUnidad: Object.fromEntries(unidades.filter((u) => u.maxErrores != null).map((u) => [u.numero, u.maxErrores])),
      },
      complementarioPNB: {
        descripcion: 'Para quien tiene el título de PNB o ha aprobado su examen teórico: solo UT 7 a 11',
        unidades: compl.map((u) => u.numero),
        preguntas: totalCompl,
        duracion: texto(/tiempo máximo de ([^.]+)\./, examen)[1],
        minAciertos: tot[4],
        maxErroresTotales: tot[3],
        maxErroresPorUnidad: Object.fromEntries(compl.filter((u) => u.maxErroresComplementario != null).map((u) => [u.numero, u.maxErroresComplementario])),
      },
      equivalenciaPNB: {
        descripcion: 'Si no se aprueba el PER pero sí con las exigencias del PNB (UT 1 a 6), se reconoce el aprobado del PNB durante dos convocatorias',
        unidades: [1, 2, 3, 4, 5, 6],
        preguntas: 27,
        minAciertos: 17,
        maxErroresPorUnidad: { 5: 2, 6: 5 },
      },
      notas: ['En cada Resolución de Convocatorias se especificará la normativa IALA en la que se basarán los exámenes (marcas laterales: Región A).'],
    },
    unidades: unidades.map(({ numero, nombre, nombreCuadro, bloque, preguntas, maxErrores, minAciertos, maxErroresComplementario, minAciertosComplementario, apartados, excluido }) => ({
      numero, nombre, nombreCuadro, bloque, preguntas, maxErrores, minAciertos, maxErroresComplementario, minAciertosComplementario, apartados, excluido,
    })),
  };

  await mkdir('data', { recursive: true });
  await writeFile('data/programa.json', JSON.stringify(programa, null, 2) + '\n', 'utf8');

  console.log(`Consolidado actualizado el ${actualizacion}`);
  console.table(unidades.map((u) => ({ UT: u.numero, nombre: u.nombre, preg: u.preguntas, maxErr: u.maxErrores ?? '', apartados: u.apartados.length })));
  console.log(`Total ${totalPreg} preguntas, aprobado ≥ ${minAciertos}. Complementario: ${totalCompl} preguntas, aprobado ≥ ${tot[4]}.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
