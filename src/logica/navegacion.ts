/**
 * Motor de navegación costera (UT 11): las mismas cuentas que se hacen sobre la carta,
 * con la aproximación de la estima (latitud media), que es la que se usa en el PER.
 * Ángulos en grados; latitud + N y longitud + E (W negativa).
 */

export interface Pos {
  lat: number
  lon: number
}

const RAD = Math.PI / 180

/** Lleva un ángulo a [0, 360). */
export const n360 = (a: number): number => ((a % 360) + 360) % 360

/** Ct = dm + Δ (NE/E y + suman; NW/W y − restan). */
export const correccionTotal = (dm: number, desvio: number): number => dm + desvio

/** Rv = Ra + Ct. */
export const rumboVerdadero = (ra: number, ct: number): number => n360(ra + ct)

/** Ra = Rv − Ct. */
export const rumboAguja = (rv: number, ct: number): number => n360(rv - ct)

/** Demora verdadera a partir de la marcación (estribor +, babor −). */
export const demoraDeMarcacion = (rv: number, marcacion: number): number => n360(rv + marcacion)

/** Ángulo con signo en (−180, 180]: lo que hay que sumar a «de» para llegar a «a». */
export const diferencia = (de: number, a: number): number => {
  const d = n360(a - de)
  return d > 180 ? d - 360 : d
}

/** Rumbo verdadero y distancia (millas) de A a B por estima. */
export function rumboYDistancia(a: Pos, b: Pos): { rumbo: number; distancia: number } {
  const dl = (b.lat - a.lat) * 60
  const ap = (b.lon - a.lon) * 60 * Math.cos(((a.lat + b.lat) / 2) * RAD)
  return { rumbo: n360(Math.atan2(ap, dl) / RAD), distancia: Math.hypot(dl, ap) }
}

/** Situación tras navegar d millas al rumbo verdadero r desde p. */
export function estima(p: Pos, r: number, d: number): Pos {
  const dl = d * Math.cos(r * RAD)
  const ap = d * Math.sin(r * RAD)
  const lat = p.lat + dl / 60
  return { lat, lon: p.lon + ap / 60 / Math.cos(((p.lat + lat) / 2) * RAD) }
}

/** Coordenadas planas (millas) de p respecto a un origen. */
function plano(o: Pos, p: Pos): [number, number] {
  const c = Math.cos(((o.lat + p.lat) / 2) * RAD)
  return [(p.lon - o.lon) * 60 * c, (p.lat - o.lat) * 60]
}
function dePlano(o: Pos, [x, y]: [number, number]): Pos {
  const lat = o.lat + y / 60
  return { lat, lon: o.lon + x / 60 / Math.cos(((o.lat + lat) / 2) * RAD) }
}
const vector = (r: number): [number, number] => [Math.sin(r * RAD), Math.cos(r * RAD)]

/** Situación por dos demoras verdaderas simultáneas a los puntos f1 y f2. */
export function porDosDemoras(f1: Pos, dv1: number, f2: Pos, dv2: number): Pos {
  // S = F1 − t1·u1 = F2 − t2·u2  →  t1·u1 − t2·u2 = F1 − F2
  const [bx, by] = plano(f2, f1)
  const [ax, ay] = vector(dv1)
  const [cx, cy] = vector(dv2)
  const det = ax * -cy - -cx * ay
  if (Math.abs(det) < 1e-9) throw new Error('Demoras paralelas: no se cortan')
  const t1 = (bx * -cy - -cx * by) / det
  return estima(f1, n360(dv1 + 180), t1)
}

/**
 * Situación por demora verdadera a g y distancia a f (que pueden ser el mismo punto).
 * Si hay dos cortes, «cual» elige: 0 el más cercano a g, 1 el más lejano.
 */
export function porDemoraYDistancia(g: Pos, dv: number, f: Pos, d: number, cual = 0): Pos {
  // S = G − t·u ; |S − F| = d
  const [px, py] = plano(f, g)
  const [ux, uy] = vector(dv)
  const b = -2 * (px * ux + py * uy)
  const c = px * px + py * py - d * d
  const disc = b * b - 4 * c
  if (disc < 0) throw new Error('La demora no corta el círculo de distancia')
  const ts = [(-b - Math.sqrt(disc)) / 2, (-b + Math.sqrt(disc)) / 2].filter((t) => t > -1e-9).sort((x, y) => x - y)
  if (!ts.length) throw new Error('Sin corte por delante')
  const t = ts[Math.min(cual, ts.length - 1)]
  return estima(g, n360(dv + 180), t)
}

/** Situación por distancias a dos puntos; «lado» elige el corte más al N, S, E o W. */
export function porDosDistancias(f1: Pos, d1: number, f2: Pos, d2: number, lado: 'N' | 'S' | 'E' | 'W'): Pos {
  const [x2, y2] = plano(f1, f2)
  const D = Math.hypot(x2, y2)
  if (D > d1 + d2 || D < Math.abs(d1 - d2)) throw new Error('Los círculos no se cortan')
  const a = (d1 * d1 - d2 * d2 + D * D) / (2 * D)
  const h = Math.sqrt(Math.max(0, d1 * d1 - a * a))
  const mx = (a * x2) / D
  const my = (a * y2) / D
  const cands: [number, number][] = [
    [mx + (h * -y2) / D, my + (h * x2) / D],
    [mx - (h * -y2) / D, my - (h * x2) / D],
  ]
  const k = { N: (p: [number, number]) => p[1], S: (p: [number, number]) => -p[1], E: (p: [number, number]) => p[0], W: (p: [number, number]) => -p[0] }[lado]
  cands.sort((p, q) => k(q) - k(p))
  return dePlano(f1, cands[0])
}

/** Punto donde la derrota (p, rumbo r) corta la recta que pasa por a y b. */
export function corteConRecta(p: Pos, r: number, a: Pos, b: Pos): Pos {
  const [ax, ay] = plano(p, a)
  const [bx, by] = plano(p, b)
  const [ux, uy] = vector(r)
  const dx = bx - ax
  const dy = by - ay
  const det = ux * -dy - -dx * uy
  if (Math.abs(det) < 1e-9) throw new Error('La derrota es paralela a la recta')
  const t = (ax * -dy - -dx * ay) / det
  return dePlano(p, [ux * t, uy * t])
}

/**
 * Rumbo verdadero para pasar a d millas de f dejándolo por la banda indicada
 * (tangente al círculo de distancia), y ángulo de desvío respecto a la demora.
 */
export function rumboParaPasar(p: Pos, f: Pos, d: number, banda: 'babor' | 'estribor'): { rumbo: number; demora: number; distancia: number; angulo: number } {
  const { rumbo: demora, distancia } = rumboYDistancia(p, f)
  if (d >= distancia) throw new Error('Ya estamos dentro de esa distancia')
  const angulo = Math.asin(d / distancia) / RAD
  return { rumbo: n360(banda === 'estribor' ? demora - angulo : demora + angulo), demora, distancia, angulo }
}

/** Rumbo efectivo y velocidad efectiva con corriente (rumbo de la corriente, intensidad horaria). */
export function conCorriente(rs: number, vs: number, rc: number, ih: number): { rumbo: number; velocidad: number } {
  const [ax, ay] = vector(rs)
  const [cx, cy] = vector(rc)
  const x = ax * vs + cx * ih
  const y = ay * vs + cy * ih
  return { rumbo: n360(Math.atan2(x, y) / RAD), velocidad: Math.hypot(x, y) }
}

/** Rumbo de superficie y velocidad efectiva para seguir el rumbo efectivo re con corriente. */
export function contraCorriente(re: number, vs: number, rc: number, ih: number): { rumbo: number; velocidad: number } {
  // Componente de la corriente perpendicular al rumbo efectivo que hay que compensar
  const perp = ih * Math.sin((rc - re) * RAD)
  const alfa = Math.asin(-perp / vs) / RAD
  const rs = n360(re + alfa)
  const ve = vs * Math.cos(alfa * RAD) + ih * Math.cos((rc - re) * RAD)
  return { rumbo: rs, velocidad: ve }
}

/* ---------- Horas ---------- */

/** «0930» / «09:30» / «9h 30m» → minutos desde las 00:00. */
export function aMinutos(h: string | number): number {
  const s = String(h).replace(/\s/g, '')
  const m = s.match(/^(\d{1,2})[h:.]?(\d{2})(?:m|:(\d{2}))?$/i)
  if (!m) throw new Error(`Hora no reconocida: ${h}`)
  return +m[1] * 60 + +m[2] + (m[3] ? +m[3] / 60 : 0)
}

/** Minutos → «12h 08m». */
export function hora(min: number): string {
  const t = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}h ${String(t % 60).padStart(2, '0')}m`
}

/** Minutos → «1h 25m» (duración). */
export function duracion(min: number): string {
  const t = Math.round(min)
  return t >= 60 ? `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m` : `${t}m`
}

/* ---------- Formato ---------- */

const coma = (x: number, dec: number) => x.toFixed(dec).replace('.', ',')

/** 205.3 → «205º» (o con un decimal si dec = 1). */
export const grados = (a: number, dec = 0): string => {
  const v = n360(a)
  const r = +v.toFixed(dec)
  return `${(r === 360 ? 0 : r).toFixed(dec).replace('.', ',').padStart(dec ? 5 + dec - 1 : 3, '0')}º`
}

/** Ángulo con signo y sentido: +3 → «+3º (NE)». */
export const corr = (a: number, dec = 1): string => {
  const r = +a.toFixed(dec)
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${coma(Math.abs(r), dec).replace(/,0+$/, '')}º${r ? (r > 0 ? ' (NE)' : ' (NW)') : ''}`
}

export const millas = (d: number): string => `${coma(d, 1)} millas`

function gm(v: number, gr: number): string {
  let g = Math.floor(Math.abs(v))
  let m = +((Math.abs(v) - g) * 60).toFixed(1)
  if (m >= 60) {
    g += 1
    m = 0
  }
  return `${String(g).padStart(gr, '0')}º ${coma(m, 1).padStart(4, '0')}′`
}
export const latitud = (l: number): string => `${gm(l, 2)} ${l >= 0 ? 'N' : 'S'}`
export const longitud = (l: number): string => `${gm(l, 3)} ${l >= 0 ? 'E' : 'W'}`
export const situacion = (p: Pos): string => `${latitud(p.lat)}, ${longitud(p.lon)}`

/** «36º 03,9' N» / «005 18.5 W» → grados decimales. */
export function leerCoord(s: string): number {
  const m = s.replace(/,/g, '.').match(/(\d+)\s*[º°]?\s*(\d+(?:\.\d+)?)?\s*['′’]?\s*([NSEW])/i)
  if (!m) throw new Error(`Coordenada no reconocida: ${s}`)
  const v = +m[1] + (m[2] ? +m[2] / 60 : 0)
  return /[SW]/i.test(m[3]) ? -v : v
}
