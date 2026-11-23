import { BLOQUES } from '../config/eleccion';
import { hora, numero, porcentaje } from '../lib/formato';
import { esFinal } from '../lib/scoring';
import type { Snapshot } from '../types';
import { BarraEscanos } from './BarraEscanos';
import { MarcaCorregido } from './MarcaCorregido';

/** Franja con el último resultado: barra de 350 escaños, cifras, participación y escrutado. */
export function UltimoResultado({ snapshot }: { snapshot: Snapshot }) {
  const final = esFinal(snapshot);
  const titulo = final ? 'Resultado final' : snapshot.tipo === 'sondeo' ? 'Sondeo' : 'Último dato';

  return (
    <section aria-labelledby="ultimo-titulo" className="pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="ultimo-titulo" className="etiqueta">
          {titulo} · {hora(snapshot.momento)}
        </h2>
        {snapshot.editadoEn && <MarcaCorregido iso={snapshot.editadoEn} />}
      </div>

      <div className="mt-8">
        <BarraEscanos escanos={snapshot.escanos} />
      </div>

      <dl className="mt-4 grid grid-cols-5 gap-x-2">
        {BLOQUES.map((b) => (
          <div key={b.id} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[12px] text-secundario">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: b.color }} />
              <span className="truncate">{b.corto}</span>
            </dt>
            <dd className="mt-0.5 font-display text-[22px] leading-7 font-semibold sm:text-[26px] sm:leading-8">
              {numero(snapshot.escanos[b.id])}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-borde pt-3 font-mono text-[12px]">
        <div className="flex gap-2">
          <dt className="text-secundario">Participación</dt>
          <dd>{porcentaje(snapshot.participacion)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-secundario">Escrutado</dt>
          <dd>{snapshot.tipo === 'sondeo' ? 'sondeo a pie de urna' : porcentaje(snapshot.escrutado)}</dd>
        </div>
        {snapshot.nota && (
          <div className="flex min-w-0 gap-2">
            <dt className="sr-only">Nota</dt>
            <dd className="text-secundario italic">{snapshot.nota}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
