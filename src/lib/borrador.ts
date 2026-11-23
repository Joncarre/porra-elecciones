/**
 * Formulario del panel de administración: estado como texto (lo que se teclea en el móvil)
 * y conversión a una entrada validada con las mismas reglas que el servidor.
 * Solo datos de escrutinio: la hora se elige entre las de la noche (20:00 … 02:00).
 */
import { BLOQUES_PARTIDO } from '../config/eleccion';
import type { EntradaSnapshot, EscanosPartidos, Snapshot } from '../types';
import { calcularOtros, validarEntrada, type Validacion } from './snapshots';

export type Borrador = {
  /** ISO de la hora elegida (una de las de la noche). */
  momento: string;
  escrutado: string;
  pp: string;
  psoe: string;
  vox: string;
  fa: string;
  participacion: string;
};

/** "73,5" o "73.5" → 73.5; vacío o no numérico → NaN. */
export function aNumero(texto: string): number {
  const limpio = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (limpio === '' || !/^-?\d*\.?\d*$/.test(limpio)) return Number.NaN;
  return Number(limpio);
}

const aTexto = (n: number) => String(n).replace('.', ',');

/** Borrador nuevo para una hora, precargado con los valores del último dato (si hay). */
export function borradorNuevo(ultimo: Snapshot | undefined, momento: string): Borrador {
  return {
    momento,
    escrutado: ultimo ? aTexto(ultimo.escrutado) : '',
    pp: ultimo ? String(ultimo.escanos.pp) : '',
    psoe: ultimo ? String(ultimo.escanos.psoe) : '',
    vox: ultimo ? String(ultimo.escanos.vox) : '',
    fa: ultimo ? String(ultimo.escanos.fa) : '',
    participacion: ultimo ? aTexto(ultimo.participacion) : '',
  };
}

/** Borrador para corregir un dato existente. */
export function borradorDesde(s: Snapshot): Borrador {
  return {
    momento: s.momento,
    escrutado: aTexto(s.escrutado),
    pp: String(s.escanos.pp),
    psoe: String(s.escanos.psoe),
    vox: String(s.escanos.vox),
    fa: String(s.escanos.fa),
    participacion: aTexto(s.participacion),
  };
}

/** Escaños de "Otros" en vivo (NaN si falta algún partido). */
export function otrosEnVivo(b: Borrador): number {
  const escanos = {} as EscanosPartidos;
  for (const bloque of BLOQUES_PARTIDO) escanos[bloque.id as keyof EscanosPartidos] = aNumero(b[bloque.id as keyof EscanosPartidos]);
  return calcularOtros(escanos);
}

/** Convierte el borrador en una entrada válida o en un mensaje de error en español. */
export function entradaDesde(b: Borrador): Validacion<EntradaSnapshot> {
  if (!b.momento || Number.isNaN(Date.parse(b.momento))) return { ok: false, error: 'Elige la hora del dato.' };
  for (const bloque of BLOQUES_PARTIDO) {
    if (b[bloque.id as keyof EscanosPartidos].trim() === '') return { ok: false, error: `Faltan los escaños de ${bloque.corto}.` };
  }
  return validarEntrada({
    momento: b.momento,
    tipo: 'escrutinio',
    escrutado: b.escrutado.trim() === '' ? undefined : aNumero(b.escrutado),
    escanos: Object.fromEntries(BLOQUES_PARTIDO.map((x) => [x.id, aNumero(b[x.id as keyof EscanosPartidos])])),
    participacion: b.participacion.trim() === '' ? undefined : aNumero(b.participacion),
  });
}
