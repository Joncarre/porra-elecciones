/** Lógica pura del panel del administrador. */
import type { Snapshot } from '../types';
import type { FilaClasificacion, MomentoHistorial } from './scoring';
import { snapshotEnMomento } from './snapshots';
import { franjas, horaEnPuntoMasCercana, type Franja } from './tiempo';

/**
 * Hora por defecto del formulario: la hora en punto más cercana a ahora; si esa hora ya
 * tiene dato, la siguiente franja libre tras el último dato (o una hora después del último).
 */
export function horaPorDefecto(snapshots: readonly Snapshot[], ahora: Date, lista: readonly Franja[] = franjas()): string {
  const cercana = horaEnPuntoMasCercana(ahora);
  if (!snapshotEnMomento(snapshots, cercana)) return cercana;
  const ultimo = Math.max(...snapshots.map((s) => Date.parse(s.momento)));
  const libre = lista.find((f) => Date.parse(f.iso) > ultimo && !snapshotEnMomento(snapshots, f.iso));
  return libre ? libre.iso : new Date(ultimo + 3_600_000).toISOString();
}

export type Relacion =
  | { tipo: 'solo' }
  | { tipo: 'lider'; ventajaCent: number; segundos: string[] }
  | { tipo: 'colider'; con: string[] }
  | { tipo: 'persigue'; distanciaCent: number; lideres: string[] };

export type Situacion = {
  fila: FilaClasificacion;
  participantes: number;
  cambio: number | null;
  relacion: Relacion;
};

/** Situación de un participante: posición, desviación y diferencia con el líder (o con el segundo si va primero). */
export function situacionDe(momento: MomentoHistorial, id: string): Situacion | null {
  const { clasificacion } = momento;
  const fila = clasificacion.find((f) => f.porra.id === id);
  if (!fila) return null;
  const otros = clasificacion.filter((f) => f.porra.id !== id);
  const nombres = (filas: FilaClasificacion[]) => filas.map((f) => f.porra.nombre);
  let relacion: Relacion;

  if (otros.length === 0) {
    relacion = { tipo: 'solo' };
  } else if (fila.lider) {
    const empatados = otros.filter((f) => f.lider);
    if (empatados.length > 0) {
      relacion = { tipo: 'colider', con: nombres(empatados) };
    } else {
      const mejorTotal = Math.min(...otros.map((f) => f.desviacion.totalCent));
      relacion = {
        tipo: 'lider',
        ventajaCent: mejorTotal - fila.desviacion.totalCent,
        segundos: nombres(otros.filter((f) => f.desviacion.totalCent === mejorTotal)),
      };
    }
  } else {
    const lideres = clasificacion.filter((f) => f.lider);
    relacion = {
      tipo: 'persigue',
      distanciaCent: fila.desviacion.totalCent - lideres[0].desviacion.totalCent,
      lideres: nombres(lideres),
    };
  }
  return { fila, participantes: clasificacion.length, cambio: momento.cambios[id] ?? null, relacion };
}

export type EstadoFranja = Franja & { hecha: boolean; siguiente: boolean };

/**
 * Franjas configuradas, marcando las que ya tienen dato y la siguiente que toca:
 * la primera sin dato posterior al último snapshot (o la primera sin dato si no hay ninguno).
 */
export function estadoFranjas(lista: readonly Franja[], snapshots: readonly Snapshot[]): EstadoFranja[] {
  const ultimo = snapshots.reduce<number>((max, s) => Math.max(max, Date.parse(s.momento)), Number.NEGATIVE_INFINITY);
  const estados = lista.map((f) => ({ ...f, hecha: !!snapshotEnMomento(snapshots, f.iso), siguiente: false }));
  const siguiente = estados.find((f) => !f.hecha && Date.parse(f.iso) > ultimo);
  if (siguiente) siguiente.siguiente = true;
  return estados;
}
