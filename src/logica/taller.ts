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
  /** Margen admitido (grados o millas; en minutos para latitud y longitud). */
  margen: number
  /** Rumbo/demora (0–360, se compara en círculo), valor con signo (Ct, dm, desvío) o coordenada (grados decimales). */
  clase: 'rumbo' | 'signo' | 'valor' | 'lat' | 'lon'
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
const coma = (x: number) => String(+x.toFixed(1)).replace('.', ',').replace('-', '−')
/** Hora de reloj: 16:05. */
const reloj = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
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

/* ---------- Situaciones en la mar (lecciones 4 a 6) ---------- */

/** Faros que se usan para situarse. */
const FAROS = ['roche', 'trafalgar', 'barbate', 'gracia', 'paloma', 'tarifa', 'carnero', 'europa', 'almina', 'cires', 'alcazar', 'malabata', 'espartel']

/** Puntos en agua libre del Estrecho (grados, W negativo); se mueven hasta ±1′. */
const MAR: [number, number][] = [
  [36 + 8 / 60, -(6 + 8 / 60)],
  [36 + 3 / 60, -(6 + 5 / 60)],
  [36 + 6 / 60, -(5 + 59 / 60)],
  [36 + 1 / 60, -(5 + 50 / 60)],
  [35 + 57 / 60, -(5 + 42 / 60)],
  [35 + 55 / 60, -(5 + 36 / 60)],
  [35 + 58 / 60, -(5 + 30 / 60)],
  [36 + 1 / 60, -(5 + 22 / 60)],
  [35 + 58 / 60, -(5 + 16 / 60)],
  [35 + 52 / 60, -(5 + 56 / 60)],
  [35 + 53 / 60, -(5 + 47 / 60)],
]

const redondeaPos = (p: N.Pos): N.Pos => ({ lat: Math.round(p.lat * 600) / 600, lon: Math.round(p.lon * 600) / 600 })
const enMar = (azar: Azar, punto = elige(azar, MAR)): N.Pos => redondeaPos({ lat: punto[0] + ent(azar, -10, 10) / 600, lon: punto[1] + ent(azar, -10, 10) / 600 })
/** Distancia en millas entre dos situaciones. */
const separacion = (a: N.Pos, b: N.Pos) => N.rumboYDistancia(a, b).distancia

const PISTA_LAT = 'La latitud se lee en la escala de los lados de la carta, a la altura de la situación: grados y minutos N.'
const PISTA_LON = 'La longitud se lee en la escala de arriba o de abajo de la carta: grados y minutos W.'

function pasosSituacion(sit: N.Pos, pistaLat = PISTA_LAT): PasoEjercicio[] {
  return [
    { pregunta: '¿Cuál es la latitud de la situación?', tipo: 'numero', clase: 'lat', respuesta: sit.lat, margen: 1, pista: pistaLat, solucion: `l = ${N.latitud(sit.lat)} (se admite ±1′)` },
    { pregunta: '¿Y la longitud?', tipo: 'numero', clase: 'lon', respuesta: sit.lon, margen: 1.5, pista: PISTA_LON, solucion: `L = ${N.longitud(sit.lon)} (se admite ±1,5′)` },
  ]
}

const marcacionTexto = (m: number) =>
  m === 0 ? 'por la proa' : Math.abs(m) === 180 ? 'por la popa' : Math.abs(m) === 90 ? `por el través de ${m > 0 ? 'estribor' : 'babor'}` : `${Math.abs(m)}º por ${m > 0 ? 'estribor' : 'babor'}`

type Visto = { k: string; rumbo: number; distancia: number }

function faroPorFaro(puntos: Record<string, PuntoCarta>) {
  const pos = (k: string): N.Pos => ({ lat: N.leerCoord(puntos[k].lat), lon: N.leerCoord(puntos[k].lon) })
  /** Faros a la vista desde s (entre 2,5 y 14 millas) y parejas que se cortan bien (35º–145º). */
  const vistos = (desde: N.Pos) => {
    const v: Visto[] = FAROS.map((k) => ({ k, ...N.rumboYDistancia(desde, pos(k)) })).filter((x) => x.distancia >= 2.5 && x.distancia <= 14)
    const pares: [Visto, Visto][] = []
    for (let i = 0; i < v.length; i++)
      for (let j = i + 1; j < v.length; j++) {
        const a = Math.abs(N.diferencia(v[i].rumbo, v[j].rumbo))
        if (a >= 35 && a <= 145) pares.push([v[i], v[j]])
      }
    return { v, pares }
  }
  const pareja = (azar: Azar, pares: [Visto, Visto][]): [Visto, Visto] => {
    const [a, b] = elige(azar, pares)
    return azar() < 0.5 ? [a, b] : [b, a]
  }
  return { pos, vistos, pareja }
}

/* ---------- Lección 4: situación por dos demoras ---------- */

function leccion4(puntos: Record<string, PuntoCarta>) {
  const { pos, vistos, pareja } = faroPorFaro(puntos)
  return (azar: Azar): Ejercicio => {
    for (;;) {
      const { pares } = vistos(enMar(azar))
      if (!pares.length) continue
      const [f1, f2] = pareja(azar, pares)
      const dv1 = Math.round(f1.rumbo) % 360
      const dv2 = Math.round(f2.rumbo) % 360
      const sit = N.porDosDemoras(pos(f1.k), dv1, pos(f2.k), dv2)
      const n1 = puntos[f1.k].nombre
      const n2 = puntos[f2.k].nombre
      const trazar = `Traza desde cada faro su Dv dada la vuelta (Dv ± 180º): la situación es donde se cortan las dos líneas. ${PISTA_LAT}`
      if (azar() < 0.5) {
        // Demoras de aguja
        const separado = azar() < 0.5
        const dm = noCero(azar, -4, 2)
        let de = noCero(azar, -5, 5)
        while (dm + de === 0) de = noCero(azar, -5, 5)
        const ct = separado ? dm + de : noCero(azar, -9, 9)
        const da1 = N.n360(dv1 - ct)
        const da2 = N.n360(dv2 - ct)
        return {
          carta: true,
          enunciado: `${separado ? `Declinación = ${comoDm(azar, dm)}; desvío = ${comoDesvio(azar, de)}.` : `Ct = ${c(ct)}.`} Tomamos al mismo tiempo Da del ${n1} = ${g(da1)} y Da del ${n2} = ${g(da2)}. ¿Cuál es nuestra situación?`,
          pasos: [
            ...(separado ? [{ pregunta: '¿Cuál es la corrección total (Ct)?', tipo: 'numero', clase: 'signo', respuesta: ct, margen: 0.05, pista: PISTA_CT, solucion: `Ct = dm + Δ = ${c(dm)} ${s(de)} = ${c(ct)}` } satisfies PasoEjercicio] : []),
            { pregunta: `¿Qué Dv tiene el ${n1}?`, tipo: 'numero', clase: 'rumbo', respuesta: dv1, margen: 0.5, pista: 'Dv = Da + Ct.', solucion: `Dv = ${g(da1)} ${s(ct)} = ${g(dv1)}` },
            { pregunta: `¿Y el ${n2}?`, tipo: 'numero', clase: 'rumbo', respuesta: dv2, margen: 0.5, pista: 'Dv = Da + Ct.', solucion: `Dv = ${g(da2)} ${s(ct)} = ${g(dv2)}` },
            ...pasosSituacion(sit, trazar),
          ],
        }
      }
      // Marcaciones
      const ct = noCero(azar, -8, 8)
      const rv = ent(azar, 0, 359)
      const ra = N.rumboAguja(rv, ct)
      const m1 = N.diferencia(rv, dv1)
      const m2 = N.diferencia(rv, dv2)
      const pistaM = 'Dv = Rv + marcación por estribor, Rv − marcación por babor.'
      const cuenta = (m: number, dv: number) => `Dv = ${g(rv)} ${m < 0 ? '−' : '+'} ${Math.abs(m)}º = ${g(dv)}`
      return {
        carta: true,
        enunciado: `Navegando al Ra = ${g(ra)} con Ct = ${c(ct)}, marcamos a la vez el ${n1} ${marcacionTexto(m1)} y el ${n2} ${marcacionTexto(m2)}. ¿Cuál es nuestra situación?`,
        pasos: [
          { pregunta: '¿Cuál es el rumbo verdadero (Rv)?', tipo: 'numero', clase: 'rumbo', respuesta: rv, margen: 0.5, pista: PISTA_RV, solucion: `Rv = Ra + Ct = ${g(ra)} ${s(ct)} = ${g(rv)}` },
          { pregunta: `¿Qué Dv tiene el ${n1}?`, tipo: 'numero', clase: 'rumbo', respuesta: dv1, margen: 0.5, pista: pistaM, solucion: cuenta(m1, dv1) },
          { pregunta: `¿Y el ${n2}?`, tipo: 'numero', clase: 'rumbo', respuesta: dv2, margen: 0.5, pista: pistaM, solucion: cuenta(m2, dv2) },
          ...pasosSituacion(sit, trazar),
        ],
      }
    }
  }
}

/* ---------- Lección 5: demora y distancia, dos distancias ---------- */

const PISTA_COMPAS = 'Una milla es un minuto de latitud: la distancia se toma en la escala de los lados de la carta (nunca en la de arriba).'

function leccion5(puntos: Record<string, PuntoCarta>) {
  const { pos, vistos, pareja } = faroPorFaro(puntos)
  return (azar: Azar): Ejercicio => {
    for (;;) {
      const s0 = enMar(azar)
      const { v, pares } = vistos(s0)
      if (!v.length) continue
      const variante = ent(azar, 0, 2)
      const ct = noCero(azar, -8, 8)
      if (variante === 0) {
        // Demora y distancia al mismo faro
        const f = elige(azar, v)
        const dv = Math.round(f.rumbo) % 360
        const d = Math.round(f.distancia * 10) / 10
        const sit = N.estima(pos(f.k), N.n360(dv + 180), d)
        const n = puntos[f.k].nombre
        const da = N.n360(dv - ct)
        return {
          carta: true,
          enunciado: `Con Ct = ${c(ct)} tomamos Da del ${n} = ${g(da)}, y en el radar lo vemos a ${coma(d)} millas. ¿Cuál es nuestra situación?`,
          pasos: [
            { pregunta: `¿Qué Dv tiene el ${n}?`, tipo: 'numero', clase: 'rumbo', respuesta: dv, margen: 0.5, pista: 'Dv = Da + Ct.', solucion: `Dv = ${g(da)} ${s(ct)} = ${g(dv)}` },
            { pregunta: '¿Cuántos minutos de latitud abres con el compás?', tipo: 'numero', clase: 'valor', respuesta: d, margen: 0.05, pista: PISTA_COMPAS, solucion: `${coma(d)} millas = ${coma(d)}′ de latitud` },
            ...pasosSituacion(sit, `Traza desde el faro la línea a ${g(dv + 180)} (la Dv dada la vuelta) y lleva sobre ella las ${coma(d)} millas con el compás. ${PISTA_LAT}`),
          ],
        }
      }
      if (!pares.length) continue
      const [f1, f2] = pareja(azar, pares)
      const n1 = puntos[f1.k].nombre
      const n2 = puntos[f2.k].nombre
      const d2 = Math.round(f2.distancia * 10) / 10
      if (variante === 1) {
        // Dos distancias
        const d1 = Math.round(f1.distancia * 10) / 10
        let cortes: Record<'N' | 'S' | 'E' | 'W', N.Pos>
        try {
          const corte = (lado: 'N' | 'S' | 'E' | 'W') => N.porDosDistancias(pos(f1.k), d1, pos(f2.k), d2, lado)
          cortes = { N: corte('N'), S: corte('S'), E: corte('E'), W: corte('W') }
        } catch {
          continue
        }
        const porLat = Math.abs(cortes.N.lat - cortes.S.lat) * 60 >= separacion(cortes.E, cortes.W) * 0.6
        const [o1, o2] = porLat ? (['N', 'S'] as const) : (['E', 'W'] as const)
        const lado = separacion(cortes[o1], s0) < separacion(cortes[o2], s0) ? o1 : o2
        const sit = cortes[lado]
        if (separacion(sit, s0) > 0.5 || separacion(cortes[o1], cortes[o2]) < 2) continue
        const nombreLado = { N: 'norte', S: 'sur', E: 'este', W: 'oeste' }[lado]
        return {
          carta: true,
          enunciado: `En el radar vemos el ${n1} a ${coma(d1)} millas y el ${n2} a ${coma(d2)} millas. De los dos puntos donde se cortan los círculos, estamos en el que queda más al ${nombreLado}. ¿Cuál es nuestra situación?`,
          pasos: [
            { pregunta: `¿Cuántos minutos de latitud abres con el compás para el ${n1}?`, tipo: 'numero', clase: 'valor', respuesta: d1, margen: 0.05, pista: PISTA_COMPAS, solucion: `${coma(d1)} millas = ${coma(d1)}′ de latitud` },
            ...pasosSituacion(sit, `Con centro en cada faro, traza un arco con su distancia. Los arcos se cortan en dos puntos: quédate con el más al ${nombreLado}. ${PISTA_LAT}`),
          ],
        }
      }
      // Demora a un faro y distancia a otro
      const dv1 = Math.round(f1.rumbo) % 360
      let a: N.Pos, b: N.Pos
      try {
        a = N.porDemoraYDistancia(pos(f1.k), dv1, pos(f2.k), d2, 0)
        b = N.porDemoraYDistancia(pos(f1.k), dv1, pos(f2.k), d2, 1)
      } catch {
        continue
      }
      const unico = separacion(a, b) < 0.01
      if (!unico && separacion(a, b) < 2) continue
      const cerca = separacion(a, s0) <= separacion(b, s0)
      const sit = cerca ? a : b
      if (separacion(sit, s0) > 0.5) continue
      const da1 = N.n360(dv1 - ct)
      return {
        carta: true,
        enunciado: `Con Ct = ${c(ct)} tomamos Da del ${n1} = ${g(da1)} y, a la vez, vemos en el radar el ${n2} a ${coma(d2)} millas.${unico ? '' : ` La línea de demora corta el círculo en dos puntos: estamos en el más ${cerca ? 'cercano al' : 'alejado del'} ${n1}.`} ¿Cuál es nuestra situación?`,
        pasos: [
          { pregunta: `¿Qué Dv tiene el ${n1}?`, tipo: 'numero', clase: 'rumbo', respuesta: dv1, margen: 0.5, pista: 'Dv = Da + Ct.', solucion: `Dv = ${g(da1)} ${s(ct)} = ${g(dv1)}` },
          ...pasosSituacion(sit, `Traza desde el ${n1} la línea a ${g(dv1 + 180)} y, con centro en el ${n2}, un arco de ${coma(d2)} millas: la situación es el corte. ${PISTA_LAT}`),
        ],
      }
    }
  }
}

/* ---------- Lección 6: estima ---------- */

/** Minutos con signo y sentido: «−5,3′ (S)». */
const minutos = (x: number, mas: string, menos: string, unidad = '′') => `${x < 0 ? '−' : '+'}${coma(Math.abs(x))}${unidad} (${x < 0 ? menos : mas})`

function leccion6(azar: Azar): Ejercicio {
  for (;;) {
    const i = ent(azar, 0, MAR.length - 1)
    const j = ent(azar, 0, MAR.length - 1)
    if (i === j) continue
    const p0 = enMar(azar, MAR[i])
    const { rumbo, distancia } = N.rumboYDistancia(p0, enMar(azar, MAR[j]))
    if (distancia < 4 || distancia > 13) continue
    const rv = Math.round(rumbo) % 360
    const v = elige(azar, [4, 5, 6, 7, 8, 10])
    const decimas = Math.max(3, Math.round((distancia / v) * 10)) // tiempo en décimas de hora (múltiplos de 6 min)
    const t = decimas / 10
    const d = Math.round(v * t * 10) / 10
    const minTotal = decimas * 6
    const salida = ent(azar, 7 * 12, 17 * 12) * 5
    const llegada = salida + minTotal
    const ct = noCero(azar, -8, 8)
    const ra = N.rumboAguja(rv, ct)
    const conRa = azar() < 0.6
    const rad = (rv * Math.PI) / 180
    const dl = d * Math.cos(rad)
    const ap = d * Math.sin(rad)
    const l1 = p0.lat + dl / 60
    const lm = (p0.lat + l1) / 2
    const dL = ap / Math.cos((lm * Math.PI) / 180)
    const fin = { lat: l1, lon: p0.lon + dL / 60 }
    const enCarta = azar() < 0.4
    const pasos: PasoEjercicio[] = []
    if (conRa) pasos.push({ pregunta: '¿Cuál es el rumbo verdadero (Rv)?', tipo: 'numero', clase: 'rumbo', respuesta: rv, margen: 0.5, pista: PISTA_RV, solucion: `Rv = Ra + Ct = ${g(ra)} ${s(ct)} = ${g(rv)}` })
    pasos.push(
      {
        pregunta: '¿Cuánto tiempo navegamos, en horas con decimales?',
        tipo: 'numero',
        clase: 'valor',
        respuesta: t,
        margen: 0.02,
        pista: 'Resta las horas y pasa los minutos a horas dividiendo entre 60 (30 min = 0,5 h; 6 min = 0,1 h).',
        solucion: `${reloj(llegada)} − ${reloj(salida)} = ${N.duracion(minTotal)} = ${coma(t)} h`,
      },
      { pregunta: '¿Cuántas millas navegamos?', tipo: 'numero', clase: 'valor', respuesta: d, margen: 0.1, pista: 'Distancia = velocidad × tiempo (nudos × horas).', solucion: `d = ${v} nudos × ${coma(t)} h = ${coma(d)} millas` },
    )
    if (enCarta)
      pasos.push(...pasosSituacion(fin, `Desde la situación de salida traza el Rv = ${g(rv)} y lleva sobre él ${coma(d)} millas con el compás (tomadas en la escala de latitudes). ${PISTA_LAT}`))
    else
      pasos.push(
        {
          pregunta: '¿Cuánto cambia la latitud (Δl), en minutos? (+ o N si sube, − o S si baja)',
          tipo: 'numero',
          clase: 'signo',
          respuesta: dl,
          margen: 0.15,
          pista: 'Δl = d · cos Rv. Con rumbos entre 090º y 270º el coseno es negativo: vamos al S.',
          solucion: `Δl = ${coma(d)} · cos ${g(rv)} = ${minutos(dl, 'N', 'S')}`,
        },
        {
          pregunta: '¿Cuál es la latitud de llegada?',
          tipo: 'numero',
          clase: 'lat',
          respuesta: l1,
          margen: 0.3,
          pista: 'Latitud de llegada = latitud de salida + Δl. Si los minutos pasan de 60, suma un grado; si bajan de 0, quita uno.',
          solucion: `l = ${N.latitud(p0.lat)} ${dl < 0 ? '−' : '+'} ${coma(Math.abs(dl))}′ = ${N.latitud(l1)}`,
        },
        {
          pregunta: '¿Cuál es el apartamiento (A), en millas? (+ o E hacia el este, − o W hacia el oeste)',
          tipo: 'numero',
          clase: 'signo',
          respuesta: ap,
          margen: 0.15,
          pista: 'A = d · sen Rv. Con rumbos entre 180º y 360º el seno es negativo: vamos al W.',
          solucion: `A = ${coma(d)} · sen ${g(rv)} = ${minutos(ap, 'E', 'W', ' millas')}`,
        },
        {
          pregunta: '¿Cuánto cambia la longitud (ΔL), en minutos?',
          tipo: 'numero',
          clase: 'signo',
          respuesta: dL,
          margen: 0.3,
          pista: 'ΔL = A / cos lm, donde lm es la latitud media entre la de salida y la de llegada.',
          solucion: `lm = ${N.latitud(lm)} → ΔL = ${coma(ap)} / cos lm = ${minutos(dL, 'E', 'W')}`,
        },
        {
          pregunta: '¿Cuál es la longitud de llegada?',
          tipo: 'numero',
          clase: 'lon',
          respuesta: fin.lon,
          margen: 0.4,
          pista: 'Estamos al W de Greenwich: si ΔL es W, los minutos de longitud aumentan; si es E, disminuyen.',
          solucion: `L = ${N.longitud(p0.lon)} ${dL < 0 ? '+' : '−'} ${coma(Math.abs(dL))}′ = ${N.longitud(fin.lon)}`,
        },
      )
    return {
      carta: enCarta,
      enunciado: `A las ${reloj(salida)} estamos en l = ${N.latitud(p0.lat)}, L = ${N.longitud(p0.lon)}. Navegamos ${conRa ? `al Ra = ${g(ra)} con Ct = ${c(ct)}` : `al Rv = ${g(rv)}`} a ${v} nudos hasta las ${reloj(llegada)}. ¿Cuál es la situación de estima a esa hora?${enCarta ? ' Resuélvelo en la carta.' : ''}`,
      pasos,
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
    {
      id: 'dos-demoras',
      numero: 4,
      titulo: 'Situación por dos demoras',
      resumen: 'Dos Dv simultáneas se cortan en la situación · necesitas la carta',
      teoria: [
        'Una demora a un faro es una línea de posición: estamos en algún punto de la recta que sale del faro en la dirección contraria a la Dv (Dv ± 180º). Con dos demoras tomadas a la vez, estamos donde se cortan.',
        'Primero se pasan las demoras a verdaderas: Dv = Da + Ct, o bien Dv = Rv ± marcación si nos dan marcaciones.',
        'En la carta: lleva la Dv desde una rosa hasta el faro con regla y cartabón y traza la línea por el lado del mar. Haz lo mismo con el segundo faro. El corte es la situación.',
        'La latitud se lee en las escalas de los lados de la carta; la longitud, en las de arriba y abajo. Se admite ±1′ en latitud y ±1,5′ en longitud.',
      ],
      laminas: ['ut11-dos-demoras'],
      generar: leccion4(puntos),
    },
    {
      id: 'distancias',
      numero: 5,
      titulo: 'Demora y distancia, dos distancias',
      resumen: 'Situación con el compás: círculos de distancia · necesitas la carta',
      teoria: [
        'Una distancia a un faro (por radar) es otra línea de posición: un círculo con centro en el faro y radio esa distancia.',
        'Demora y distancia al mismo faro: traza la línea de la Dv dada la vuelta desde el faro y lleva sobre ella la distancia. Es la forma más rápida de situarse.',
        'Dos distancias a dos faros: dos arcos que se cortan en dos puntos. El enunciado te dice con cuál quedarte (el otro suele caer en tierra).',
        'Demora a un faro y distancia a otro: la recta y el círculo también se pueden cortar dos veces; de nuevo, el enunciado dice cuál.',
        'La distancia se toma siempre en la escala de latitudes (los lados de la carta): 1 milla = 1′ de latitud.',
      ],
      laminas: ['ut11-circulos'],
      generar: leccion5(puntos),
    },
    {
      id: 'estima',
      numero: 6,
      titulo: 'Situación de estima',
      resumen: 'Desde una situación, con rumbo, velocidad y tiempo',
      teoria: [
        'La estima es dónde estamos sabiendo de dónde salimos, a qué rumbo y cuánto hemos navegado. Distancia = velocidad × tiempo (nudos × horas).',
        'En la carta: desde la situación de salida se traza el Rv y se lleva la distancia con el compás. El final es la situación de estima.',
        'Con números: Δl = d · cos Rv (minutos de latitud, + N / − S) y apartamiento A = d · sen Rv (millas, + E / − W). La latitud de llegada es la de salida + Δl.',
        'El apartamiento se pasa a minutos de longitud con la latitud media: ΔL = A / cos lm. Al W de Greenwich, ir al W hace crecer los minutos de longitud.',
      ],
      laminas: ['ut11-estima'],
      generar: leccion6,
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
  const m = t.match(/^([+-])?\s*(\d+(?:\.\d+)?)\s*(NE|NW|N|S|E|W)?$/)
  if (!m) return null
  let v = +m[2]
  if (m[1] === '-' || m[3] === 'NW' || m[3] === 'W' || m[3] === 'S') v = -v
  return v
}

/**
 * Lee una latitud o longitud: «36 02,5», «36º 02,5′ N», «005 41,3 W», «5-41.3».
 * Sin letra, la latitud es N y la longitud W (estamos en el Estrecho). Grados decimales.
 */
export function leerCoordenada(texto: string, clase: 'lat' | 'lon'): number | null {
  const t = texto.trim().replace(/[−–]/g, '-').replace(/,/g, '.').replace(/[º°'′’"]/g, ' ').toUpperCase()
  const m = t.match(/^(-)?\s*(\d{1,3})(?:[\s-]+(\d{1,2}(?:\.\d+)?))?\s*([NSEW])?$/)
  if (!m) return null
  const min = m[3] ? +m[3] : 0
  if (min >= 60) return null
  const v = +m[2] + min / 60
  const letra = m[4]
  if (letra && (clase === 'lat') !== (letra === 'N' || letra === 'S')) return null
  const negativo = clase === 'lat' ? m[1] === '-' || letra === 'S' : letra !== 'E'
  return negativo ? -v : v
}

/** Lee la respuesta de un paso según su clase. */
export const leerPaso = (p: PasoEjercicio, texto: string): number | null => (p.clase === 'lat' || p.clase === 'lon' ? leerCoordenada(texto, p.clase) : leerRespuesta(texto))

export function esCorrecta(p: PasoEjercicio, v: number): boolean {
  if (p.tipo === 'banda') return v === p.respuesta
  if (p.clase === 'lat' || p.clase === 'lon') return Math.abs(p.respuesta - v) * 60 <= p.margen + 1e-9
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
