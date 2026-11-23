/** Estado del escrutinio (pura): lo abre y lo cierra el administrador con sus botones. */
import type { AccionEstado, EstadoPorra, Fase } from '../types';

export const ESTADO_INICIAL: EstadoPorra = { iniciadoEn: null, cerradoEn: null };

const ACCIONES: readonly AccionEstado[] = ['iniciar', 'cerrar', 'reabrir', 'reiniciar'];

export function esAccion(valor: unknown): valor is AccionEstado {
  return typeof valor === 'string' && (ACCIONES as readonly string[]).includes(valor);
}

/** Normaliza lo que venga del almacén (o nada) a un estado válido. */
export function normalizarEstado(valor: unknown): EstadoPorra {
  if (typeof valor !== 'object' || valor === null) return ESTADO_INICIAL;
  const v = valor as Record<string, unknown>;
  const iso = (x: unknown) => (typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : null);
  return { iniciadoEn: iso(v.iniciadoEn), cerradoEn: iso(v.cerradoEn) };
}

export function aplicarAccion(estado: EstadoPorra, accion: AccionEstado, ahora: Date): EstadoPorra {
  const ya = ahora.toISOString();
  switch (accion) {
    case 'iniciar':
      return { iniciadoEn: estado.iniciadoEn ?? ya, cerradoEn: null };
    case 'cerrar':
      return { iniciadoEn: estado.iniciadoEn ?? ya, cerradoEn: estado.cerradoEn ?? ya };
    case 'reabrir':
      return { ...estado, cerradoEn: null };
    case 'reiniciar':
      return ESTADO_INICIAL;
  }
}

/**
 * Fase de la porra:
 * - cerrada: el administrador pulsó "Escrutinio terminado" (y hay datos).
 * - en-curso: pulsó "Iniciar escrutinio" o ya hay algún dato.
 * - espera: todavía nada.
 */
export function faseDe(estado: EstadoPorra, hayDatos: boolean): Fase {
  if (estado.cerradoEn && hayDatos) return 'cerrada';
  if (estado.iniciadoEn || hayDatos) return 'en-curso';
  return 'espera';
}
