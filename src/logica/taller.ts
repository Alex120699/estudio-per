/**
 * Taller de carta: lecciones de menos a más con ejercicios guiados que la app inventa
 * (con los faros reales del Estrecho) y corrige paso a paso.
 */
import * as N from './navegacion'

export type Azar = () => number

export interface PasoEjercicio {
  pregunta: string
  /** «numero»: se escribe un valor; «banda»: se elige babor o estribor. */
  tipo: 'numero' | 'banda'
  /** Para «banda»: +1 estribor, −1 babor. */
  respuesta: number
  /** Margen admitido (grados o millas). */
  margen: number
  /** Rumbo/demora (0–360, se compara en círculo) o valor con signo (Ct, dm, desvío). */
  clase: 'rumbo' | 'signo' | 'valor'
  pista: string
  /** La cuenta hecha, para enseñarla al acertar o tras fallar dos veces. */
  solucion: string
}

export interface Ejercicio {
  enunciado: string
  pasos: PasoEjercicio[]
  /** Hace falta medir en la carta de papel. */
  carta?: boolean
}

export interface Leccion {
  id: string
  numero: number
  titulo: string
  resumen: string
  teoria: string[]
  /** Láminas (ids de laminas.json) que ilustran la lección. */
  laminas: string[]
  generar: (azar: Azar) => Ejercicio
}

/* ---------- Azar y formato ---------- */

const ent = (azar: Azar, a: number, b: number) => a + Math.floor(azar() * (b - a + 1))
const elige = <T>(azar: Azar, xs: readonly T[]): T => xs[Math.floor(azar() * xs.length)]
/** Rumbo con tres cifras, y con un decimal solo si lo tiene (241,5º). */
const g = (a: number) => (Number.isInteger(Math.round(N.n360(a) * 10) / 10) ? N.grados(a) : N.grados(a, 1))
const coma = (x: number) => String(+x.toFixed(1)).replace('.', ',')
/** Ángulo con signo y sentido: «+3º (NE)». */
const c = (a: number) => N.corr(a)
/** Sumando para escribir cuentas: «+ 3º» / «− 3º». */
const s = (x: number) => `${x < 0 ? '−' : '+'} ${coma(Math.abs(x))}º`
/** Una declinación como la escriben los enunciados: «3º NE» o «−3º». */
const comoDm = (azar: Azar, x: number) => (azar() < 0.5 ? `${coma(Math.abs(x))}º ${x >= 0 ? 'NE' : 'NW'}` : `${x < 0 ? '−' : '+'}${coma(Math.abs(x))}º`)
const comoDesvio = (azar: Azar, x: number) => (azar() < 0.5 ? `${coma(Math.abs(x))}º ${x >= 0 ? 'NE' : 'NW'}` : `${x < 0 ? '−' : '+'}${coma(Math.abs(x))}º (${x < 0 ? 'menos' : 'más'})`)
const noCero = (azar: Azar, a: number, b: number) => {
  let x = 0
  while (x === 0) x = ent(azar, a, b)
  return x
}

/** Rumbo cuadrantal («S 40 E») de un rumbo circular, si no cae en un eje. */
function cuadrantal(r: number): string {
  const ns = r <= 90 || r >= 270 ? 'N' : 'S'
  const ew = r < 180 ? 'E' : 'W'
  const a = ns === 'N' ? (r <= 90 ? r : 360 - r) : r <= 180 ? 180 - r : r - 180
  return `${ns} ${a} ${ew}`
}

const PISTA_CT = 'Ct = dm + Δ. Lo que es NE o + suma; lo que es NW o − resta.'
const PISTA_RV = 'Rv = Ra + Ct (con el signo de la Ct).'
const PISTA_RA = 'Ra = Rv − Ct: se deshace la corrección.'

/* ---------- Lección 1: Ct y rumbos ---------- */

function leccion1(azar: Azar): Ejercicio {
  const dm = noCero(azar, -6, 6) / (azar() < 0.3 ? 2 : 1)
  const de = noCero(azar, -8, 8)
  const ct = dm + de
  const pasoCt: PasoEjercicio = {
    pregunta: '¿Cuál es la corrección total (Ct)?',
    tipo: 'numero',
    clase: 'signo',
    respuesta: ct,
    margen: 0.05,
    pista: PISTA_CT,
    solucion: `Ct = dm + Δ = ${c(dm)} ${s(de)} = ${c(ct)}`,
  }
  const variante = ent(azar, 0, 2)
  if (variante === 0) {
    const ra = ent(azar, 0, 359)
    const rv = N.rumboVerdadero(ra, ct)
    const enCuadrantal = azar() < 0.35 && ra % 90 !== 0
    return {
      enunciado: `Navegamos al rumbo de aguja Ra = ${enCuadrantal ? cuadrantal(ra) : g(ra)}. Declinación magnética = ${comoDm(azar, dm)}; desvío de la aguja = ${comoDesvio(azar, de)}.`,
      pasos: [
        ...(enCuadrantal
          ? [
              {
                pregunta: `Pasa ${cuadrantal(ra)} a rumbo circular (0–360º).`,
                tipo: 'numero',
                clase: 'rumbo',
                respuesta: ra,
                margen: 0,
                pista: 'N…E = el ángulo; S…E = 180 − ángulo; S…W = 180 + ángulo; N…W = 360 − ángulo.',
                solucion: `${cuadrantal(ra)} = ${g(ra)}`,
              } satisfies PasoEjercicio,
            ]
          : []),
        pasoCt,
        { pregunta: '¿Cuál es el rumbo verdadero (Rv)?', tipo: 'numero', clase: 'rumbo', respuesta: rv, margen: 0.5, pista: PISTA_RV, solucion: `Rv = Ra + Ct = ${g(ra)} ${s(ct)} = ${g(rv)}` },
      ],
    }
  }
  if (variante === 1) {
    const rv = ent(azar, 0, 359)
    const ra = N.rumboAguja(rv, ct)
    return {
      enunciado: `En la carta trazamos el rumbo verdadero Rv = ${g(rv)}. Declinación magnética = ${comoDm(azar, dm)}; desvío = ${comoDesvio(azar, de)}. ¿Qué rumbo damos al timonel?`,
      pasos: [pasoCt, { pregunta: '¿Cuál es el rumbo de aguja (Ra)?', tipo: 'numero', clase: 'rumbo', respuesta: ra, margen: 0.5, pista: PISTA_RA, solucion: `Ra = Rv − Ct = ${g(rv)} ${s(-ct)} = ${g(ra)}` }],
    }
  }
  // Declinación de la carta trasladada al año en curso
  const anio = ent(azar, 2005, 2016)
  const hoy = 2026
  const anual = noCero(azar, 4, 9) * (azar() < 0.8 ? 1 : -1) // minutos al año, + hacia el E
  const base = -(ent(azar, 3, 6) + ent(azar, 0, 5) / 10)
  const baseMin = Math.round(base * 60)
  const dmHoy = Math.round(baseMin + anual * (hoy - anio)) / 60
  const deg = (x: number) => {
    const m = Math.round(Math.abs(x) * 60)
    return `${Math.floor(m / 60)}º ${String(m % 60).padStart(2, '0')}′ ${x < 0 ? 'W' : 'E'}`
  }
  const ra = ent(azar, 0, 359)
  const ctR = Math.round((dmHoy + de) * 10) / 10
  const rv = N.rumboVerdadero(ra, dmHoy + de)
  return {
    enunciado: `La rosa de la carta dice: declinación ${deg(base)} ${anio} (${Math.abs(anual)}′ ${anual > 0 ? 'E' : 'W'}). Estamos en ${hoy}, navegando al Ra = ${g(ra)} con desvío ${comoDesvio(azar, de)}.`,
    pasos: [
      {
        pregunta: `¿Cuál es la declinación (dm) en ${hoy}? Escríbela en grados con decimales (p. ej. −3,5 o 3,5 NW).`,
        tipo: 'numero',
        clase: 'signo',
        respuesta: dmHoy,
        margen: 0.1,
        pista: `Multiplica los años que han pasado por el cambio anual y súmalo (si es ${anual > 0 ? 'E, acerca la W a cero' : 'W, la hace más W'}). 60′ = 1º.`,
        solucion: `${hoy} − ${anio} = ${hoy - anio} años × ${Math.abs(anual)}′ = ${Math.abs(anual * (hoy - anio))}′ ${anual > 0 ? 'E' : 'W'} → ${deg(base)} ${anual > 0 ? '−' : '+'} ${Math.abs(anual * (hoy - anio))}′ = ${deg(dmHoy)} = ${c(dmHoy)}`,
      },
      { ...pasoCt, respuesta: dmHoy + de, margen: 0.15, solucion: `Ct = dm + Δ = ${c(dmHoy)} ${s(de)} = ${c(ctR)}` },
      { pregunta: '¿Cuál es el rumbo verdadero (Rv)?', tipo: 'numero', clase: 'rumbo', respuesta: rv, margen: 0.6, pista: PISTA_RV, solucion: `Rv = Ra + Ct = ${g(ra)} ${s(ctR)} = ${g(rv)}` },
    ],
  }
}

/* ---------- Lección 2: demoras y marcaciones ---------- */

function leccion2(azar: Azar): Ejercicio {
  const faro = elige(azar, ['el faro de Isla de Tarifa', 'el faro de Punta Carnero', 'el faro de Cabo Espartel', 'el faro de Punta Cires', 'el faro de Punta Paloma', 'el faro de Punta Almina'])
  const variante = ent(azar, 0, 2)
  const ct = noCero(azar, -9, 9)
  const ra = ent(azar, 0, 359)
  const rv = N.rumboVerdadero(ra, ct)
  const pasoRv: PasoEjercicio = { pregunta: '¿Cuál es el rumbo verdadero (Rv)?', tipo: 'numero', clase: 'rumbo', respuesta: rv, margen: 0.5, pista: PISTA_RV, solucion: `Rv = Ra + Ct = ${g(ra)} ${s(ct)} = ${g(rv)}` }
  if (variante === 0) {
    const especial = azar() < 0.3
    const m = especial ? elige(azar, [0, 90, -90, 180]) : noCero(azar, -17, 17) * 10 + ent(azar, -4, 4)
    const texto = m === 0 ? 'por la proa' : m === 180 ? 'por la popa' : Math.abs(m) === 90 ? `por el través de ${m > 0 ? 'estribor' : 'babor'}` : `${Math.abs(m)}º por ${m > 0 ? 'estribor' : 'babor'}`
    const dv = N.demoraDeMarcacion(rv, m)
    return {
      enunciado: `Navegando al Ra = ${g(ra)} con Ct = ${c(ct)}, marcamos ${faro} ${texto}.`,
      pasos: [
        pasoRv,
        {
          pregunta: `¿Qué demora verdadera (Dv) tiene ${faro}?`,
          tipo: 'numero',
          clase: 'rumbo',
          respuesta: dv,
          margen: 0.5,
          pista: 'Dv = Rv + marcación: por estribor se suma, por babor se resta (proa 0º, través 90º, popa 180º).',
          solucion: `Dv = Rv ${m < 0 ? '−' : '+'} ${Math.abs(m)}º = ${g(rv)} ${m < 0 ? '−' : '+'} ${Math.abs(m)}º = ${g(dv)}`,
        },
      ],
    }
  }
  if (variante === 1) {
    const da = ent(azar, 0, 359)
    const dv = N.n360(da + ct)
    return {
      enunciado: `Con Ct = ${c(ct)}, tomamos con la aguja la demora de ${faro}: Da = ${g(da)}.`,
      pasos: [{ pregunta: `¿Qué demora verdadera (Dv) tiene ${faro}?`, tipo: 'numero', clase: 'rumbo', respuesta: dv, margen: 0.5, pista: 'Las demoras se corrigen igual que los rumbos: Dv = Da + Ct.', solucion: `Dv = Da + Ct = ${g(da)} ${s(ct)} = ${g(dv)}` }],
    }
  }
  // De demora a marcación
  const m = noCero(azar, -17, 17) * 10 + ent(azar, -4, 4)
  const dv = N.demoraDeMarcacion(rv, m)
  return {
    enunciado: `Navegamos al Ra = ${g(ra)} con Ct = ${c(ct)}. En la carta vemos que ${faro} nos demora Dv = ${g(dv)}.`,
    pasos: [
      pasoRv,
      {
        pregunta: '¿Cuántos grados de marcación tiene el faro (de 0 a 180)?',
        tipo: 'numero',
        clase: 'valor',
        respuesta: Math.abs(m),
        margen: 0.5,
        pista: 'Marcación = Dv − Rv. Si sale más de 180º, réstalo de 360º y es por babor.',
        solucion: `Dv − Rv = ${g(dv)} − ${g(rv)} = ${N.n360(dv - rv)}º${m < 0 ? ` → 360º − ${N.n360(dv - rv)}º = ${Math.abs(m)}º` : ''}`,
      },
      {
        pregunta: '¿Por qué banda?',
        tipo: 'banda',
        clase: 'valor',
        respuesta: m > 0 ? 1 : -1,
        margen: 0,
        pista: 'Si Dv − Rv sale entre 0º y 180º el faro está a la derecha: estribor.',
        solucion: `${Math.abs(m)}º por ${m > 0 ? 'estribor' : 'babor'}`,
      },
    ],
  }
}

/* ---------- Lección 3: Ct por enfilación u oposición (con la carta) ---------- */

export interface PuntoCarta {
  nombre: string
  lat: string
  lon: string
}

type Linea = { tipo: 'enfilacion' | 'oposicion'; a: string; b: string; donde?: string }

/** Enfilaciones (a es el faro cercano) y oposiciones habituales en la carta 105. */
const LINEAS: Linea[] = [
  { tipo: 'enfilacion', a: 'trafalgar', b: 'roche', donde: 'al sur de Cabo Trafalgar' },
  { tipo: 'enfilacion', a: 'gracia', b: 'paloma', donde: 'al oeste de Punta Gracia' },
  { tipo: 'enfilacion', a: 'tarifa', b: 'paloma', donde: 'al sureste de Tarifa' },
  { tipo: 'enfilacion', a: 'europa', b: 'carnero', donde: 'al este de Gibraltar' },
  { tipo: 'enfilacion', a: 'carnero', b: 'europa', donde: 'al suroeste de Punta Carnero' },
  { tipo: 'enfilacion', a: 'cires', b: 'alcazar', donde: 'al noreste de Punta Cires' },
  { tipo: 'oposicion', a: 'carnero', b: 'almina' },
  { tipo: 'oposicion', a: 'carnero', b: 'cires' },
  { tipo: 'oposicion', a: 'europa', b: 'almina' },
  { tipo: 'oposicion', a: 'europa', b: 'cires' },
  { tipo: 'oposicion', a: 'tarifa', b: 'malabata' },
  { tipo: 'oposicion', a: 'tarifa', b: 'cires' },
  { tipo: 'oposicion', a: 'tarifa', b: 'alcazar' },
  { tipo: 'oposicion', a: 'paloma', b: 'malabata' },
  { tipo: 'oposicion', a: 'trafalgar', b: 'espartel' },
]

function leccion3(puntos: Record<string, PuntoCarta>) {
  const pos = (k: string): N.Pos => ({ lat: N.leerCoord(puntos[k].lat), lon: N.leerCoord(puntos[k].lon) })
  return (azar: Azar): Ejercicio => {
    const l = elige(azar, LINEAS)
    const [a, b] = l.tipo === 'oposicion' && azar() < 0.5 ? [l.b, l.a] : [l.a, l.b]
    const dv = l.tipo === 'enfilacion' ? N.rumboYDistancia(pos(a), pos(b)).rumbo : N.rumboYDistancia(pos(b), pos(a)).rumbo
    const dvR = Math.round(dv)
    const ct = noCero(azar, -10, 10)
    const da = N.n360(dvR - ct)
    const na = puntos[a].nombre
    const nb = puntos[b].nombre
    const dm = noCero(azar, -4, 3)
    const ra = ent(azar, 0, 359)
    const enunciado =
      l.tipo === 'enfilacion'
        ? `Navegando ${l.donde}, vemos enfilados el ${na} y, detrás, el ${nb}. Tomamos con la aguja la demora de la enfilación: Da = ${g(da)}. Ra = ${g(ra)}; declinación de la zona = ${c(dm)}.`
        : `Cruzamos la oposición del ${na} y el ${nb} (estamos entre los dos) y tomamos Da del ${na} = ${g(da)}. Ra = ${g(ra)}; declinación de la zona = ${c(dm)}.`
    return {
      carta: true,
      enunciado,
      pasos: [
        {
          pregunta: l.tipo === 'enfilacion' ? 'Mide en la carta la demora verdadera (Dv) de la enfilación.' : `Mide en la carta la demora verdadera (Dv) al ${na}.`,
          tipo: 'numero',
          clase: 'rumbo',
          respuesta: dv,
          margen: 2,
          pista:
            l.tipo === 'enfilacion'
              ? `Une los dos faros con la regla y lleva la línea a una rosa: la dirección es del ${na} hacia el ${nb}.`
              : `Une los dos faros con la regla: la Dv al ${na} es la dirección que va del ${nb} hacia el ${na}.`,
          solucion: `Medida en la carta: Dv ≈ ${g(dvR)} (se admite ±2º)`,
        },
        {
          pregunta: '¿Cuál es la corrección total (Ct)?',
          tipo: 'numero',
          clase: 'signo',
          respuesta: ct,
          margen: 2,
          pista: 'La Ct es lo que hay que sumar a la demora de aguja para llegar a la verdadera: Ct = Dv − Da.',
          solucion: `Ct = Dv − Da = ${g(dvR)} − ${g(da)} = ${c(ct)}`,
        },
        {
          pregunta: '¿Cuál es el desvío (Δ) de la aguja?',
          tipo: 'numero',
          clase: 'signo',
          respuesta: ct - dm,
          margen: 2,
          pista: 'Ct = dm + Δ, así que Δ = Ct − dm.',
          solucion: `Δ = Ct − dm = ${c(ct)} ${s(-dm)} = ${c(ct - dm)}`,
        },
        {
          pregunta: '¿Cuál es el rumbo verdadero (Rv)?',
          tipo: 'numero',
          clase: 'rumbo',
          respuesta: N.rumboVerdadero(ra, ct),
          margen: 2,
          pista: PISTA_RV,
          solucion: `Rv = Ra + Ct = ${g(ra)} ${s(ct)} = ${g(N.rumboVerdadero(ra, ct))}`,
        },
      ],
    }
  }
}

/* ---------- Lecciones ---------- */

export function lecciones(puntos: Record<string, PuntoCarta>): Leccion[] {
  return [
    {
      id: 'ct-rumbos',
      numero: 1,
      titulo: 'Corrección total y rumbos',
      resumen: 'dm + desvío = Ct · de Ra a Rv y de Rv a Ra',
      teoria: [
        'La aguja no apunta al norte verdadero. Se separa por dos causas: la declinación magnética (dm), que depende del lugar y del año y viene en la rosa de la carta, y el desvío (Δ), que depende del barco y del rumbo y viene en la tablilla de desvíos.',
        'Las dos se suman con su signo: Ct = dm + Δ. Lo que es NE (o E, o +) suma; lo que es NW (o W, o −) resta.',
        'Con la Ct se pasa de aguja a verdadero sumando: Rv = Ra + Ct. Y de verdadero a aguja, restando: Ra = Rv − Ct. Si sale más de 360º se restan 360º; si sale negativo, se suman.',
        'La declinación de la carta está referida a un año. Para llevarla al año en curso: años transcurridos × cambio anual, y se suma o resta según el cambio sea E o W.',
      ],
      laminas: ['ut10-nortes'],
      generar: leccion1,
    },
    {
      id: 'demoras',
      numero: 2,
      titulo: 'Demoras y marcaciones',
      resumen: 'Dv = Da + Ct · Dv = Rv + marcación',
      teoria: [
        'La demora es el ángulo desde el norte hasta la visual a un objeto. La de aguja (Da) se corrige como un rumbo: Dv = Da + Ct.',
        'La marcación es el ángulo desde la proa hasta el objeto, de 0º a 180º por estribor o por babor. Proa = 0º, través = 90º, popa = 180º.',
        'Para pasar de marcación a demora verdadera: Dv = Rv + marcación por estribor, o Dv = Rv − marcación por babor.',
        'Al revés: marcación = Dv − Rv. Si sale entre 0º y 180º es por estribor; si sale más, se resta de 360º y es por babor.',
      ],
      laminas: ['ut10-marcacion', 'ut11-marcacion'],
      generar: leccion2,
    },
    {
      id: 'ct-carta',
      numero: 3,
      titulo: 'Ct por enfilación u oposición',
      resumen: 'Se mide la Dv en la carta y se compara con la Da · necesitas la carta',
      teoria: [
        'Cuando vemos dos faros en línea (enfilación) o estamos en la recta que los une y entre los dos (oposición), sabemos su demora verdadera sin calcular nada: es la dirección de esa recta, medida en la carta.',
        'Enfilación: la Dv a los dos faros es la dirección que va del faro cercano al lejano. Oposición: la Dv a un faro es la dirección que va desde el otro faro hacia él.',
        'Si a la vez tomamos la demora con la aguja (Da), la diferencia es la corrección total: Ct = Dv − Da. Con la declinación de la carta se saca el desvío: Δ = Ct − dm.',
        'Para medir: une los dos faros con la regla, desplázala con el cartabón hasta el centro de una rosa y lee el ángulo en el sentido correcto. Se admite un margen de ±2º.',
      ],
      laminas: ['ut11-ct'],
      generar: leccion3(puntos),
    },
  ]
}

/* ---------- Corrección de respuestas ---------- */

/**
 * Lee lo que escribe el alumno: «-3», «−3,5», «+4», «3 NW», «3,5º NE», «045».
 * Devuelve null si no es un número.
 */
export function leerRespuesta(texto: string): number | null {
  const t = texto.trim().replace(/[−–]/g, '-').replace(/,/g, '.').replace(/[º°]/g, '').toUpperCase()
  const m = t.match(/^([+-])?\s*(\d+(?:\.\d+)?)\s*(NE|NW|E|W)?$/)
  if (!m) return null
  let v = +m[2]
  if (m[1] === '-' || m[3] === 'NW' || m[3] === 'W') v = -v
  return v
}

export function esCorrecta(p: PasoEjercicio, v: number): boolean {
  if (p.tipo === 'banda') return v === p.respuesta
  if (p.clase === 'rumbo') return Math.abs(N.diferencia(p.respuesta, v)) <= p.margen + 1e-9
  return Math.abs(p.respuesta - v) <= p.margen + 1e-9
}

/** Generador repetible (mulberry32) para el ejemplo resuelto y los tests. */
export function azarFijo(semilla: number): Azar {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
