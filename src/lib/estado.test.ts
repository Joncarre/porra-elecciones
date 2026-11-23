import { describe, expect, it } from 'vitest';
import { aplicarAccion, ESTADO_INICIAL, esAccion, faseDe, normalizarEstado } from './estado';

const t1 = new Date('2026-11-29T19:02:00Z');
const t2 = new Date('2026-11-30T00:15:00Z');

describe('estado del escrutinio', () => {
  it('iniciar, cerrar, reabrir y reiniciar', () => {
    const iniciado = aplicarAccion(ESTADO_INICIAL, 'iniciar', t1);
    expect(iniciado).toEqual({ iniciadoEn: t1.toISOString(), cerradoEn: null });
    const cerrado = aplicarAccion(iniciado, 'cerrar', t2);
    expect(cerrado).toEqual({ iniciadoEn: t1.toISOString(), cerradoEn: t2.toISOString() });
    expect(aplicarAccion(cerrado, 'reabrir', t2)).toEqual(iniciado);
    expect(aplicarAccion(cerrado, 'reiniciar', t2)).toEqual(ESTADO_INICIAL);
  });

  it('iniciar dos veces conserva la primera hora; cerrar sin iniciar también marca el inicio', () => {
    const iniciado = aplicarAccion(ESTADO_INICIAL, 'iniciar', t1);
    expect(aplicarAccion(iniciado, 'iniciar', t2).iniciadoEn).toBe(t1.toISOString());
    expect(aplicarAccion(ESTADO_INICIAL, 'cerrar', t2)).toEqual({ iniciadoEn: t2.toISOString(), cerradoEn: t2.toISOString() });
  });

  it('fases', () => {
    expect(faseDe(ESTADO_INICIAL, false)).toBe('espera');
    expect(faseDe(ESTADO_INICIAL, true)).toBe('en-curso'); // meter un dato también la abre
    expect(faseDe({ iniciadoEn: t1.toISOString(), cerradoEn: null }, false)).toBe('en-curso');
    expect(faseDe({ iniciadoEn: t1.toISOString(), cerradoEn: t2.toISOString() }, true)).toBe('cerrada');
    // Cerrada sin datos no tiene sentido: se queda en curso.
    expect(faseDe({ iniciadoEn: t1.toISOString(), cerradoEn: t2.toISOString() }, false)).toBe('en-curso');
  });

  it('valida acciones y normaliza lo guardado', () => {
    expect(esAccion('cerrar')).toBe(true);
    expect(esAccion('borrar')).toBe(false);
    expect(normalizarEstado(null)).toEqual(ESTADO_INICIAL);
    expect(normalizarEstado({ iniciadoEn: 'ayer', cerradoEn: t2.toISOString() })).toEqual({ iniciadoEn: null, cerradoEn: t2.toISOString() });
  });
});
