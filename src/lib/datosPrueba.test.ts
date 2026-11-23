import { describe, expect, it } from 'vitest';
import { PORRAS } from '../data/porras';
import { generarDatosPrueba } from './datosPrueba';
import { validarEntrada } from './snapshots';

describe('datos de prueba', () => {
  it('genera sondeo + 4 snapshots válidos y ordenados, el último al 100 %', () => {
    for (let i = 0; i < 50; i++) {
      const datos = generarDatosPrueba(PORRAS);
      expect(datos).toHaveLength(5);
      expect(datos[0].tipo).toBe('sondeo');
      expect(datos[4].escrutado).toBe(100);
      for (const d of datos) {
        const v = validarEntrada(d);
        expect(v.ok, v.ok ? '' : v.error).toBe(true);
      }
      const ts = datos.map((d) => Date.parse(d.momento));
      expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    }
  });

  it('las horas son las de la noche electoral en Madrid', () => {
    const datos = generarDatosPrueba(PORRAS, () => 0.5);
    expect(datos.map((d) => d.momento)).toEqual([
      '2026-11-29T19:00:00.000Z',
      '2026-11-29T20:00:00.000Z',
      '2026-11-29T21:00:00.000Z',
      '2026-11-29T22:00:00.000Z',
      '2026-11-29T23:00:00.000Z',
    ]);
  });

  it('funciona sin porras', () => {
    expect(generarDatosPrueba([])).toHaveLength(5);
  });
});
