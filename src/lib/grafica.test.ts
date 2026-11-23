import { describe, expect, it } from 'vitest';
import { colocarEtiquetas, escalaDesviacion, ticksPosicion } from './grafica';

describe('ejes', () => {
  it('ticks de posición', () => {
    expect(ticksPosicion(1)).toEqual([1]);
    expect(ticksPosicion(3)).toEqual([1, 2, 3]);
    expect(ticksPosicion(15)).toEqual([1, 5, 10, 15]);
    expect(ticksPosicion(16)).toEqual([1, 5, 10, 16]);
    expect(ticksPosicion(20)).toEqual([1, 5, 10, 15, 20]);
  });

  it('escala de desviación con tope redondo', () => {
    expect(escalaDesviacion(0)).toEqual({ tope: 4, ticks: [0, 1, 2, 3, 4] });
    expect(escalaDesviacion(37.4)).toEqual({ tope: 40, ticks: [0, 10, 20, 30, 40] });
    expect(escalaDesviacion(3.3).tope).toBe(4);
  });
});

describe('etiquetas al final de las líneas', () => {
  const ys = (r: { id: string; yEtiqueta: number }[]) => Object.fromEntries(r.map((x) => [x.id, x.yEtiqueta]));

  it('si no se solapan, cada una se queda a la altura de su línea', () => {
    const r = colocarEtiquetas([{ id: 'a', y: 10 }, { id: 'b', y: 50 }, { id: 'c', y: 90 }], 15, 0, 100);
    expect(ys(r)).toEqual({ a: 10, b: 50, c: 90 });
  });

  it('separa las que se solapan, sin perder el orden', () => {
    const r = colocarEtiquetas([{ id: 'a', y: 40 }, { id: 'b', y: 42 }, { id: 'c', y: 44 }], 15, 0, 200);
    expect(ys(r)).toEqual({ a: 40, b: 55, c: 70 });
  });

  it('los empates conservan el orden de entrada', () => {
    const r = colocarEtiquetas([{ id: 'x', y: 30 }, { id: 'y', y: 30 }], 15, 0, 200);
    expect(r.map((e) => e.id)).toEqual(['x', 'y']);
    expect(ys(r)).toEqual({ x: 30, y: 45 });
  });

  it('respeta el borde inferior empujando hacia arriba', () => {
    const r = colocarEtiquetas([{ id: 'a', y: 95 }, { id: 'b', y: 98 }], 15, 0, 100);
    expect(ys(r)).toEqual({ a: 85, b: 100 });
  });

  it('si no caben, se reparten por igual', () => {
    const r = colocarEtiquetas([1, 2, 3, 4, 5].map((i) => ({ id: `p${i}`, y: 50 })), 30, 0, 40);
    expect(r.map((e) => e.yEtiqueta)).toEqual([0, 10, 20, 30, 40]);
  });
});
