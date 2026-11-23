import { eventosImportantes, type ClaseEvento } from '../lib/eventos';
import { hora, porcentaje } from '../lib/formato';
import type { MomentoHistorial } from '../lib/scoring';
import { MarcaCorregido } from './MarcaCorregido';

const DESTACADOS: readonly ClaseEvento[] = ['liderato', 'victoria'];

/** La noche contada hora a hora (lo más reciente arriba): cambios de líder, recortes, saltos, victoria… sin saturar. */
export function EventosImportantes({ historial }: { historial: MomentoHistorial[] }) {
  const grupos = eventosImportantes(historial).reverse();
  if (grupos.length === 0) return null;

  return (
    <section aria-labelledby="eventos-titulo" className="mt-14">
      <h2 id="eventos-titulo" className="font-display text-[19px] font-semibold">
        Eventos importantes
      </h2>
      <ol className="mt-4 space-y-5 border-l border-borde pl-4">
        {grupos.map(({ momento, eventos }) => {
          const s = momento.snapshot;
          return (
            <li key={s.id} className="relative">
              <span aria-hidden className="absolute top-[4px] -left-[20.5px] size-2 rounded-full border border-borde-fuerte bg-fondo" />
              <p className="font-mono text-[11px] tracking-[0.04em] text-secundario">
                {hora(s.momento)} · {s.tipo === 'sondeo' ? 'sondeo' : `${porcentaje(s.escrutado)} escrutado`}
                {s.editadoEn && (
                  <>
                    {' · '}
                    <MarcaCorregido iso={s.editadoEn} />
                  </>
                )}
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {eventos.map((e) => {
                  const destacado = DESTACADOS.includes(e.clase);
                  return (
                    <li key={e.texto} className="flex gap-2.5 text-[13px] leading-snug">
                      <span
                        aria-hidden
                        className={`mt-[6px] size-1.5 shrink-0 rounded-full ${destacado ? 'bg-acento' : 'bg-secundario/60'}`}
                      />
                      <span className="font-light text-texto">{e.texto}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
