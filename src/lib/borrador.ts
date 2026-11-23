/**
 * Formulario del panel de administración: estado como texto (lo que se teclea en el móvil)
 * y conversión a una entrada validada con las mismas reglas que el servidor.
 */
import { BLOQUES_PARTIDO } from '../config/eleccion';
import type { EntradaSnapshot, EscanosPartidos, Snapshot, TipoSnapshot } from '../types';
import { calcularOtros, validarEntrada, type Validacion } from './snapshots';
import { horaEnPuntoMasCercana, isoAMadridLocal, madridLocalAIso } from './tiempo';

export type Borrador = {
  /** Valor de <input type="datetime-local">, en hora de Madrid. */
  hora: string;
  escrutado: string;
  pp: string;
  psoe: string;
  vox: string;
  fa: string;
  participacion: string;
  tipo: TipoSnapshot;
  nota: string;
};

/** "73,5" o "73.5" → 73.5; vacío o no numérico → NaN. */
export function aNumero(texto: string): number {
  const limpio = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (limpio === '' || !/^-?\d*\.?\d*$/.test(limpio)) return Number.NaN;
  return Number(limpio);
}

const aTexto = (n: number) => String(n).replace('.', ',');

/** Borrador nuevo: hora en punto más cercana y, si hay, los valores del último snapshot. */
export function borradorNuevo(ultimo: Snapshot | undefined, ahora: Date): Borrador {
  return {
    hora: isoAMadridLocal(horaEnPuntoMasCercana(ahora)),
    escrutado: ultimo && ultimo.tipo === 'escrutinio' ? aTexto(ultimo.escrutado) : '',
    pp: ultimo ? String(ultimo.escanos.pp) : '',
    psoe: ultimo ? String(ultimo.escanos.psoe) : '',
    vox: ultimo ? String(ultimo.escanos.vox) : '',
    fa: ultimo ? String(ultimo.escanos.fa) : '',
    participacion: ultimo ? aTexto(ultimo.participacion) : '',
    tipo: 'escrutinio',
    nota: '',
  };
}

/** Borrador para corregir un snapshot existente. */
export function borradorDesde(s: Snapshot): Borrador {
  return {
    hora: isoAMadridLocal(s.momento),
    escrutado: s.tipo === 'escrutinio' ? aTexto(s.escrutado) : '',
    pp: String(s.escanos.pp),
    psoe: String(s.escanos.psoe),
    vox: String(s.escanos.vox),
    fa: String(s.escanos.fa),
    participacion: aTexto(s.participacion),
    tipo: s.tipo,
    nota: s.nota ?? '',
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
  const momento = madridLocalAIso(b.hora);
  if (!momento) return { ok: false, error: 'Indica la hora del dato.' };
  for (const bloque of BLOQUES_PARTIDO) {
    if (b[bloque.id as keyof EscanosPartidos].trim() === '') return { ok: false, error: `Faltan los escaños de ${bloque.corto}.` };
  }
  return validarEntrada({
    momento,
    tipo: b.tipo,
    escrutado: b.tipo === 'escrutinio' ? (b.escrutado.trim() === '' ? undefined : aNumero(b.escrutado)) : undefined,
    escanos: Object.fromEntries(BLOQUES_PARTIDO.map((x) => [x.id, aNumero(b[x.id as keyof EscanosPartidos])])),
    participacion: b.participacion.trim() === '' ? undefined : aNumero(b.participacion),
    nota: b.nota,
  });
}
