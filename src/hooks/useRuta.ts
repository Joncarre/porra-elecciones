import { useCallback, useEffect, useState } from 'react';

export type Ruta = 'directo' | 'admin';

export const RUTAS: Record<Ruta, string> = { directo: '/', admin: '/admin' };

function deRuta(path: string): Ruta {
  return path.startsWith('/admin') ? 'admin' : 'directo';
}

/** Enrutado mínimo con la History API: dos rutas, sin dependencias. */
export function useRuta() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const alVolver = () => setPath(window.location.pathname);
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  const navegar = useCallback((destino: string) => {
    if (destino === window.location.pathname) return;
    window.history.pushState(null, '', destino);
    setPath(destino);
    window.scrollTo({ top: 0 });
  }, []);

  return { ruta: deRuta(path), navegar };
}
