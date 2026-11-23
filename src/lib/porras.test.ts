import { describe, expect, it } from 'vitest';
import { PORRAS } from '../data/porras';
import type { Porra } from '../types';
import { avisoSuma, validarPorras } from './porras';

const ok: Porra = { id: 'ana', nombre: 'Ana', escanos: { pp: 130, psoe: 115, vox: 70, fa: 15, otros: 20 }, participacion: 73.5 };

describe('validarPorras', () => {
  it('las porras del repositorio son válidas', () => {
    expect(validarPorras(PORRAS).errores).toEqual([]);
  });

  it('dice quién no suma 350 y cuánto suma', () => {
    const mal = { ...ok, id: 'bea', nombre: 'Bea', escanos: { ...ok.escanos, pp: 144 } };
    const { errores } = validarPorras([ok, mal], 'ana');
    expect(errores).toEqual(['Bea [bea]: suma 364 escaños (sobran 14 para 350).']);
    expect(avisoSuma(mal)).toBe('suma 364');
    expect(avisoSuma(ok)).toBeNull();
  });

  it('detecta ids repetidos, escaños inválidos, participación fuera de rango y admin inexistente', () => {
    const { errores } = validarPorras(
      [ok, { ...ok, escanos: { ...ok.escanos, vox: 69.5, otros: 20.5 } }, { ...ok, id: 'c', participacion: 101 }],
      'jonathan',
    );
    expect(errores.some((e) => e.includes('repetido'))).toBe(true);
    expect(errores.some((e) => e.includes('"vox"'))).toBe(true);
    expect(errores.some((e) => e.includes('participación'))).toBe(true);
    expect(errores.some((e) => e.includes('administrador'))).toBe(true);
  });

  it('avisa (sin fallar) de las porras de ejemplo', () => {
    const { errores, avisos } = validarPorras([ok, { ...ok, id: 'ej', ejemplo: true }], 'ana');
    expect(errores).toEqual([]);
    expect(avisos).toHaveLength(1);
  });
});
