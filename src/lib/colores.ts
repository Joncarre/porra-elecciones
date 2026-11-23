/**
 * Un color por participante para la gráfica de evolución (y el punto junto a su nombre).
 *
 * Diez familias de color con nombre propio (azul, rojo, verde, morado, naranja, verde azulado,
 * rosa, lima, celeste y lavanda), ajustadas para que CUALQUIER pareja se distinga sobre el
 * fondo oscuro (ΔE OKLab ≥ 13 en visión normal, ≥ 9 con deuteranopía) y lejos del ámbar
 * reservado al líder.
 *
 * El color se asigna por orden de aparición en src/data/porras.ts: quien se añada al final
 * no le cambia el color a nadie. Si hay más de 10 participantes, los colores se repiten
 * (el nombre al final de cada línea sigue identificando a cada uno).
 */
import type { Porra } from '../types';

export const COLORES_PERSONA = [
  '#558ac0', // azul
  '#f36164', // rojo
  '#92fd69', // verde
  '#9657e8', // morado
  '#bd6710', // naranja
  '#2fb39a', // verde azulado
  '#f099ba', // rosa
  '#c4c50f', // amarillo lima
  '#5bcdf9', // celeste
  '#9f94fd', // lavanda
] as const;

export function coloresPorPersona(porras: readonly Porra[]): Record<string, string> {
  return Object.fromEntries(porras.map((p, i) => [p.id, COLORES_PERSONA[i % COLORES_PERSONA.length]]));
}
