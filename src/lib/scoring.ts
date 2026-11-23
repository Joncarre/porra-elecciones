/**
 * Puntuación de la porra. Solo funciones puras.
 *
 * Reglas:
 * - Desviación por bloque = real − apuesta (con signo).
 * - Desviación en participación = real − apuesta, en puntos porcentuales (con signo).
 * - Desviación total = suma de valores absolutos. Un punto de participación pesa lo mismo que un escaño.
 * - Las desviaciones nunca se compensan entre sí.
 * - Gana quien tenga la menor desviación total; los empates comparten posición (1, 1, 3…).
 *
 * Para evitar errores de coma flotante, todo se calcula en centésimas enteras
 * (1 escaño = 100 centésimas; 1 punto de participación = 100 centésimas).
 */
import { BLOQUE_IDS } from '../config/eleccion';
import type { BloqueId, Escanos, Porra, Snapshot } from '../types';
import { ordenarSnapshots } from './snapshots';

/** Convierte un valor con hasta dos decimales a centésimas enteras (73.5 → 7350). */
export function aCentesimas(valor: number): number {
  return Math.round(valor * 100);
}

/** Convierte centésimas a número para mostrar (330 → 3.3). */
export function desdeCentesimas(centesimas: number): number {
  return centesimas / 100;
}

export type Resultado = Pick<Snapshot, 'escanos' | 'participacion'>;

export type Desviacion = {
  /** real − apuesta, en escaños, con signo. */
  bloques: Record<BloqueId, number>;
  /** real − apuesta, en centésimas de punto, con signo. */
  participacionCent: number;
  /** Suma de valores absolutos, en centésimas. Nunca negativa. */
  totalCent: number;
};

export function calcularDesviacion(porra: Pick<Porra, 'escanos' | 'participacion'>, real: Resultado): Desviacion {
  const bloques = {} as Record<BloqueId, number>;
  let totalCent = 0;
  for (const id of BLOQUE_IDS) {
    const d = real.escanos[id] - porra.escanos[id];
    bloques[id] = d;
    totalCent += Math.abs(d) * 100;
  }
  const participacionCent = aCentesimas(real.participacion) - aCentesimas(porra.participacion);
  totalCent += Math.abs(participacionCent);
  return { bloques, participacionCent, totalCent };
}

export type FilaClasificacion = {
  porra: Porra;
  desviacion: Desviacion;
  /** Posición 1-based; los empates comparten posición (1, 1, 3…). */
  posicion: number;
  /** true para el líder o co-líderes. */
  lider: boolean;
};

const compararNombres = (a: Porra, b: Porra) =>
  a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** Orden alfabético (para cuando aún no hay datos). */
export function ordenAlfabetico(porras: readonly Porra[]): Porra[] {
  return [...porras].sort(compararNombres);
}

/**
 * Clasificación para un resultado: de menor a mayor desviación total.
 * A igual desviación, misma posición; el orden entre empatados es alfabético (solo visual).
 */
export function clasificar(porras: readonly Porra[], real: Resultado): FilaClasificacion[] {
  const filas = porras.map((porra) => ({ porra, desviacion: calcularDesviacion(porra, real) }));
  filas.sort((a, b) => a.desviacion.totalCent - b.desviacion.totalCent || compararNombres(a.porra, b.porra));
  return filas.map((fila) => {
    const posicion = 1 + filas.filter((otra) => otra.desviacion.totalCent < fila.desviacion.totalCent).length;
    return { ...fila, posicion, lider: posicion === 1 };
  });
}

export type MomentoHistorial = {
  snapshot: Snapshot;
  clasificacion: FilaClasificacion[];
  /**
   * Cambio de posición respecto al snapshot anterior, por id de porra.
   * Positivo = sube (▲), negativo = baja (▼), 0 = igual, null = no había snapshot anterior.
   */
  cambios: Record<string, number | null>;
  /** Ids de los líderes en este momento. */
  lideres: string[];
};

/** Clasificación en cada snapshot, en orden cronológico. */
export function calcularHistorial(porras: readonly Porra[], snapshots: readonly Snapshot[]): MomentoHistorial[] {
  const historial: MomentoHistorial[] = [];
  let anterior: FilaClasificacion[] | undefined;
  for (const snapshot of ordenarSnapshots(snapshots)) {
    const clasificacion = clasificar(porras, snapshot);
    const cambios: Record<string, number | null> = {};
    for (const fila of clasificacion) {
      const previa = anterior?.find((f) => f.porra.id === fila.porra.id);
      cambios[fila.porra.id] = previa ? previa.posicion - fila.posicion : null;
    }
    const lideres = clasificacion.filter((f) => f.lider).map((f) => f.porra.id);
    historial.push({ snapshot, clasificacion, cambios, lideres });
    anterior = clasificacion;
  }
  return historial;
}

export type CambioLider = {
  snapshot: Snapshot;
  /** Ids de quienes lideran desde este snapshot. */
  lideres: string[];
  /** Ids de quienes lideraban antes (vacío en el primer snapshot). */
  anteriores: string[];
};

const mismoConjunto = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/** Solo los momentos en los que cambia quién lidera (incluido el primero, que fija el punto de partida). */
export function cambiosDeLider(historial: readonly MomentoHistorial[]): CambioLider[] {
  const cambios: CambioLider[] = [];
  let anteriores: string[] = [];
  for (const momento of historial) {
    if (cambios.length === 0 || !mismoConjunto(momento.lideres, anteriores)) {
      cambios.push({ snapshot: momento.snapshot, lideres: momento.lideres, anteriores });
    }
    anteriores = momento.lideres;
  }
  return cambios;
}

const listaY = (nombres: string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(nombres);

/** Frase para un cambio de líder: "Marta pasa a liderar", "Marta y Luis comparten el liderato"… */
export function textoCambioLider(cambio: CambioLider, nombre: (id: string) => string): string {
  const nombres = cambio.lideres.map(nombre);
  if (cambio.lideres.length > 1) return `${listaY(nombres)} comparten el liderato`;
  if (cambio.anteriores.length === 0) return `${nombres[0]} lidera`;
  if (cambio.anteriores.includes(cambio.lideres[0])) return `${nombres[0]} pasa a liderar en solitario`;
  return `${nombres[0]} pasa a liderar`;
}

/** Un snapshot es el resultado final cuando es de escrutinio y está al 100 %. */
export function esFinal(snapshot: Snapshot): boolean {
  return snapshot.tipo === 'escrutinio' && snapshot.escrutado >= 100;
}

/** Fila de datos para la gráfica de evolución: una por snapshot. */
export type PuntoEvolucion = {
  snapshotId: string;
  momento: string;
  escrutado: number;
  sondeo: boolean;
  editadoEn?: string;
  /** Posición de cada porra en ese momento. */
  posicion: Record<string, number>;
  /** Desviación total de cada porra en ese momento, en puntos (centésimas / 100). */
  desviacion: Record<string, number>;
};

export function seriesEvolucion(historial: readonly MomentoHistorial[]): PuntoEvolucion[] {
  return historial.map(({ snapshot, clasificacion }) => {
    const posicion: Record<string, number> = {};
    const desviacion: Record<string, number> = {};
    for (const fila of clasificacion) {
      posicion[fila.porra.id] = fila.posicion;
      desviacion[fila.porra.id] = desdeCentesimas(fila.desviacion.totalCent);
    }
    return {
      snapshotId: snapshot.id,
      momento: snapshot.momento,
      escrutado: snapshot.escrutado,
      sondeo: snapshot.tipo === 'sondeo',
      editadoEn: snapshot.editadoEn,
      posicion,
      desviacion,
    };
  });
}

/** Media del grupo por bloque y participación (para la fila "Media del grupo"). */
export function mediaGrupo(porras: readonly Porra[]): { escanos: Escanos; participacion: number } | null {
  if (porras.length === 0) return null;
  const escanos = {} as Escanos;
  for (const id of BLOQUE_IDS) {
    escanos[id] = porras.reduce((s, p) => s + p.escanos[id], 0) / porras.length;
  }
  const participacionCent = porras.reduce((s, p) => s + aCentesimas(p.participacion), 0) / porras.length;
  return { escanos, participacion: participacionCent / 100 };
}
