/** Identificador de cada bloque de escaños. El orden canónico vive en src/config/eleccion.ts. */
export type BloqueId = 'pp' | 'psoe' | 'vox' | 'fa' | 'otros';

export type Escanos = Record<BloqueId, number>;

/** Escaños de los partidos que se introducen a mano ("otros" se calcula). */
export type EscanosPartidos = Omit<Escanos, 'otros'>;

export type Porra = {
  id: string;
  nombre: string;
  escanos: Escanos;
  /** Participación apostada, en %, con hasta dos decimales (p. ej. 73.5). */
  participacion: number;
  /** Marca las porras de ejemplo que hay que sustituir por las reales. */
  ejemplo?: true;
};

export type TipoSnapshot = 'escrutinio' | 'sondeo';

export type Snapshot = {
  id: string;
  /** ISO: hora a la que corresponde el dato. */
  momento: string;
  /** ISO, automático. */
  creadoEn: string;
  /** ISO, automático si se corrige. */
  editadoEn?: string;
  /** % escrutado, 0–100. */
  escrutado: number;
  /** "otros" = 350 − suma de los cuatro partidos, calculado en el servidor. */
  escanos: Escanos;
  /** Participación real, en %. */
  participacion: number;
  tipo: TipoSnapshot;
  nota?: string;
};

/** Lo que el administrador (o una fuente automática futura) envía para crear o editar un snapshot. */
export type EntradaSnapshot = {
  momento: string;
  escrutado: number;
  escanos: EscanosPartidos;
  participacion: number;
  tipo: TipoSnapshot;
  nota?: string;
};
