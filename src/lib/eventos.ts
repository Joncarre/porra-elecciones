/**
 * Eventos importantes de la noche (funciones puras).
 *
 * Por cada dato se buscan hechos con gancho y se quedan los más relevantes
 * (como mucho 3 por hora), para que la lista cuente la noche sin saturar:
 * cambios de líder, victoria, quien se pone a tiro, ventajas que crecen,
 * recortes de 5 o más puntos, saltos de 3 o más puestos y, al final, los aciertos exactos.
 */
import { BLOQUES } from '../config/eleccion';
import { numero, porcentaje } from './formato';
import { deArticulo } from './frases';
import { textoCambioLider, type FilaClasificacion, type MomentoHistorial } from './scoring';

export type ClaseEvento =
  | 'liderato'
  | 'victoria'
  | 'a-tiro'
  | 'ventaja'
  | 'recorte'
  | 'salto'
  | 'clavado'
  | 'participacion';

export type Evento = { clase: ClaseEvento; texto: string; prioridad: number };

export type GrupoEventos = { momento: MomentoHistorial; eventos: Evento[] };

export const UMBRALES = {
  /** Recorte mínimo entre dos participantes seguidos (centésimas: 500 = 5 puntos). */
  recorteCent: 500,
  /** Cuánto tiene que crecer la ventaja del líder para contarlo. */
  ventajaCent: 500,
  /** Por debajo de esta distancia, el segundo está "a tiro" del líder. */
  aTiroCent: 100,
  /** Puestos que hay que subir o caer de golpe. */
  salto: 3,
  /** Los saltos solo cuentan con al menos estos participantes. */
  minParticipantesSalto: 5,
  /** Máximo de eventos por hora. */
  maxPorHora: 3,
};

const lista = (nombres: string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(nombres);
const pts = (centesimas: number) => numero(centesimas / 100);
const puntosTexto = (centesimas: number) => `${pts(centesimas)} ${centesimas === 100 ? 'punto' : 'puntos'}`;
const total = (f: FilaClasificacion) => f.desviacion.totalCent;
const nombres = (filas: FilaClasificacion[]) => filas.map((f) => f.porra.nombre);
const mismoConjunto = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** "en una hora", "en 30 minutos", "en 2 horas". */
export function lapso(desde: string, hasta: string): string {
  const minutos = Math.round((Date.parse(hasta) - Date.parse(desde)) / 60_000);
  if (minutos >= 50 && minutos <= 70) return 'en una hora';
  if (minutos < 50) return `en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  const horas = Math.round(minutos / 60);
  return horas === 1 ? 'en una hora' : `en ${horas} horas`;
}

/** Los que siguen al líder (o líderes): la mejor desviación entre el resto. */
function perseguidores(m: MomentoHistorial): { filas: FilaClasificacion[]; distanciaCent: number } | null {
  const resto = m.clasificacion.filter((f) => !f.lider);
  if (resto.length === 0) return null;
  const mejor = Math.min(...resto.map(total));
  const lider = m.clasificacion.find((f) => f.lider)!;
  return { filas: resto.filter((f) => total(f) === mejor), distanciaCent: mejor - total(lider) };
}

function victoria(m: MomentoHistorial): Evento {
  const ganadores = m.clasificacion.filter((f) => f.lider);
  const desv = total(ganadores[0]);
  if (ganadores.length > 1) {
    return {
      clase: 'victoria',
      prioridad: 120,
      texto: `${lista(nombres(ganadores))} empatan en cabeza y comparten la victoria (${pts(desv)} de desviación)`,
    };
  }
  const siguen = perseguidores(m);
  return {
    clase: 'victoria',
    prioridad: 120,
    texto: siguen
      ? `${ganadores[0].porra.nombre} gana la porra con ${pts(desv)} de desviación, ${pts(siguen.distanciaCent)} menos que ${lista(nombres(siguen.filas))}`
      : `${ganadores[0].porra.nombre} gana la porra con ${pts(desv)} de desviación`,
  };
}

function clavados(m: MomentoHistorial): Evento | null {
  const aciertos = m.clasificacion
    .map((f) => ({ f, bloques: BLOQUES.filter((b) => f.desviacion.bloques[b.id] === 0) }))
    .filter((x) => x.bloques.length > 0);
  if (aciertos.length === 0) return null;
  if (aciertos.length === 1 && aciertos[0].bloques.length === 1) {
    const { f, bloques } = aciertos[0];
    const b = bloques[0];
    return {
      clase: 'clavado',
      prioridad: 35,
      texto: `${f.porra.nombre} clava los escaños ${deArticulo(b.articulo)} (${m.snapshot.escanos[b.id]})`,
    };
  }
  const partes = aciertos.map(({ f, bloques }) => `${f.porra.nombre} (${lista(bloques.map((b) => b.corto))})`);
  return { clase: 'clavado', prioridad: 35, texto: `Escaños clavados: ${lista(partes)}` };
}

function masCercaParticipacion(m: MomentoHistorial): Evento | null {
  if (m.clasificacion.length < 2) return null;
  const mejor = Math.min(...m.clasificacion.map((f) => Math.abs(f.desviacion.participacionCent)));
  const filas = m.clasificacion.filter((f) => Math.abs(f.desviacion.participacionCent) === mejor);
  const real = porcentaje(m.snapshot.participacion);
  if (mejor === 0) {
    return {
      clase: 'participacion',
      prioridad: 30,
      texto: `${lista(nombres(filas))} ${filas.length > 1 ? 'clavan' : 'clava'} la participación (${real})`,
    };
  }
  if (filas.length > 1) {
    return {
      clase: 'participacion',
      prioridad: 30,
      texto: `${lista(nombres(filas))} son quienes más se acercan a la participación (${real})`,
    };
  }
  return {
    clase: 'participacion',
    prioridad: 30,
    texto: `${filas[0].porra.nombre} es quien más se acerca a la participación: apostó ${porcentaje(filas[0].porra.participacion)} y fue ${real}`,
  };
}

/**
 * @param cerrada true cuando el administrador ha pulsado "Escrutinio terminado":
 *   el último dato es el resultado final (victoria, escaños clavados…).
 */
export function eventosImportantes(historial: readonly MomentoHistorial[], u = UMBRALES, cerrada = false): GrupoEventos[] {
  const grupos: GrupoEventos[] = [];

  historial.forEach((cur, i) => {
    const prev = i > 0 ? historial[i - 1] : undefined;
    const nombre = (id: string) => cur.clasificacion.find((f) => f.porra.id === id)?.porra.nombre ?? id;
    const final = cerrada && i === historial.length - 1;
    const candidatos: Evento[] = [];
    let nuevosLideres: string[] = [];

    // Liderato (o victoria si es el resultado final)
    if (final) {
      candidatos.push(victoria(cur));
      nuevosLideres = cur.lideres;
    } else if (!prev || !mismoConjunto(cur.lideres, prev.lideres)) {
      candidatos.push({
        clase: 'liderato',
        prioridad: 100,
        texto: textoCambioLider({ snapshot: cur.snapshot, lideres: cur.lideres, anteriores: prev?.lideres ?? [] }, nombre),
      });
      nuevosLideres = cur.lideres.filter((id) => !prev?.lideres.includes(id));
    }

    if (prev) {
      // Ventaja del líder: se pone a tiro o se amplía (en el final ya lo cuenta la victoria)
      let parATiro: [string, string] | null = null;
      if (!final && cur.lideres.length === 1 && prev.lideres.length === 1 && cur.lideres[0] === prev.lideres[0]) {
        const antes = perseguidores(prev);
        const ahora = perseguidores(cur);
        if (antes && ahora) {
          const lider = nombre(cur.lideres[0]);
          if (ahora.distanciaCent < u.aTiroCent && antes.distanciaCent >= u.aTiroCent) {
            candidatos.push({
              clase: 'a-tiro',
              prioridad: 70,
              texto: `${lista(nombres(ahora.filas))} se ${ahora.filas.length > 1 ? 'ponen' : 'pone'} a ${pts(ahora.distanciaCent)} de ${lider}`,
            });
            if (ahora.filas.length === 1) parATiro = [ahora.filas[0].porra.id, cur.lideres[0]];
          } else if (ahora.distanciaCent - antes.distanciaCent >= u.ventajaCent) {
            candidatos.push({
              clase: 'ventaja',
              prioridad: 60,
              texto: `${lider} amplía su ventaja: ya saca ${puntosTexto(ahora.distanciaCent)} a ${lista(nombres(ahora.filas))}`,
            });
          }
        }
      }

      // Mayor recorte al que va justo delante
      let mejor: { a: FilaClasificacion; b: FilaClasificacion; recorte: number } | null = null;
      for (const a of cur.clasificacion) {
        const delante = cur.clasificacion.filter((f) => total(f) < total(a));
        if (delante.length === 0) continue;
        const b = delante[delante.length - 1];
        const aAntes = prev.clasificacion.find((f) => f.porra.id === a.porra.id);
        const bAntes = prev.clasificacion.find((f) => f.porra.id === b.porra.id);
        if (!aAntes || !bAntes) continue;
        const distanciaAntes = total(aAntes) - total(bAntes);
        if (distanciaAntes <= 0) continue;
        const recorte = distanciaAntes - (total(a) - total(b));
        if (recorte >= u.recorteCent && (!mejor || recorte > mejor.recorte)) mejor = { a, b, recorte };
      }
      if (mejor && !(parATiro && parATiro[0] === mejor.a.porra.id && parATiro[1] === mejor.b.porra.id)) {
        candidatos.push({
          clase: 'recorte',
          prioridad: 50,
          texto: `${mejor.a.porra.nombre} le recorta ${puntosTexto(mejor.recorte)} a ${mejor.b.porra.nombre} ${lapso(prev.snapshot.momento, cur.snapshot.momento)}`,
        });
      }

      // Saltos grandes (el mayor hacia arriba y el mayor hacia abajo)
      if (cur.clasificacion.length >= u.minParticipantesSalto) {
        const saltos = cur.clasificacion
          .map((f) => ({ f, cambio: cur.cambios[f.porra.id] ?? 0 }))
          .filter((x) => Math.abs(x.cambio) >= u.salto && !nuevosLideres.includes(x.f.porra.id));
        const arriba = saltos.filter((x) => x.cambio > 0).sort((p, q) => q.cambio - p.cambio)[0];
        const abajo = saltos.filter((x) => x.cambio < 0).sort((p, q) => p.cambio - q.cambio)[0];
        for (const s of [arriba, abajo]) {
          if (!s) continue;
          const n = Math.abs(s.cambio);
          const desde = s.f.posicion + s.cambio;
          candidatos.push({
            clase: 'salto',
            prioridad: 40 + n,
            texto: `${s.f.porra.nombre} ${s.cambio > 0 ? 'sube' : 'cae'} ${n} puestos: del ${desde}.º al ${s.f.posicion}.º`,
          });
        }
      }
    }

    // Curiosidades del resultado final
    if (final) {
      const c = clavados(cur);
      if (c) candidatos.push(c);
      const p = masCercaParticipacion(cur);
      if (p) candidatos.push(p);
    }

    const eventos = candidatos.sort((a, b) => b.prioridad - a.prioridad).slice(0, u.maxPorHora);
    if (eventos.length > 0) grupos.push({ momento: cur, eventos });
  });

  return grupos;
}
