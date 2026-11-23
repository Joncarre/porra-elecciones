import { describe, expect, it } from 'vitest';
import { calcularOtros, crearSnapshot, editarSnapshot, ordenarSnapshots, snapshotEnMomento, validarEntrada } from './snapshots';

const valida = {
  momento: '2026-11-29T21:00:00.000Z',
  escrutado: 64.5,
  escanos: { pp: 130, psoe: 110, vox: 60, fa: 20 },
  participacion: 70.2,
  tipo: 'escrutinio',
};

describe('validarEntrada', () => {
  it('acepta una entrada correcta', () => {
    const r = validarEntrada(valida);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.escanos).toEqual({ pp: 130, psoe: 110, vox: 60, fa: 20 });
  });

  it('rechaza si los cuatro partidos pasan de 350', () => {
    const r = validarEntrada({ ...valida, escanos: { pp: 180, psoe: 120, vox: 40, fa: 20 } });
    expect(r).toEqual({ ok: false, error: 'PP, PSOE, Vox y FA suman 360 escaños: no pueden pasar de 350.' });
  });

  it('rechaza escaños no enteros o negativos', () => {
    expect(validarEntrada({ ...valida, escanos: { ...valida.escanos, vox: 60.5 } }).ok).toBe(false);
    const r = validarEntrada({ ...valida, escanos: { ...valida.escanos, fa: -1 } });
    expect(r.ok === false && r.error).toBe('Los escaños de FA deben ser un número entero igual o mayor que 0.');
  });

  it('rechaza rangos y decimales de más', () => {
    expect(validarEntrada({ ...valida, escrutado: 101 }).ok).toBe(false);
    expect(validarEntrada({ ...valida, participacion: -1 }).ok).toBe(false);
    expect(validarEntrada({ ...valida, participacion: 70.123 }).ok).toBe(false);
    expect(validarEntrada({ ...valida, tipo: 'encuesta' }).ok).toBe(false);
    expect(validarEntrada({ ...valida, momento: 'ayer' }).ok).toBe(false);
    expect(validarEntrada('hola').ok).toBe(false);
  });

  it('sin momento usa la hora en punto más cercana', () => {
    const r = validarEntrada({ ...valida, momento: undefined }, new Date('2026-11-29T21:34:00Z'));
    expect(r.ok && r.valor.momento).toBe('2026-11-29T22:00:00.000Z');
  });

  it('en un sondeo el % escrutado es 0', () => {
    const r = validarEntrada({ ...valida, tipo: 'sondeo', escrutado: undefined });
    expect(r.ok && r.valor.escrutado).toBe(0);
  });

  it('recorta la nota y descarta la vacía', () => {
    const r1 = validarEntrada({ ...valida, nota: '  dato de RTVE  ' });
    expect(r1.ok && r1.valor.nota).toBe('dato de RTVE');
    const r2 = validarEntrada({ ...valida, nota: '   ' });
    expect(r2.ok && r2.valor.nota).toBeUndefined();
  });
});

describe('crear y editar', () => {
  it('calcula Otros = 350 − suma de los cuatro', () => {
    expect(calcularOtros({ pp: 130, psoe: 110, vox: 60, fa: 20 })).toBe(30);
    const r = validarEntrada(valida);
    if (!r.ok) throw new Error(r.error);
    const s = crearSnapshot(r.valor, { id: 'x', ahora: new Date('2026-11-29T21:05:00Z') });
    expect(s.escanos.otros).toBe(30);
    expect(s.creadoEn).toBe('2026-11-29T21:05:00.000Z');
    expect(s.editadoEn).toBeUndefined();
  });

  it('al editar conserva id y creadoEn y rellena editadoEn', () => {
    const r = validarEntrada(valida);
    if (!r.ok) throw new Error(r.error);
    const s = crearSnapshot(r.valor, { id: 'x', ahora: new Date('2026-11-29T21:05:00Z') });
    const e = editarSnapshot(s, { ...r.valor, escrutado: 70 }, new Date('2026-11-29T21:14:00Z'));
    expect(e.id).toBe('x');
    expect(e.creadoEn).toBe(s.creadoEn);
    expect(e.editadoEn).toBe('2026-11-29T21:14:00.000Z');
    expect(e.escrutado).toBe(70);
  });

  it('ordena por momento y detecta horas repetidas', () => {
    const base = { creadoEn: '2026-11-29T20:00:00Z', escrutado: 0, participacion: 70, tipo: 'escrutinio' as const };
    const escanos = { pp: 1, psoe: 1, vox: 1, fa: 1, otros: 346 };
    const a = { ...base, escanos, id: 'a', momento: '2026-11-29T22:00:00.000Z' };
    const b = { ...base, escanos, id: 'b', momento: '2026-11-29T21:00:00.000Z' };
    expect(ordenarSnapshots([a, b]).map((s) => s.id)).toEqual(['b', 'a']);
    expect(snapshotEnMomento([a, b], '2026-11-29T22:00:00Z')?.id).toBe('a');
    expect(snapshotEnMomento([a, b], '2026-11-29T22:00:00Z', 'a')).toBeUndefined();
  });
});
