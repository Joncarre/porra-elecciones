import { BLOQUES } from '../config/eleccion';
import { porcentaje } from '../lib/formato';
import { avisoSuma } from '../lib/porras';
import { ordenAlfabetico } from '../lib/scoring';
import { siguienteFranja } from '../lib/tiempo';
import type { Fase, Porra } from '../types';
import { BarraEscanos } from './BarraEscanos';

/** Directo antes del primer dato: las porras en orden alfabético. */
export function AntesDeDatos({ porras, fase, error }: { porras: readonly Porra[]; fase: Fase; error: string | null }) {
  const primerDato = siguienteFranja(new Date().toISOString());
  return (
    <>
      <section className="pt-6">
        <p className="max-w-[34rem] text-[16px] leading-relaxed text-secundario">
          {fase === 'espera'
            ? 'Las urnas cierran el domingo 29 a las 20:00. Los resultados se actualizarán cada hora durante el escrutinio.'
            : `El escrutinio ha empezado. ${primerDato ? `El primer dato llegará hacia las ${primerDato.etiqueta}; después, ` : 'Los resultados se actualizarán '}uno cada hora.`}
        </p>
        {error && (
          <p role="alert" className="mt-3 font-mono text-[12px] text-error">
            {error} Reintentando…
          </p>
        )}
      </section>

      <section aria-labelledby="porras-titulo" className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 id="porras-titulo" className="font-display text-[19px] font-semibold">
            Las porras
          </h2>
          <span className="etiqueta">{porras.length} participantes</span>
        </div>
        <ul className="mt-4 border-t border-borde">
          {ordenAlfabetico(porras).map((p) => {
            const aviso = avisoSuma(p);
            return (
              <li key={p.id} className="border-b border-borde py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate font-display text-[17px] font-medium">{p.nombre}</span>
                    {aviso && <span className="font-mono text-[11px] text-secundario">{aviso}</span>}
                  </span>
                  <span className="font-mono text-[12px] text-secundario">
                    <span className="sr-only">Participación apostada: </span>
                    {porcentaje(p.participacion)}
                  </span>
                </div>
                <div className="mt-2.5" aria-hidden>
                  <BarraEscanos escanos={p.escanos} grosor="fina" mayoria={false} />
                </div>
                <p className="mt-2 font-mono text-[11px] text-secundario">
                  <span className="sr-only">Apuesta de {p.nombre}: </span>
                  {BLOQUES.map((b) => `${b.corto} ${p.escanos[b.id]}`).join(' · ')}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
