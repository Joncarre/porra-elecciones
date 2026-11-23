/**
 * Creación y validación de snapshots de resultados.
 *
 * Módulo independiente de la API y del almacén: hoy lo usa el panel del administrador
 * (vía la función de Netlify), y mañana podría usarlo una fuente automática de resultados
 * sin tocar nada más.
 */
import { BLOQUES_PARTIDO, ELECCION } from '../config/eleccion';
import type { EntradaSnapshot, EscanosPartidos, Snapshot, TipoSnapshot } from '../types';
import { horaEnPuntoMasCercana } from './tiempo';

export type Validacion<T> = { ok: true; valor: T } | { ok: false; error: string };

const NOTA_MAX = 280;

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const hastaDosDecimales = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

/** Escaños de "Otros": lo que falta hasta 350. */
export function calcularOtros(escanos: EscanosPartidos): number {
  return ELECCION.totalEscanos - BLOQUES_PARTIDO.reduce((s, b) => s + escanos[b.id as keyof EscanosPartidos], 0);
}

/** Ordena por momento y, a igual momento, por fecha de creación. */
export function ordenarSnapshots(snapshots: readonly Snapshot[]): Snapshot[] {
  return [...snapshots].sort(
    (a, b) => Date.parse(a.momento) - Date.parse(b.momento) || Date.parse(a.creadoEn) - Date.parse(b.creadoEn),
  );
}

/** Valida lo que llega del formulario o de una fuente automática. Mensajes en español, listos para mostrar. */
export function validarEntrada(datos: unknown, ahora: Date = new Date()): Validacion<EntradaSnapshot> {
  if (!esObjeto(datos)) return { ok: false, error: 'El cuerpo de la petición debe ser un objeto JSON.' };

  // Momento: si no viene, la hora en punto más cercana.
  let momento: string;
  if (datos.momento === undefined || datos.momento === null || datos.momento === '') {
    momento = horaEnPuntoMasCercana(ahora);
  } else if (typeof datos.momento === 'string' && !Number.isNaN(Date.parse(datos.momento))) {
    momento = new Date(datos.momento).toISOString();
  } else {
    return { ok: false, error: 'La hora del dato no es una fecha válida.' };
  }

  const tipo = datos.tipo ?? 'escrutinio';
  if (tipo !== 'escrutinio' && tipo !== 'sondeo') {
    return { ok: false, error: 'El tipo debe ser «escrutinio» o «sondeo».' };
  }

  let escrutado = 0;
  if (tipo === 'escrutinio') {
    if (!esNumero(datos.escrutado)) return { ok: false, error: 'Falta el % escrutado.' };
    if (datos.escrutado < 0 || datos.escrutado > 100 || !hastaDosDecimales(datos.escrutado)) {
      return { ok: false, error: 'El % escrutado debe estar entre 0 y 100, con dos decimales como mucho.' };
    }
    escrutado = datos.escrutado;
  }

  if (!esObjeto(datos.escanos)) return { ok: false, error: 'Faltan los escaños.' };
  const escanos = {} as EscanosPartidos;
  for (const bloque of BLOQUES_PARTIDO) {
    const v = datos.escanos[bloque.id];
    if (!esNumero(v) || !Number.isInteger(v) || v < 0) {
      return { ok: false, error: `Los escaños de ${bloque.corto} deben ser un número entero igual o mayor que 0.` };
    }
    escanos[bloque.id as keyof EscanosPartidos] = v;
  }
  const otros = calcularOtros(escanos);
  if (otros < 0) {
    const suma = ELECCION.totalEscanos - otros;
    const nombres = BLOQUES_PARTIDO.map((b) => b.corto).join(', ').replace(/, ([^,]*)$/, ' y $1');
    return {
      ok: false,
      error: `${nombres} suman ${suma} escaños: no pueden pasar de ${ELECCION.totalEscanos}.`,
    };
  }

  if (!esNumero(datos.participacion)) return { ok: false, error: 'Falta la participación.' };
  if (datos.participacion < 0 || datos.participacion > 100 || !hastaDosDecimales(datos.participacion)) {
    return { ok: false, error: 'La participación debe estar entre 0 y 100, con dos decimales como mucho.' };
  }

  let nota: string | undefined;
  if (datos.nota !== undefined && datos.nota !== null) {
    if (typeof datos.nota !== 'string') return { ok: false, error: 'La nota debe ser texto.' };
    nota = datos.nota.trim() || undefined;
    if (nota && nota.length > NOTA_MAX) {
      return { ok: false, error: `La nota no puede pasar de ${NOTA_MAX} caracteres.` };
    }
  }

  return {
    ok: true,
    valor: { momento, escrutado, escanos, participacion: datos.participacion, tipo: tipo as TipoSnapshot, nota },
  };
}

/** Construye un snapshot nuevo a partir de una entrada ya validada. */
export function crearSnapshot(entrada: EntradaSnapshot, { id, ahora }: { id: string; ahora: Date }): Snapshot {
  return {
    id,
    momento: entrada.momento,
    creadoEn: ahora.toISOString(),
    escrutado: entrada.escrutado,
    escanos: { ...entrada.escanos, otros: calcularOtros(entrada.escanos) },
    participacion: entrada.participacion,
    tipo: entrada.tipo,
    ...(entrada.nota ? { nota: entrada.nota } : {}),
  };
}

/** Corrige un snapshot existente: conserva id y creadoEn, y marca editadoEn. */
export function editarSnapshot(previo: Snapshot, entrada: EntradaSnapshot, ahora: Date): Snapshot {
  return { ...crearSnapshot(entrada, { id: previo.id, ahora: new Date(previo.creadoEn) }), editadoEn: ahora.toISOString() };
}

/** Snapshot que ya ocupa ese mismo minuto (para no duplicar horas), excluyendo opcionalmente uno. */
export function snapshotEnMomento(
  snapshots: readonly Snapshot[],
  momento: string,
  excluirId?: string,
): Snapshot | undefined {
  const t = Math.floor(Date.parse(momento) / 60_000);
  return snapshots.find((s) => s.id !== excluirId && Math.floor(Date.parse(s.momento) / 60_000) === t);
}
