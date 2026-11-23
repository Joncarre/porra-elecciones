import { describe, expect, it } from 'vitest';
import type { Escanos, Porra, Snapshot } from '../types';
import {
  aCentesimas,
  calcularDesviacion,
  calcularHistorial,
  cambiosDeLider,
  clasificar,
  desdeCentesimas,
  esFinal,
  mediaGrupo,
  seriesEvolucion,
  textoCambioLider,
} from './scoring';

const BASE: Escanos = { pp: 120, psoe: 110, vox: 60, fa: 20, otros: 40 };

function porra(id: string, cambios: Partial<Escanos> = {}, participacion = 70): Porra {
  return { id, nombre: id[0].toUpperCase() + id.slice(1), escanos: { ...BASE, ...cambios }, participacion };
}

let contador = 0;
function snap(escanos: Partial<Escanos>, extra: Partial<Snapshot> = {}): Snapshot {
  contador += 1;
  return {
    id: `s${contador}`,
    momento: extra.momento ?? new Date(Date.UTC(2026, 10, 29, 18) + contador * 3_600_000).toISOString(),
    creadoEn: '2026-11-29T20:00:00.000Z',
    escrutado: 50,
    escanos: { ...BASE, ...escanos },
    participacion: 70,
    tipo: 'escrutinio',
    ...extra,
  };
}

describe('desviación por bloque', () => {
  it('apuesta PP 120 y real 116 → −4 (suma 4)', () => {
    const p = porra('ana');
    const real = { escanos: { ...BASE, pp: 116 }, participacion: 70 }; // resto idéntico
    const d = calcularDesviacion(p, real);
    expect(d.bloques.pp).toBe(-4);
    expect(desdeCentesimas(d.totalCent)).toBe(4);
  });

  it('apuesta PP 120 y real 124 → +4 (suma 4)', () => {
    const d = calcularDesviacion(porra('ana'), { escanos: { ...BASE, pp: 124 }, participacion: 70 });
    expect(d.bloques.pp).toBe(4);
    expect(desdeCentesimas(d.totalCent)).toBe(4);
  });

  it('PP +4 y PSOE −4 → desviación 8 (no se compensan)', () => {
    const d = calcularDesviacion(porra('ana'), { escanos: { ...BASE, pp: 124, psoe: 106 }, participacion: 70 });
    expect(d.bloques.pp).toBe(4);
    expect(d.bloques.psoe).toBe(-4);
    expect(desdeCentesimas(d.totalCent)).toBe(8);
  });

  it('sin errores la desviación es 0', () => {
    const d = calcularDesviacion(porra('ana'), { escanos: BASE, participacion: 70 });
    expect(d.totalCent).toBe(0);
    expect(Object.values(d.bloques).every((v) => v === 0)).toBe(true);
  });
});

describe('participación', () => {
  it('73,5 apostada y 70,2 real → 3,3 (sin errores de coma flotante)', () => {
    const d = calcularDesviacion(porra('ana', {}, 73.5), { escanos: BASE, participacion: 70.2 });
    expect(d.participacionCent).toBe(-330);
    expect(d.totalCent).toBe(330);
    expect(desdeCentesimas(d.totalCent)).toBe(3.3);
  });

  it('trabaja en centésimas enteras', () => {
    expect(aCentesimas(73.5)).toBe(7350);
    expect(aCentesimas(70.2)).toBe(7020);
    expect(aCentesimas(0.1 + 0.2)).toBe(30);
    // 70.2 − 73.5 en coma flotante da −3.299999…; en centésimas, exacto.
    expect(aCentesimas(70.2) - aCentesimas(73.5)).toBe(-330);
  });

  it('un punto de participación pesa lo mismo que un escaño', () => {
    const p = porra('ana', {}, 70);
    const unEscano = calcularDesviacion(p, { escanos: { ...BASE, pp: 121, otros: 39 }, participacion: 70 });
    const unPunto = calcularDesviacion(p, { escanos: BASE, participacion: 71 });
    expect(unEscano.totalCent).toBe(200); // +1 PP y −1 Otros
    expect(unPunto.totalCent).toBe(100);
    expect(calcularDesviacion(p, { escanos: { ...BASE, pp: 121 }, participacion: 70 }).totalCent).toBe(unPunto.totalCent);
  });

  it('suma escaños y participación en valor absoluto', () => {
    const d = calcularDesviacion(porra('ana', {}, 73.5), {
      escanos: { ...BASE, pp: 124, psoe: 106 },
      participacion: 70.2,
    });
    expect(desdeCentesimas(d.totalCent)).toBe(11.3);
  });
});

describe('clasificación', () => {
  it('ordena de menor a mayor desviación total', () => {
    const real = { escanos: BASE, participacion: 70 };
    const filas = clasificar([porra('carla', { pp: 130, otros: 30 }), porra('ana'), porra('bea', { pp: 122, otros: 38 })], real);
    expect(filas.map((f) => f.porra.id)).toEqual(['ana', 'bea', 'carla']);
    expect(filas.map((f) => f.posicion)).toEqual([1, 2, 3]);
  });

  it('dos personas con la misma desviación total → misma posición (1, 1, 3)', () => {
    const real = { escanos: BASE, participacion: 70 };
    const filas = clasificar(
      [
        porra('dani', { pp: 130, otros: 30 }), // 20
        porra('bea', { pp: 122, otros: 38 }), // 4
        porra('ana', { psoe: 112, otros: 38 }), // 4
      ],
      real,
    );
    expect(filas.map((f) => [f.porra.id, f.posicion])).toEqual([
      ['ana', 1],
      ['bea', 1],
      ['dani', 3],
    ]);
    expect(filas.filter((f) => f.lider).map((f) => f.porra.id)).toEqual(['ana', 'bea']);
  });

  it('empates en mitad de la tabla (1, 2, 2, 4)', () => {
    const real = { escanos: BASE, participacion: 70 };
    const filas = clasificar(
      [porra('a'), porra('b', { vox: 61, otros: 39 }), porra('c', { fa: 19, otros: 41 }), porra('d', { pp: 110, otros: 50 })],
      real,
    );
    expect(filas.map((f) => f.posicion)).toEqual([1, 2, 2, 4]);
  });

  it('empate exacto con decimales de participación', () => {
    const real = { escanos: BASE, participacion: 70.2 };
    const filas = clasificar([porra('a', {}, 70.1), porra('b', {}, 70.3)], real);
    expect(filas.map((f) => f.posicion)).toEqual([1, 1]);
  });

  it('funciona con un número cualquiera de participantes', () => {
    const real = { escanos: BASE, participacion: 70 };
    for (const n of [1, 3, 20]) {
      const porras = Array.from({ length: n }, (_, i) => porra(`p${i}`, { pp: 120 + i, otros: 40 - i }));
      const filas = clasificar(porras, real);
      expect(filas).toHaveLength(n);
      expect(filas[0].posicion).toBe(1);
    }
  });
});

describe('historial, cambios de posición y de líder', () => {
  const ana = porra('ana', { pp: 130, otros: 30 });
  const bea = porra('bea', { pp: 110, otros: 50 });
  const carla = porra('carla', { pp: 121, otros: 39 });

  it('calcula el cambio de posición respecto al snapshot anterior', () => {
    const s1 = snap({ pp: 130, otros: 30 }); // ana 0, carla 18, bea 40
    const s2 = snap({ pp: 110, otros: 50 }); // bea 0, carla 22, ana 40
    const h = calcularHistorial([ana, bea, carla], [s2, s1]); // desordenados a propósito
    expect(h.map((m) => m.snapshot.id)).toEqual([s1.id, s2.id]);
    expect(h[0].cambios).toEqual({ ana: null, bea: null, carla: null });
    expect(h[1].cambios).toEqual({ bea: 2, carla: 0, ana: -2 });
  });

  it('detecta solo los cambios de líder (el primero fija el punto de partida)', () => {
    const s1 = snap({ pp: 130, otros: 30 }); // lidera ana
    const s2 = snap({ pp: 129, otros: 31 }); // sigue ana
    const s3 = snap({ pp: 110, otros: 50 }); // pasa bea
    const s4 = snap({ pp: 120, otros: 40 }); // ana 20, bea 20, carla 2 → carla
    const h = calcularHistorial([ana, bea, carla], [s1, s2, s3, s4]);
    const cambios = cambiosDeLider(h);
    expect(cambios.map((c) => [c.snapshot.id, c.lideres])).toEqual([
      [s1.id, ['ana']],
      [s3.id, ['bea']],
      [s4.id, ['carla']],
    ]);
    const nombre = (id: string) => ({ ana: 'Ana', bea: 'Bea', carla: 'Carla' })[id]!;
    expect(textoCambioLider(cambios[0], nombre)).toBe('Ana lidera');
    expect(textoCambioLider(cambios[1], nombre)).toBe('Bea pasa a liderar');
  });

  it('empate en cabeza: co-líderes y salida del empate', () => {
    const x = porra('ana', { pp: 124, otros: 36 });
    const y = porra('bea', { pp: 116, otros: 44 });
    const s1 = snap({ pp: 120, otros: 40 }); // ambos a 8 → co-líderes
    const s2 = snap({ pp: 123, otros: 37 }); // ana 2, bea 14
    const cambios = cambiosDeLider(calcularHistorial([x, y], [s1, s2]));
    const nombre = (id: string) => (id === 'ana' ? 'Ana' : 'Bea');
    expect(cambios).toHaveLength(2);
    expect(textoCambioLider(cambios[0], nombre)).toBe('Ana y Bea comparten el liderato');
    expect(textoCambioLider(cambios[1], nombre)).toBe('Ana pasa a liderar en solitario');
  });

  it('sin snapshots no hay historial ni cambios', () => {
    expect(calcularHistorial([ana], [])).toEqual([]);
    expect(cambiosDeLider([])).toEqual([]);
  });
});

describe('snapshots de sondeo', () => {
  const ana = porra('ana', { pp: 130, otros: 30 });
  const bea = porra('bea', { pp: 110, otros: 50 });

  it('puntúan igual que el escrutinio y aparecen marcados en la serie', () => {
    const sondeo = snap({ pp: 130, otros: 30 }, { tipo: 'sondeo', escrutado: 0, momento: '2026-11-29T19:00:00.000Z' });
    const s1 = snap({ pp: 110, otros: 50 }, { momento: '2026-11-29T20:00:00.000Z' });
    const h = calcularHistorial([ana, bea], [s1, sondeo]);
    expect(h[0].snapshot.tipo).toBe('sondeo');
    expect(h[0].lideres).toEqual(['ana']);
    const serie = seriesEvolucion(h);
    expect(serie.map((p) => p.sondeo)).toEqual([true, false]);
    expect(serie[0].posicion).toEqual({ ana: 1, bea: 2 });
    expect(serie[1].posicion).toEqual({ bea: 1, ana: 2 });
    expect(serie[1].desviacion).toEqual({ bea: 0, ana: 40 });
  });

  it('el cambio de líder tras el sondeo cuenta como cambio', () => {
    const sondeo = snap({ pp: 130, otros: 30 }, { tipo: 'sondeo', escrutado: 0, momento: '2026-11-29T19:00:00.000Z' });
    const s1 = snap({ pp: 110, otros: 50 }, { momento: '2026-11-29T20:00:00.000Z' });
    const cambios = cambiosDeLider(calcularHistorial([ana, bea], [sondeo, s1]));
    expect(cambios.map((c) => c.lideres)).toEqual([['ana'], ['bea']]);
  });

  it('un sondeo nunca es el resultado final; el escrutinio al 100 % sí', () => {
    expect(esFinal(snap({}, { tipo: 'sondeo', escrutado: 100 }))).toBe(false);
    expect(esFinal(snap({}, { escrutado: 99.9 }))).toBe(false);
    expect(esFinal(snap({}, { escrutado: 100 }))).toBe(true);
  });
});

describe('media del grupo', () => {
  it('promedia escaños y participación', () => {
    const m = mediaGrupo([porra('a', { pp: 121, otros: 39 }, 70.1), porra('b', { pp: 124, otros: 36 }, 73.4)]);
    expect(m?.escanos.pp).toBe(122.5);
    expect(m?.participacion).toBe(71.75);
  });

  it('sin porras no hay media', () => {
    expect(mediaGrupo([])).toBeNull();
  });
});
