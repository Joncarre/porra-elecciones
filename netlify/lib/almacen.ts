/**
 * Almacén de snapshots. En producción y en `netlify dev`, Netlify Blobs;
 * en los tests, un almacén en memoria con el mismo contrato.
 */
import { getStore } from '@netlify/blobs';
import { ESTADO_INICIAL, normalizarEstado } from '../../src/lib/estado';
import { ordenarSnapshots } from '../../src/lib/snapshots';
import type { EstadoPorra, Snapshot } from '../../src/types';

export const NOMBRE_STORE = 'porra-29n';
export const CLAVE_SNAPSHOTS = 'snapshots';

export type Lectura = { snapshots: Snapshot[]; version: string | null };

export interface Almacen {
  leer(): Promise<Lectura>;
  /**
   * Escribe la lista completa solo si nadie ha escrito desde `version`
   * (null = la clave aún no existe). Devuelve false si otra escritura se adelantó.
   */
  escribir(snapshots: Snapshot[], version: string | null): Promise<boolean>;
}

/** La clave existe pero el servidor no dio ETag (pasa en el emulador local de `netlify dev`). */
const SIN_ETAG = '*sin-etag*';

export function almacenBlobs(): Almacen {
  const store = getStore({ name: NOMBRE_STORE, consistency: 'strong' });
  return {
    async leer() {
      const r = await store.getWithMetadata(CLAVE_SNAPSHOTS, { type: 'json' });
      if (!r) return { snapshots: [], version: null };
      return { snapshots: Array.isArray(r.data) ? (r.data as Snapshot[]) : [], version: r.etag || SIN_ETAG };
    },
    async escribir(snapshots, version) {
      const datos = ordenarSnapshots(snapshots);
      // En producción, escritura condicional por ETag; sin ETag, escritura normal.
      const opciones =
        version === null ? { onlyIfNew: true } : version === SIN_ETAG ? {} : { onlyIfMatch: version };
      const r = await store.setJSON(CLAVE_SNAPSHOTS, datos, opciones);
      return r.modified;
    },
  };
}

/** Estado del escrutinio (iniciado / cerrado), en la clave "estado" del mismo store. */
export const CLAVE_ESTADO = 'estado';

export interface AlmacenEstado {
  leer(): Promise<EstadoPorra>;
  escribir(estado: EstadoPorra): Promise<void>;
}

export function almacenEstadoBlobs(): AlmacenEstado {
  const store = getStore({ name: NOMBRE_STORE, consistency: 'strong' });
  return {
    async leer() {
      return normalizarEstado(await store.get(CLAVE_ESTADO, { type: 'json' }));
    },
    async escribir(estado) {
      await store.setJSON(CLAVE_ESTADO, estado);
    },
  };
}

export function almacenEstadoMemoria(inicial: EstadoPorra = ESTADO_INICIAL): AlmacenEstado & { actual(): EstadoPorra } {
  let estado = inicial;
  return {
    async leer() {
      return estado;
    },
    async escribir(nuevo) {
      estado = nuevo;
    },
    actual: () => estado,
  };
}

export function almacenMemoria(inicial: Snapshot[] = []): Almacen & { datos(): Snapshot[] } {
  let datos: Snapshot[] | null = inicial.length ? ordenarSnapshots(inicial) : null;
  let version = datos ? 1 : 0;
  return {
    async leer() {
      return { snapshots: datos ? structuredClone(datos) : [], version: datos ? String(version) : null };
    },
    async escribir(snapshots, v) {
      const actual = datos ? String(version) : null;
      if (v !== actual) return false;
      datos = ordenarSnapshots(structuredClone(snapshots));
      version += 1;
      return true;
    },
    datos: () => datos ?? [],
  };
}
