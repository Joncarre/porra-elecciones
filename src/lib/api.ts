/** Cliente de la API (Netlify Functions). */
import type { EntradaSnapshot, Snapshot } from '../types';

export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(ruta, { cache: 'no-store', ...opciones });
  } catch {
    throw new ErrorApi(0, 'Sin conexión con el servidor.');
  }
  if (!r.ok) {
    let mensaje = `Error ${r.status}`;
    try {
      const cuerpo = await r.json();
      if (typeof cuerpo?.error === 'string') mensaje = cuerpo.error;
    } catch {
      /* respuesta sin JSON */
    }
    throw new ErrorApi(r.status, mensaje);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

const conToken = (token: string, extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${token}`,
  ...extra,
});

const JSON_CT = { 'Content-Type': 'application/json' };

export const obtenerSnapshots = () => pedir<Snapshot[]>('/api/snapshots');

export const comprobarToken = (token: string) => pedir<void>('/api/sesion', { headers: conToken(token) });

export const crearSnapshot = (token: string, entrada: EntradaSnapshot) =>
  pedir<Snapshot>('/api/snapshots', {
    method: 'POST',
    headers: conToken(token, JSON_CT),
    body: JSON.stringify(entrada),
  });

export const editarSnapshot = (token: string, id: string, entrada: EntradaSnapshot) =>
  pedir<Snapshot>(`/api/snapshots/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: conToken(token, JSON_CT),
    body: JSON.stringify(entrada),
  });

export const borrarSnapshot = (token: string, id: string) =>
  pedir<void>(`/api/snapshots/${encodeURIComponent(id)}`, { method: 'DELETE', headers: conToken(token) });

export const borrarTodos = (token: string) =>
  pedir<void>('/api/snapshots', { method: 'DELETE', headers: conToken(token) });
