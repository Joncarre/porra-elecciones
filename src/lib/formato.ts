/** Formato español (es-ES) y horas en Europe/Madrid. */
import { ELECCION } from '../config/eleccion';

const NBSP = ' ';
const MENOS = '−';

const formatos = new Map<string, Intl.NumberFormat>();
function formato(maxDecimales: number, minDecimales: number) {
  const clave = `${maxDecimales}-${minDecimales}`;
  let f = formatos.get(clave);
  if (!f) {
    f = new Intl.NumberFormat('es-ES', { maximumFractionDigits: maxDecimales, minimumFractionDigits: minDecimales });
    formatos.set(clave, f);
  }
  return f;
}

/** 73.5 → "73,5"; 3.3 → "3,3"; 12 → "12". Siempre redondeado a 2 decimales como mucho. */
export function numero(valor: number, maxDecimales = 2, minDecimales = 0): string {
  return formato(maxDecimales, Math.min(minDecimales, maxDecimales)).format(valor).replace('-', MENOS);
}

/** Decimales que necesita una columna de valores en centésimas (para alinearla): 0, 1 o 2. */
export function decimalesComunes(centesimas: readonly number[]): number {
  if (centesimas.every((c) => c % 100 === 0)) return 0;
  if (centesimas.every((c) => c % 10 === 0)) return 1;
  return 2;
}

/** 73.5 → "73,5 %" */
export function porcentaje(valor: number, maxDecimales = 2): string {
  return `${numero(valor, maxDecimales)}${NBSP}%`;
}

/** Desviación con signo: +4 / −4 / 0. */
export function conSigno(valor: number, maxDecimales = 2): string {
  if (valor > 0) return `+${numero(valor, maxDecimales)}`;
  if (valor < 0) return `${MENOS}${numero(-valor, maxDecimales)}`;
  return '0';
}

/** Desviación total (en centésimas) para mostrar: 1130 → "11,3" (o "11,30" con decimales fijos). */
export function puntos(centesimas: number, decimalesFijos?: number): string {
  return decimalesFijos === undefined ? numero(centesimas / 100) : numero(centesimas / 100, decimalesFijos, decimalesFijos);
}

const horaMadrid = new Intl.DateTimeFormat('es-ES', {
  timeZone: ELECCION.zonaHoraria,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** ISO → "22:00" en hora de Madrid. */
export function hora(iso: string): string {
  return horaMadrid.format(new Date(iso));
}

/** "Sube 2 puestos", "Baja 1 puesto", "Se mantiene". */
export function textoCambio(cambio: number | null): string {
  if (cambio === null) return 'Sin dato anterior';
  if (cambio === 0) return 'Se mantiene';
  const n = Math.abs(cambio);
  return `${cambio > 0 ? 'Sube' : 'Baja'} ${n} ${n === 1 ? 'puesto' : 'puestos'}`;
}

/** Posición ordinal corta: 1 → "1.º" */
export function ordinal(n: number): string {
  return `${n}.º`;
}
