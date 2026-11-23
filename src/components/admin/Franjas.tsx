import { estadoFranjas } from '../../lib/panel';
import { franjas } from '../../lib/tiempo';
import type { Snapshot } from '../../types';

/** Fila de franjas horarias: hechas (✓), la siguiente que toca (destacada) y el resto. Tocar una la pone en el formulario. */
export function Franjas({ snapshots, onElegir }: { snapshots: readonly Snapshot[]; onElegir: (iso: string) => void }) {
  const estados = estadoFranjas(franjas(), snapshots);
  return (
    <section aria-labelledby="franjas-titulo" className="mt-8">
      <h2 id="franjas-titulo" className="etiqueta">
        Franjas
      </h2>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {estados.map((f) => (
          <li key={f.iso}>
            <button
              type="button"
              onClick={() => onElegir(f.iso)}
              aria-label={`${f.etiqueta}: ${f.hecha ? 'ya introducida' : f.siguiente ? 'la siguiente' : 'pendiente'}. Usar esta hora`}
              className={`flex h-10 items-center gap-1.5 rounded-[10px] border px-3 font-mono text-[13px] transition-colors ${
                f.siguiente
                  ? 'border-texto/70 bg-superficie-2 font-bold text-texto'
                  : f.hecha
                    ? 'border-borde bg-superficie text-secundario'
                    : 'border-borde text-texto hover:bg-superficie'
              }`}
            >
              {f.hecha && <span aria-hidden>✓</span>}
              {f.etiqueta}
              {f.siguiente && <span className="font-sans text-[11px] font-normal text-secundario">siguiente</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
