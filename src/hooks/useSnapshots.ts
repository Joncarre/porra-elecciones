import { useCallback, useEffect, useRef, useState } from 'react';
import { ELECCION } from '../config/eleccion';
import { obtenerEstado, obtenerSnapshots } from '../lib/api';
import { ESTADO_INICIAL } from '../lib/estado';
import type { EstadoPorra, Snapshot } from '../types';

export type EstadoCarga = 'cargando' | 'listo' | 'error';

/**
 * Datos del servidor: snapshots y estado del escrutinio (iniciado / cerrado).
 * Consulta cada 60 s mientras la pestaña está visible (Page Visibility API)
 * y en cuanto se vuelve a ella. Sin websockets.
 */
export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [estadoPorra, setEstadoPorra] = useState<EstadoPorra>(ESTADO_INICIAL);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [error, setError] = useState<string | null>(null);
  const ultimo = useRef<string>('');

  const recargar = useCallback(async () => {
    try {
      const [lista, porra] = await Promise.all([obtenerSnapshots(), obtenerEstado()]);
      const json = JSON.stringify([lista, porra]);
      // Solo re-renderiza si algo ha cambiado (evita re-animar sin motivo).
      if (json !== ultimo.current) {
        ultimo.current = json;
        setSnapshots(lista);
        setEstadoPorra(porra);
      }
      setEstado('listo');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los resultados.');
      setEstado((prev) => (prev === 'cargando' ? 'error' : prev));
    }
  }, []);

  useEffect(() => {
    let temporizador: ReturnType<typeof setInterval> | undefined;
    const programar = () => {
      clearInterval(temporizador);
      if (document.visibilityState === 'visible') {
        temporizador = setInterval(recargar, ELECCION.intervaloRefresco);
      }
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') void recargar();
      programar();
    };
    void recargar();
    programar();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, [recargar]);

  return { snapshots, estadoPorra, estado, error, recargar };
}
