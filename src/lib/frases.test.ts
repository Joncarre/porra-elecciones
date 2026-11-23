import { describe, expect, it } from 'vitest';
import { BLOQUES } from '../config/eleccion';
import { conSigno, decimalesComunes, numero, porcentaje, puntos } from './formato';
import { fraseBloque, fraseParticipacion } from './frases';

const pp = BLOQUES.find((b) => b.id === 'pp')!;
const vox = BLOQUES.find((b) => b.id === 'vox')!;

describe('frases accesibles', () => {
  it('bloques', () => {
    expect(fraseBloque(pp, 4, 'Marta')).toBe('El PP sacó 4 escaños más de los que apostó Marta.');
    expect(fraseBloque(pp, -4, 'Marta')).toBe('El PP sacó 4 escaños menos de los que apostó Marta.');
    expect(fraseBloque(vox, 1, 'Luis')).toBe('Vox sacó 1 escaño más del que apostó Luis.');
    expect(fraseBloque(pp, 0, 'Ana')).toBe('Ana acertó los escaños del PP.');
    expect(fraseBloque(vox, 0, 'Ana')).toBe('Ana acertó los escaños de Vox.');
  });

  it('participación', () => {
    expect(fraseParticipacion(-330, 'Marta')).toBe('La participación fue 3,3 puntos menor de lo que apostó Marta.');
    expect(fraseParticipacion(100, 'Luis')).toBe('La participación fue 1 punto mayor de lo que apostó Luis.');
    expect(fraseParticipacion(0, 'Ana')).toBe('Ana acertó la participación.');
  });
});

describe('formato es-ES', () => {
  it('números, porcentajes y signos', () => {
    expect(numero(73.5)).toBe('73,5');
    expect(numero(3.3)).toBe('3,3');
    expect(numero(11.333)).toBe('11,33');
    expect(porcentaje(73.5)).toBe('73,5 %');
    expect(conSigno(4)).toBe('+4');
    expect(conSigno(-4)).toBe('−4');
    expect(conSigno(-3.3)).toBe('−3,3');
    expect(conSigno(0)).toBe('0');
  });

  it('decimales comunes para alinear columnas', () => {
    expect(decimalesComunes([2590, 2888])).toBe(2);
    expect(decimalesComunes([2590, 2880])).toBe(1);
    expect(decimalesComunes([2500, 2800])).toBe(0);
    expect(puntos(2590, 2)).toBe('25,90');
    expect(puntos(2590)).toBe('25,9');
  });
});
