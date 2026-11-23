import type { Porra } from '../types';

/**
 * Apuestas de la porra. Son fijas y públicas: solo se cambian aquí, en el código.
 *
 * - Los cinco bloques de escaños deben sumar exactamente 350.
 * - La participación va en %, con hasta dos decimales (73.5 = 73,5 %).
 * - `id` único, en minúsculas y sin espacios ni tildes.
 * - `npm run build` ejecuta scripts/validate-porras.ts y falla si algo no cuadra.
 *
 * Añade una entrada por participante. Da igual cuántos seáis.
 */
export const PORRAS: Porra[] = [
  {
    id: 'jonathan',
    nombre: 'Jonathan',
    escanos: { pp: 125, psoe: 110, vox: 70, fa: 10, otros: 35 },
    participacion: 74,
  },
  {
    id: 'angel',
    nombre: 'Ángel',
    escanos: { pp: 134, psoe: 121, vox: 53, fa: 10, otros: 32 },
    participacion: 73,
  },
  {
    id: 'luismi',
    nombre: 'Luismi',
    escanos: { pp: 133, psoe: 114, vox: 47, fa: 12, otros: 44 },
    participacion: 73.4,
  },
  {
    id: 'crespo',
    nombre: 'Crespo',
    escanos: { pp: 133, psoe: 122, vox: 56, fa: 7, otros: 32 },
    participacion: 75,
  },
  {
    id: 'pablo',
    nombre: 'Pablo',
    escanos: { pp: 130, psoe: 112, vox: 65, fa: 11, otros: 32 },
    participacion: 75,
  },
  {
    id: 'sagrario',
    nombre: 'Sagrario',
    escanos: { pp: 138, psoe: 119, vox: 63, fa: 12, otros: 18 },
    participacion: 82,
  },

  // ⚠️ PENDIENTE: la porra de Varo suma 368 (sobran 18 escaños). Descoméntala cuando la corrija.
  // {
  //   id: 'varo',
  //   nombre: 'Varo',
  //   escanos: { pp: 145, psoe: 125, vox: 58, fa: 18, otros: 22 },
  //   participacion: 81,
  // },

  {
    id: 'goyo',
    nombre: 'Goyo',
    escanos: { pp: 119, psoe: 123, vox: 63, fa: 9, otros: 36 },
    participacion: 71.5,
  },
  {
    id: 'ainhoa',
    nombre: 'Ainhoa',
    escanos: { pp: 136, psoe: 131, vox: 38, fa: 15, otros: 30 },
    participacion: 69,
  },

  // ⚠️ PENDIENTE: Jesús aún no ha hecho la porra.
  // {
  //   id: 'jesus',
  //   nombre: 'Jesús',
  //   escanos: { pp: 0, psoe: 0, vox: 0, fa: 0, otros: 0 },
  //   participacion: 0,
  // },
];
