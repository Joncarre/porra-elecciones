import { BLOQUE_IDS, ELECCION } from '../config/eleccion';
import type { Escanos, Porra } from '../types';

export function sumaEscanos(escanos: Escanos): number {
  return BLOQUE_IDS.reduce((s, id) => s + escanos[id], 0);
}

/** Aviso discreto para la interfaz si una porra no suma 350 ("suma 364"); null si está bien. */
export function avisoSuma(porra: Porra): string | null {
  const suma = sumaEscanos(porra.escanos);
  return suma === ELECCION.totalEscanos ? null : `suma ${suma}`;
}

export type InformeValidacion = { errores: string[]; avisos: string[] };

/** Comprueba todas las porras. Cada error dice quién falla y por qué. */
export function validarPorras(porras: readonly Porra[], adminId: string = ELECCION.adminId): InformeValidacion {
  const errores: string[] = [];
  const avisos: string[] = [];
  const vistos = new Set<string>();

  if (porras.length === 0) errores.push('No hay ninguna porra en src/data/porras.ts.');

  for (const porra of porras) {
    const quien = `${porra.nombre || '(sin nombre)'} [${porra.id || 'sin id'}]`;

    if (!porra.id || !/^[a-z0-9-]+$/.test(porra.id)) {
      errores.push(`${quien}: el id debe ir en minúsculas, sin espacios (letras, números y guiones).`);
    }
    if (vistos.has(porra.id)) errores.push(`${quien}: el id "${porra.id}" está repetido.`);
    vistos.add(porra.id);

    if (!porra.nombre?.trim()) errores.push(`${quien}: falta el nombre.`);

    for (const id of BLOQUE_IDS) {
      const v = porra.escanos?.[id];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
        errores.push(`${quien}: los escaños de "${id}" deben ser un entero ≥ 0 (tiene ${String(v)}).`);
      }
    }
    if (BLOQUE_IDS.every((id) => Number.isInteger(porra.escanos?.[id]))) {
      const suma = sumaEscanos(porra.escanos);
      if (suma !== ELECCION.totalEscanos) {
        const diff = suma - ELECCION.totalEscanos;
        errores.push(
          `${quien}: suma ${suma} escaños (${diff > 0 ? 'sobran' : 'faltan'} ${Math.abs(diff)} para ${ELECCION.totalEscanos}).`,
        );
      }
    }

    const p = porra.participacion;
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 100) {
      errores.push(`${quien}: la participación debe estar entre 0 y 100 (tiene ${String(p)}).`);
    } else if (Math.abs(p * 100 - Math.round(p * 100)) > 1e-6) {
      errores.push(`${quien}: la participación admite dos decimales como mucho (tiene ${p}).`);
    }

    if (porra.ejemplo) avisos.push(`${quien}: es una porra de EJEMPLO; sustitúyela por una real.`);
  }

  if (!porras.some((p) => p.id === adminId)) {
    errores.push(`El administrador "${adminId}" (ELECCION.adminId) no existe entre las porras.`);
  }

  return { errores, avisos };
}
