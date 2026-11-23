/**
 * Datos de prueba verosímiles para ensayar la noche electoral:
 * sondeo a las 20:00 y escrutinio a las 21:00, 22:00, 23:00 y 00:00 (100 %).
 *
 * Parten de la media del grupo con algo de ruido, y el escrutinio temprano
 * sobrerrepresenta el voto rural (como suele pasar), así que la clasificación se mueve.
 */
import { BLOQUES_PARTIDO, ELECCION } from '../config/eleccion';
import type { EntradaSnapshot, EscanosPartidos, Porra } from '../types';
import { mediaGrupo } from './scoring';
import { madridAIso } from './tiempo';

type Azar = () => number;

const ruido = (azar: Azar, amplitud: number) => (azar() * 2 - 1) * amplitud;
const redondear2 = (x: number) => Math.round(x * 100) / 100;

/** Sesgo típico del escrutinio temprano (escaños), que se diluye al avanzar. */
const SESGO_INICIAL: EscanosPartidos = { pp: 7, psoe: -4, vox: 3, fa: -4 };

function ajustar(escanos: EscanosPartidos): EscanosPartidos {
  const r = {} as EscanosPartidos;
  for (const b of BLOQUES_PARTIDO) {
    const id = b.id as keyof EscanosPartidos;
    r[id] = Math.max(0, Math.round(escanos[id]));
  }
  // Deja al menos 8 escaños para "Otros".
  const tope = ELECCION.totalEscanos - 8;
  let suma = r.pp + r.psoe + r.vox + r.fa;
  while (suma > tope) {
    const mayor = (Object.keys(r) as (keyof EscanosPartidos)[]).reduce((a, b) => (r[a] >= r[b] ? a : b));
    r[mayor] -= 1;
    suma -= 1;
  }
  return r;
}

export function generarDatosPrueba(porras: readonly Porra[], azar: Azar = Math.random): EntradaSnapshot[] {
  const media = mediaGrupo(porras) ?? {
    escanos: { pp: 135, psoe: 110, vox: 55, fa: 25, otros: 25 },
    participacion: 70,
  };

  const final = {} as EscanosPartidos;
  for (const b of BLOQUES_PARTIDO) {
    const id = b.id as keyof EscanosPartidos;
    final[id] = media.escanos[id] + ruido(azar, 9);
  }
  const participacionFinal = Math.min(85, Math.max(55, media.participacion + ruido(azar, 2.5)));

  const pasos: { hora: string; dia: 0 | 1; escrutado: number; tipo: 'sondeo' | 'escrutinio' }[] = [
    { hora: '20:00', dia: 0, escrutado: 0, tipo: 'sondeo' },
    { hora: '21:00', dia: 0, escrutado: redondear2(10 + azar() * 8), tipo: 'escrutinio' },
    { hora: '22:00', dia: 0, escrutado: redondear2(48 + azar() * 14), tipo: 'escrutinio' },
    { hora: '23:00', dia: 0, escrutado: redondear2(86 + azar() * 8), tipo: 'escrutinio' },
    { hora: '00:00', dia: 1, escrutado: 100, tipo: 'escrutinio' },
  ];

  const fechaNoche = ELECCION.fecha;
  const [a, m, d] = fechaNoche.split('-').map(Number);
  const fechaMadrugada = new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);

  return pasos.map((paso) => {
    const pendiente = paso.tipo === 'sondeo' ? 0.6 : 1 - paso.escrutado / 100;
    const escanos = {} as EscanosPartidos;
    for (const b of BLOQUES_PARTIDO) {
      const id = b.id as keyof EscanosPartidos;
      const sesgo = paso.tipo === 'sondeo' ? 0 : SESGO_INICIAL[id] * pendiente;
      escanos[id] = final[id] + sesgo + ruido(azar, 6 * pendiente);
    }
    const participacion = redondear2(
      Math.min(95, Math.max(40, participacionFinal + ruido(azar, 1.5 * pendiente))),
    );
    return {
      momento: madridAIso(paso.dia ? fechaMadrugada : fechaNoche, paso.hora),
      escrutado: paso.escrutado,
      escanos: ajustar(escanos),
      participacion,
      tipo: paso.tipo,
      nota: paso.tipo === 'sondeo' ? 'Datos de prueba · sondeo' : 'Datos de prueba',
    };
  });
}
