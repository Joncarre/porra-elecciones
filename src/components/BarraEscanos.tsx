import { BLOQUES, ELECCION } from '../config/eleccion';
import type { Escanos } from '../types';

type Props = {
  escanos: Escanos;
  /** "normal" para el último resultado; "fina" para las apuestas antes del primer dato. */
  grosor?: 'normal' | 'fina';
  /** Muestra la marca de mayoría absoluta (176). */
  mayoria?: boolean;
  etiquetaAria?: string;
};

/**
 * Barra apilada de 350 escaños. Los huecos de 2 px separan los bloques
 * (identidad no solo por color: el nombre y la cifra van siempre al lado).
 */
export function BarraEscanos({ escanos, grosor = 'normal', mayoria = true, etiquetaAria }: Props) {
  const suma = BLOQUES.reduce((s, b) => s + escanos[b.id], 0);
  const total = Math.max(suma, ELECCION.totalEscanos);
  let acumulado = 0;
  const segmentos = BLOQUES.map((b) => {
    const izquierda = (acumulado / total) * 100;
    acumulado += escanos[b.id];
    return { b, valor: escanos[b.id], izquierda, ancho: (escanos[b.id] / total) * 100 };
  }).filter((s) => s.valor > 0);

  const descripcion =
    etiquetaAria ??
    `Reparto de ${ELECCION.totalEscanos} escaños: ${BLOQUES.map((b) => `${b.corto} ${escanos[b.id]}`).join(', ')}. Mayoría absoluta en ${ELECCION.mayoriaAbsoluta}.`;
  const alto = grosor === 'fina' ? 'h-[6px]' : 'h-3';
  const posMayoria = ((ELECCION.mayoriaAbsoluta - 0.5) / ELECCION.totalEscanos) * 100;

  return (
    <div role="img" aria-label={descripcion} className="relative">
      {mayoria && (
        <span
          aria-hidden
          className="absolute -top-[18px] -translate-x-1/2 font-mono text-[10px] leading-3 text-secundario"
          style={{ left: `${posMayoria}%` }}
        >
          {ELECCION.mayoriaAbsoluta}
        </span>
      )}
      <div className={`relative w-full ${alto}`}>
        {segmentos.map((s, i) => (
          <span
            key={s.b.id}
            className="absolute inset-y-0 rounded-[3px] transition-[left,width] duration-700 ease-out"
            style={{
              left: `${s.izquierda}%`,
              width: i === segmentos.length - 1 ? `${s.ancho}%` : `max(0px, calc(${s.ancho}% - 2px))`,
              background: s.b.color,
            }}
          />
        ))}
      </div>
      {mayoria && (
        <span
          aria-hidden
          className="absolute -top-[3px] -bottom-[3px] w-px bg-texto/80"
          style={{ left: `${posMayoria}%` }}
        />
      )}
    </div>
  );
}
