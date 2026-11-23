import { esFinal, type MomentoHistorial } from '../../lib/scoring';
import { hora, ordinal, puntos, textoCambio } from '../../lib/formato';
import { situacionDe } from '../../lib/panel';

const lista = (n: string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(n);

/** Tarjeta con mi situación en la porra. */
export function MiSituacion({ momento, adminId }: { momento: MomentoHistorial | undefined; adminId: string }) {
  if (!momento) {
    return (
      <div className="mt-5 rounded-[12px] border border-borde bg-superficie px-4 py-4">
        <p className="etiqueta">Tu situación</p>
        <p className="mt-2 text-[14px] text-secundario">Aún no hay datos. Con el primero verás aquí tu posición.</p>
      </div>
    );
  }
  const s = situacionDe(momento, adminId);
  if (!s) return null;
  const { fila, relacion } = s;
  const final = esFinal(momento.snapshot);

  let frase: string;
  switch (relacion.tipo) {
    case 'solo':
      frase = 'Eres el único participante.';
      break;
    case 'lider':
      frase = `Le sacas ${puntos(relacion.ventajaCent)} a ${lista(relacion.segundos)} (2.º).`;
      break;
    case 'colider':
      frase = `Compartes el liderato con ${lista(relacion.con)}.`;
      break;
    case 'persigue':
      frase = `A ${puntos(relacion.distanciaCent)} ${relacion.lideres.length > 1 ? 'de los líderes' : 'del líder'} (${lista(relacion.lideres)}).`;
      break;
  }

  return (
    <div
      className={`mt-5 rounded-[12px] border px-4 py-4 ${fila.lider ? 'border-acento/35 bg-acento-suave' : 'border-borde bg-superficie'}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="etiqueta">
          Tu situación · {final ? 'final' : hora(momento.snapshot.momento)}
        </p>
        <p className="font-mono text-[11px] text-secundario">{textoCambio(s.cambio)}</p>
      </div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className={`font-display text-[34px] leading-none font-semibold ${fila.lider ? 'text-acento' : ''}`}>
          {ordinal(fila.posicion)}
          <span className="ml-1.5 text-[15px] font-medium text-secundario">de {s.participantes}</span>
        </p>
        <p className="text-right">
          <span className="block font-mono text-[11px] text-secundario uppercase">Desviación</span>
          <span className="font-display text-[26px] leading-none font-semibold">{puntos(fila.desviacion.totalCent)}</span>
        </p>
      </div>
      <p className="mt-3 text-[14px]">{frase}</p>
    </div>
  );
}
