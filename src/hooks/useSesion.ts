import { useCallback, useEffect, useState } from 'react';
import { comprobarToken, ErrorApi } from '../lib/api';
import { borrarToken, guardarToken, leerToken } from '../lib/sesion';

/**
 * Sesión del administrador. Con la sesión iniciada aparece la pestaña "Panel";
 * el resto de la web es idéntica para todos.
 * La contraseña vive en sessionStorage: dura mientras la pestaña siga abierta.
 */
export function useSesion() {
  const [token, setToken] = useState<string | null>(() => leerToken());
  const [aviso, setAviso] = useState<string | null>(null);

  const cerrar = useCallback((mensaje?: string) => {
    borrarToken();
    setToken(null);
    setAviso(mensaje ?? null);
  }, []);

  const iniciar = useCallback((nuevo: string) => {
    guardarToken(nuevo);
    setToken(nuevo);
    setAviso(null);
  }, []);

  // Si había una sesión guardada, comprueba en segundo plano que la contraseña siga valiendo.
  useEffect(() => {
    const guardado = leerToken();
    if (!guardado) return;
    comprobarToken(guardado).catch((e) => {
      if (e instanceof ErrorApi && e.status === 401) cerrar('La sesión ha caducado: vuelve a iniciarla.');
    });
  }, [cerrar]);

  return { token, aviso, iniciar, cerrar };
}
