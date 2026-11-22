/**
 * Resolución paso a paso de los ejercicios de carta: cada pregunta trae un planteamiento
 * (lista de pasos con sus datos) y aquí se hacen las cuentas y se redacta cada paso.
 */
import * as N from './navegacion'

export type Arg = number | string

export interface Paso {
  op: string
  /** Variable donde se guarda el resultado del paso. */
  as?: string
  /** Aclaración que se muestra debajo del paso. */
  nota?: string
  [k: string]: unknown
}

export interface Planteamiento {
  pasos: Paso[]
}

export interface Punto {
  nombre: string
  lat: string
  lon: string
}

export interface Linea {
  texto: string
  nota?: string
  /** Es la línea con el resultado final. */
  final?: boolean
}

export interface Resolucion {
  lineas: Linea[]
  error?: string
}

type Valor = number | N.Pos

const esPos = (v: unknown): v is N.Pos => typeof v === 'object' && v !== null && 'lat' in v

/** Número con coma decimal y sin ceros sobrantes. */
const num = (x: number, dec = 1) => String(+x.toFixed(dec)).replace('.', ',')
/** Sumando con signo entre paréntesis si es negativo: «+ 3º» / «− 3º». */
const sumando = (x: number) => `${x < 0 ? '−' : '+'} ${num(Math.abs(x))}º`

function decl(x: number): string {
  const a = Math.abs(x)
  const g = Math.floor(a + 1e-9)
  const m = Math.round((a - g) * 60)
  return `${g}º${m ? ` ${String(m).padStart(2, '0')}′` : ''} ${x < 0 ? 'W' : 'E'}`
}

export function resolver(pl: Planteamiento, puntos: Record<string, Punto>): Resolucion {
  const vars: Record<string, Valor> = {}
  const nombres: Record<string, string> = {}
  const lineas: Linea[] = []

  const pos = (a: unknown): N.Pos => {
    if (typeof a === 'string') {
      const v = vars[a]
      if (esPos(v)) return v
      const p = puntos[a]
      if (p) return { lat: N.leerCoord(p.lat), lon: N.leerCoord(p.lon) }
    }
    throw new Error(`Punto desconocido: ${String(a)}`)
  }
  const nom = (a: unknown): string => (typeof a === 'string' ? nombres[a] ?? puntos[a]?.nombre ?? a : String(a))
  const n = (a: unknown): number => {
    if (typeof a === 'number') return a
    if (typeof a === 'string') {
      if (typeof vars[a] === 'number') return vars[a] as number
      if (/^\d{1,2}[h:.]?\d{2}/.test(a)) return N.aMinutos(a)
    }
    throw new Error(`Valor desconocido: ${String(a)}`)
  }
  const guarda = (p: Paso, def: string, v: Valor) => {
    const k = p.as ?? def
    vars[k] = v
    if (typeof p.nombre === 'string') nombres[k] = p.nombre
    return k
  }
  // Contracciones y artículos delante de los nombres de los puntos («a faro» → «al faro»)
  const pulir = (t: string) =>
    t
      .replace(/\ba faro\b/g, 'al faro')
      .replace(/\bde faro\b/g, 'del faro')
      .replace(/\b(a|de|en) (luz|bocana)\b/g, '$1 la $2')
      .replace(/(^|[:(–] |\b(?:a|[Dd]e|en|[Dd]esde) )S\b(?! =)/g, '$1la situación')
      .replace(/\bS = /g, 'situación = ')
      .replace(/línea faro/g, 'línea del faro')
  const linea = (p: Paso, texto: string) => {
    // Los puntos auxiliares (p. ej., uno al sur de un faro para trazar su meridiano) no se cuentan
    if (p.oculto) return
    const t = pulir(texto)
    lineas.push({ texto: /^[a-záéíóú]{2}/.test(t) ? t[0].toUpperCase() + t.slice(1) : t, nota: p.nota })
  }

  const fmt = (v: Valor, f?: string): string => {
    if (esPos(v)) return f === 'lat' ? N.latitud(v.lat) : f === 'lon' ? N.longitud(v.lon) : N.situacion(v)
    switch (f) {
      case 'hora':
        return N.hora(v)
      case 'dur':
        return N.duracion(v)
      case 'millas':
        return N.millas(v)
      case 'corr':
        return N.corr(v)
      case 'g1':
        return N.grados(v, 1)
      case 'nudos':
        return `${num(v, 2)} nudos`
      case 'marc':
        return `${num(Math.abs(v), 0)}º por ${v >= 0 ? 'estribor' : 'babor'}`
      default:
        return N.grados(v)
    }
  }

  try {
    for (const p of pl.pasos) {
      switch (p.op) {
        case 'dm': {
          // Declinación de la carta trasladada al año pedido
          const base = n(p.valor)
          const anual = n(p.anual) / 60
          const anios = n(p.hasta) - n(p.anio)
          const dm = base + anual * anios
          guarda(p, 'dm', dm)
          linea(
            p,
            `Declinación: la carta da ${decl(base)} en ${p.anio} y cambia ${num(Math.abs(n(p.anual)), 1)}′ ${n(p.anual) < 0 ? 'W' : 'E'} al año. En ${p.hasta} (${anios} años): ${decl(base)} ${anual < 0 ? '−' : '+'} ${anios} × ${num(Math.abs(n(p.anual)))}′ = ${decl(dm)} → dm = ${N.corr(dm)}`,
          )
          break
        }
        case 'ct': {
          const dm = n(p.dm)
          const de = n(p.desvio)
          const ct = dm + de
          guarda(p, 'ct', ct)
          linea(p, `Ct = dm + Δ = ${N.corr(dm)} ${sumando(de)} = ${N.corr(ct)}`)
          break
        }
        case 'ctDe': {
          const dv = n(p.dv)
          const da = n(p.da)
          const ct = N.diferencia(da, dv)
          guarda(p, 'ct', ct)
          linea(p, `Ct = Dv − Da = ${N.grados(dv)} − ${N.grados(da)} = ${N.corr(ct)}`)
          break
        }
        case 'rv': {
          const ra = n(p.ra)
          const ct = n(p.ct ?? 'ct')
          const rv = N.rumboVerdadero(ra, ct)
          guarda(p, 'rv', rv)
          linea(p, `Rv = Ra + Ct = ${N.grados(ra)} ${sumando(ct)} = ${N.grados(rv)}`)
          break
        }
        case 'ra': {
          const rv = n(p.rv ?? 'rv')
          const ct = n(p.ct ?? 'ct')
          const ra = N.rumboAguja(rv, ct)
          guarda(p, 'ra', ra)
          linea(p, `Ra = Rv − Ct = ${N.grados(rv)} ${sumando(-ct)} = ${N.grados(ra)}`)
          break
        }
        case 'dvMarc': {
          const rv = n(p.rv ?? 'rv')
          const m = n(p.m)
          const dv = N.demoraDeMarcacion(rv, m)
          guarda(p, `dv_${p.a}`, dv)
          const banda = m === 0 ? 'por la proa' : Math.abs(m) === 180 ? 'por la popa' : `${num(Math.abs(m), 0)}º por ${m > 0 ? 'estribor' : 'babor'}`
          linea(p, `Dv a ${nom(p.a)} = Rv + marcación (${banda}) = ${N.grados(rv)} ${sumando(m)} = ${N.grados(dv)}`)
          break
        }
        case 'dvAguja': {
          const da = n(p.da)
          const ct = n(p.ct ?? 'ct')
          const dv = N.n360(da + ct)
          guarda(p, `dv_${p.a}`, dv)
          linea(p, `Dv a ${nom(p.a)} = Da + Ct = ${N.grados(da)} ${sumando(ct)} = ${N.grados(dv)}`)
          break
        }
        case 'enfilacion': {
          // Faros en línea: los vemos en la dirección del más cercano al más lejano
          const dv = N.rumboYDistancia(pos(p.a), pos(p.b)).rumbo
          guarda(p, `dv_${p.a}`, dv)
          linea(p, `Enfilación ${nom(p.a)} – ${nom(p.b)}: los vemos uno detrás de otro, así que la Dv a los dos es el rumbo de uno a otro, medido en la carta: ${N.grados(dv)}`)
          break
        }
        case 'oposicion': {
          // Estamos entre los dos: la Dv a «a» es el rumbo de «b» a «a»
          const dv = N.rumboYDistancia(pos(p.b), pos(p.a)).rumbo
          guarda(p, `dv_${p.a}`, dv)
          linea(p, `Oposición ${nom(p.a)} – ${nom(p.b)}: estamos entre los dos, así que la Dv a ${nom(p.a)} es el rumbo de ${nom(p.b)} a ${nom(p.a)}, medido en la carta: ${N.grados(dv)}`)
          break
        }
        case 'punto': {
          const s = { lat: N.leerCoord(String(p.lat)), lon: N.leerCoord(String(p.lon)) }
          const k = guarda(p, 'S', s)
          linea(p, `${nom(k)}: ${N.situacion(s)}`)
          break
        }
        case 'desde': {
          // Punto a d millas de un faro en la dirección verdadera r (vista desde el faro)
          const r = n(p.r)
          const d = n(p.d)
          const s = N.estima(pos(p.p), r, d)
          const k = guarda(p, 'S', s)
          linea(p, `${nom(k)}: a ${num(d)} millas de ${nom(p.p)} en la dirección ${N.grados(r)} desde el faro → ${N.situacion(s)}`)
          break
        }
        case 'sit2dv': {
          const s = N.porDosDemoras(pos(p.a), n(p.dva ?? `dv_${p.a}`), pos(p.b), n(p.dvb ?? `dv_${p.b}`))
          const k = guarda(p, 'S', s)
          linea(p, `Trazando desde cada faro la línea opuesta a su demora, se cortan en ${nom(k)}: ${N.situacion(s)}`)
          break
        }
        case 'sitDvD': {
          const g = p.a as string
          const f = (p.f ?? g) as string
          const d = n(p.d)
          const s = N.porDemoraYDistancia(pos(g), n(p.dv ?? `dv_${g}`), pos(f), d, n(p.cual ?? 0))
          const k = guarda(p, 'S', s)
          linea(p, `Corte de la línea de demora a ${nom(g)} con el círculo de ${num(d)} millas alrededor de ${nom(f)}: ${nom(k)} = ${N.situacion(s)}`)
          break
        }
        case 'sit2d': {
          const s = N.porDosDistancias(pos(p.a), n(p.da), pos(p.b), n(p.db), p.lado as 'N' | 'S' | 'E' | 'W')
          const k = guarda(p, 'S', s)
          linea(p, `Corte de los círculos de ${num(n(p.da))} millas a ${nom(p.a)} y ${num(n(p.db))} millas a ${nom(p.b)} (el del ${p.lado}): ${nom(k)} = ${N.situacion(s)}`)
          break
        }
        case 'rumbo': {
          const { rumbo, distancia } = N.rumboYDistancia(pos(p.de ?? 'S'), pos(p.a))
          guarda(p, 'rv', rumbo)
          vars[(p.d as string) ?? 'd'] = distancia
          linea(p, `De ${nom(p.de ?? 'S')} a ${nom(p.a)}, en la carta: Rv = ${N.grados(rumbo)} y distancia = ${N.millas(distancia)}`)
          break
        }
        case 'pasar': {
          const banda = (p.banda ?? 'estribor') as 'babor' | 'estribor'
          const d = n(p.d)
          const r = N.rumboParaPasar(pos(p.de ?? 'S'), pos(p.a), d, banda)
          guarda(p, 'rv', r.rumbo)
          // Distancia hasta tener el faro por el través (punto de tangencia)
          vars.dt = Math.sqrt(r.distancia ** 2 - d ** 2)
          linea(
            p,
            `Para pasar a ${num(d)} millas de ${nom(p.a)} (dejándolo por ${banda}): su demora es ${N.grados(r.demora)} a ${N.millas(r.distancia)}; la tangente al círculo de ${num(d)} millas se separa arcsen(${num(d)} / ${num(r.distancia)}) = ${num(r.angulo)}º → Rv = ${N.grados(r.rumbo)}`,
          )
          break
        }
        case 'tiempo': {
          const d = n(p.d ?? 'd')
          const v = n(p.v)
          const t = (d / v) * 60
          guarda(p, 't', t)
          linea(p, `t = d / v = ${num(d)} / ${num(v)} = ${num(d / v, 2)} h = ${N.duracion(t)}`)
          break
        }
        case 'intervalo': {
          const a = n(p.de)
          const b = n(p.a)
          const t = (((b - a) % 1440) + 1440) % 1440
          guarda(p, 't', t)
          linea(p, `Tiempo navegado: de ${N.hora(a)} a ${N.hora(b)} = ${N.duracion(t)}`)
          break
        }
        case 'distancia': {
          const v = n(p.v)
          const t = n(p.t ?? 't')
          const d = (v * t) / 60
          guarda(p, 'd', d)
          linea(p, `d = v × t = ${num(v)} × ${num(t / 60, 2)} h = ${N.millas(d)}`)
          break
        }
        case 'hora': {
          const h = n(p.h)
          const t = n(p.mas ?? 't')
          guarda(p, 'hrb', h + t)
          linea(p, `HRB = ${N.hora(h)} + ${N.duracion(t)} = ${N.hora(h + t)}`)
          break
        }
        case 'estima': {
          const r = n(p.r ?? 'rv')
          const d = n(p.d ?? 'd')
          const de = pos(p.de ?? 'S')
          const s = N.estima(de, r, d)
          const k = guarda(p, 'S', s)
          linea(p, `Navegando ${N.millas(d)} al Rv ${N.grados(r)} desde ${nom(p.de ?? 'S')} se llega a ${nom(k)}: ${N.situacion(s)}`)
          break
        }
        case 'corte': {
          const de = pos(p.de ?? 'S')
          const r = n(p.r ?? 'rv')
          const s = N.corteConRecta(de, r, pos(p.a), pos(p.b))
          const d = N.rumboYDistancia(de, s).distancia
          const k = guarda(p, 'S', s)
          vars[(p.d as string) ?? 'd'] = d
          linea(p, `Siguiendo el Rv ${N.grados(r)} cortamos ${p.linea ?? `la línea ${nom(p.a)} – ${nom(p.b)}`} en ${nom(k)}: ${N.situacion(s)}, tras ${N.millas(d)}`)
          break
        }
        case 'sitDvLinea': {
          // Línea de demora a un faro cortada con una enfilación u oposición
          const dv = n(p.dv ?? `dv_${p.a}`)
          const s = N.corteConRecta(pos(p.a), N.n360(dv + 180), pos(p.l1), pos(p.l2))
          const k = guarda(p, 'S', s)
          linea(p, `La línea de demora ${N.grados(dv)} a ${nom(p.a)} corta la línea ${nom(p.l1)} – ${nom(p.l2)} en ${nom(k)}: ${N.situacion(s)}`)
          break
        }
        case 'cruce': {
          // Corte de dos enfilaciones u oposiciones (a–b con c–d)
          const a = pos(p.a)
          const s = N.corteConRecta(a, N.rumboYDistancia(a, pos(p.b)).rumbo, pos(p.c), pos(p.d))
          const k = guarda(p, 'S', s)
          linea(p, `Corte de ${p.linea ?? `la línea ${nom(p.a)} – ${nom(p.b)}`} con ${p.linea2 ?? `la línea ${nom(p.c)} – ${nom(p.d)}`}: ${nom(k)} = ${N.situacion(s)}`)
          break
        }
        case 'marcacion': {
          const dv = N.rumboYDistancia(pos(p.de ?? 'S'), pos(p.a)).rumbo
          const rv = n(p.rv ?? 'rv')
          const m = N.diferencia(rv, dv)
          guarda(p, 'm', m)
          linea(p, `Dv a ${nom(p.a)} = ${N.grados(dv)}; marcación = Dv − Rv = ${N.grados(dv)} − ${N.grados(rv)} = ${num(Math.abs(m), 0)}º por ${m >= 0 ? 'estribor' : 'babor'}`)
          break
        }
        case 'velocidad': {
          const d = n(p.d ?? 'd')
          const t = n(p.t ?? 't')
          const v = d / (t / 60)
          guarda(p, 'v', v)
          linea(p, `v = d / t = ${num(d)} / ${num(t / 60, 2)} h = ${num(v, 2)} nudos`)
          break
        }
        case 'desvioDe': {
          const ct = n(p.ct ?? 'ct')
          const dm = n(p.dm)
          guarda(p, 'desvio', ct - dm)
          linea(p, `Δ = Ct − dm = ${N.corr(ct)} ${sumando(-dm)} = ${N.corr(ct - dm)}`)
          break
        }
        case 'popa': {
          // El punto del que venimos queda por la popa: su Dv es el rumbo + 180º
          const rv = n(p.rv ?? 'rv')
          const dv = N.n360(rv + 180)
          guarda(p, `dv_${p.a}`, dv)
          linea(p, `${nom(p.a)} queda por la popa: Dv = Rv + 180º = ${N.grados(dv)}`)
          break
        }
        case 'texto':
          linea(p, String(p.texto))
          break
        case 'resultado': {
          const texto = String(p.texto).replace(/\{(\w+)(?:\|(\w+))?\}/g, (_, k: string, f?: string) => {
            if (!(k in vars)) throw new Error(`Variable sin calcular: ${k}`)
            return fmt(vars[k], f)
          })
          lineas.push({ texto, nota: p.nota, final: true })
          break
        }
        default:
          throw new Error(`Paso desconocido: ${p.op}`)
      }
    }
    return { lineas }
  } catch (e) {
    return { lineas, error: (e as Error).message }
  }
}
