import { useCallback, useEffect, useRef, useState } from 'react';
import { ELECCION } from '../config/eleccion';
import { obtenerSnapshots } from '../lib/api';
import type { Snapshot } from '../types';

export type EstadoCarga = 'cargando' | 'listo' | 'error';

/**
 * Snapshots del servidor. Consulta cada 60 s mientras la pestaña está visible
 * (Page Visibility API) y en cuanto se vuelve a ella. Sin websockets.
 */
export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [error, setError] = useState<string | null>(null);
  const ultimo = useRef<string>('');

  const recargar = useCallback(async () => {
    try {
      const lista = await obtenerSnapshots();
      const json = JSON.stringify(lista);
      // Solo re-renderiza si algo ha cambiado (evita re-animar sin motivo).
      if (json !== ultimo.current) {
        ultimo.current = json;
        setSnapshots(lista);
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

  return { snapshots, estado, error, recargar };
}
