import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Cabecera } from './components/Cabecera';
import { PORRAS } from './data/porras';
import { RUTAS, useRuta } from './hooks/useRuta';
import { useSesion } from './hooks/useSesion';
import { useSnapshots } from './hooks/useSnapshots';
import { faseDe } from './lib/estado';
import { calcularHistorial } from './lib/scoring';
import { Directo } from './pages/Directo';

// El panel solo lo usa el administrador: se descarga aparte, bajo demanda.
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));

export function App() {
  const { ruta, navegar } = useRuta();
  const { snapshots, estadoPorra, estado, error, recargar } = useSnapshots();
  const sesion = useSesion();
  const historial = useMemo(() => calcularHistorial(PORRAS, snapshots), [snapshots]);
  const ultimo = historial.at(-1)?.snapshot;
  const fase = faseDe(estadoPorra, snapshots.length > 0);
  const conSesion = sesion.token !== null;

  useEffect(() => {
    const titulos = {
      directo: 'Porra 29N',
      admin: conSesion ? 'Panel · Porra 29N' : 'Iniciar sesión · Porra 29N',
    };
    document.title = titulos[ruta];
  }, [ruta, conSesion]);

  const cerrarSesion = () => {
    sesion.cerrar();
    navegar(RUTAS.directo);
  };

  return (
    <MotionConfig reducedMotion="user">
      <Cabecera
        ruta={ruta}
        navegar={navegar}
        conSesion={conSesion}
        onIniciarSesion={() => navegar(RUTAS.admin)}
        ultimo={ultimo}
        fase={fase}
        estado={estado}
        error={error}
      />
      <main className="mx-auto w-full max-w-[720px] px-4">
        {ruta === 'directo' && <Directo porras={PORRAS} historial={historial} fase={fase} estado={estado} error={error} />}
        {ruta === 'admin' && (
          <Suspense fallback={<p className="pt-10 font-mono text-[12px] text-secundario">Cargando…</p>}>
            <Admin
              porras={PORRAS}
              snapshots={snapshots}
              historial={historial}
              estadoPorra={estadoPorra}
              fase={fase}
              recargar={recargar}
              token={sesion.token}
              aviso={sesion.aviso}
              onIniciarSesion={sesion.iniciar}
              onCerrarSesion={cerrarSesion}
              onSesionCaducada={sesion.cerrar}
            />
          </Suspense>
        )}
        <div aria-hidden className="h-20" />
      </main>
    </MotionConfig>
  );
}
