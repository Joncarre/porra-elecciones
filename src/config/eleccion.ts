import type { BloqueId } from '../types';

export type Bloque = {
  id: BloqueId;
  /** Nombre corto para cabeceras y etiquetas. */
  corto: string;
  /** Nombre largo para textos accesibles. */
  largo: string;
  /** Artículo para frases ("el PP", "Frente Amplio"…). */
  articulo: string;
  /** Variable CSS definida en @theme (src/index.css). */
  color: string;
};

export const ELECCION = {
  nombre: 'Elecciones generales 2026',
  /** Fecha de la noche electoral (hora de Madrid). */
  fecha: '2026-11-29',
  totalEscanos: 350,
  mayoriaAbsoluta: 176,
  zonaHoraria: 'Europe/Madrid',
  /** Participante que administra la porra (debe existir en src/data/porras.ts). */
  adminId: 'jonathan',
  /**
   * Franjas horarias previstas para meter datos, en hora de Madrid.
   * Las horas anteriores a las 12:00 se entienden del día siguiente (madrugada).
   */
  franjas: ['21:00', '22:00', '23:00', '00:00', '01:00'],
  /** Cada cuánto consulta la web si hay datos nuevos (ms). */
  intervaloRefresco: 60_000,
} as const;

/** Bloques en el orden en que se muestran siempre. Ningún componente escribe partidos a fuego. */
export const BLOQUES: readonly Bloque[] = [
  { id: 'pp', corto: 'PP', largo: 'Partido Popular', articulo: 'el PP', color: 'var(--color-pp)' },
  { id: 'psoe', corto: 'PSOE', largo: 'PSOE', articulo: 'el PSOE', color: 'var(--color-psoe)' },
  { id: 'vox', corto: 'Vox', largo: 'Vox', articulo: 'Vox', color: 'var(--color-vox)' },
  { id: 'fa', corto: 'FA', largo: 'Frente Amplio', articulo: 'Frente Amplio', color: 'var(--color-fa)' },
  { id: 'otros', corto: 'Otros', largo: 'Otros partidos', articulo: 'el resto de partidos', color: 'var(--color-otros)' },
];

/** Bloques que se introducen a mano (todos menos "otros", que se calcula). */
export const BLOQUES_PARTIDO = BLOQUES.filter((b) => b.id !== 'otros');

export const BLOQUE_IDS: readonly BloqueId[] = BLOQUES.map((b) => b.id);
