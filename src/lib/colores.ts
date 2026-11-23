/**
 * Un color por participante para la gráfica de evolución (y el punto junto a su nombre).
 * Paleta validada sobre #0b0b0d: banda de luminosidad, croma, separación en daltonismo y en
 * visión normal entre vecinos, y contraste ≥ 3:1 (≥ 5,8:1 como texto).
 * El color sigue a la persona (orden alfabético), nunca a su posición.
 */
import type { Porra } from '../types';
import { ordenAlfabetico } from './scoring';

export const COLORES_PERSONA = [
  '#4d97de',
  '#65a556',
  '#b576c3',
  '#cb7d34',
  '#00a9b1',
  '#d46e80',
  '#8b85de',
  '#a5931b',
  '#00a3c9',
  '#d67161',
] as const;

export function coloresPorPersona(porras: readonly Porra[]): Record<string, string> {
  return Object.fromEntries(ordenAlfabetico(porras).map((p, i) => [p.id, COLORES_PERSONA[i % COLORES_PERSONA.length]]));
}
