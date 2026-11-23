import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../types';
import { aNumero, borradorDesde, borradorNuevo, entradaDesde, otrosEnVivo } from './borrador';

const ultimo: Snapshot = {
  id: 'a',
  momento: '2026-11-29T21:00:00.000Z',
  creadoEn: '2026-11-29T21:03:00.000Z',
  escrutado: 64.5,
  escanos: { pp: 133, psoe: 108, vox: 59, fa: 21, otros: 29 },
  participacion: 70.4,
  tipo: 'escrutinio',
};

describe('borrador del panel', () => {
  it('acepta coma o punto decimal', () => {
    expect(aNumero('73,5')).toBe(73.5);
    expect(aNumero('73.5')).toBe(73.5);
    expect(aNumero(' 12 ')).toBe(12);
    expect(aNumero('')).toBeNaN();
    expect(aNumero('12a')).toBeNaN();
  });

  it('precarga el último dato para la hora elegida', () => {
    const b = borradorNuevo(ultimo, '2026-11-29T22:00:00.000Z');
    expect(b.momento).toBe('2026-11-29T22:00:00.000Z');
    expect(b.pp).toBe('133');
    expect(b.participacion).toBe('70,4');
    expect(b.escrutado).toBe('64,5');
  });

  it('sin datos previos, campos vacíos', () => {
    const b = borradorNuevo(undefined, '2026-11-29T19:00:00.000Z');
    expect(b.pp).toBe('');
    expect(entradaDesde(b)).toEqual({ ok: false, error: 'Faltan los escaños de PP.' });
  });

  it('calcula Otros en vivo y avisa si se pasa de 350', () => {
    const b = { ...borradorDesde(ultimo), pp: '200' };
    expect(otrosEnVivo(b)).toBe(-38);
    expect(entradaDesde(b).ok).toBe(false);
    expect(otrosEnVivo(borradorDesde(ultimo))).toBe(29);
  });

  it('convierte a una entrada de escrutinio válida', () => {
    const r = entradaDesde({ ...borradorDesde(ultimo), escrutado: '70,25' });
    expect(r).toEqual({
      ok: true,
      valor: {
        momento: '2026-11-29T21:00:00.000Z',
        escrutado: 70.25,
        escanos: { pp: 133, psoe: 108, vox: 59, fa: 21 },
        participacion: 70.4,
        tipo: 'escrutinio',
        nota: undefined,
      },
    });
  });

  it('mensajes claros si faltan datos', () => {
    expect(entradaDesde({ ...borradorDesde(ultimo), momento: '' })).toEqual({ ok: false, error: 'Elige la hora del dato.' });
    expect(entradaDesde({ ...borradorDesde(ultimo), escrutado: '' })).toEqual({ ok: false, error: 'Falta el % escrutado.' });
    expect(entradaDesde({ ...borradorDesde(ultimo), participacion: '' })).toEqual({ ok: false, error: 'Falta la participación.' });
  });
});
