import { lazy, Suspense, useMemo, useState } from 'react';
import { AntesDeDatos } from '../components/AntesDeDatos';
import { Clasificacion } from '../components/Clasificacion';
import { EventosImportantes } from '../components/EventosImportantes';
import { UltimoResultado } from '../components/UltimoResultado';
import type { EstadoCarga } from '../hooks/useSnapshots';
import { coloresPorPersona } from '../lib/colores';
import type { MomentoHistorial } from '../lib/scoring';
import type { Fase, Porra } from '../types';

// La gráfica (Recharts) pesa: se descarga aparte, solo cuando hay datos que dibujar.
const Evolucion = lazy(() => import('../components/Evolucion').then((m) => ({ default: m.Evolucion })));

type Props = {
  porras: readonly Porra[];
  historial: MomentoHistorial[];
  fase: Fase;
  estado: EstadoCarga;
  error: string | null;
};

export function Directo({ porras, historial, fase, estado, error }: Props) {
  // Resaltado compartido entre la clasificación y la gráfica.
  const [hover, setHover] = useState<string | null>(null);
  const [fijado, setFijado] = useState<string | null>(null);
  const resaltado = hover ?? fijado;
  const colores = useMemo(() => coloresPorPersona(porras), [porras]);

  if (estado === 'cargando' && historial.length === 0) {
    return <p className="pt-10 font-mono text-[12px] text-secundario">Cargando…</p>;
  }
  if (historial.length === 0) return <AntesDeDatos porras={porras} fase={fase} error={error} />;

  const actual = historial[historial.length - 1];
  // El resultado es final cuando el administrador pulsa "Escrutinio terminado".
  const final = fase === 'cerrada';

  return (
    <>
      <UltimoResultado snapshot={actual.snapshot} final={final} />
      <Clasificacion
        momento={actual}
        final={final}
        colores={colores}
        resaltado={resaltado}
        onHover={setHover}
        abierta={fijado}
        onAbrir={setFijado}
      />
      <Suspense fallback={<div aria-hidden className="mt-14 h-[320px]" />}>
        <Evolucion
          historial={historial}
          porras={porras}
          colores={colores}
          resaltado={resaltado}
          onHover={setHover}
          onFijar={(id) => setFijado((f) => (f === id ? null : id))}
        />
      </Suspense>
      <EventosImportantes historial={historial} cerrada={final} />
    </>
  );
}
