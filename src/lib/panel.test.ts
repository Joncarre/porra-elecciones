import { describe, expect, it } from 'vitest';
import type { Escanos, Porra, Snapshot } from '../types';
import { estadoFranjas, horaPorDefecto, situacionDe } from './panel';
import { calcularHistorial } from './scoring';
import { franjas } from './tiempo';

const BASE: Escanos = { pp: 120, psoe: 110, vox: 60, fa: 20, otros: 40 };
const porra = (id: string, c: Partial<Escanos> = {}): Porra => ({ id, nombre: id.toUpperCase(), escanos: { ...BASE, ...c }, participacion: 70 });
const snap = (id: string, momento: string, c: Partial<Escanos> = {}): Snapshot => ({
  id,
  momento,
  creadoEn: momento,
  escrutado: 50,
  escanos: { ...BASE, ...c },
  participacion: 70,
  tipo: 'escrutinio',
});

describe('situación del administrador', () => {
  const porras = [porra('yo'), porra('b', { pp: 122, otros: 38 }), porra('c', { pp: 130, otros: 30 })];

  it('si va primero, la ventaja sobre el segundo', () => {
    const [m] = calcularHistorial(porras, [snap('s', '2026-11-29T21:00:00Z')]);
    const s = situacionDe(m, 'yo')!;
    expect(s.fila.posicion).toBe(1);
    expect(s.relacion).toEqual({ tipo: 'lider', ventajaCent: 400, segundos: ['B'] });
  });

  it('si no, la distancia al líder', () => {
    const [m] = calcularHistorial(porras, [snap('s', '2026-11-29T21:00:00Z', { pp: 130, otros: 30 })]);
    const s = situacionDe(m, 'yo')!;
    expect(s.fila.posicion).toBe(3);
    expect(s.relacion).toEqual({ tipo: 'persigue', distanciaCent: 2000, lideres: ['C'] });
  });

  it('empate en cabeza', () => {
    const [m] = calcularHistorial([porra('yo', { pp: 121, otros: 39 }), porra('b', { pp: 119, otros: 41 })], [snap('s', '2026-11-29T21:00:00Z')]);
    expect(situacionDe(m, 'yo')!.relacion).toEqual({ tipo: 'colider', con: ['B'] });
  });

  it('participante único', () => {
    const [m] = calcularHistorial([porra('yo')], [snap('s', '2026-11-29T21:00:00Z')]);
    expect(situacionDe(m, 'yo')!.relacion).toEqual({ tipo: 'solo' });
  });
});

describe('franjas del panel', () => {
  const lista = franjas('2026-11-29', ['21:00', '22:00', '23:00', '00:00', '01:00']);

  it('hora por defecto: la más cercana, o la siguiente franja si ya tiene dato', () => {
    const ahora = new Date('2026-11-29T21:05:00Z'); // 22:05 en Madrid
    expect(horaPorDefecto([], ahora, lista)).toBe('2026-11-29T21:00:00.000Z');
    const conDato = [snap('a', '2026-11-29T21:00:00.000Z')];
    expect(horaPorDefecto(conDato, ahora, lista)).toBe('2026-11-29T22:00:00.000Z'); // 23:00
    const tarde = [snap('z', '2026-11-30T00:00:00.000Z')]; // 01:00, última franja
    expect(horaPorDefecto(tarde, new Date('2026-11-30T00:10:00Z'), lista)).toBe('2026-11-30T01:00:00.000Z');
  });

  it('sin datos, la siguiente es la primera', () => {
    const e = estadoFranjas(lista, []);
    expect(e.filter((f) => f.siguiente).map((f) => f.etiqueta)).toEqual(['21:00']);
    expect(e.some((f) => f.hecha)).toBe(false);
  });

  it('marca las hechas y la siguiente tras el último dato', () => {
    const e = estadoFranjas(lista, [snap('a', '2026-11-29T19:00:00Z'), snap('b', '2026-11-29T20:00:00Z'), snap('c', '2026-11-29T21:00:00Z')]);
    expect(e.map((f) => [f.etiqueta, f.hecha, f.siguiente])).toEqual([
      ['21:00', true, false],
      ['22:00', true, false],
      ['23:00', false, true],
      ['00:00', false, false],
      ['01:00', false, false],
    ]);
  });
});
