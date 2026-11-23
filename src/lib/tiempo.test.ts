import { describe, expect, it } from 'vitest';
import { franjas, horaEnPuntoMasCercana, isoAMadridLocal, madridAIso, madridLocalAIso, siguienteFranja } from './tiempo';

describe('horas en Europe/Madrid', () => {
  it('convierte hora de Madrid a UTC (invierno, UTC+1)', () => {
    expect(madridAIso('2026-11-29', '22:00')).toBe('2026-11-29T21:00:00.000Z');
    expect(madridAIso('2026-11-30', '00:00')).toBe('2026-11-29T23:00:00.000Z');
  });

  it('convierte hora de Madrid a UTC (verano, UTC+2)', () => {
    expect(madridAIso('2026-07-01', '22:00')).toBe('2026-07-01T20:00:00.000Z');
  });

  it('ida y vuelta con datetime-local', () => {
    expect(isoAMadridLocal('2026-11-29T21:00:00.000Z')).toBe('2026-11-29T22:00');
    expect(madridLocalAIso('2026-11-29T22:00')).toBe('2026-11-29T21:00:00.000Z');
    expect(madridLocalAIso('')).toBeNull();
  });

  it('hora en punto más cercana', () => {
    expect(horaEnPuntoMasCercana(new Date('2026-11-29T21:29:59Z'))).toBe('2026-11-29T21:00:00.000Z');
    expect(horaEnPuntoMasCercana(new Date('2026-11-29T21:30:00Z'))).toBe('2026-11-29T22:00:00.000Z');
  });

  it('las franjas de madrugada caen al día siguiente', () => {
    const f = franjas('2026-11-29', ['21:00', '00:00', '01:00']);
    expect(f.map((x) => x.iso)).toEqual([
      '2026-11-29T20:00:00.000Z',
      '2026-11-29T23:00:00.000Z',
      '2026-11-30T00:00:00.000Z',
    ]);
  });

  it('siguiente franja tras un dato', () => {
    const f = franjas('2026-11-29', ['21:00', '22:00', '23:00', '00:00', '01:00']);
    expect(siguienteFranja('2026-11-29T21:00:00.000Z', f)?.etiqueta).toBe('23:00'); // dato de las 22:00
    expect(siguienteFranja('2026-11-29T19:00:00.000Z', f)?.etiqueta).toBe('21:00'); // sondeo de las 20:00
    expect(siguienteFranja('2026-11-30T00:00:00.000Z', f)).toBeNull(); // dato de la 01:00
  });
});
