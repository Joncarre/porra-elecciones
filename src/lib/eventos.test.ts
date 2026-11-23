import { describe, expect, it } from 'vitest';
import type { Escanos, Porra, Snapshot } from '../types';
import { eventosImportantes, lapso, UMBRALES } from './eventos';
import { calcularHistorial } from './scoring';

const BASE: Escanos = { pp: 120, psoe: 110, vox: 60, fa: 20, otros: 40 };

/** Porra que se desvía `d` escaños del PP hacia Otros: desviación = 2·|r − d| con un resultado r. */
const porra = (nombre: string, d: number, participacion = 70): Porra => ({
  id: nombre.toLowerCase(),
  nombre,
  escanos: { ...BASE, pp: 120 + d, otros: 40 - d },
  participacion,
});

let hora = 0;
const dato = (r: number, extra: Partial<Snapshot> = {}): Snapshot => {
  hora += 1;
  return {
    id: `s${hora}`,
    momento: new Date(Date.UTC(2026, 10, 29, 19) + hora * 3_600_000).toISOString(),
    creadoEn: '2026-11-29T19:00:00.000Z',
    escrutado: 50,
    escanos: { ...BASE, pp: 120 + r, otros: 40 - r },
    participacion: 70,
    tipo: 'escrutinio',
    ...extra,
  };
};

const textos = (porras: Porra[], datos: Snapshot[], u = UMBRALES, cerrada = false) =>
  eventosImportantes(calcularHistorial(porras, datos), u, cerrada).map((g) => g.eventos.map((e) => e.texto));

describe('eventos importantes', () => {
  it('el primer dato fija quién lidera', () => {
    expect(textos([porra('Ana', 0), porra('Bea', 10)], [dato(0)])).toEqual([['Ana lidera']]);
  });

  it('cambio de líder', () => {
    expect(textos([porra('Ana', 0), porra('Bea', 10)], [dato(0), dato(10)])).toEqual([['Ana lidera'], ['Bea pasa a liderar']]);
  });

  it('recorte de 5 o más puntos al que va justo delante', () => {
    // r=0: Ana 0, Bea 20, Carla 60 · r=4: Ana 8, Bea 12, Carla 52 → Bea recorta 16 a Ana
    expect(textos([porra('Ana', 0), porra('Bea', 10), porra('Carla', 30)], [dato(0), dato(4)])).toEqual([
      ['Ana lidera'],
      ['Bea le recorta 16 puntos a Ana en una hora'],
    ]);
  });

  it('un recorte pequeño no es noticia', () => {
    // r=0: Ana 0, Bea 20 · r=2: Ana 4, Bea 16 → recorte 8… con umbral 10, nada
    expect(textos([porra('Ana', 0), porra('Bea', 10)], [dato(0), dato(2)], { ...UMBRALES, recorteCent: 1000 })).toEqual([['Ana lidera']]);
  });

  it('el segundo se pone a tiro (a menos de 1 punto)', () => {
    // r=0, part 70,2: Ana 0,2 · Bea 20,7 → r=5: Ana 10,2 · Bea 10,7 (a 0,5)
    const porras = [porra('Ana', 0, 70), porra('Bea', 10, 70.9)];
    const t = textos(porras, [dato(0, { participacion: 70.2 }), dato(5, { participacion: 70.2 })]);
    expect(t[1]).toEqual(['Bea se pone a 0,5 de Ana']); // sin repetir el recorte del mismo par
  });

  it('el líder amplía su ventaja', () => {
    // r=4: Ana 8 · Bea 12 (ventaja 4) → r=0: Ana 0 · Bea 20 (ventaja 20)
    expect(textos([porra('Ana', 0), porra('Bea', 10)], [dato(4), dato(0)])[1]).toEqual([
      'Ana amplía su ventaja: ya saca 20 puntos a Bea',
    ]);
  });

  it('saltos de 3 o más puestos (con 5 o más participantes)', () => {
    const porras = ['Ana', 'Bea', 'Carla', 'Dani', 'Eva'].map((n, i) => porra(n, i * 10));
    // r=0: orden Ana…Eva · r=40: orden Eva…Ana
    expect(textos(porras, [dato(0), dato(40)])[1]).toEqual(['Eva pasa a liderar', 'Ana cae 4 puestos: del 1.º al 5.º']);
  });

  it('como mucho N eventos por hora, los más relevantes', () => {
    const porras = ['Ana', 'Bea', 'Carla', 'Dani', 'Eva'].map((n, i) => porra(n, i * 10));
    expect(textos(porras, [dato(0), dato(40)], { ...UMBRALES, maxPorHora: 1 })[1]).toEqual(['Eva pasa a liderar']);
  });

  it('al cerrar la porra: victoria, escaños clavados y participación', () => {
    const t = textos([porra('Ana', 0, 70), porra('Bea', 10, 71.5), porra('Carla', 30, 72)], [dato(4), dato(0, { escrutado: 100 })], UMBRALES, true);
    expect(t[1]).toEqual([
      'Ana gana la porra con 0 de desviación, 21,5 menos que Bea',
      'Escaños clavados: Ana (PP, PSOE, Vox, FA y Otros), Bea (PSOE, Vox y FA) y Carla (PSOE, Vox y FA)',
      'Ana clava la participación (70 %)',
    ]);
  });

  it('llegar al 100 % sin cerrar la porra no da la victoria', () => {
    const t = textos([porra('Ana', 0), porra('Bea', 10)], [dato(4), dato(0, { escrutado: 100 })]);
    expect(t.flat().some((x) => x.includes('gana la porra'))).toBe(false);
  });

  it('se puede cerrar antes del 100 % (escrutinio atascado en 99,9x %)', () => {
    const t = textos([porra('Ana', 0), porra('Bea', 10)], [dato(4), dato(0, { escrutado: 99.97 })], UMBRALES, true);
    expect(t[1][0]).toBe('Ana gana la porra con 0 de desviación, 20 menos que Bea');
  });

  it('victoria compartida', () => {
    const t = textos([porra('Ana', 5), porra('Bea', -5)], [dato(0, { escrutado: 100 })], UMBRALES, true);
    expect(t[0][0]).toBe('Ana y Bea empatan en cabeza y comparten la victoria (10 de desviación)');
  });

  it('un solo escaño clavado se cuenta con su cifra', () => {
    const p = [
      { ...porra('Ana', 0), escanos: { pp: 121, psoe: 109, vox: 61, fa: 19, otros: 40 } },
      { ...porra('Bea', 0, 75), escanos: { pp: 140, psoe: 100, vox: 55, fa: 25, otros: 30 } },
    ];
    const t = textos(p, [dato(0, { escrutado: 100 })], UMBRALES, true);
    expect(t[0]).toContain('Ana clava los escaños del resto de partidos (40)');
  });

  it('lapso entre datos', () => {
    expect(lapso('2026-11-29T20:00:00Z', '2026-11-29T21:00:00Z')).toBe('en una hora');
    expect(lapso('2026-11-29T20:00:00Z', '2026-11-29T20:30:00Z')).toBe('en 30 minutos');
    expect(lapso('2026-11-29T20:00:00Z', '2026-11-29T22:00:00Z')).toBe('en 2 horas');
  });
});
