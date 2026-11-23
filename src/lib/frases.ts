/** Frases accesibles para el desglose de desviaciones. */
import type { Bloque } from '../config/eleccion';
import { numero } from './formato';

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "el PP" → "del PP"; "Vox" → "de Vox". */
export const deArticulo = (articulo: string) => (articulo.startsWith('el ') ? `del ${articulo.slice(3)}` : `de ${articulo}`);

/** "El PP sacó 4 escaños más de los que apostó Marta." */
export function fraseBloque(bloque: Bloque, desviacion: number, nombre: string): string {
  if (desviacion === 0) return `${nombre} acertó los escaños ${deArticulo(bloque.articulo)}.`;
  const n = Math.abs(desviacion);
  const escanos = n === 1 ? 'escaño' : 'escaños';
  const comparacion = desviacion > 0 ? 'más' : 'menos';
  const relativo = n === 1 ? 'del que' : 'de los que';
  return `${mayuscula(bloque.articulo)} sacó ${n} ${escanos} ${comparacion} ${relativo} apostó ${nombre}.`;
}

/** "La participación fue 3,3 puntos menor de lo que apostó Marta." (desviación en centésimas) */
export function fraseParticipacion(desviacionCent: number, nombre: string): string {
  if (desviacionCent === 0) return `${nombre} acertó la participación.`;
  const n = Math.abs(desviacionCent) / 100;
  const puntos = n === 1 ? 'punto' : 'puntos';
  return `La participación fue ${numero(n)} ${puntos} ${desviacionCent > 0 ? 'mayor' : 'menor'} de lo que apostó ${nombre}.`;
}
